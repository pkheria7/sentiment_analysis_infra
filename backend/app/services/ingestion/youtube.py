from sqlalchemy.orm import Session
from app.models.content import Content
from app.services.scraping.youtube import scrape_youtube_comments


def ingest_youtube_video(
    db: Session,
    video_url: str,
    location_name: str | None = None,
    max_comments: int = 50
) -> int:
    comments = scrape_youtube_comments(video_url, max_comments)

    inserted = 0

    for c in comments:
        record = Content(
            source="youtube",
            source_ref=video_url,
            original_text=c["original_text"],
            original_language=None,  # detected later
            timestamp=c["timestamp"],
            location_name=location_name,
            raw_metadata=c["raw_metadata"]
        )

        db.add(record)
        inserted += 1

    db.commit()
    return inserted
