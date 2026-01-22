from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.content import Content
from app.services.analytics.sentiment_agreement import llm_vs_model_sentiment
from app.services.analytics.translation_consistency import translation_consistency_check

router = APIRouter(prefix="/api/checking_metric", tags=["Metric Checking"])

@router.get("/sentiment/llm-vs-model")
def sentiment_llm_vs_model(
    limit: int | None = Query(None, description="Optional limit on records"),
    db: Session = Depends(get_db)
):
    """
    Compares LLM sentiment vs ML model sentiment on translated English text.
    """
    return llm_vs_model_sentiment(db=db, limit=limit)


@router.get("/translation-consistency")
def translation_consistency(db: Session = Depends(get_db)):
    return translation_consistency_check(db)