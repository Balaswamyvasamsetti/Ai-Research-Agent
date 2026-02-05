#!/usr/bin/env python3
"""
Simple system test for AI Research Agent
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import db_manager
from app.services.ingestion import chunker
from app.workflows.enhanced_frag import process_enhanced_query

async def test_complete_system():
    """Test the complete AI Research Agent system"""
    
    print("Testing AI Research Agent System...")
    
    try:
        # 1. Initialize database
        print("1. Initializing database...")
        await db_manager.init_postgres()
        db_manager.init_neo4j()
        print("   Database initialized")
        
        # 2. Check existing documents
        async with db_manager.pg_pool.acquire() as conn:
            doc_count = await conn.fetchval("SELECT COUNT(*) FROM documents")
            chunk_count = await conn.fetchval("SELECT COUNT(*) FROM chunks")
        
        print(f"   Found {doc_count} documents, {chunk_count} chunks")
        
        # 3. Process documents if none exist
        if doc_count == 0:
            print("2. Processing documents...")
            data_dir = Path("data/pdfs")
            if data_dir.exists():
                files = list(data_dir.glob("*"))
                processed = 0
                for file_path in files:
                    if file_path.suffix.lower() in ['.pdf', '.txt', '.docx']:
                        try:
                            doc_id = await chunker.process_document(str(file_path))
                            processed += 1
                            print(f"   Processed {file_path.name} -> ID: {doc_id}")
                        except Exception as e:
                            print(f"   Failed {file_path.name}: {e}")
                
                print(f"   Processed {processed} documents")
                
                # Recheck counts
                async with db_manager.pg_pool.acquire() as conn:
                    doc_count = await conn.fetchval("SELECT COUNT(*) FROM documents")
                    chunk_count = await conn.fetchval("SELECT COUNT(*) FROM chunks")
                print(f"   Now have {doc_count} documents, {chunk_count} chunks")
        
        # 4. Test queries
        if chunk_count > 0:
            print("3. Testing queries...")
            
            test_queries = [
                "What is the main topic?",
                "What are the key findings?",
                "Summarize the content"
            ]
            
            for i, query in enumerate(test_queries, 1):
                print(f"   Query {i}: {query}")
                try:
                    response = await process_enhanced_query(query)
                    print(f"   Answer: {response.answer[:100]}...")
                    print(f"   Confidence: {response.confidence:.2%}, Sources: {len(response.sources)}")
                except Exception as e:
                    print(f"   Query failed: {e}")
        else:
            print("3. No chunks available for testing queries")
        
        print("\nSystem test completed!")
        
    except Exception as e:
        print(f"System test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await db_manager.close()

if __name__ == "__main__":
    asyncio.run(test_complete_system())