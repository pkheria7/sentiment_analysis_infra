from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl
from app.core.database import get_db
from app.models.content import Content

router = APIRouter(prefix="/api/manage", tags=["Database Management"])


class DeleteUnprocessedRequest(BaseModel):
    url: HttpUrl


@router.delete("/delete-unprocessed")
def delete_unprocessed(
    payload: DeleteUnprocessedRequest, db: Session = Depends(get_db)
):
    """
    Delete all unprocessed rows from the database for a given URL.

    Args:
        url: The source URL to delete unprocessed records for

    Returns:
        Dictionary with deletion status and count of deleted rows
    """
    try:
        # Count unprocessed rows for this source_ref
        source_ref = str(payload.url)

        unprocessed_count = (
            db.query(Content)
            .filter(Content.source_ref == source_ref, Content.is_processed == False)
            .count()
        )

        # Delete unprocessed rows
        deleted_count = (
            db.query(Content)
            .filter(Content.source_ref == source_ref, Content.is_processed == False)
            .delete()
        )

        db.commit()

        return {
            "status": "success",
            "message": f"Deleted {deleted_count} unprocessed records",
            "url": str(payload.url),
            "deleted_count": deleted_count,
            "remaining_count": db.query(Content)
            .filter(Content.source_ref == source_ref)
            .count(),
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete unprocessed records: {str(e)}"
        )
