from fastapi import APIRouter
from app.models.schemas import QueryRequest
from app.workflows.enhanced_frag import process_enhanced_query

router = APIRouter()

@router.get("/quantum/coherence")
async def get_quantum_coherence():
    """Get quantum coherence metrics"""
    from app.services.quantum_retrieval import QuantumRetrieval
    quantum = QuantumRetrieval()
    return {"coherence_threshold": quantum.coherence_threshold}

@router.get("/swarm/statistics")
async def get_swarm_statistics():
    """Get swarm intelligence statistics"""
    from app.services.swarm_retrieval import swarm_retrieval
    return swarm_retrieval.get_swarm_statistics()

@router.get("/holographic/efficiency")
async def get_holographic_efficiency():
    """Get holographic storage efficiency"""
    from app.services.holographic_storage import holographic_storage
    return holographic_storage.get_storage_efficiency()

@router.get("/causal/timeline/{query}")
async def get_causal_timeline(query: str):
    """Get causal timeline for query"""
    from app.services.temporal_causality import causality_engine
    return await causality_engine.generate_causal_timeline(query)

@router.get("/neuromorphic/memory")
async def get_neuromorphic_memory():
    """Get neuromorphic memory state"""
    from app.services.neuromorphic_memory import neuromorphic_memory
    return {
        "synaptic_weights": len(neuromorphic_memory.synaptic_weights),
        "associations": len(neuromorphic_memory.association_matrix),
        "decay_rate": neuromorphic_memory.decay_rate
    }

@router.post("/metamorphic/test")
async def run_metamorphic_test(request: QueryRequest):
    """Run metamorphic tests on query"""
    from app.services.metamorphic_testing import metamorphic_tester
    
    async def query_func(q: str):
        return await process_enhanced_query(q)
    
    results = await metamorphic_tester.run_metamorphic_tests(request.query, query_func)
    return results

@router.get("/metamorphic/report")
async def get_metamorphic_report():
    """Get metamorphic testing report"""
    from app.services.metamorphic_testing import metamorphic_tester
    return metamorphic_tester.generate_test_report()
