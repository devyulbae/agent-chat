from pydantic import BaseModel
from typing import Literal

RetrievalMode = Literal['structured', 'bm25', 'hybrid_rag']


class RetrievalConfig(BaseModel):
    mode: RetrievalMode = 'structured'
    bm25_enabled: bool = True
    vector_enabled: bool = False
    reranker_enabled: bool = False
    notes: str = ''


class RetrievalEvalReport(BaseModel):
    strategy_a: RetrievalMode
    strategy_b: RetrievalMode
    quality_score_a: float
    quality_score_b: float
    avg_latency_ms_a: int
    avg_latency_ms_b: int
    avg_tokens_a: int
    avg_tokens_b: int
    recommended: RetrievalMode
