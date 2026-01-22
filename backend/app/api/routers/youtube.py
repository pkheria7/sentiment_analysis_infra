from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.ingestion.youtube import ingest_youtube_video
from pydantic import BaseModel, HttpUrl
from app.services.processing.youtube_summary import get_youtube_summary

router = APIRouter(prefix="/api/ingest/youtube", tags=["YouTube Ingestion"])


class YouTubeIngestRequest(BaseModel):
    video_url: HttpUrl
    location_name: str | None = None
    max_comments: int = 50


@router.post("")
def ingest_youtube(
    payload: YouTubeIngestRequest,
    db: Session = Depends(get_db)
):
    try:
        count = ingest_youtube_video(
            db=db,
            video_url=str(payload.video_url),
            location_name=payload.location_name,
            max_comments=payload.max_comments
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "success",
        "source": "youtube",
        "video_url": payload.video_url,
        "comments_ingested": count
    }





# router = APIRouter(prefix="/youtube", tags=["YouTube"])


# class YouTubeSummaryRequest(BaseModel):
#     video_url: str


# @router.post("/summary")
# def youtube_video_summary(payload: YouTubeSummaryRequest):
#     try:
#         return get_youtube_summary(payload.video_url)
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))
