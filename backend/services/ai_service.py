import re
import asyncio
import logging
from pathlib import Path
from openai import AsyncOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logger.warning("OPENAI_API_KEY não configurada nas variáveis de ambiente.")

client = AsyncOpenAI(api_key=api_key or "sk-dummy-key-for-test-environments")

SECTION_KEYS = [
    "portal",
    "essencia",
    "ferida_e_dom",
    "dons_esquecidos",
    "luz_e_sombra",
    "reencontro",
    "rituais",
    "afirmagias",
]

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "mapa_mestre.txt"


def _load_master_prompt() -> str:
    if not _PROMPT_PATH.exists():
        raise FileNotFoundError(
            f"Arquivo de prompt não encontrado: {_PROMPT_PATH}\n"
            "Coloque o arquivo 'mapa_mestre.txt' na pasta 'backend/prompts/'."
        )
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _build_prompt(chart_data: dict, form_answers: dict, focus_areas: list, name: str) -> str:
    master = _load_master_prompt()

    cd = chart_data
    fa = form_answers

    sun = cd.get("sun", {})
    moon = cd.get("moon", {})
    rising = cd.get("rising", {})
    mercury = cd.get("mercury", {})
    venus = cd.get("venus", {})
    mars = cd.get("mars", {})
    jupiter = cd.get("jupiter", {})
    saturn = cd.get("saturn", {})
    chiron = cd.get("chiron", {})
    pluto = cd.get("pluto", {})
    lilith = cd.get("lilith", {})
    north_node = cd.get("north_node", {})
    south_node = cd.get("south_node", {})
    mc = cd.get("mc", {})
    elements = cd.get("elements", {})

    focus_str = ", ".join(focus_areas) if focus_areas else "não especificadas"

    prompt = f"""{master}

---

AGORA GERE O MAPA COMPLETO COM ESSES DADOS:

CLIENTE:
- Nome: {name}
- Áreas de foco: {focus_str}

RESPOSTAS DO FORMULÁRIO:
1. O que está acontecendo na sua vida agora?
   "{fa.get('vida_agora', '')}"
2. Se você pudesse mudar uma coisa na sua vida hoje, o que seria?
   "{fa.get('carrega_tempo', '')}"
3. O que você espera descobrir através do seu Mapa Astral?
   "{fa.get('espera_descobrir', '')}"

DADOS ASTROLÓGICOS:
- Sol: {sun.get('sign', '')} na Casa {sun.get('house', '')}
- Lua: {moon.get('sign', '')} na Casa {moon.get('house', '')}
- Ascendente: {rising.get('sign', '')}
- Mercúrio: {mercury.get('sign', '')} na Casa {mercury.get('house', '')} | Retrógrado: {mercury.get('retrograde', False)}
- Vênus: {venus.get('sign', '')} na Casa {venus.get('house', '')}
- Marte: {mars.get('sign', '')} na Casa {mars.get('house', '')}
- Júpiter: {jupiter.get('sign', '')} na Casa {jupiter.get('house', '')}
- Saturno: {saturn.get('sign', '')} na Casa {saturn.get('house', '')} | Retrógrado: {saturn.get('retrograde', False)}
- Quíron: {chiron.get('sign', '')} na Casa {chiron.get('house', '')}
- Plutão: {pluto.get('sign', '')} na Casa {pluto.get('house', '')} | Retrógrado: {pluto.get('retrograde', False)}
- Lilith: {lilith.get('sign', '')} na Casa {lilith.get('house', '')}
- Nodo Norte: {north_node.get('sign', '')} na Casa {north_node.get('house', '')}
- Nodo Sul: {south_node.get('sign', '')}
- Meio do Céu: {mc.get('sign', '')}
- Fase Lunar: {cd.get('lunar_phase', '')}
- Elementos: Fogo {elements.get('fire', 0)}% | Terra {elements.get('earth', 0)}% | Ar {elements.get('air', 0)}% | Água {elements.get('water', 0)}%

INSTRUÇÃO DE FORMATO:
Gere cada seção separada por este marcador exato:
===SECAO: nome_da_secao===

Use exatamente estes nomes nessa ordem:
portal
essencia
ferida_e_dom
dons_esquecidos
luz_e_sombra
reencontro
rituais
afirmagias

Mapeamento das seções com os portais do prompt mestre:
- portal        → Introdução (Carta Sagrada)
- essencia      → Primeiro Portal (A Tríade Sagrada: Sol, Lua, Ascendente)
- ferida_e_dom  → Segundo Portal (A Ferida que É Porta: Quíron, Nodos)
- dons_esquecidos → Terceiro Portal (Os Dons Esquecidos: Vênus, Marte, Júpiter)
- luz_e_sombra  → Quarto Portal (As Sombras que Ensinam: Plutão, Lilith)
- reencontro    → Quinto Portal (O Chamado: síntese e próximo passo)
- rituais       → Rituais de Integração (siga as instruções completas do prompt)
- afirmagias    → Afirmagias (siga as instruções completas do prompt — cada afirmagia com origem em itálico)"""

    return prompt


def _parse_sections(raw: str) -> dict:
    sections = {}
    pattern = r"===SECAO:\s*(\w+)===(.*?)(?====SECAO:|\Z)"
    matches = re.findall(pattern, raw, re.DOTALL)
    for key, content in matches:
        key = key.strip()
        content = content.strip()
        if key in SECTION_KEYS:
            sections[key] = content
        else:
            logger.warning(f"Seção desconhecida ignorada: '{key}'")

    for key in SECTION_KEYS:
        if key not in sections or not sections[key]:
            logger.warning(f"Seção '{key}' veio vazia ou ausente no retorno da IA")
            sections.setdefault(key, "")

    return sections


_SYSTEM_PROMPT = (
    "Você é Andrieli Oliver, astróloga brasileira especialista em leituras de mapa astral "
    "profundas e transformadoras. Escreva sempre em português brasileiro, com sensibilidade, "
    "profundidade e linguagem acessível."
)


async def generate_sections(
    chart_data: dict,
    form_answers: dict,
    focus_areas: list,
    name: str,
) -> dict:
    """
    Gera as 8 seções completas do mapa via gpt-5.4-2026-03-05.
    """
    prompt = _build_prompt(chart_data, form_answers, focus_areas, name)

    _MODELS = ["gpt-4o", "gpt-4o-mini"]
    last_exc = None
    response = None

    for model_name in _MODELS:
        try:
            logger.info("🤖 Gerando seções do mapa com modelo '%s'", model_name)
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                max_completion_tokens=8192,
                temperature=0.85,
            )
            break
        except Exception as exc:
            logger.warning("Modelo '%s' falhou para geração de seções: %s", model_name, exc)
            last_exc = exc
    else:
        raise RuntimeError(f"Falha ao gerar seções em todos os modelos: {last_exc}") from last_exc

    raw_text = response.choices[0].message.content or ""
    sections = _parse_sections(raw_text)
    logger.info(f"Seções geradas para '{name}': {list(sections.keys())}")
    return sections


def _build_partial_prompt(
    chart_data: dict,
    form_answers: dict,
    focus_areas: list,
    name: str,
    existing_sections: dict,
    missing_keys: list,
) -> str:
    """
    Prompt para gerar APENAS as seções faltantes, usando o conteúdo já
    existente como contexto de coerência narrativa.
    """
    master = _load_master_prompt()

    cd = chart_data
    fa = form_answers

    sun           = cd.get("sun", {})
    moon          = cd.get("moon", {})
    rising        = cd.get("rising", {})
    mercury       = cd.get("mercury", {})
    venus         = cd.get("venus", {})
    mars          = cd.get("mars", {})
    jupiter       = cd.get("jupiter", {})
    saturn        = cd.get("saturn", {})
    chiron        = cd.get("chiron", {})
    pluto         = cd.get("pluto", {})
    lilith        = cd.get("lilith", {})
    north_node    = cd.get("north_node", {})
    south_node    = cd.get("south_node", {})
    mc            = cd.get("mc", {})
    elements      = cd.get("elements", {})

    focus_str = ", ".join(focus_areas) if focus_areas else "não especificadas"

    # Resumo do mapa já gerado (até 800 caracteres por seção)
    section_labels = {
        "portal":          "Portal — Introdução",
        "essencia":        "Essência (Portal I)",
        "ferida_e_dom":    "A Ferida e o Dom (Portal II)",
        "dons_esquecidos": "Dons Esquecidos (Portal III)",
        "luz_e_sombra":    "Luz e Sombra (Portal IV)",
        "reencontro":      "O Reencontro (Portal V)",
    }
    context_parts = []
    for key in ["portal","essencia","ferida_e_dom","dons_esquecidos","luz_e_sombra","reencontro"]:
        content = existing_sections.get(key, "").strip()
        if content:
            label = section_labels.get(key, key)
            context_parts.append(f"--- {label} ---\n{content[:800]}")
    context_str = "\n\n".join(context_parts) or "(Sem seções anteriores disponíveis)"

    missing_human = {
        "rituais":    "rituais       → Rituais de Integração (Portal VI — siga as instruções do prompt mestre)",
        "afirmagias": "afirmagias    → Afirmagias (Portal VII — cada afirmagia com origem em itálico)",
    }
    missing_str         = "\n".join(missing_human.get(k, k) for k in missing_keys)
    section_names_str   = "\n".join(missing_keys)

    return f"""{master}

---

CONTEXTO — SEÇÕES JÁ GERADAS PARA ESTA CLIENTE:
{context_str}

---

COMPLETE O MAPA GERANDO APENAS AS SEÇÕES FALTANTES:

CLIENTE:
- Nome: {name}
- Áreas de foco: {focus_str}

RESPOSTAS DO FORMULÁRIO:
1. O que está acontecendo na sua vida agora?
   "{fa.get('vida_agora', '')}"
2. Se você pudesse mudar uma coisa na sua vida hoje, o que seria?
   "{fa.get('carrega_tempo', '')}"
3. O que você espera descobrir através do seu Mapa Astral?
   "{fa.get('espera_descobrir', '')}"

DADOS ASTROLÓGICOS:
- Sol: {sun.get('sign', '')} na Casa {sun.get('house', '')}
- Lua: {moon.get('sign', '')} na Casa {moon.get('house', '')}
- Ascendente: {rising.get('sign', '')}
- Mercúrio: {mercury.get('sign', '')} na Casa {mercury.get('house', '')} | Retrógrado: {mercury.get('retrograde', False)}
- Vênus: {venus.get('sign', '')} na Casa {venus.get('house', '')}
- Marte: {mars.get('sign', '')} na Casa {mars.get('house', '')}
- Júpiter: {jupiter.get('sign', '')} na Casa {jupiter.get('house', '')}
- Saturno: {saturn.get('sign', '')} na Casa {saturn.get('house', '')} | Retrógrado: {saturn.get('retrograde', False)}
- Quíron: {chiron.get('sign', '')} na Casa {chiron.get('house', '')}
- Plutão: {pluto.get('sign', '')} na Casa {pluto.get('house', '')} | Retrógrado: {pluto.get('retrograde', False)}
- Lilith: {lilith.get('sign', '')} na Casa {lilith.get('house', '')}
- Nodo Norte: {north_node.get('sign', '')} na Casa {north_node.get('house', '')}
- Nodo Sul: {south_node.get('sign', '')}
- Meio do Céu: {mc.get('sign', '')}
- Fase Lunar: {cd.get('lunar_phase', '')}
- Elementos: Fogo {elements.get('fire', 0)}% | Terra {elements.get('earth', 0)}% | Ar {elements.get('air', 0)}% | Água {elements.get('water', 0)}%

INSTRUÇÃO: Gere SOMENTE as seções listadas abaixo. Use as seções acima como contexto para criar
rituais e afirmações que sejam coerentes e contínuos com a leitura já realizada.

Seções a gerar:
{missing_str}

INSTRUÇÃO DE FORMATO — use o marcador exato abaixo para cada seção:
===SECAO: nome_da_secao===

Nomes das seções (exatamente assim):
{section_names_str}"""


async def generate_missing_sections(
    chart_data: dict,
    form_answers: dict,
    focus_areas: list,
    name: str,
    existing_sections: dict,
    missing_keys: list,
) -> dict:
    """
    Gera apenas as seções faltantes (ex.: rituais, afirmagias) para um
    cliente antigo, usando o mapa já gerado como contexto.
    """
    prompt = _build_partial_prompt(
        chart_data, form_answers, focus_areas, name, existing_sections, missing_keys
    )

    _MODELS = ["gpt-4o", "gpt-4o-mini"]
    last_exc = None
    response = None

    for model_name in _MODELS:
        try:
            logger.info("🤖 Gerando seções faltantes com modelo '%s'", model_name)
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                max_completion_tokens=8192,
                temperature=0.85,
            )
            break
        except Exception as exc:
            logger.warning("Modelo '%s' falhou para seções faltantes: %s", model_name, exc)
            last_exc = exc
    else:
        raise RuntimeError(f"Falha ao gerar seções faltantes em todos os modelos: {last_exc}") from last_exc

    raw_text = response.choices[0].message.content or ""
    sections = _parse_sections(raw_text)
    logger.info(
        f"Seções complementares geradas para '{name}': "
        f"solicitadas={missing_keys} | recebidas={[k for k,v in sections.items() if v]}"
    )
    return sections
