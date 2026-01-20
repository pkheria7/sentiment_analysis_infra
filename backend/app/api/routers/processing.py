from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.processing.llm_pipeline import process_unprocessed_content

router = APIRouter(prefix="/api/process", tags=["LLM Processing"])


@router.post("")
def run_llm_processing(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    process_unprocessed_content(db, limit)
    return {
        "status": "completed",
        "processed_records": limit
    }
