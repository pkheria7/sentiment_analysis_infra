from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.ingestion.reddit import ingest_reddit_to_db

router = APIRouter()

@router.post("/api/ingest/reddit", tags=["Reddit Ingestion"])
def ingest_reddit(
    post_url: str = Query(..., description="Full Reddit post URL"),
    location_name: str = Query(None, description="Optional location name associated with the post"),
    db: Session = Depends(get_db)
):
    """
    Ingest comments from a Reddit post and store them in the database
    """

    if not post_url.startswith("https://www.reddit.com"):
        raise HTTPException(
            status_code=400,
            detail="Invalid Reddit post URL"
        )

    try:
        result = ingest_reddit_to_db(db, post_url)
        return {
            "status": "success",
            "source": "reddit",
            "result": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Reddit ingestion failed: {str(e)}"
        )
