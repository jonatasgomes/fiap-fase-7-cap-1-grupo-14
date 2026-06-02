"""Motor conversacional da Fase 5 (Gemini, free tier).

Suporta conversa multi-turno: recebe o histórico (lista de mensagens com papel
'user'/'model') e o contexto clínico do paciente (injetado na system_instruction).
Degrada de forma graciosa: sem GEMINI_API_KEY (ou em caso de falha do SDK),
retorna uma resposta de fallback para não quebrar a demo.
"""

from __future__ import annotations

from ..config import get_settings

settings = get_settings()

SYSTEM_INSTRUCTION = (
    "Você é o assistente virtual da CardioIA, uma plataforma de monitoramento "
    "cardíaco. Responda em português do Brasil, de forma clara, acolhedora e "
    "objetiva. Você apoia pacientes e profissionais de saúde, mas NÃO substitui "
    "avaliação médica: diante de sinais de emergência, oriente procurar "
    "atendimento imediato. Quando houver dados do paciente no contexto, use-os "
    "para personalizar a resposta."
)

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not settings.gemini_api_key:
        return None
    try:
        from google import genai

        _client = genai.Client(api_key=settings.gemini_api_key)
    except Exception:
        return None
    return _client


def _fallback(contexto: str | None) -> str:
    if contexto:
        return (
            "Assistente de IA indisponível (configure GEMINI_API_KEY). "
            "Com base nos últimos sinais registrados — " + contexto
        )
    return (
        "Assistente de IA indisponível no momento. Configure GEMINI_API_KEY "
        "para habilitar respostas geradas pelo Gemini."
    )


def responder(historico: list[dict], contexto: str | None = None) -> tuple[str, str]:
    """Gera a resposta do assistente.

    historico: lista de {"papel": "user"|"model", "conteudo": str}, terminando
    na pergunta atual do usuário. contexto: dados do paciente (ou None).
    Retorna (resposta, modelo). modelo == "fallback"/"error" em degradação.
    """
    client = _get_client()
    if client is None:
        return _fallback(contexto), "fallback"

    from google.genai import types

    instrucao = SYSTEM_INSTRUCTION
    if contexto:
        instrucao += (
            "\n\nContexto clínico do paciente (use para personalizar):\n" + contexto
        )
    contents = [
        types.Content(
            role=m["papel"], parts=[types.Part.from_text(text=m["conteudo"])]
        )
        for m in historico
    ]
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=instrucao,
                temperature=0.4,
                max_output_tokens=512,
            ),
        )
        texto = (response.text or "").strip() or "(o modelo retornou resposta vazia)"
        return texto, settings.gemini_model
    except Exception as exc:
        return f"Falha ao consultar o assistente de IA: {exc}. Tente novamente.", "error"
