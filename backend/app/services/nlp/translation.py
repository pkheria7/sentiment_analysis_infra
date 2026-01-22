from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
load_dotenv()
import time
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize the client with your API Key
# You can also set this as an environment variable: export GOOGLE_API_KEY='your-key'
client = genai.Client(api_key=GEMINI_API_KEY)

def translate_text(text: str, target_language: str) -> str:
    """
    Translates text to a target language using Gemini 2.5 Flash.
    Returns only the translated string.
    """
    model_id = "gemini-2.5-flash"
    
    # System instructions ensure the output is clean (no "Here is your translation:")
    system_instr = (
        f"You are a professional translator. Translate the provided text into {target_language}. "
        "Return ONLY the translated text. Do not include explanations, quotes, or formatting."
    )

    response = client.models.generate_content(
        model=model_id,
        config=types.GenerateContentConfig(
            system_instruction=system_instr,
            temperature=0.1,  # Lower temperature for more accurate/consistent translation
        ),
        contents=text
    )
    time.sleep(0.5)  # To avoid hitting rate limits
    return response.text.strip()

# Example Usage:
# result = translate_text("Hello, how are you today?", "French")
# print(result)  # Output: Bonjour, comment allez-vous aujourd'hui ?