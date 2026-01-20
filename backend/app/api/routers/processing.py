from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.processing.llm_pipeline import process_unprocessed_content 
from app.services.processing.llm_summarisation import summary_content

router = APIRouter(prefix="/api/process", tags=["LLM Processing"])


@router.post("")
def run_llm_processing(
    db: Session = Depends(get_db),
):
    status = process_unprocessed_content(db)
    return {
        "status": status
    }

@router.get("/summary")
def get_processing_summary(
    db: Session = Depends(get_db),
    source: str | None = None,
):
    summary = summary_content(db, source)
    return {
        "summary": summary
    }
    