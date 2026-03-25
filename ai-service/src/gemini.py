from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL_TEXT   = "llama-3.3-70b-versatile"       # text conversations
MODEL_VISION = "llama-3.2-11b-vision-preview"  # image analysis


def get_gemini_response(
    system_prompt: str,
    conversation_history: list,
    image_base64: str = None,
    image_media_type: str = "image/jpeg"
) -> str:
    """
    Main AI call — automatically switches to vision model when an image is provided.

    conversation_history arrives in Gemini-style parts format:
        [{"role": "user"|"model", "parts": [{"text": "..."}]}, ...]

    We convert it to Groq's format:
        [{"role": "user"|"assistant", "content": "..."}, ...]

    The system_prompt is sent as a system message (Groq supports this natively),
    which is cleaner than appending it as the last user message.
    """
    try:
        messages = []

        # ── System message (Groq supports role="system") ────────────────────
        # Only add for text model — vision model gets the prompt embedded in
        # the image message content instead.
        if not image_base64:
            messages.append({
                "role":    "system",
                "content": system_prompt,
            })

        # ── Convert conversation history (Gemini parts → Groq content) ──────
        for msg in conversation_history:
            role  = msg.get("role", "user")
            parts = msg.get("parts", [])
            # Support both formats: parts=[{"text":"..."}] and content="..."
            if parts:
                text = parts[0].get("text", "") if isinstance(parts[0], dict) else str(parts[0])
            else:
                text = msg.get("content", "")

            if not text or not text.strip():
                continue

            groq_role = "assistant" if role == "model" else "user"
            messages.append({"role": groq_role, "content": text})

        # ── Build final user turn ────────────────────────────────────────────
        if image_base64:
            # Vision model — strip data URL prefix if present
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]

            print(f"📷 Image detected — switching to vision model ({MODEL_VISION})")

            # For vision, embed system prompt as text alongside the image
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
            # Text only — the system message already carries the prompt.
            # We DON'T append another user message here because the system
            # prompt already contains the user's latest message embedded in it.
            # The history above has all prior turns; Groq will respond to the
            # system instruction directly.
            model = MODEL_TEXT

        print(f"📤 Sending {len(messages)} message(s) to Groq ({model})...")
        print(f"   Roles: {[m['role'] for m in messages]}")

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