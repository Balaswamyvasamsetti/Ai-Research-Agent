import asyncio
import json
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi
from app.core.database import db_manager
from app.models.schemas import Chunk

class SimpleRetriever:
    """Fast vector search with BM25 hybrid retrieval"""
    
    async def retrieve(self, query: str, max_results: int = 10, document_ids: List[int] = None) -> List[Chunk]:
        # Use document_ids from parameter or stored attribute
        doc_filter = document_ids or getattr(self, 'document_ids', None)
        
        query_embedding = db_manager.embedding_model.encode(query)
        # Convert to PostgreSQL vector format
        query_vector = '[' + ','.join(map(str, query_embedding)) + ']'
        
        async with db_manager.pg_pool.acquire() as conn:
            # Build query with optional document filtering
            base_query = """
                SELECT c.id, c.content, c.document_id, c.chunk_index, c.metadata,
                       1 - (c.embedding <=> $1::vector) as similarity_score
                FROM chunks c
            """
            
            params = [query_vector]
            
            if doc_filter:
                base_query += " WHERE c.document_id = ANY($2)"
                params.append(doc_filter)
            
            base_query += " ORDER BY c.embedding <=> $1::vector LIMIT $" + str(len(params) + 1)
            params.append(max_results)
            
            results = await conn.fetch(base_query, *params)
            
            return [
                Chunk(
                    id=row['id'],
                    content=row['content'],
                    document_id=row['document_id'],
                    chunk_index=row['chunk_index'],
                    metadata=json.loads(row['metadata']) if row['metadata'] else {},
                    embedding=None,  # Don't load full embedding for performance
                    similarity_score=row['similarity_score']
                )
                for row in results
            ]

class ComplexRetriever:
    """Multi-hop graph traversal for complex queries"""
    
    async def retrieve(self, query: str, max_results: int = 10, document_ids: List[int] = None) -> List[Chunk]:
        # Use document_ids from parameter or stored attribute
        doc_filter = document_ids or getattr(self, 'document_ids', None)
        
        # First get initial candidates
        simple_retriever = SimpleRetriever()
        initial_chunks = await simple_retriever.retrieve(query, max_results * 2, doc_filter)
        
        # Then expand via graph traversal
        expanded_chunks = await self._graph_expansion(initial_chunks, query)
        
        return expanded_chunks[:max_results]
    
    async def _graph_expansion(self, chunks: List[Chunk], query: str) -> List[Chunk]:
        """Expand retrieval using Neo4j graph relationships"""
        chunk_ids = [chunk.id for chunk in chunks]
        
        # Skip Neo4j expansion if driver not available
        if not db_manager.neo4j_driver:
            return chunks
        
        with db_manager.neo4j_driver.session() as session:
            # Find related documents through entity relationships
            result = session.run("""
                MATCH (d1:Document)-[:CONTAINS]->(c1:Chunk)
                WHERE c1.id IN $chunk_ids
                MATCH (d1)-[:CITES|:AUTHORED_BY|:SIMILAR_TO]-(d2:Document)
                MATCH (d2)-[:CONTAINS]->(c2:Chunk)
                RETURN DISTINCT c2.id as chunk_id
                LIMIT 20
            """, chunk_ids=chunk_ids)
            
            related_chunk_ids = [record["chunk_id"] for record in result]
        
        # Fetch related chunks from PostgreSQL
        if related_chunk_ids:
            async with db_manager.pg_pool.acquire() as conn:
                results = await conn.fetch("""
                    SELECT id, content, document_id, chunk_index, metadata
                    FROM chunks
                    WHERE id = ANY($1)
                """, related_chunk_ids)
                
                related_chunks = [
                    Chunk(
                        id=row['id'],
                        content=row['content'],
                        document_id=row['document_id'],
                        chunk_index=row['chunk_index'],
                        metadata=json.loads(row['metadata']) if row['metadata'] else {},
                        embedding=None
                    )
                    for row in results
                ]
                
                return chunks + related_chunks
        
        return chunks
