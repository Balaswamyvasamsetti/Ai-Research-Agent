import asyncpg
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.pg_pool = None
        self.neo4j_driver = None
        self.embedding_model = SentenceTransformer(settings.embedding_model)
    
    async def init_postgres(self):
        try:
            self.pg_pool = await asyncpg.create_pool(settings.database_url)
            # Create required tables with all columns
            async with self.pg_pool.acquire() as conn:
                # Create vector extension first
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
                
                # Create documents table with all required columns
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS documents (
                        id SERIAL PRIMARY KEY,
                        filename VARCHAR(255) NOT NULL,
                        content TEXT,
                        metadata JSONB,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Create chunks table with all required columns
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS chunks (
                        id SERIAL PRIMARY KEY,
                        document_id INTEGER REFERENCES documents(id),
                        content TEXT NOT NULL,
                        embedding vector(384),
                        chunk_index INTEGER,
                        metadata JSONB,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Create holographic storage table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS holographic_storage (
                        doc_id INTEGER PRIMARY KEY REFERENCES documents(id),
                        interference_pattern BYTEA,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Create feedback table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS feedback (
                        id SERIAL PRIMARY KEY,
                        message_id BIGINT UNIQUE,
                        feedback_type VARCHAR(20) NOT NULL,
                        comment TEXT,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Ensure all columns exist (for existing tables)
                await conn.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB")
                await conn.execute("ALTER TABLE chunks ADD COLUMN IF NOT EXISTS metadata JSONB")
                await conn.execute("ALTER TABLE chunks ADD COLUMN IF NOT EXISTS chunk_index INTEGER")
                
            logger.info("PostgreSQL connection established and tables created")
        except Exception as e:
            logger.error(f"PostgreSQL connection failed: {e}")
            raise
    
    def init_neo4j(self):
        try:
            # Temporarily disabled due to connection issues
            self.neo4j_driver = None
            logger.info("Neo4j temporarily disabled")
            # self.neo4j_driver = GraphDatabase.driver(
            #     settings.neo4j_url,
            #     auth=(settings.neo4j_user, settings.neo4j_password)
            # )
            # # Test connection and create constraints
            # with self.neo4j_driver.session() as session:
            #     session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE")
            #     session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Chunk) REQUIRE c.id IS UNIQUE")
            # logger.info("Neo4j connection established and constraints created")
        except Exception as e:
            logger.error(f"Neo4j connection failed: {e}")
            self.neo4j_driver = None
    
    async def close(self):
        if self.pg_pool:
            await self.pg_pool.close()
        if self.neo4j_driver:
            self.neo4j_driver.close()

db_manager = DatabaseManager()