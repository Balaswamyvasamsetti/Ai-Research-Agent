from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/agentic_rag"
    neo4j_url: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    neo4j_database: str = "neo4j"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3:7b"
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    vllm_url: str = "http://localhost:8000"
    searxng_url: str = "http://localhost:8082"
    drafter_model: str = "gemini-3-flash-preview"
    verifier_model: str = "gemini-2.5-flash-preview-09-2025"
    fallback_model: str = "gemini-3-flash-preview"
    enable_adaptive_models: bool = True
    complex_query_threshold: float = 0.7
    use_speculative_rag: bool = True
    use_gemini_primary: bool = True
    max_chunk_size: int = 1000
    min_chunk_size: int = 200
    max_results: int = 10
    
    class Config:
        env_file = ".env"

settings = Settings()
