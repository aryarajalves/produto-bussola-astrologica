import uuid
import asyncio
import logging
from datetime import datetime, date, time as dtime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date

from database import get_db
from models.models import User, Chart, ChartSection, GenerationLog
from routes.auth import require_admin, hash_password
from services.astro_service import generate_birth_chart
from services.geocoding_service import city_to_coordinates
from services.ai_service import generate_sections
from services.email_service import send_boas_vindas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin-chart"])

SECTION_ORDER = [
    "portal", "essencia", "ferida_e_dom",
    "dons_esquecidos", "luz_e_sombra", "reencontro",
    "rituais", "afirmagias",
]

CAPITALS = {
    "AC": "Rio Branco", "AL": "Maceió", "AP": "Macapá", "AM": "Manaus",
    "BA": "Salvador", "CE": "Fortaleza", "DF": "Brasília", "ES": "Vitória",
    "GO": "Goiânia", "MA": "São Luís", "MT": "Cuiabá", "MS": "Campo Grande",
    "MG": "Belo Horizonte", "PA": "Belém", "PB": "João Pessoa", "PR": "Curitiba",
    "PE": "Recife", "PI": "Teresina", "RJ": "Rio de Janeiro", "RN": "Natal",
    "RS": "Porto Alegre", "RO": "Porto Velho", "RR": "Boa Vista", "SC": "Florianópolis",
    "SP": "São Paulo", "SE": "Aracaju", "TO": "Palmas",
}

def _get_zodiac_sign(day: int, month: int) -> str:
    zodiac = [
        (1, 20, "Capricórnio"), (2, 19, "Aquário"), (3, 20, "Peixes"),
        (4, 20, "Áries"), (5, 20, "Touro"), (6, 20, "Gêmeos"),
        (7, 22, "Câncer"), (8, 22, "Leão"), (9, 22, "Virgem"),
        (10, 22, "Libra"), (11, 21, "Escorpião"), (12, 21, "Sagitário"),
        (12, 31, "Capricórnio")
    ]
    for zm, zd, zs in zodiac:
        if (month == zm and day <= zd) or month < zm:
            return zs
    return "Capricórnio"

def _generate_fallback_sections(name: str, chart_data: dict) -> dict:
    sun = chart_data.get("sun", {}).get("sign", "o Cosmos")
    moon = chart_data.get("moon", {}).get("sign", "a Intuição")
    rising = chart_data.get("rising", {}).get("sign", "a Luz")

    return {
        "portal": f"Bem-vindo(a) ao seu mapa natal sagrado, {name}. As estrelas no momento do seu nascimento traçaram um alinhamento único e sagrado.",
        "essencia": f"Sua Tríade Sagrada vibra com o Sol em {sun}, a Lua em {moon} e o Ascendente em {rising}, tecendo sua personalidade e propósito de alma.",
        "ferida_e_dom": f"A posição de Quíron e dos Nodos Lunares convida à cura profunda, transformando dores passadas em seu maior dom.",
        "dons_esquecidos": f"Vênus e Marte no seu mapa revelam talentos natos e a forma única como você manifesta amor, coragem e abundância.",
        "luz_e_sombra": "Plutão e Lilith trazem à tona o poder da integração: reconhecer suas sombras para despertar sua força autêntica.",
        "reencontro": f"Este é o momento de reconexão consigo mesmo(a), {name}. Confie na sua jornada cósmica e no fluxo da vida.",
        "rituais": "Rituais de Integração sugeridos: Acenda uma vela com intenção de clareza, pratique respiração consciente e medite sob a lua.",
        "afirmagias": f"Eu, {name}, honro minha essência cósmica, integro meus dons celestes e caminho com confiança no meu propósito sagrado.",
    }

class ManualGenerate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    whatsapp: Optional[str] = ""
    birth_date: date
    birth_time: str
    birth_city: Optional[str] = ""
    birth_state: Optional[str] = ""
    birth_country: Optional[str] = "Brasil"
    lat: Optional[float] = None
    lng: Optional[float] = None
    tz_str: Optional[str] = None
    is_dst: Optional[bool] = None
    focus_areas: List[str] = []
    form_vida_agora: Optional[str] = ""
    form_carrega_tempo: Optional[str] = ""
    form_espera_descobrir: Optional[str] = ""
    save_only: Optional[bool] = False
    client_id: Optional[str] = None

@router.post("/generate-manual")
async def generate_manual(
    body: ManualGenerate,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    import time as _t
    import re as _re
    user_email = body.email
    existing = None
    if body.client_id:
        existing = db.query(User).filter(User.id == body.client_id).first()
    elif user_email:
        existing = db.query(User).filter(User.email == user_email).first()

    if not user_email:
        if existing and existing.email:
            user_email = existing.email
        else:
            clean_name = _re.sub(r"[^a-zA-Z0-9]", "", body.name.lower())[:12] or "lead"
            user_email = f"{clean_name}_{uuid.uuid4().hex[:6]}_{int(_t.time())}@bussola.local"

    birth_city = (body.birth_city or "").strip()
    if not birth_city:
        st_key = (body.birth_state or "").upper().strip()
        birth_city = CAPITALS.get(st_key) or body.birth_state or "Brasília"

    if body.lat is not None and body.lng is not None:
        coords = {
            "lat": body.lat,
            "lng": body.lng,
            "tz_str": body.tz_str or "America/Sao_Paulo",
        }
    else:
        try:
            coords = await asyncio.to_thread(
                city_to_coordinates,
                birth_city,
                body.birth_state or "",
                body.birth_country or "Brasil",
            )
        except Exception as e:
            logger.warning(f"Geocoding fallback: {e}")
            coords = {"lat": -23.5505, "lng": -46.6333, "tz_str": "America/Sao_Paulo"}

    tz_str = coords.get("tz_str") or "America/Sao_Paulo"

    try:
        hour, minute = [int(p) for p in body.birth_time.split(":")]
    except Exception:
        hour, minute = 12, 0

    try:
        astro = await asyncio.to_thread(
            generate_birth_chart,
            name=body.name,
            year=body.birth_date.year,
            month=body.birth_date.month,
            day=body.birth_date.day,
            hour=hour,
            minute=minute,
            lat=coords["lat"],
            lng=coords["lng"],
            tz_str=tz_str,
            is_dst=body.is_dst,
            city_name=birth_city,
            country_name=body.birth_country or "Brasil",
        )
        chart_data = astro.get("chart_data", {})
        svg_content = astro.get("svg", "")
        sun_sign = chart_data.get("sun", {}).get("sign", "")
        moon_sign = chart_data.get("moon", {}).get("sign", "")
        rising_sign = chart_data.get("rising", {}).get("sign", "")
    except Exception as e:
        logger.warning(f"Astro cálculo preliminar: {e}")
        chart_data = {}
        svg_content = ""
        sun_sign = _get_zodiac_sign(body.birth_date.day, body.birth_date.month)
        moon_sign = ""
        rising_sign = ""

    if existing:
        user = existing
        user.name = body.name
        user.whatsapp = body.whatsapp or ""
        user.birth_date = body.birth_date
        user.birth_time = dtime(hour, minute)
        user.birth_city = birth_city
        user.birth_state = body.birth_state or ""
        user.birth_country = body.birth_country or "Brasil"
        user.tz_str = tz_str
        user.lat = coords.get("lat")
        user.lng = coords.get("lng")
        if sun_sign:
            user.sun_sign = sun_sign
        if moon_sign:
            user.moon_sign = moon_sign
        if rising_sign:
            user.rising_sign = rising_sign
        user.focus_areas = body.focus_areas
        user.created_at = datetime.utcnow()
        db.flush()
    else:
        user = User(
            name=body.name,
            email=user_email,
            whatsapp=body.whatsapp or "",
            password_hash=hash_password(str(uuid.uuid4())),
            birth_date=body.birth_date,
            birth_time=dtime(hour, minute),
            birth_city=birth_city,
            birth_state=body.birth_state or "",
            birth_country=body.birth_country or "Brasil",
            tz_str=tz_str,
            lat=coords.get("lat"),
            lng=coords.get("lng"),
            sun_sign=sun_sign,
            moon_sign=moon_sign,
            rising_sign=rising_sign,
            focus_areas=body.focus_areas,
            role="client",
            email_status="not_sent",
        )
        db.add(user)
        db.flush()

    if body.save_only:
        chart = db.query(Chart).filter(Chart.user_id == user.id).first()
        if not chart:
            chart = Chart(
                user_id=user.id,
                svg_content=svg_content,
                chart_data=chart_data,
                status="pending",
                sun_sign=sun_sign,
                moon_sign=moon_sign,
                rising_sign=rising_sign,
            )
            db.add(chart)
        else:
            if sun_sign: chart.sun_sign = sun_sign
            if moon_sign: chart.moon_sign = moon_sign
            if rising_sign: chart.rising_sign = rising_sign
            if svg_content: chart.svg_content = svg_content
            if chart_data: chart.chart_data = chart_data

        gen_log = GenerationLog(
            name=user.name,
            email=user.email,
            whatsapp=user.whatsapp or "",
            birth_city=user.birth_city or "",
            birth_date=str(user.birth_date) if user.birth_date else "",
            birth_time=str(user.birth_time) if user.birth_time else "",
            status="success",
            error_message="",
            model_used="salvo no painel",
        )
        db.add(gen_log)
        db.commit()
        db.refresh(user)
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "sun_sign": user.sun_sign,
            "moon_sign": user.moon_sign,
            "rising_sign": user.rising_sign,
            "lat": user.lat,
            "lng": user.lng,
            "tz_str": user.tz_str,
            "status": "pending",
            "message": "Informações do lead salvas com sucesso para uso futuro.",
        }

    form_answers = {
        "vida_agora": body.form_vida_agora or "",
        "carrega_tempo": body.form_carrega_tempo or "",
        "espera_descobrir": body.form_espera_descobrir or "",
    }

    try:
        sections_dict = await generate_sections(
            chart_data=chart_data,
            form_answers=form_answers,
            focus_areas=body.focus_areas,
            name=body.name,
        )
    except Exception as e:
        logger.warning(f"IA indisponível, gerando interpretação com fallback: {e}")
        sections_dict = _generate_fallback_sections(user.name, chart_data)

    chart = db.query(Chart).filter(Chart.user_id == user.id).first()
    if not chart:
        chart = Chart(
            user_id=user.id,
            svg_content=svg_content,
            chart_data=chart_data,
            status="ready",
            sun_sign=chart_data.get("sun", {}).get("sign", sun_sign),
            moon_sign=chart_data.get("moon", {}).get("sign", moon_sign),
            rising_sign=chart_data.get("rising", {}).get("sign", rising_sign),
            delivered_at=datetime.utcnow(),
        )
        db.add(chart)
    else:
        chart.svg_content = svg_content
        chart.chart_data = chart_data
        chart.status = "ready"
        chart.sun_sign = chart_data.get("sun", {}).get("sign", sun_sign)
        chart.moon_sign = chart_data.get("moon", {}).get("sign", moon_sign)
        chart.rising_sign = chart_data.get("rising", {}).get("sign", rising_sign)
        chart.delivered_at = datetime.utcnow()
    db.flush()

    db.query(ChartSection).filter(ChartSection.chart_id == chart.id).delete()
    for order, key in enumerate(SECTION_ORDER):
        db.add(ChartSection(
            chart_id=chart.id,
            section_key=key,
            content=sections_dict.get(key, ""),
            section_order=order,
        ))

    gen_log = GenerationLog(
        name=user.name,
        email=user.email,
        whatsapp=user.whatsapp or "",
        birth_city=user.birth_city or "",
        birth_date=str(user.birth_date) if user.birth_date else "",
        birth_time=str(user.birth_time) if user.birth_time else "",
        status="success",
        error_message="",
        model_used="kerykeion / gemini",
    )
    db.add(gen_log)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "sun_sign": user.sun_sign,
        "moon_sign": user.moon_sign,
        "rising_sign": user.rising_sign,
        "lat": user.lat,
        "lng": user.lng,
        "tz_str": user.tz_str,
        "status": "ready",
        "chart_id": chart.id,
    }

@router.post("/clients/{client_id}/generate-chart")
async def generate_chart_for_client(
    client_id: str,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Gera o mapa astral de um lead existente, validando se faltam informações
    essenciais coletadas na Home.
    """
    user = db.query(User).filter(User.id == client_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    missing = []
    if not user.name or not user.name.strip():
        missing.append("Nome completo")
    if not user.birth_date:
        missing.append("Data de nascimento")
    if not user.birth_time:
        missing.append("Horário de nascimento")
    if not user.birth_country or not user.birth_country.strip():
        missing.append("País de nascimento")
    if not user.birth_state or not user.birth_state.strip():
        missing.append("Estado")

    if missing:
        missing_str = ", ".join(missing)
        raise HTTPException(
            status_code=400,
            detail=f"Estão faltando informações importantes para gerar o Mapa Astral de {user.name} ({missing_str}). Por favor, acerte as informações na aba Home."
        )

    birth_city = (user.birth_city or "").strip()
    if not birth_city:
        st_key = (user.birth_state or "").upper().strip()
        birth_city = CAPITALS.get(st_key) or user.birth_state or "Brasília"

    if user.lat is not None and user.lng is not None:
        coords = {
            "lat": user.lat,
            "lng": user.lng,
            "tz_str": user.tz_str or "America/Sao_Paulo",
        }
    else:
        try:
            coords = await asyncio.to_thread(
                city_to_coordinates,
                birth_city,
                user.birth_state or "",
                user.birth_country or "Brasil",
            )
        except Exception as e:
            logger.warning(f"Geocoding fallback: {e}")
            coords = {"lat": -23.5505, "lng": -46.6333, "tz_str": "America/Sao_Paulo"}

    tz_str = coords.get("tz_str") or "America/Sao_Paulo"
    hour = user.birth_time.hour
    minute = user.birth_time.minute

    try:
        astro = await asyncio.to_thread(
            generate_birth_chart,
            name=user.name,
            year=user.birth_date.year,
            month=user.birth_date.month,
            day=user.birth_date.day,
            hour=hour,
            minute=minute,
            lat=coords["lat"],
            lng=coords["lng"],
            tz_str=tz_str,
            is_dst=None,
            city_name=birth_city,
            country_name=user.birth_country or "Brasil",
        )
    except Exception as e:
        logger.error(f"Erro no astro_service: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao calcular coordenadas celestes do mapa astral.")

    chart_data = astro.get("chart_data", {})
    svg_content = astro.get("svg", "")
    sun_sign = chart_data.get("sun", {}).get("sign", "")
    moon_sign = chart_data.get("moon", {}).get("sign", "")
    rising_sign = chart_data.get("rising", {}).get("sign", "")

    form_answers = {
        "vida_agora": user.form_vida_agora or "",
        "carrega_tempo": user.form_carrega_tempo or "",
        "espera_descobrir": user.form_espera_descobrir or "",
    }

    try:
        sections_dict = await generate_sections(
            chart_data=chart_data,
            form_answers=form_answers,
            focus_areas=user.focus_areas or [],
            name=user.name,
        )
    except Exception as e:
        logger.warning(f"Geração com IA falhou, usando interpretação com fallback: {e}")
        sections_dict = _generate_fallback_sections(user.name, chart_data)

    user.sun_sign = sun_sign or user.sun_sign
    user.moon_sign = moon_sign or user.moon_sign
    user.rising_sign = rising_sign or user.rising_sign
    user.tz_str = tz_str
    user.lat = coords["lat"]
    user.lng = coords["lng"]
    db.flush()

    chart = db.query(Chart).filter(Chart.user_id == user.id).first()
    if not chart:
        chart = Chart(
            user_id=user.id,
            svg_content=svg_content,
            chart_data=chart_data,
            status="ready",
            sun_sign=sun_sign,
            moon_sign=moon_sign,
            rising_sign=rising_sign,
            delivered_at=datetime.utcnow(),
        )
        db.add(chart)
    else:
        chart.svg_content = svg_content
        chart.chart_data = chart_data
        chart.status = "ready"
        chart.sun_sign = sun_sign
        chart.moon_sign = moon_sign
        chart.rising_sign = rising_sign
        chart.delivered_at = datetime.utcnow()
    db.flush()

    db.query(ChartSection).filter(ChartSection.chart_id == chart.id).delete()
    for order, key in enumerate(SECTION_ORDER):
        db.add(ChartSection(
            chart_id=chart.id,
            section_key=key,
            content=sections_dict.get(key, ""),
            section_order=order,
        ))

    gen_log = GenerationLog(
        name=user.name,
        email=user.email,
        whatsapp=user.whatsapp or "",
        birth_city=user.birth_city or "",
        birth_date=str(user.birth_date) if user.birth_date else "",
        birth_time=str(user.birth_time) if user.birth_time else "",
        status="success",
        error_message="",
        model_used="kerykeion / gemini",
    )
    db.add(gen_log)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "status": "ready",
        "chart_id": chart.id,
        "sun_sign": user.sun_sign,
        "moon_sign": user.moon_sign,
        "rising_sign": user.rising_sign,
        "message": f"Mapa Astral de {user.name} gerado com sucesso!",
    }

class BatchGenerateRequest(BaseModel):
    client_ids: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

@router.post("/clients/batch-generate")
async def batch_generate_charts(
    body: BatchGenerateRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Gera mapas astrais em lote para os clientes filtrados por período ou IDs,
    notificando leads com informações faltantes.
    """
    q = db.query(User).filter(User.role == "client")
    if body.client_ids:
        q = q.filter(User.id.in_(body.client_ids))
    else:
        if body.start_date:
            q = q.filter(cast(User.created_at, Date) >= body.start_date)
        if body.end_date:
            q = q.filter(cast(User.created_at, Date) <= body.end_date)
    users = q.all()

    successes = []
    skipped_missing = []
    errors = []

    for u in users:
        missing = []
        if not u.name or not u.name.strip(): missing.append("Nome completo")
        if not u.birth_date: missing.append("Data de nascimento")
        if not u.birth_time: missing.append("Horário de nascimento")
        if not u.birth_country or not u.birth_country.strip(): missing.append("País de nascimento")
        if not u.birth_state or not u.birth_state.strip(): missing.append("Estado")

        if missing:
            skipped_missing.append({
                "id": u.id,
                "name": u.name,
                "missing": missing,
                "message": f"Estão faltando informações importantes de {u.name}: {', '.join(missing)}. Acesse a aba Home para preencher."
            })
            continue

        try:
            birth_city = (u.birth_city or "").strip()
            if not birth_city:
                st_key = (u.birth_state or "").upper().strip()
                birth_city = CAPITALS.get(st_key) or u.birth_state or "Brasília"

            if u.lat is not None and u.lng is not None:
                coords = {"lat": u.lat, "lng": u.lng, "tz_str": u.tz_str or "America/Sao_Paulo"}
            else:
                try:
                    coords = await asyncio.to_thread(city_to_coordinates, birth_city, u.birth_state or "", u.birth_country or "Brasil")
                except Exception:
                    coords = {"lat": -23.5505, "lng": -46.6333, "tz_str": "America/Sao_Paulo"}

            tz_str = coords.get("tz_str") or "America/Sao_Paulo"
            hour = u.birth_time.hour
            minute = u.birth_time.minute

            astro = await asyncio.to_thread(
                generate_birth_chart,
                name=u.name,
                year=u.birth_date.year,
                month=u.birth_date.month,
                day=u.birth_date.day,
                hour=hour,
                minute=minute,
                lat=coords["lat"],
                lng=coords["lng"],
                tz_str=tz_str,
                is_dst=None,
                city_name=birth_city,
                country_name=u.birth_country or "Brasil",
            )
            chart_data = astro.get("chart_data", {})
            svg_content = astro.get("svg", "")
            sun_sign = chart_data.get("sun", {}).get("sign", "")
            moon_sign = chart_data.get("moon", {}).get("sign", "")
            rising_sign = chart_data.get("rising", {}).get("sign", "")

            try:
                sections_dict = await generate_sections(
                    chart_data=chart_data,
                    form_answers={"vida_agora": u.form_vida_agora or "", "carrega_tempo": u.form_carrega_tempo or "", "espera_descobrir": u.form_espera_descobrir or ""},
                    focus_areas=u.focus_areas or [],
                    name=u.name,
                )
            except Exception:
                sections_dict = _generate_fallback_sections(u.name, chart_data)

            u.sun_sign = sun_sign or u.sun_sign
            u.moon_sign = moon_sign or u.moon_sign
            u.rising_sign = rising_sign or u.rising_sign
            u.tz_str = tz_str
            u.lat = coords["lat"]
            u.lng = coords["lng"]
            db.flush()

            chart = db.query(Chart).filter(Chart.user_id == u.id).first()
            if not chart:
                chart = Chart(user_id=u.id, svg_content=svg_content, chart_data=chart_data, status="ready", sun_sign=sun_sign, moon_sign=moon_sign, rising_sign=rising_sign, delivered_at=datetime.utcnow())
                db.add(chart)
            else:
                chart.svg_content = svg_content
                chart.chart_data = chart_data
                chart.status = "ready"
                chart.sun_sign = sun_sign
                chart.moon_sign = moon_sign
                chart.rising_sign = rising_sign
                chart.delivered_at = datetime.utcnow()
            db.flush()

            db.query(ChartSection).filter(ChartSection.chart_id == chart.id).delete()
            for order, key in enumerate(SECTION_ORDER):
                db.add(ChartSection(chart_id=chart.id, section_key=key, content=sections_dict.get(key, ""), section_order=order))

            db.commit()
            gen_log = GenerationLog(
                name=u.name,
                email=u.email,
                whatsapp=u.whatsapp or "",
                birth_city=u.birth_city or "",
                birth_date=str(u.birth_date) if u.birth_date else "",
                birth_time=str(u.birth_time) if u.birth_time else "",
                status="success",
                error_message="",
                model_used="kerykeion / gemini",
            )
            db.add(gen_log)
            db.commit()
            successes.append({"id": u.id, "name": u.name})
        except Exception as exc:
            errors.append({"id": u.id, "name": u.name, "error": str(exc)})

    return {
        "total_processed": len(users),
        "generated_count": len(successes),
        "skipped_missing_count": len(skipped_missing),
        "error_count": len(errors),
        "successes": successes,
        "skipped_missing": skipped_missing,
        "errors": errors,
    }


class BatchDeleteLogsRequest(BaseModel):
    ids: List[str]


@router.delete("/generation-logs/batch")
@router.post("/generation-logs/batch-delete")
def delete_generation_logs_batch(
    body: BatchDeleteLogsRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Exclui múltiplos registros do histórico de pesquisas/gerações em lote.
    """
    if not body.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum ID informado para exclusão.",
        )

    deleted_count = 0

    # 1. Deleta de generation_logs
    gen_logs = db.query(GenerationLog).filter(GenerationLog.id.in_(body.ids)).all()
    for gl in gen_logs:
        db.delete(gl)
        deleted_count += 1

    # 2. Deleta de charts (caso o registro exibido venha de chart fallback)
    charts = db.query(Chart).filter(Chart.id.in_(body.ids)).all()
    for ch in charts:
        db.query(ChartSection).filter(ChartSection.chart_id == ch.id).delete(synchronize_session=False)
        db.delete(ch)
        deleted_count += 1

    db.commit()

    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"{deleted_count} registro(s) do histórico excluído(s) com sucesso.",
    }


@router.delete("/generation-logs/{log_id}")
def delete_single_generation_log(
    log_id: str,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Exclui um único registro do histórico de pesquisas/gerações.
    """
    gl = db.query(GenerationLog).filter(GenerationLog.id == log_id).first()
    if gl:
        db.delete(gl)
        db.commit()
        return {"success": True, "message": "Registro do histórico excluído com sucesso."}

    ch = db.query(Chart).filter(Chart.id == log_id).first()
    if ch:
        db.query(ChartSection).filter(ChartSection.chart_id == ch.id).delete(synchronize_session=False)
        db.delete(ch)
        db.commit()
        return {"success": True, "message": "Registro do histórico excluído com sucesso."}

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro de histórico não encontrado.")

