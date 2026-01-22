from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url: str) -> str:
    if "watch?v=" in url:
        return url.split("watch?v=")[1].split("&")[0]
    if "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]
    raise ValueError("Invalid YouTube URL")


def get_transcript(video_url: str) -> str:
    video_id = extract_video_id(video_url)

    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

    # Prefer manually created captions, fallback to auto-generated
    try:
        transcript = transcript_list.find_manually_created_transcript(["en"])
    except:
        transcript = transcript_list.find_generated_transcript(["en"])

    captions = transcript.fetch()

    full_text = " ".join([c["text"] for c in captions])
    return full_text


def summarize_text(text: str) -> str:
    """
    Replace with Gemini / OpenAI / LLM
    """
    prompt = f"""
    Summarize the following YouTube video transcript
    in 5–6 concise bullet points:

    {text}
    """

    # TEMP placeholder
    return text[:1200]


def get_youtube_summary(video_url: str) -> dict:
    transcript = get_transcript(video_url)
    summary = summarize_text(transcript)

    return {
        "video_url": video_url,
        "transcript_length": len(transcript.split()),
        "summary": summary
    }
