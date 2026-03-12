from groq import Groq
import os
import base64
import httpx
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL_TEXT   = "llama-3.3-70b-versatile"       # text conversations
MODEL_VISION = "llama-3.2-11b-vision-preview"  # image analysis


def get_gemini_response(system_prompt: str, conversation_history: list, image_base64: str = None, image_media_type: str = "image/jpeg") -> str:
    """
    Main AI call — automatically switches to vision model when an image is provided.
    Keeps the same function name so conversation.py needs no changes.
    """
    try:
        messages = []

        # ── Build conversation history ──────────────────────────────────────
        for msg in conversation_history:
            role  = msg.get("role", "user")
            parts = msg.get("parts", [])
            text  = parts[0].get("text", "") if parts else ""
            if not text:
                continue
            groq_role = "assistant" if role == "model" else "user"
            messages.append({"role": groq_role, "content": text})

        # ── Build final user message (with or without image) ────────────────
        if image_base64:
            # Vision model — send image + prompt together
            print(f"📷 Image detected — switching to vision model ({MODEL_VISION})")

            # Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]

            messages.append({
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{image_media_type};base64,{image_base64}"
                        },
                    },
                    {
                        "type": "text",
                        "text": system_prompt,
                    },
                ],
            })

            model = MODEL_VISION

        else:
            # Text only
            messages.append({"role": "user", "content": system_prompt})
            model = MODEL_TEXT

        print(f"📤 Sending {len(messages)} turn(s) to Groq ({model})...")

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )

        reply = response.choices[0].message.content
        print(f"✅ Groq responded: {reply[:80]}...")
        return reply

    except Exception as e:
        print(f"❌ Groq error: {type(e).__name__}: {e}")
        raise