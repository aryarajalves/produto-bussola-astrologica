"""
podcast_service.py — Sirius Academy
Gera podcast de 2 narradores sobre o Mapa da Alma via OpenAI GPT + TTS.
"""
import os
import re
import json
import asyncio
import logging
from typing import List, Dict

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logger.warning("OPENAI_API_KEY não configurada nas variáveis de ambiente.")

client = AsyncOpenAI(api_key=api_key or "sk-dummy-key-for-test-environments")

# Limite máximo de caracteres por chamada TTS da OpenAI (máximo oficial: 4096)
_TTS_MAX_CHARS = 4000

# ── Identidade dos narradores ──────────────────────────────────────────────
NARRATOR_A = "Lunna"   # feminino — shimmer, muito sutil, calma e acolhedora
NARRATOR_B = "Apollo"  # masculino — echo, voz calma, calorosa e serena
VOICE_A    = "shimmer" # Lunna — voz feminina extremamente sutil, calma e reconfortante (para não parecer robótica)
VOICE_B    = "echo"    # Apollo — voz masculina acolhedora, calma e assertiva, sem tons bravos ou agressivos

# ── Labels das seções ───────────────────────────────────────────────────────
SECTION_LABELS = {
    "portal":          "Abertura — a chegada ao mapa",
    "essencia":        "Essência — Sol, Lua e Ascendente",
    "ferida_e_dom":    "A Ferida e o Dom — Quíron e os Nodos",
    "dons_esquecidos": "Dons Esquecidos — Vênus, Marte e Júpiter",
    "luz_e_sombra":    "Luz e Sombra — Plutão e Lilith",
    "reencontro":      "O Reencontro — síntese da alma",
    "rituais":         "Rituais de Integração",
    "afirmagias":      "Afirmagias",
}

# ── Prompt do roteiro ───────────────────────────────────────────────────────
_SYSTEM = """\
Você é um roteirista especialista em podcasts de astrologia profunda e autoconhecimento.

IDIOMA: Todo o roteiro deve ser escrito EXCLUSIVAMENTE em português brasileiro. \
Absolutamente nenhuma palavra em inglês, latim ou outro idioma. \
Nomes astrológicos como "Quíron", "Lilith", "Plutão", "Nodos" devem ser usados em português.

Crie um roteiro de podcast entre dois narradores brasileiros:
— LUNNA (feminina): extremamente sutil, acolhedora, com voz calma e tom quase terapêutico/meditativo. Ela traz intuição, suavidade e calor emocional. Suas falas devem ser tranquilizadoras.
— APOLLO (masculino): assertivo, mas muito calmo, sereno e reflexivo. Ele fala de forma pausada e profunda, sem nenhuma pressa ou agressividade. Ele conecta os astros a conselhos amorosos e gentis para a vida real.

Eles estão discutindo ao vivo o Mapa da Alma de {first_name} com suavidade, respeito e empatia profunda.

REGRAS OBRIGATÓRIAS:
1. APENAS português brasileiro — sem inglês, sem code-switching, sem termos técnicos não traduzidos.
2. Duração alvo: 6 a 8 minutos de fala (aprox. 1000–1300 palavras no total entre os dois).
3. Eles DISCUTEM entre si de forma mansa e cúmplice — concordam com carinho, ponderam juntos, complementam o raciocínio um do outro com suavidade e se encantam genuinamente com os dons da pessoa.
4. Use o nome "{first_name}" com naturalidade e ternura ao longo do podcast.
5. Evite tons exaltados ou reações histéricas. Prefira pausas acolhedoras, momentos de silêncio e reflexões profundas ("olha que bonito isso...", "de fato, isso traz uma paz...", "perceba a sutileza desse ponto...").
6. Tornem tudo humano, sensível e poético — sem parecer um robô ou uma IA.
7. Construam revelações progressivas e reconfortantes: comecem pela identidade central (Sol/Lua/Ascendente), acalentem as feridas antigas mostrando o caminho da cura (Quíron/Nodos), e tragam uma síntese de muita luz.
8. Terminem com uma mensagem de carinho, acolhimento e força sutil direcionada a {first_name}.
9. NÃO usem frases genéricas ou fórmulas prontas. Ancorem a leitura no afeto e na verdade dos posicionamentos reais.
10. Ritmo de conversa real e respirada: inclua suspirar, pausas indicadas no texto (ex: [pausa suave]) e frases curtas de concordância pacífica.

Retorne APENAS este JSON (sem markdown, sem explicação extra):
{{"script": [
  {{"narrator": "Lunna", "text": "fala da Lunna..."}},
  {{"narrator": "Apollo", "text": "fala do Apollo..."}},
  ...
]}}
"""


async def _generate_script(
    name: str,
    sun_sign: str,
    moon_sign: str,
    rising_sign: str,
    sections: dict,
    form_answers: dict,
) -> List[Dict[str, str]]:
    """
    Gera o roteiro completo via GPT.
    Tenta gpt-4o como modelo principal (estável e testado).
    Mantém fallback para gpt-4o-mini se o modelo principal falhar.
    """

    first = name.split()[0]

    # Monta resumo das seções (limita tamanho para caber no contexto)
    sections_text = ""
    for key, label in SECTION_LABELS.items():
        content = sections.get(key, "").strip()
        if content:
            sections_text += f"\n\n## {label}\n{content[:700]}"

    user_msg = f"""
DADOS DO MAPA DE {name.upper()}:
• Sol em {sun_sign} · Lua em {moon_sign} · Ascendente em {rising_sign}

RESPOSTAS DO FORMULÁRIO:
• O que está vivendo agora: {form_answers.get("vida_agora", "—")}
• O que mudaria: {form_answers.get("carrega_tempo", "—")}
• O que espera descobrir: {form_answers.get("espera_descobrir", "—")}

LEITURA DO MAPA DA ALMA:
{sections_text}
"""

    system = _SYSTEM.format(first_name=first)

    # Tentativa com modelo principal; fallback automático se falhar
    _MODELS = ["gpt-5.4-2026-03-05", "gpt-5.4", "gpt-4o", "gpt-4o-mini"]

    last_exc: Exception = RuntimeError("Nenhum modelo disponível")
    for model_name in _MODELS:
        try:
            logger.info("🤖 Gerando roteiro com modelo '%s'", model_name)
            resp = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user_msg},
                ],
                temperature=0.88,
                max_tokens=3000,
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content
            data = json.loads(raw)
            break  # sucesso — sai do loop
        except Exception as exc:
            logger.warning("Modelo '%s' falhou para roteiro: %s", model_name, exc)
            last_exc = exc
    else:
        # Todos os modelos falharam
        raise RuntimeError(f"Falha ao gerar roteiro em todos os modelos: {last_exc}") from last_exc

    # Suporta {"script": [...]} ou diretamente [...]
    if isinstance(data, list):
        return data
    for key in ("script", "podcast", "dialogue", "roteiro", "falas"):
        if key in data and isinstance(data[key], list):
            return data[key]
    # fallback: retorna qualquer lista encontrada
    for v in data.values():
        if isinstance(v, list):
            return v
    raise ValueError(f"Formato de script inesperado: {list(data.keys())}")


# Termos astrológicos em inglês que o GPT às vezes insiste em usar → versão PT
_EN_TO_PT = {
    "rising": "ascendente",
    "sun sign": "signo solar",
    "moon sign": "signo lunar",
    "north node": "nodo norte",
    "south node": "nodo sul",
    "chiron": "quíron",
    "lilith": "lilith",
    "midheaven": "meio do céu",
    "ascendant": "ascendente",
    "descendant": "descendente",
    "chart": "mapa",
    "birth chart": "mapa natal",
    "natal chart": "mapa natal",
    "placement": "posição",
    "transit": "trânsito",
    "retrograde": "retrógrado",
    "aspects": "aspectos",
    "houses": "casas",
}

def _sanitize_portuguese(text: str) -> str:
    """Substitui termos astrológicos em inglês pela versão em português."""
    lower = text.lower()
    for en, pt in _EN_TO_PT.items():
        if en in lower:
            text = re.sub(re.escape(en), pt, text, flags=re.IGNORECASE)
    return text


def _split_text(text: str, max_chars: int = _TTS_MAX_CHARS) -> List[str]:
    """
    Divide texto em chunks respeitando o limite de caracteres do TTS da OpenAI.
    Tenta manter frases inteiras; em último caso corta por vírgula ou força.
    """
    if len(text) <= max_chars:
        return [text]

    chunks: List[str] = []
    # Divide em sentenças (ponto, exclamação, reticências)
    sentences = re.split(r'(?<=[.!?…])\s+', text)
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= max_chars:
            current = (current + " " + sentence).strip()
        else:
            if current:
                chunks.append(current)
            if len(sentence) > max_chars:
                # Sentença sozinha ultrapassa o limite → divide por vírgula
                sub_parts = re.split(r'(?<=,)\s+', sentence)
                current = ""
                for part in sub_parts:
                    if len(current) + len(part) + 1 <= max_chars:
                        current = (current + " " + part).strip()
                    else:
                        if current:
                            chunks.append(current)
                        # Ainda muito longo → corta bruto
                        current = part[:max_chars]
            else:
                current = sentence

    if current:
        chunks.append(current)

    return chunks if chunks else [text[:max_chars]]


async def _tts_single(text: str, voice: str) -> bytes:
    """Converte um único chunk (≤ 4000 chars) em MP3 usando o modelo TTS de alta fidelidade."""
    response = await client.audio.speech.create(
        model="tts-1-hd",
        voice=voice,
        input=text,
        response_format="mp3",
    )
    return response.content


async def _tts_segment(text: str, voice: str) -> bytes:
    """
    Converte um segmento de texto em áudio MP3.
    Divide automaticamente segmentos longos (> 4000 chars) para respeitar
    o limite da API de TTS da OpenAI.
    """
    text = _sanitize_portuguese(text)
    chunks = _split_text(text)

    if len(chunks) == 1:
        return await _tts_single(chunks[0], voice)

    # Múltiplos chunks — gera em série e concatena
    logger.debug("Segmento dividido em %d chunks (texto: %d chars)", len(chunks), len(text))
    parts = []
    for chunk in chunks:
        parts.append(await _tts_single(chunk, voice))
    return b"".join(parts)


async def generate_podcast(
    name: str,
    sun_sign: str,
    moon_sign: str,
    rising_sign: str,
    sections: dict,
    form_answers: dict,
) -> bytes:
    """
    Gera o podcast completo como bytes MP3.
    Retorna os bytes do áudio pronto para download/streaming.
    """
    first = name.split()[0]
    logger.info("🎙️ Gerando roteiro do podcast para '%s'", first)

    # Valida que há conteúdo mínimo para gerar um podcast útil
    sections_with_content = [k for k, v in sections.items() if v and v.strip()]
    if not sections_with_content:
        raise ValueError(
            "O mapa desta pessoa não possui seções com conteúdo. "
            "Regenere o mapa antes de gerar o podcast."
        )
    logger.info("📚 Seções disponíveis: %s", sections_with_content)

    script = await _generate_script(
        name=name,
        sun_sign=sun_sign,
        moon_sign=moon_sign,
        rising_sign=rising_sign,
        sections=sections,
        form_answers=form_answers,
    )
    logger.info("📝 Roteiro gerado com %d segmentos", len(script))

    # Converte segmentos em áudio com concorrência limitada (evita rate limit)
    semaphore = asyncio.Semaphore(3)
    failed_segments = 0

    async def tts_with_sem(seg: dict) -> bytes:
        nonlocal failed_segments
        async with semaphore:
            narrator = seg.get("narrator", NARRATOR_A)
            text     = seg.get("text", "").strip()
            if not text:
                return b""
            voice = VOICE_A if narrator == NARRATOR_A else VOICE_B

            # Retry com backoff exponencial (até 3 tentativas)
            for attempt in range(3):
                try:
                    return await _tts_segment(text, voice)
                except Exception as exc:
                    if attempt < 2:
                        wait = 2 ** attempt  # 1s, 2s
                        logger.warning(
                            "TTS falhou para %s (tentativa %d/3): %s — retrying em %ds",
                            narrator, attempt + 1, exc, wait,
                        )
                        await asyncio.sleep(wait)
                    else:
                        logger.error(
                            "TTS falhou definitivamente para %s após 3 tentativas: %s",
                            narrator, exc,
                        )
                        failed_segments += 1
                        return b""
        return b""

    logger.info("🔊 Gerando áudio de %d segmentos...", len(script))
    parts = await asyncio.gather(*[tts_with_sem(seg) for seg in script])

    combined = b"".join(p for p in parts if p)

    if not combined:
        raise RuntimeError(
            f"Podcast gerado vazio — todos os {len(script)} segmentos de áudio falharam. "
            "Verifique os logs para detalhes."
        )

    if failed_segments > 0:
        logger.warning(
            "⚠️ Podcast gerado com %d/%d segmentos falhos (áudio parcial: %.1f KB)",
            failed_segments, len(script), len(combined) / 1024,
        )
    else:
        logger.info("✅ Podcast gerado: %.1f KB", len(combined) / 1024)

    return combined
