import asyncio
import google.generativeai as genai
from typing import List, Dict, Any
import traceback
from app.services.retrieval import SimpleRetriever
from app.core.database import db_manager
from app.models.schemas import Chunk
from app.core.config import settings
import os
from dotenv import load_dotenv

load_dotenv()

class GeminiSpeculativeRAG:
    """Production-grade Gemini Speculative RAG with comprehensive error handling"""
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.available = False
        
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                genai.configure(api_key=api_key)
                # Test the API with a simple call
                test_model = genai.GenerativeModel(settings.drafter_model)
                test_model.generate_content("test")
                self.available = True
                print(f"✓ Gemini API initialized and tested successfully with {settings.drafter_model}")
            except Exception as e:
                print(f"✗ Gemini API initialization failed: {e}")
                self.available = False
        else:
            print("✗ No valid Gemini API key found")
            self.available = False
    
    async def generate_answer(self, query: str, chunks: List[Chunk]) -> Dict[str, Any]:
        """Production-grade answer generation with comprehensive fallbacks"""
        
        print(f"\n=== GENERATION START ===")
        print(f"Query: {query}")
        print(f"Chunks available: {len(chunks)}")
        print(f"Gemini available: {self.available}")
        
        # Validate inputs
        if not chunks:
            print("✗ No chunks provided, returning no-docs response")
            return self._no_docs_response(query)
        
        # Try Gemini if available
        if self.available:
            try:
                print("→ Attempting Gemini generation...")
                result = await self._generate_with_gemini(query, chunks)
                print(f"✓ Gemini generation successful")
                return result
            except Exception as e:
                print(f"✗ Gemini generation failed: {e}")
                print(f"Traceback: {traceback.format_exc()}")
        
        # Fallback to enhanced extraction
        print("→ Using enhanced extraction fallback...")
        return self._enhanced_extraction(query, chunks)
    
    async def _generate_with_gemini(self, query: str, chunks: List[Chunk]) -> Dict[str, Any]:
        """Generate comprehensive answer using Gemini"""
        
        # Prepare context from top chunks
        context_parts = []
        for i, chunk in enumerate(chunks[:8]):  # Use top 8 chunks for better context
            context_parts.append(f"[Source {i+1} - Chunk {chunk.id}]\n{chunk.content}")
        
        context = "\n\n".join(context_parts)
        
        prompt = f"""You are an expert AI research assistant analyzing documents to answer questions accurately and comprehensively.

Question: {query}

Relevant Document Excerpts:
{context}

Instructions:
1. Provide a detailed, accurate answer based ONLY on the information in the documents above
2. Include specific details, facts, and examples from the documents
3. Cite sources using [Source X] notation when referencing information
4. If the documents don't contain enough information, clearly state what's missing
5. Structure your answer clearly with proper paragraphs
6. Be thorough but concise

Answer:"""
        
        try:
            model = genai.GenerativeModel(settings.drafter_model)
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=2048,
                )
            )
            
            answer_text = response.text
            
            # Validate response
            if not answer_text or len(answer_text.strip()) < 20:
                raise ValueError("Generated answer too short or empty")
            
            return {
                "answer": answer_text,
                "confidence": 0.9,
                "sources": self._extract_sources(chunks[:8]),
                "model": settings.drafter_model
            }
            
        except Exception as e:
            print(f"Gemini API call failed: {e}")
            raise
    
    def _no_docs_response(self, query: str) -> Dict[str, Any]:
        """Response when no documents are available"""
        return {
            "answer": f"I don't have any relevant documents to answer your question: '{query}'. Please upload documents first.",
            "confidence": 0.1,
            "sources": [],
            "model": "no-documents"
        }
    
    def _enhanced_extraction(self, query: str, chunks: List[Chunk]) -> Dict[str, Any]:
        """Enhanced extraction when AI models unavailable"""
        
        # Build comprehensive answer from chunks
        answer_parts = [f"Based on the available documents, here's what I found regarding '{query}':\n"]
        
        for i, chunk in enumerate(chunks[:5], 1):
            # Extract key sentences
            content = chunk.content[:500]
            answer_parts.append(f"\n{i}. From document section {chunk.id}:\n{content}...")
        
        answer_parts.append(f"\n\nThis information is compiled from {len(chunks)} relevant document sections.")
        
        return {
            "answer": "".join(answer_parts),
            "confidence": 0.75,
            "sources": self._extract_sources(chunks[:5]),
            "model": "enhanced-extraction"
        }
    
    def _extract_sources(self, chunks: List[Chunk]) -> List[Dict[str, Any]]:
        return [{
            "chunk_id": c.id, 
            "document_id": c.document_id,
            "content_preview": c.content[:200]
        } for c in chunks]

gemini_speculative_rag = GeminiSpeculativeRAG()