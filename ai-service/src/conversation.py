from src.gemini import get_gemini_response
import json
import re

# ── Vehicle state helpers ────────────────────────────────────────────────────

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
                data = json.loads(content[start:end])
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


# ── Prompt builders ──────────────────────────────────────────────────────────

def build_vision_prompt(chat_state: dict) -> str:
    """Prompt used when user uploads an image of their dashboard / warning light."""
    has_brand = chat_state.get("vehicle_brand")
    has_model = chat_state.get("vehicle_model")
    has_year  = chat_state.get("vehicle_year")

    vehicle_info = f"{has_year or ''} {has_brand or 'Unknown'} {has_model or ''}".strip()

    return f"""You are an expert vehicle diagnostic assistant.
Vehicle: {vehicle_info}

The user has uploaded an image of their vehicle dashboard or a warning light.

Please analyze the image carefully and:
1. IDENTIFY all visible warning lights, error indicators, or dashboard symbols.
2. EXPLAIN what each warning light means in simple terms.
3. DIAGNOSE the likely cause for each warning light on a {vehicle_info}.
4. RECOMMEND immediate action — what should the driver do right now?
5. URGENCY — is this safe to drive? Rate: Low / Medium / High.
6. COST ESTIMATE — rough repair cost in USD if applicable.

If the image does not show a dashboard or warning lights, describe what you see and ask the user to clarify.

Be specific to the {vehicle_info} where possible — mention known issues for this vehicle.

IMPORTANT: vehicle_year must be a STRING like "{has_year or 'null'}".

Respond ONLY with valid JSON, no markdown:
{{"reply": "your detailed analysis", "vehicle_brand": "{has_brand or 'null'}", "vehicle_model": "{has_model or 'null'}", "vehicle_year": "{has_year or 'null'}"}}"""


def build_system_prompt(chat_state: dict, user_message: str) -> str:
    has_brand = chat_state.get("vehicle_brand")
    has_model = chat_state.get("vehicle_model")
    has_year  = chat_state.get("vehicle_year")

    # Stage 1 — No vehicle info yet
    if not has_brand:
        return f"""You are a vehicle diagnostic assistant helping users diagnose vehicle issues step by step.

The user said: "{user_message}"

Extract the vehicle brand if mentioned (Toyota, Honda, BMW, Ford, Nissan, etc).
- Found: confirm warmly and ask for the model.
- Not found: ask "What is the brand of your vehicle?"

Keep your reply short and friendly.

Respond ONLY with valid JSON, no markdown:
{{"reply": "your message", "vehicle_brand": "brand or null", "vehicle_model": null, "vehicle_year": null}}"""

    # Stage 2 — Have brand, need model
    if not has_model:
        return f"""You are a vehicle diagnostic assistant.
Brand confirmed: {has_brand}

The user said: "{user_message}"

Extract the vehicle model (Corolla, Civic, 3 Series, X5, Hilux, etc).
- Found: confirm and ask for manufacturing year.
- Not found: ask "What is the model of your {has_brand}?"

Keep your reply short and friendly.

Respond ONLY with valid JSON, no markdown:
{{"reply": "your message", "vehicle_brand": "{has_brand}", "vehicle_model": "model or null", "vehicle_year": null}}"""

    # Stage 3 — Have brand + model, need year
    if not has_year:
        return f"""You are a vehicle diagnostic assistant.
Vehicle: {has_brand} {has_model}

The user said: "{user_message}"

Extract the manufacturing year (4-digit number like 2007, 2018).
- Found: confirm and ask what issue they are experiencing with their {has_brand} {has_model}.
- Not found: ask "What year was your {has_brand} {has_model} manufactured?"

Keep your reply short and friendly.
IMPORTANT: vehicle_year must be a STRING like "2007", not a number.

Respond ONLY with valid JSON, no markdown:
{{"reply": "your message", "vehicle_brand": "{has_brand}", "vehicle_model": "{has_model}", "vehicle_year": "year as string or null"}}"""

    # Stage 4 — Full vehicle info, diagnose the issue
    return f"""You are an expert vehicle diagnostic assistant with deep knowledge of common issues for specific makes, models and years.
Vehicle: {has_year} {has_brand} {has_model}

The user said: "{user_message}"

If they are describing a problem, provide a thorough diagnosis structured like this:
1. **Most Likely Root Cause** — identify the single most probable cause that explains all symptoms together. Name the exact component (e.g. MAF sensor, VANOS solenoid, fuel pressure regulator).
2. **Other Possible Causes** — list 2-3 secondary causes in order of likelihood.
3. **OBD2 Fault Codes** — mention the specific OBD2 codes likely triggered (e.g. P0101, P0171) and recommend scanning before replacing any parts.
4. **Recommended Fix** — step by step: what to try first (cheapest/easiest), what to do if that fails.
5. **Cost Estimate** — rough parts + labour cost in USD for each fix.
6. **Urgency** — Low / Medium / High and why.
7. **Mechanic Needed** — yes or no, and why.

If it is a follow-up question, answer helpfully in context.
If they say the issue is resolved, thank them warmly.

Use simple, clear language. Be specific to the {has_year} {has_brand} {has_model} — mention known issues for this exact vehicle if relevant.
Always suggest an OBD2 scan first to get exact fault codes before recommending part replacements.

IMPORTANT: vehicle_year must be a STRING like "{has_year}".

Respond ONLY with valid JSON, no markdown:
{{"reply": "your detailed structured response", "vehicle_brand": "{has_brand}", "vehicle_model": "{has_model}", "vehicle_year": "{has_year}"}}"""


# ── Main process function ────────────────────────────────────────────────────

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

    # Start with DB values
    chat_state = {
        "vehicle_brand": vehicle_brand,
        "vehicle_model": vehicle_model,
        "vehicle_year":  str(vehicle_year) if vehicle_year else None,
    }

    # Fallback 1: extract from previous bot JSON responses
    if not all([chat_state["vehicle_brand"], chat_state["vehicle_model"], chat_state["vehicle_year"]]):
        from_history = extract_vehicle_from_history(messages)
        chat_state["vehicle_brand"] = chat_state["vehicle_brand"] or from_history["vehicle_brand"]
        chat_state["vehicle_model"] = chat_state["vehicle_model"] or from_history["vehicle_model"]
        chat_state["vehicle_year"]  = chat_state["vehicle_year"]  or from_history["vehicle_year"]

    # Fallback 2: extract brand/year from raw user messages
    if not chat_state["vehicle_brand"] or not chat_state["vehicle_year"]:
        from_users = extract_from_user_messages(messages)
        chat_state["vehicle_brand"] = chat_state["vehicle_brand"] or from_users["vehicle_brand"]
        chat_state["vehicle_year"]  = chat_state["vehicle_year"]  or from_users["vehicle_year"]

    print(f"\n🔄 Processing message for Chat [{chat_id}]")
    print(f"   State   : brand={chat_state['vehicle_brand']}, model={chat_state['vehicle_model']}, year={chat_state['vehicle_year']}")
    print(f"   Message : {user_message}")
    print(f"   Image   : {'yes' if image_base64 else 'no'}")

    # Build Groq conversation history (all except the latest user message)
    groq_history = []
    for msg in messages[:-1]:
        role = "user" if msg["role"] == "user" else "model"
        groq_history.append({
            "role":  role,
            "parts": [{"text": msg["content"]}]
        })

    # Choose prompt — vision if image provided, otherwise normal stage prompt
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

    # Parse JSON response
    try:
        cleaned = raw_response.strip()

        if "```" in cleaned:
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.strip()

        start = cleaned.find("{")
        end   = cleaned.rfind("}") + 1
        if start != -1 and end > start:
            cleaned = cleaned[start:end]

        result = json.loads(cleaned)

        # Always keep known values — never overwrite with null
        final_brand = result.get("vehicle_brand") or chat_state["vehicle_brand"]
        final_model = result.get("vehicle_model") or chat_state["vehicle_model"]
        final_year  = result.get("vehicle_year")  or chat_state["vehicle_year"]

        # Always cast year to string
        if final_year is not None:
            final_year = str(final_year)

        print(f"✅ Parsed reply: {result.get('reply', '')[:80]}...")
        print(f"   Final state : brand={final_brand}, model={final_model}, year={final_year}")

        return {
            "reply":         result.get("reply", "I didn't understand that. Could you please repeat?"),
            "vehicle_brand": final_brand,
            "vehicle_model": final_model,
            "vehicle_year":  final_year,
        }

    except json.JSONDecodeError as e:
        print(f"⚠️  JSON parse failed ({e}) — using raw response")
        return {
            "reply":         raw_response,
            "vehicle_brand": chat_state["vehicle_brand"],
            "vehicle_model": chat_state["vehicle_model"],
            "vehicle_year":  str(chat_state["vehicle_year"]) if chat_state["vehicle_year"] else None,
        }