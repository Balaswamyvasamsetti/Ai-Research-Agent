from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import asyncio
import os
from pathlib import Path
from app.core.database import db_manager
from app.models.schemas import QueryRequest, QueryResponse
from app.workflows.enhanced_frag import process_enhanced_query
from app.services.ingestion import chunker
from app.services.resume_analyzer import analyze_resume_with_gemini

# Import API extensions
from app.api_extensions import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db_manager.init_postgres()
    db_manager.init_neo4j()
    yield
    # Shutdown
    await db_manager.close()

app = FastAPI(title="Agentic RAG Research System", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
async def root():
    return {"message": "AI Research Agent API", "docs": "/docs"}

@app.post("/upload", response_model=dict)
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a research document"""
    filename = os.path.basename(file.filename or "")
    if not filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    if not filename.lower().endswith(('.pdf', '.docx', '.txt')):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    # Save uploaded file
    upload_dir = Path("data") / "pdfs"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Process document
    doc_id = await chunker.process_document(str(file_path))
    
    return {
        "message": "Document processed successfully",
        "document_id": doc_id,
        "filename": filename
    }

@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """Query the research documents using FRAG workflow"""
    try:
        response = await process_enhanced_query(request.query, request.document_ids)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
async def list_documents():
    """List all uploaded documents"""
    async with db_manager.pg_pool.acquire() as conn:
        documents = await conn.fetch(
            "SELECT id, filename, created_at FROM documents ORDER BY created_at DESC"
        )
    
    return {
        "documents": [
            {
                "id": doc["id"],
                "filename": doc["filename"],
                "created_at": doc["created_at"].isoformat()
            }
            for doc in documents
        ]
    }

@app.delete("/documents/{document_id}")
async def delete_document(document_id: int):
    """Delete a document and all its chunks"""
    async with db_manager.pg_pool.acquire() as conn:
        # Check if document exists
        doc = await conn.fetchrow("SELECT filename FROM documents WHERE id = $1", document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete from PostgreSQL (cascades to chunks and holographic_storage)
        await conn.execute("DELETE FROM documents WHERE id = $1", document_id)
        
        # Delete from Neo4j (disabled temporarily)
        # if db_manager.neo4j_driver:
        #     with db_manager.neo4j_driver.session() as session:
        #         session.run("MATCH (d:Document {id: $doc_id}) DETACH DELETE d", doc_id=document_id)
    
    return {"message": f"Document '{doc['filename']}' deleted successfully"}

@app.post("/feedback")
async def submit_feedback(feedback_data: dict):
    """Submit user feedback for query responses"""
    async with db_manager.pg_pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO feedback (message_id, feedback_type, comment, created_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (message_id) DO UPDATE SET
            feedback_type = $2, comment = $3, updated_at = NOW()
        """, 
        feedback_data["message_id"], 
        feedback_data["feedback_type"], 
        feedback_data.get("comment", "")
        )
    
    return {"message": "Feedback submitted successfully"}

@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), job_description: str = Form(...)):
    """Analyze resume against job description using AI"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")
    
    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is required")
    
    try:
        # Read file content
        content = await file.read()
        
        # Analyze with Gemini AI
        analysis = await analyze_resume_with_gemini(content, job_description.strip())
        
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "system": "Agentic RAG"}

@app.get("/stats")
async def get_stats():
    """Get system statistics"""
    async with db_manager.pg_pool.acquire() as conn:
        doc_count = await conn.fetchval("SELECT COUNT(*) FROM documents")
        chunk_count = await conn.fetchval("SELECT COUNT(*) FROM chunks")
    
    return {
        "documents": doc_count,
        "chunks": chunk_count,
        "system": "FRAG + MAGMA + Speculative RAG"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
