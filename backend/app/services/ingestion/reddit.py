from sqlalchemy.orm import Session
from datetime import datetime

from app.models.content import Content
from app.services.scraping.reddit import ingest_reddit_post


def ingest_reddit_to_db(
    db: Session,
    post_url: str,
    commit: bool = True
):
    """
    Fetch Reddit comments using scraper
    and insert into Content table
    """

    rows = ingest_reddit_post(post_url)

    if not rows:
        return {
            "inserted": 0,
            "message": "No valid comments found"
        }

    inserted = 0

    for row in rows:
        # Basic deduplication: same text + same source
        exists = (
            db.query(Content)
            .filter(
                Content.source == "reddit",
                Content.original_text == row["original_text"]
            )
            .first()
        )

        if exists:
            continue

        content = Content(
            source=row["source"],
            source_ref=row["source_ref"],
            original_text=row["original_text"],

            original_language=None,
            translated_text=None,
            aspect=None,
            sentiment=None,

            is_processed=False,
            processed_at=None,

            timestamp=row["timestamp"],
            location_name=None,

            raw_metadata=row["raw_metadata"],
            created_at=row["created_at"]
        )

        db.add(content)
        inserted += 1

    if commit:
        db.commit()

    return {
        "inserted": inserted,
        "total_scraped": len(rows),
        "source": "reddit",
        "source_ref": post_url
    }
