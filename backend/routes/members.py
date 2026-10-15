import io
import logging
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.models import User, Chart, ChartSection, Analise
from database import get_db
from routes.auth import get_current_user
from services.pdf_service import generate_pdf
from services.podcast_service import generate_podcast
from services.notebooklm_service import generate_notebooklm_podcast, _is_available as notebooklm_available
from services.transit_service import AREAS
from services.analise_service import gerar_analise
from services.interpretacoes import interpretacao
from services.ai_service import generate_transit_synthesis

router = APIRouter(prefix="/members", tags=["members"])
logger = logging.getLogger(__name__)


def _get_chart(user: User, db: Session) -> Chart:
    chart = (
        db.query(Chart)
        .filter(Chart.user_id == user.id)
        .order_by(Chart.created_at.desc())
        .first()
    )
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapa não encontrado.")
    return chart


@router.get("/chart")
def get_chart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chart = _get_chart(current_user, db)
    return {
        "svg": chart.svg_content,
        "sun_sign": chart.sun_sign,
        "moon_sign": chart.moon_sign,
        "rising_sign": chart.rising_sign,
        "status": chart.status,
        "created_at": chart.created_at,
    }


@router.get("/sections")
def list_sections(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chart = _get_chart(current_user, db)
    sections = (
        db.query(ChartSection)
        .filter(ChartSection.chart_id == chart.id)
        .order_by(ChartSection.section_order)
        .all()
    )
    return [{"section_key": s.section_key, "section_order": s.section_order} for s in sections]


# Retrocompatibilidade: mapeia chaves novas → legadas e legadas → novas
_NEW_TO_OLD_KEY = {
    "portal":          "introducao",
    "essencia":        "primeiro_portal",
    "ferida_e_dom":    "segundo_portal",
    "dons_esquecidos": "terceiro_portal",
    "luz_e_sombra":    "quarto_portal",
    "reencontro":      "quinto_portal",
}
# Inverso: chave legada → chave nova
_OLD_TO_NEW_KEY = {v: k for k, v in _NEW_TO_OLD_KEY.items()}


@router.get("/sections/{section_key}")
def get_section(
    section_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chart = _get_chart(current_user, db)

    # Tenta primeiro com a chave nova, depois com a chave legada (clientes antigos)
    candidate_keys = [section_key]
    legacy_key = _NEW_TO_OLD_KEY.get(section_key)
    if legacy_key:
        candidate_keys.append(legacy_key)

    section = (
        db.query(ChartSection)
        .filter(
            ChartSection.chart_id == chart.id,
            ChartSection.section_key.in_(candidate_keys),
        )
        .first()
    )
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Seção '{section_key}' não encontrada.",
        )
    # Retorna sempre com a chave nova (seção solicitada) para o frontend
    return {"section_key": section_key, "content": section.content}


@router.get("/chart/pdf")
def download_pdf(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chart = _get_chart(current_user, db)
    sections = (
        db.query(ChartSection)
        .filter(ChartSection.chart_id == chart.id)
        .order_by(ChartSection.section_order)
        .all()
    )
    sections_dict = {s.section_key: s.content for s in sections}
    logger.info(
        "PDF request: user='%s' | chart_id=%s | sections_keys=%s | has_svg=%s",
        current_user.name,
        chart.id,
        sorted(sections_dict.keys()),
        bool(chart.svg_content),
    )

    # Formata data de nascimento
    birth_date_str = ""
    if current_user.birth_date:
        try:
            birth_date_str = current_user.birth_date.strftime("%d/%m/%Y")
        except Exception:
            birth_date_str = str(current_user.birth_date)

    pdf_bytes = generate_pdf(
        name=current_user.name,
        sun_sign=current_user.sun_sign or "",
        moon_sign=current_user.moon_sign or "",
        rising_sign=current_user.rising_sign or "",
        birth_date=birth_date_str,
        birth_city=current_user.birth_city or "",
        birth_country=getattr(current_user, "birth_country", "Brasil") or "Brasil",
        sections=sections_dict,
        svg_content=chart.svg_content or "",
    )

    filename = f"mapa-{current_user.name.lower().replace(' ', '-')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/podcast/engine")
def podcast_engine():
    """Informa qual engine de podcast está ativa."""
    return {"engine": "notebooklm" if notebooklm_available() else "openai-tts"}


@router.post("/podcast")
async def generate_user_podcast(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Gera o podcast da alma do usuário — roteiro via GPT-4o + áudio via TTS dual-voice.
    Retorna MP3 pronto para reprodução/download.
    """
    chart = _get_chart(current_user, db)
    sections = (
        db.query(ChartSection)
        .filter(ChartSection.chart_id == chart.id)
        .order_by(ChartSection.section_order)
        .all()
    )
    # Normaliza chaves legadas → novas para que o podcast service encontre o conteúdo
    # (clientes antigos têm "introducao", "primeiro_portal", etc.)
    sections_dict = {
        _OLD_TO_NEW_KEY.get(s.section_key, s.section_key): s.content
        for s in sections
    }

    sections_with_content = [k for k, v in sections_dict.items() if v and v.strip()]
    logger.info(
        "🎙️ Podcast request: user='%s' | chart_id=%s | total_sections=%d | com_conteudo=%d | signos=%s/%s/%s",
        current_user.name,
        chart.id,
        len(sections),
        len(sections_with_content),
        current_user.sun_sign or "N/A",
        current_user.moon_sign or "N/A",
        current_user.rising_sign or "N/A",
    )

    form_answers = {
        "vida_agora":       getattr(current_user, "form_vida_agora",       "") or "",
        "carrega_tempo":    getattr(current_user, "form_carrega_tempo",    "") or "",
        "espera_descobrir": getattr(current_user, "form_espera_descobrir", "") or "",
    }

    try:
        # Usa NotebookLM se configurado, senão OpenAI TTS
        if notebooklm_available():
            logger.info("Gerando podcast via NotebookLM para '%s'", current_user.name)
            mp3_bytes = await generate_notebooklm_podcast(
                name=current_user.name,
                sun_sign=current_user.sun_sign or "",
                moon_sign=current_user.moon_sign or "",
                rising_sign=current_user.rising_sign or "",
                sections=sections_dict,
                form_answers=form_answers,
            )
        else:
            logger.info("Gerando podcast via OpenAI TTS para '%s'", current_user.name)
            mp3_bytes = await generate_podcast(
                name=current_user.name,
                sun_sign=current_user.sun_sign or "",
                moon_sign=current_user.moon_sign or "",
                rising_sign=current_user.rising_sign or "",
                sections=sections_dict,
                form_answers=form_answers,
            )
    except ValueError as e:
        # Erros de validação (mapa vazio, etc.) — 422 com mensagem amigável
        logger.warning("Podcast bloqueado para '%s': %s", current_user.name, e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Erro ao gerar podcast para '%s': %s", current_user.name, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar o podcast. Tente novamente em alguns instantes.",
        )

    safe_name = current_user.name.lower().replace(" ", "-")
    return StreamingResponse(
        io.BytesIO(mp3_bytes),
        media_type="audio/mpeg",
        headers={"Content-Disposition": f'attachment; filename="podcast-{safe_name}.mp3"'},
    )


# =============================================================================
# ANÁLISE DO DIA
#
# A pessoa escolhe uma data, o sistema diz onde os cinco planetas rápidos estão
# pisando no mapa DELA e o que isso abre. É o que ela volta para usar: o mapa
# natal se lê uma vez, isto se consulta sempre.
#
# Guardamos cada análise por (usuário, data) e reaproveitamos: o mesmo dia dá o
# mesmo céu, então recalcular é pagar IA duas vezes pela mesma resposta.
# `forcar=true` ignora o cache, para quando o Crassus revisar os 60 textos.
# =============================================================================

_LIMITE_PASSADO = 365 * 2    # dois anos para trás: histórico já vivido
_LIMITE_FUTURO = 365         # um ano para frente: além disso não é leitura, é adivinhação


class AnaliseRequest(BaseModel):
    data: date
    data_fim: Optional[date] = None
    forcar: bool = False
    # O que está em jogo para a pessoa nesta leitura. Vem junto com a data, e
    # não do cadastro: pergunta guardada no perfil envelhece em duas semanas.
    area: Optional[str] = None
    pergunta: Optional[str] = None


def _dados_de_nascimento(user: User) -> tuple:
    """Confere o que o cálculo exige e devolve pronto. 422 quando falta."""
    faltando = [
        campo for campo, valor in (
            ("data de nascimento", user.birth_date),
            ("latitude", user.lat),
            ("longitude", user.lng),
        ) if valor in (None, "")
    ]
    if faltando:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Faltam dados de nascimento para calcular: {', '.join(faltando)}.",
        )

    hora = user.birth_time
    nascimento = datetime(
        user.birth_date.year, user.birth_date.month, user.birth_date.day,
        hora.hour if hora else 12, hora.minute if hora else 0,
    )
    return nascimento, float(user.lat), float(user.lng), bool(hora)


def _serializar(a: Analise, hora_conhecida: bool = True) -> dict:
    ctx = a.contexto or {}
    return {
        "id": a.id,
        "data": a.data_alvo.isoformat(),
        "data_fim": ctx.get("data_fim"),
        "movimentos_periodo": ctx.get("movimentos_periodo") or [],
        "posicoes": [
            {**p, "texto": (a.textos or {}).get(p.get("planeta"), "")}
            for p in (a.posicoes or [])
        ],
        "contexto": ctx,
        "sintese": a.sintese or "",
        "svg": a.svg_content or "",
        "status": a.status,
        "openai_cost": ctx.get("openai_cost"),
        "hora_de_nascimento_conhecida": hora_conhecida,
        "created_at": a.created_at,
    }


@router.post("/analise")
async def criar_analise(
    body: AnaliseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """A leitura da própria pessoa. A conta mora no serviço, que o painel usa também."""
    return await gerar_analise(
        user=current_user, db=db, data_alvo=body.data, data_fim=body.data_fim,
        area=body.area, pergunta=body.pergunta, forcar=body.forcar,
    )


@router.get("/analises")
def listar_analises(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """O histórico lateral: as datas já consultadas, da mais recente para trás.

    Sem posições, textos nem SVG de propósito: é uma lista de links. O corpo de
    cada análise vem de /members/analise, que já devolve do cache.
    """
    analises = (
        db.query(Analise)
        .filter(Analise.user_id == current_user.id)
        .order_by(Analise.data_alvo.desc())
        .limit(60)
        .all()
    )
    return [
        {
            "id": a.id,
            "data": a.data_alvo.isoformat(),
            "data_fim": (a.contexto or {}).get("data_fim"),
            "status": a.status,
            "tem_sintese": bool(a.sintese),
            "contexto": a.contexto or {},
            "created_at": a.created_at,
        }
        for a in analises
    ]


@router.get("/areas")
def listar_areas():
    """As áreas que a pessoa pode apontar como em jogo na leitura.

    Sai do backend e não do frontend porque é o mesmo mapa que decide a
    reordenação: duas listas separadas sairiam do ar uma da outra.
    """
    return [{"id": k, "rotulo": v["rotulo"]} for k, v in AREAS.items()]
