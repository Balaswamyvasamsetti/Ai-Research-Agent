from typing import List, Dict, Any
import traceback
from app.services.retrieval import SimpleRetriever
from app.services.gemini_speculative_rag import gemini_speculative_rag
from app.models.schemas import QueryResponse

async def process_enhanced_query(query: str, document_ids: List[int] = None) -> QueryResponse:
    """Production-grade Enhanced FRAG workflow with comprehensive error handling"""
    
    print(f"\n=== ENHANCED QUERY PROCESSING ===")
    print(f"Query: {query}")
    print(f"Document IDs filter: {document_ids}")
    
    try:
        # Step 1: Get documents from database
        retriever = SimpleRetriever()
        chunks = await retriever.retrieve(query, max_results=15, document_ids=document_ids)
        
        print(f"Retrieved {len(chunks)} chunks from database")
        
        if not chunks:
            print("✗ No chunks found, returning no-docs response")
            return QueryResponse(
                answer="No relevant documents found. Please ensure documents are uploaded and contain relevant information.",
                sources=[],
                query_type="no-results",
                confidence=0.1
            )
        
        # Step 2: Generate answer using Gemini
        print("→ Generating answer with Gemini...")
        result = await gemini_speculative_rag.generate_answer(query, chunks)
        
        print(f"✓ Answer generated successfully with model: {result.get('model', 'unknown')}")
        
        return QueryResponse(
            answer=result["answer"],
            sources=result["sources"],
            query_type="enhanced",
            confidence=result["confidence"]
        )
        
    except Exception as e:
        print(f"✗ Enhanced query processing failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        
        # Ultimate fallback
        return QueryResponse(
            answer=f"I encountered an error processing your query. Error details: {str(e)}. Please try rephrasing your question or check if documents are properly uploaded.",
            sources=[],
            query_type="error",
            confidence=0.0
        )
