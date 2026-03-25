from src.gemini import get_gemini_response
import json
import re
import urllib.parse

# ── Vehicle state helpers ─────────────────────────────────────────────────────

def extract_vehicle_from_history(messages: list) -> dict:
    """Scan previous bot messages for JSON containing vehicle info."""
    vehicle_brand = None
    vehicle_model = None
    vehicle_year  = None

    for msg in messages:
        if msg.get("role") != "bot":
            continue
        content = msg.get("content", "")
        try:
            start = content.find("{")
            end   = content.rfind("}") + 1
            if start != -1 and end > start:
                data = json.loads(content[start:end], strict=False)
                if data.get("vehicle_brand") and not vehicle_brand:
                    vehicle_brand = data["vehicle_brand"]
                if data.get("vehicle_model") and not vehicle_model:
                    vehicle_model = data["vehicle_model"]
                if data.get("vehicle_year") and not vehicle_year:
                    vehicle_year = str(data["vehicle_year"])
        except Exception:
            pass

    return {"vehicle_brand": vehicle_brand, "vehicle_model": vehicle_model, "vehicle_year": vehicle_year}


def extract_from_user_messages(messages: list) -> dict:
    """Extract brand/year directly from user messages as last resort."""
    brands = ["toyota", "honda", "bmw", "ford", "nissan", "hyundai", "kia", "mazda",
              "volkswagen", "vw", "audi", "mercedes", "chevrolet", "chevy",
              "suzuki", "mitsubishi", "subaru", "lexus", "jeep", "tesla", "volvo"]
    brand = None
    year  = None

    for msg in messages:
        if msg.get("role") != "user":
            continue
        text = msg.get("content", "").lower()
        if not brand:
            for b in brands:
                if b in text:
                    brand = b.upper() if b in ["bmw", "vw"] else b.capitalize()
                    break
        if not year:
            match = re.search(r'\b(19|20)\d{2}\b', text)
            if match:
                year = match.group()

    return {"vehicle_brand": brand, "vehicle_year": year}


# ── Link builders ─────────────────────────────────────────────────────────────

def build_resource_links(parts_needed: list, youtube_searches: list,
                         vehicle_brand: str, vehicle_model: str, vehicle_year: str) -> list:
    """Convert AI-suggested parts and YouTube queries into clickable link objects."""
    links = []

    for query in youtube_searches[:3]:
        if query and isinstance(query, str) and query.strip():
            encoded = urllib.parse.quote(query.strip())
            links.append({
                "label": query.strip(),
                "url":   f"https://www.youtube.com/results?search_query={encoded}",
                "type":  "youtube"
            })

    vehicle = f"{vehicle_year or ''} {vehicle_brand or ''} {vehicle_model or ''}".strip()
    for part in parts_needed[:3]:
        if part and isinstance(part, str) and part.strip():
            encoded = urllib.parse.quote(f"{vehicle} {part.strip()}")
            links.append({
                "label": part.strip(),
                "url":   f"https://www.ebay.com/sch/i.html?_nkw={encoded}&_sacat=6030",
                "type":  "parts"
            })

    return links


# ── JSON parser ───────────────────────────────────────────────────────────────

def parse_groq_json(raw: str) -> dict:
    """
    Parse Groq's JSON response robustly.

    THE ROOT CAUSE: Groq puts literal newline characters (\\n) inside JSON
    string values. Standard json.loads() rejects these with
    'Invalid control character'. The fix is json.loads(strict=False)
    which accepts raw control characters inside strings.

    Also handles: markdown fences, extra text before/after JSON,
    nested JSON inside reply field.
    """
    cleaned = raw.strip()

    # 1. Strip markdown code fences if present
    if "```" in cleaned:
        parts = cleaned.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                cleaned = part
                break

    # 2. Extract outermost JSON object
    start = cleaned.find("{")
    end   = cleaned.rfind("}") + 1
    if start != -1 and end > start:
        cleaned = cleaned[start:end]

    # 3. Parse with strict=False — THIS is the fix for Groq's literal newlines
    try:
        return json.loads(cleaned, strict=False)
    except json.JSONDecodeError as e:
        print(f"⚠️  strict=False parse failed: {e}")

    # 4. Fallback: try replacing literal control chars then parse again
    try:
        sanitised = cleaned.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
        return json.loads(sanitised)
    except json.JSONDecodeError as e:
        print(f"⚠️  Sanitised parse failed: {e}")

    # 5. Last resort: extract just the reply text with regex
    reply_match = re.search(r'"reply"\s*:\s*"(.*?)(?:"\s*,\s*"vehicle_brand")', cleaned, re.DOTALL)
    if reply_match:
        print("⚠️  Using regex fallback to extract reply")
        return {
            "reply":           reply_match.group(1).replace('\\"', '"'),
            "parts_needed":    [],
            "youtube_searches": [],
        }

    return None  # Caller handles total failure


# ── Prompt builders ───────────────────────────────────────────────────────────

def build_vision_prompt(chat_state: dict) -> str:
    has_brand = chat_state.get("vehicle_brand")
    has_model = chat_state.get("vehicle_model")
    has_year  = chat_state.get("vehicle_year")
    vehicle   = f"{has_year or ''} {has_brand or 'Unknown'} {has_model or ''}".strip()

    return f"""You are an expert vehicle diagnostic assistant.
Vehicle: {vehicle}

The user uploaded an image of their vehicle dashboard or warning light.

Analyze the image and provide a diagnosis covering: warning lights identification, meaning, likely cause, recommended action, urgency (Low/Medium/High), cost estimate.

Also provide:
- parts_needed: array of exact part name strings that need replacing. Empty array [] if none.
- youtube_searches: array of specific YouTube search query strings for repair videos. Empty array [] if none.

vehicle_year must be the STRING "{has_year or 'null'}".

Respond ONLY with valid JSON (no markdown fences):
{{"reply": "your full diagnosis as plain text", "vehicle_brand": "{has_brand or 'null'}", "vehicle_model": "{has_model or 'null'}", "vehicle_year": "{has_year or 'null'}", "parts_needed": [], "youtube_searches": []}}"""


def build_system_prompt(chat_state: dict, user_message: str) -> str:
    has_brand = chat_state.get("vehicle_brand")
    has_model = chat_state.get("vehicle_model")
    has_year  = chat_state.get("vehicle_year")

    # Stage 1 — No vehicle info yet
    if not has_brand:
        return f"""You are a vehicle diagnostic assistant.

The user said: "{user_message}"

If they mentioned a vehicle brand (Toyota, Honda, BMW, Ford, Nissan, Hyundai, Kia, Mazda, Suzuki, Mitsubishi, etc), extract it and ask for the model.
If no brand mentioned, ask: What is the brand of your vehicle?

Keep your reply short and friendly.

Respond ONLY with valid JSON (no markdown fences):
{{"reply": "your message", "vehicle_brand": "brand or null", "vehicle_model": null, "vehicle_year": null, "parts_needed": [], "youtube_searches": []}}"""

    # Stage 2 — Have brand, need model
    if not has_model:
        return f"""You are a vehicle diagnostic assistant.
Vehicle brand: {has_brand}

The user said: "{user_message}"

Extract the vehicle model (e.g. Corolla, Civic, 3 Series, Hilux).
If found, confirm and ask for manufacturing year.
If not found, ask: What is the model of your {has_brand}?

Keep your reply short and friendly.

Respond ONLY with valid JSON (no markdown fences):
{{"reply": "your message", "vehicle_brand": "{has_brand}", "vehicle_model": "model or null", "vehicle_year": null, "parts_needed": [], "youtube_searches": []}}"""

    # Stage 3 — Have brand + model, need year
    if not has_year:
        return f"""You are a vehicle diagnostic assistant.
Vehicle: {has_brand} {has_model}

The user said: "{user_message}"

Extract the manufacturing year (4-digit number like 2007 or 2019).
If found, confirm and ask what problem they are experiencing.
If not found, ask: What year was your {has_brand} {has_model} manufactured?

vehicle_year must be a STRING like "2019" not a number.

Respond ONLY with valid JSON (no markdown fences):
{{"reply": "your message", "vehicle_brand": "{has_brand}", "vehicle_model": "{has_model}", "vehicle_year": "year or null", "parts_needed": [], "youtube_searches": []}}"""

    # Stage 4 — Full vehicle info, diagnose
    return f"""You are an expert vehicle diagnostic assistant specialising in {has_year} {has_brand} {has_model}.

The user said: "{user_message}"

If they describe a problem, provide a thorough diagnosis with these 7 sections:
1. **Most Likely Root Cause** - the single most probable component.
2. **Other Possible Causes** - 2-3 secondary causes in order of likelihood.
3. **OBD2 Fault Codes** - likely codes (e.g. P0011). Recommend scanning first.
4. **Recommended Fix** - step by step, cheapest first.
5. **Cost Estimate** - parts + labour in USD.
6. **Urgency** - Low / Medium / High and why.
7. **Mechanic Needed** - yes or no and why.

For follow-up questions, answer helpfully in context.
If the issue is resolved, thank the user warmly.
Be specific to the {has_year} {has_brand} {has_model}.

IMPORTANT:
- parts_needed: list up to 3 exact part names that need replacing. Use [] if no parts needed.
- youtube_searches: list up to 3 specific YouTube search queries. Use [] if not applicable.
- vehicle_year must be the STRING "{has_year}".

Respond ONLY with valid JSON (no markdown fences):
{{"reply": "your full diagnosis as plain text", "vehicle_brand": "{has_brand}", "vehicle_model": "{has_model}", "vehicle_year": "{has_year}", "parts_needed": ["part1", "part2"], "youtube_searches": ["search query 1", "search query 2"]}}"""


# ── Main process function ─────────────────────────────────────────────────────

def process_message(
    chat_id: int,
    user_message: str,
    vehicle_brand: str,
    vehicle_model: str,
    vehicle_year: str,
    messages: list,
    image_base64: str = None,
    image_media_type: str = "image/jpeg",
) -> dict:

    chat_state = {
        "vehicle_brand": vehicle_brand,
        "vehicle_model": vehicle_model,
        "vehicle_year":  str(vehicle_year) if vehicle_year else None,
    }

    # Fallback 1: scan previous bot messages
    if not all([chat_state["vehicle_brand"], chat_state["vehicle_model"], chat_state["vehicle_year"]]):
        from_history = extract_vehicle_from_history(messages)
        chat_state["vehicle_brand"] = chat_state["vehicle_brand"] or from_history["vehicle_brand"]
        chat_state["vehicle_model"] = chat_state["vehicle_model"] or from_history["vehicle_model"]
        chat_state["vehicle_year"]  = chat_state["vehicle_year"]  or from_history["vehicle_year"]

    # Fallback 2: extract from raw user messages
    if not chat_state["vehicle_brand"] or not chat_state["vehicle_year"]:
        from_users = extract_from_user_messages(messages)
        chat_state["vehicle_brand"] = chat_state["vehicle_brand"] or from_users["vehicle_brand"]
        chat_state["vehicle_year"]  = chat_state["vehicle_year"]  or from_users["vehicle_year"]

    print(f"\n🔄 Processing message for Chat [{chat_id}]")
    print(f"   State   : brand={chat_state['vehicle_brand']}, model={chat_state['vehicle_model']}, year={chat_state['vehicle_year']}")
    print(f"   Message : {user_message[:80]}")
    print(f"   Image   : {'yes' if image_base64 else 'no'}")

    # Build conversation history for Groq
    groq_history = []
    for msg in messages[:-1]:
        role = "user" if msg["role"] == "user" else "model"
        groq_history.append({
            "role":  role,
            "parts": [{"text": msg["content"]}]
        })

    # Build prompt
    if image_base64:
        system_prompt = build_vision_prompt(chat_state)
    else:
        system_prompt = build_system_prompt(chat_state, user_message)

    # Call AI
    raw_response = get_gemini_response(
        system_prompt,
        groq_history,
        image_base64=image_base64,
        image_media_type=image_media_type,
    )

    print(f"📥 Raw response (first 120): {raw_response[:120]}")

    # ── Parse response ────────────────────────────────────────────────────────
    result = parse_groq_json(raw_response)

    # Total parse failure — Groq returned plain text, use it directly as reply
    if result is None:
        print("❌ Complete parse failure — using raw response as reply text")
        reply_text = raw_response.strip()
        # Strip any leftover markdown fences just in case
        if reply_text.startswith("```"):
            reply_text = re.sub(r"^```[a-z]*\n?", "", reply_text).rstrip("```").strip()
        return {
            "reply":          reply_text or "I couldn't process that. Could you please try again?",
            "vehicle_brand":  chat_state["vehicle_brand"],
            "vehicle_model":  chat_state["vehicle_model"],
            "vehicle_year":   str(chat_state["vehicle_year"]) if chat_state["vehicle_year"] else None,
            "resource_links": [],
        }

    # ── Resolve final vehicle state ───────────────────────────────────────────
    final_brand = result.get("vehicle_brand") or chat_state["vehicle_brand"]
    final_model = result.get("vehicle_model") or chat_state["vehicle_model"]
    final_year  = result.get("vehicle_year")  or chat_state["vehicle_year"]

    if final_year is not None:
        final_year = str(final_year)

    # ── Get reply text ────────────────────────────────────────────────────────
    reply_text = result.get("reply", "")

    # Guard: if reply itself is a JSON string (nested), unwrap it
    if isinstance(reply_text, str) and reply_text.strip().startswith("{"):
        try:
            inner = json.loads(reply_text, strict=False)
            if "reply" in inner:
                reply_text = inner["reply"]
                # Also grab parts/yt from inner if not in outer
                if not result.get("parts_needed"):
                    result["parts_needed"] = inner.get("parts_needed", [])
                if not result.get("youtube_searches"):
                    result["youtube_searches"] = inner.get("youtube_searches", [])
        except Exception:
            pass

    if not reply_text or not isinstance(reply_text, str) or not reply_text.strip():
        # Last resort: maybe Groq put the answer directly in the raw response
        # outside the JSON (happens occasionally with the vision model)
        stripped = raw_response.strip()
        if stripped and not stripped.startswith("{"):
            reply_text = stripped
        else:
            reply_text = "I couldn't process that. Could you please try again?"

    # ── Build resource links ──────────────────────────────────────────────────
    parts_needed     = result.get("parts_needed", [])
    youtube_searches = result.get("youtube_searches", [])

    if not isinstance(parts_needed, list):     parts_needed     = []
    if not isinstance(youtube_searches, list): youtube_searches = []

    resource_links = build_resource_links(
        parts_needed, youtube_searches,
        final_brand, final_model, final_year
    )

    print(f"✅ Reply (first 80): {reply_text[:80]}")
    print(f"   brand={final_brand}, model={final_model}, year={final_year}")
    print(f"   parts={parts_needed}")
    print(f"   yt_searches={youtube_searches}")
    print(f"   links built={len(resource_links)}")

    return {
        "reply":          reply_text,
        "vehicle_brand":  final_brand,
        "vehicle_model":  final_model,
        "vehicle_year":   final_year,
        "resource_links": resource_links,
    }