import requests
from datetime import datetime

HEADERS = {
    "User-Agent": "infra-sentiment-analysis/1.0"
}

def ingest_reddit_post(post_url):
    if not post_url.endswith(".json"):
        post_url = post_url.rstrip("/") + ".json"

    response = requests.get(post_url, headers=HEADERS, timeout=10)
    response.raise_for_status()

    json_data = response.json()
    rows = []
    seen = set()

    def is_valid_comment(data):
        body = data.get("body", "").lower()
        author = data.get("author")

        if not body:
            return False
        if author == "AutoModerator":
            return False
        if "i am a bot" in body:
            return False
        if data.get("distinguished"):
            return False
        if data.get("stickied"):
            return False

        return True

    def extract(node):
        if node.get("kind") != "t1":
            return

        data = node.get("data", {})

        if is_valid_comment(data):
            text = data["body"].strip()

            if text not in seen:
                rows.append({
                    "source": "reddit",
                    "source_ref": post_url.replace(".json", ""),
                    "original_text": text,

                    # LLM fields (filled later)
                    "original_language": None,
                    "translated_text": None,
                    "aspect": None,
                    "sentiment": None,

                    "is_processed": False,
                    "processed_at": None,

                    # Context
                    "timestamp": str(data.get("created_utc")),
                    "location_name": None,

                    "raw_metadata": {
                        "author": data.get("author"),
                        "score": data.get("score"),
                        "subreddit": data.get("subreddit"),
                        "comment_id": data.get("id"),
                        "parent_id": data.get("parent_id"),
                        "depth": data.get("depth"),
                        "permalink": data.get("permalink")
                    },

                    "created_at": datetime.utcnow()
                })
                seen.add(text)

        replies = data.get("replies")
        if isinstance(replies, dict):
            for child in replies["data"]["children"]:
                extract(child)

    # Entry point — exactly your screenshot structure
    for child in json_data[1]["data"]["children"]:
        extract(child)

    return rows
