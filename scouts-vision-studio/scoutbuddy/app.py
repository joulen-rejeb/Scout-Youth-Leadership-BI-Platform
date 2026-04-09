from pathlib import Path

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import anthropic
import os
import httpx
import requests
from openai import APIConnectionError, APITimeoutError, OpenAI

# Bump when changing providers / errors
SERVER_INFO = "Q&A Assistance backend 3.1 — Groq HTTP fallback + SSL certifi"

_SCOUTBUDDY_ROOT = Path(__file__).resolve().parent
load_dotenv(_SCOUTBUDDY_ROOT / ".env")

# Windows / corporate networks: use Mozilla CA bundle from certifi
try:
    import certifi

    if not os.environ.get("SSL_CERT_FILE") and not os.environ.get("REQUESTS_CA_BUNDLE"):
        os.environ["SSL_CERT_FILE"] = certifi.where()
        os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
except ImportError:
    pass

app = Flask(__name__)

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL_FALLBACKS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

ANTHROPIC_MODEL_FALLBACKS = [
    "claude-sonnet-4-6",
    "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-latest",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
    "claude-3-opus-20240229",
]


def _resolve_keys() -> tuple[str, str, str]:
    """
    Returns (provider, groq_key, anthropic_key).
    provider is 'groq', 'anthropic', or 'none'.
    """
    groq_explicit = (os.environ.get("GROQ_API_KEY") or "").strip()
    ant = (os.environ.get("ANTHROPIC_API_KEY") or "").strip()

    groq_key = groq_explicit
    if not groq_key and ant.startswith("gsk_"):
        groq_key = ant

    anthropic_key = ant if ant.startswith("sk-ant") else ""

    if groq_key:
        return "groq", groq_key, anthropic_key
    if anthropic_key:
        return "anthropic", "", anthropic_key
    if ant:
        print(
            "SCOUTBUDDY: ANTHROPIC_API_KEY is set but is neither Groq (gsk_) nor Anthropic (sk-ant-). "
            "Set GROQ_API_KEY or a valid Anthropic key."
        )
    return "none", "", ""


PROVIDER, GROQ_KEY, ANTHROPIC_KEY = _resolve_keys()


def _build_groq_client() -> OpenAI | None:
    if not GROQ_KEY:
        return None
    http = httpx.Client(
        timeout=httpx.Timeout(120.0, connect=45.0, read=120.0, write=45.0),
        limits=httpx.Limits(max_keepalive_connections=5, max_connections=20),
        http2=False,
        trust_env=True,
    )
    return OpenAI(
        api_key=GROQ_KEY,
        base_url=GROQ_BASE_URL,
        max_retries=2,
        timeout=120.0,
        http_client=http,
    )


groq_client = _build_groq_client()
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_KEY) if ANTHROPIC_KEY else None


def _startup_log() -> None:
    if PROVIDER == "groq":
        print(f"API: Groq (key {GROQ_KEY[:8]}…)")
    elif PROVIDER == "anthropic":
        print(f"API: Anthropic (key {ANTHROPIC_KEY[:12]}…)")
    else:
        print("WARNING: No Groq (GROQ_API_KEY or gsk_ in ANTHROPIC_API_KEY) and no Anthropic (sk-ant-) key.")
    print(SERVER_INFO)


_startup_log()

# ============ SYSTEM PROMPT (shared with Vite dev proxy: system_prompt.txt) ============
_PROMPT_FILE = _SCOUTBUDDY_ROOT / "system_prompt.txt"
try:
    SCOUT_SYSTEM_PROMPT = _PROMPT_FILE.read_text(encoding="utf-8").strip()
except OSError:
    SCOUT_SYSTEM_PROMPT = 'You are "Q&A Assistance", a scouting helper. Answer clearly in the user\'s language.'


QUICK_QUESTIONS = [
    {"id": 1, "emoji": "🏕️", "text": "How do I join a scout group?"},
    {"id": 2, "emoji": "⛺", "text": "What do scouts do?"},
    {"id": 3, "emoji": "🎒", "text": "What should I bring to camp?"},
    {"id": 4, "emoji": "🥇", "text": "How do I move up in ranks?"},
    {"id": 5, "emoji": "🪢", "text": "Which knots should a scout know?"},
    {"id": 6, "emoji": "📜", "text": "What is the Scout Law and Promise?"},
    {"id": 7, "emoji": "🌍", "text": "What is the World Scout Jamboree?"},
    {"id": 8, "emoji": "👨‍✈️", "text": "How do I become a scout leader?"},
    {"id": 9, "emoji": "🛡️", "text": "Are scout camps safe?"},
    {"id": 10, "emoji": "👨‍👩‍👧", "text": "Can parents take part?"},
]


@app.route("/")
def index():
    return render_template("index.html", questions=QUICK_QUESTIONS)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "service": "qa-assistance",
        "version": SERVER_INFO,
        "provider": PROVIDER,
        "groq_key_loaded": bool(GROQ_KEY),
        "anthropic_key_loaded": bool(ANTHROPIC_KEY),
    })


def _groq_model_candidates() -> list[str]:
    configured = (os.environ.get("GROQ_MODEL") or "").strip()
    out: list[str] = []
    if configured:
        out.append(configured)
    for m in GROQ_MODEL_FALLBACKS:
        if m not in out:
            out.append(m)
    return out


def _anthropic_model_candidates() -> list[str]:
    configured = (os.environ.get("ANTHROPIC_MODEL") or "").strip()
    out: list[str] = []
    if configured:
        out.append(configured)
    for m in ANTHROPIC_MODEL_FALLBACKS:
        if m not in out:
            out.append(m)
    return out


def _is_model_not_found(err: BaseException) -> bool:
    s = f"{type(err).__name__} {err!s}".lower()
    if "not_found" in s or "not found" in s or "404" in s:
        return True
    if "model" in s and ("invalid" in s or "does not exist" in s or "unknown" in s):
        return True
    return False


def _is_auth_failure(err: BaseException) -> bool:
    s = f"{type(err).__name__} {err!s}".lower()
    if "authentication" in s or "401" in s:
        return True
    if "invalid" in s and ("api" in s or "key" in s or "credential" in s or "x-api-key" in s):
        return True
    if "permission_denied" in s or "403" in s:
        return True
    return False


def _is_try_next_model(err: BaseException) -> bool:
    if _is_model_not_found(err):
        return True
    s = f"{type(err).__name__} {err!s}".lower()
    if "overloaded" in s or "529" in s:
        return True
    return False


def _is_connection_like(err: BaseException) -> bool:
    """Detect network/SSL issues so we can retry with the requests library."""
    if isinstance(err, (APIConnectionError, APITimeoutError)):
        return True
    tn = type(err).__name__
    if tn in (
        "APIConnectionError",
        "APITimeoutError",
        "ConnectError",
        "ReadTimeout",
        "ConnectTimeout",
        "WriteTimeout",
        "PoolTimeout",
        "ProxyError",
        "RemoteProtocolError",
        "SSLError",
        "CertificateError",
        "ConnectionError",
    ):
        return True
    s = f"{tn} {err!s}".lower()
    return any(
        x in s
        for x in (
            "connection",
            "timeout",
            "timed out",
            "resolve",
            "getaddrinfo",
            "ssl",
            "tls",
            "certificate",
            "handshake",
            "network",
            "unreachable",
            "refused",
            "errno",
            "10060",
            "10054",
            "winerror",
        )
    )


def _user_block(user_message: str) -> str:
    return (
        "Here is the question. Answer it directly and exactly (scouting topics only). "
        "Do not answer a different question.\n\n"
        + user_message.strip()
    )


def _groq_ssl_verify() -> bool:
    return os.environ.get("GROQ_SSL_VERIFY", "1").lower() not in ("0", "false", "no", "off")


def _groq_via_requests(model: str, messages: list) -> str:
    """Fallback when OpenAI/httpx client cannot connect (common on some Windows setups)."""
    url = f"{GROQ_BASE_URL.rstrip('/')}/chat/completions"
    r = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {GROQ_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": messages,
            "max_tokens": 1200,
            "temperature": 0.4,
        },
        timeout=120,
        verify=_groq_ssl_verify(),
    )
    if r.status_code == 401:
        raise RuntimeError(f"Groq 401 unauthorized: {r.text[:300]}")
    if r.status_code >= 400:
        raise RuntimeError(f"Groq HTTP {r.status_code}: {r.text[:500]}")
    data = r.json()
    return (data["choices"][0]["message"].get("content") or "").strip()


def _groq_reply(user_message: str) -> tuple[str | None, BaseException | None]:
    ub = _user_block(user_message)
    messages = [
        {"role": "system", "content": SCOUT_SYSTEM_PROMPT},
        {"role": "user", "content": ub},
    ]
    prefer_requests = os.environ.get("GROQ_PREFER_REQUESTS", "").lower() in ("1", "true", "yes")
    last_exc: BaseException | None = None
    for model in _groq_model_candidates():
        text = ""
        if prefer_requests:
            try:
                text = _groq_via_requests(model, messages)
                last_exc = None
            except Exception as e:
                last_exc = e
                print(f"Q&A Assistance: Groq requests-only ({model}): {e!r}")
        else:
            try:
                completion = groq_client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=1200,
                    temperature=0.4,
                )
                text = (completion.choices[0].message.content or "").strip()
            except Exception as e:
                last_exc = e
                if _is_auth_failure(e):
                    print(f"Q&A Assistance: Groq auth failed ({model}): {e!r}")
                    break
                if _is_connection_like(e):
                    print(f"Q&A Assistance: Groq SDK connection issue ({model}), trying requests fallback…")
                    try:
                        text = _groq_via_requests(model, messages)
                        last_exc = None
                    except Exception as e2:
                        last_exc = e2
                        print(f"Q&A Assistance: requests fallback failed ({model}): {e2!r}")
                        text = ""
                else:
                    print(f"Q&A Assistance: Groq SDK error ({model}): {e!r}")
                    if _is_try_next_model(e):
                        continue

        if text:
            print(f"Q&A Assistance: OK with Groq model {model}")
            return text, None

        if last_exc and _is_try_next_model(last_exc):
            print(f"Q&A Assistance: Groq model {model} skipped after errors")
            continue
        if last_exc and _is_auth_failure(last_exc):
            break
        continue
    return None, last_exc


def _anthropic_reply(user_message: str) -> tuple[str | None, BaseException | None]:
    ub = _user_block(user_message)
    last_exc: BaseException | None = None
    for model in _anthropic_model_candidates():
        try:
            response = anthropic_client.messages.create(
                model=model,
                max_tokens=1200,
                system=SCOUT_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": ub}],
            )
            block = response.content[0]
            if block.type != "text":
                last_exc = RuntimeError(f"Unexpected block type from {model}")
                print(f"Q&A Assistance: {last_exc!r}, trying next…")
                continue
            text = block.text.strip()
            if not text:
                last_exc = RuntimeError(f"Empty reply from {model}")
                print(f"Q&A Assistance: {last_exc!r}, trying next…")
                continue
            print(f"Q&A Assistance: OK with Anthropic model {model}")
            return text, None
        except Exception as e:
            last_exc = e
            if _is_auth_failure(e):
                print(f"Q&A Assistance: Anthropic auth failed ({model}): {e!r}")
                break
            if _is_try_next_model(e):
                print(f"Q&A Assistance: Anthropic model {model} skipped: {e!r}")
                continue
            print(f"Q&A Assistance: Anthropic {model} error: {e!r}, trying next…")
            continue
    return None, last_exc


def _hint_from_exception(err: BaseException | None, provider: str) -> str | None:
    if err is None:
        return None
    s = f"{type(err).__name__} {err!s}".lower()
    if _is_auth_failure(err):
        if provider == "groq":
            return (
                "Your Groq API key was not accepted. Check GROQ_API_KEY in scoutbuddy/.env (starts with gsk_). "
                "Create or rotate a key at https://console.groq.com then restart this app."
            )
        return (
            "Your Anthropic API key was not accepted. Check ANTHROPIC_API_KEY in scoutbuddy/.env (starts with sk-ant-). "
            "See https://console.anthropic.com — then restart this app."
        )
    if "429" in s or ("rate" in s and "limit" in s):
        return "Too many requests. Please wait a minute and try again."
    if "402" in s or "credit" in s or "billing" in s or "payment" in s:
        return "Your API account may need credits or billing. Check your provider’s console, then try again."
    if "connection" in s or "timeout" in s or "resolve" in s or "ssl" in s or "certificate" in s:
        return (
            "Could not reach Groq from this computer. Try: (1) run pip install -r scoutbuddy/requirements.txt "
            "then restart the chat app; (2) test https://groq.com in your browser; (3) if you use a VPN or strict "
            "antivirus, try briefly disabling it; (4) only if you know your network inspects HTTPS, set "
            "GROQ_SSL_VERIFY=0 in scoutbuddy/.env (less secure)."
        )
    if _is_model_not_found(err):
        return (
            "No working model ID for your account. Set GROQ_MODEL or ANTHROPIC_MODEL in scoutbuddy/.env "
            "to a model listed in your provider’s docs, then restart."
        )
    return None


def _fallback_error() -> str:
    return (
        "Sorry, we could not get an answer. Open http://127.0.0.1:5000/health — check that provider is "
        "\"groq\" or \"anthropic\" and that the key is set in scoutbuddy/.env. Then restart the Python app."
    )


def _scrub_legacy_french_error(text: str) -> str:
    low = text.lower()
    if "désolé" in low and "erreur" in low:
        return _fallback_error()
    return text


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    user_message = (data.get("message") or "").strip()

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    if PROVIDER == "none":
        return jsonify({
            "user_message": user_message,
            "bot_response": (
                "Add an API key in scoutbuddy/.env: GROQ_API_KEY=gsk_... (Groq) or "
                "ANTHROPIC_API_KEY=sk-ant-... (Anthropic), then restart the app."
            ),
        }), 200

    if PROVIDER == "groq":
        reply, last_exc = _groq_reply(user_message)
    else:
        reply, last_exc = _anthropic_reply(user_message)

    if reply is None:
        bot_response = _hint_from_exception(last_exc, PROVIDER) or _fallback_error()
        if last_exc is not None:
            print(f"Q&A Assistance: all models failed ({PROVIDER}). Last: {type(last_exc).__name__}: {last_exc!r}")
    else:
        bot_response = _scrub_legacy_french_error(reply)

    return jsonify({
        "user_message": user_message,
        "bot_response": bot_response,
    })


if __name__ == "__main__":
    print("Starting Q&A Assistance (Flask) on http://0.0.0.0:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
