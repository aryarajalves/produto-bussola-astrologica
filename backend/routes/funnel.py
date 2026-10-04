import uuid
import logging
import asyncio
from datetime import date, time, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from models.models import User, Chart, ChartSection, GenerationLog
from database import get_db
from routes.auth import hash_password, create_token
from services.geocoding_service import city_to_coordinates
from services.astro_service import generate_birth_chart
from services.ai_service import generate_sections
from services.email_service import send_boas_vindas

router = APIRouter(prefix="/funnel", tags=["funnel"])
logger = logging.getLogger(__name__)

SECTION_ORDER = [
    "portal", "essencia", "ferida_e_dom",
    "dons_esquecidos", "luz_e_sombra", "reencontro",
    "rituais", "afirmagias",
]


class FunnelSubmit(BaseModel):
    name: str
    email: EmailStr
    whatsapp: Optional[str] = ""
    birth_date: date
    birth_time: str                          # "HH:MM"
    birth_city: str
    birth_state: Optional[str] = ""
    birth_country: Optional[str] = "Brasil"

    # Pré-geocodificado pelo frontend (autocomplete)
    # Se fornecido, pula a geocodificação no backend
    lat: Optional[float] = None
    lng: Optional[float] = None
    tz_str: Optional[str] = None            # Ex: "America/Argentina/Corientes"

    # Horário de verão — relevante apenas para horas ambíguas (fall-back do DST)
    # None = automático (pytz decide pelo histórico do timezone)
    # True = a hora informada É no horário de verão
    # False = a hora informada NÃO é no horário de verão
    is_dst: Optional[bool] = None

    focus_areas: List[str] = []
    form_vida_agora: Optional[str] = ""
    form_carrega_tempo: Optional[str] = ""
    form_espera_descobrir: Optional[str] = ""


@router.post("/submit")
async def submit_funnel(body: FunnelSubmit, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == body.email).first()

    # ── Geocodificação ──
    # Se lat/lng já vieram do autocomplete, usa direto
    if body.lat is not None and body.lng is not None:
        coords = {
            "lat": body.lat,
            "lng": body.lng,
            "tz_str": body.tz_str or "America/Sao_Paulo",
        }
    else:
        # Fallback: geocodificação por nome (compatibilidade com entradas antigas)
        try:
            coords = await asyncio.to_thread(
                city_to_coordinates,
                body.birth_city,
                body.birth_state or "",
                body.birth_country or "Brasil",
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    tz_str = coords.get("tz_str") or "America/Sao_Paulo"

    try:
        parts = body.birth_time.split(":")
        hour, minute = int(parts[0]), int(parts[1])
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("out of range")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Hora inválida. Use formato HH:MM com hora 0–23 e minuto 0–59.",
        )

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
            city_name=body.birth_city,
            country_name=body.birth_country or "Brasil",
        )
    except Exception as e:
        logger.error(f"Erro no astro_service: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar o mapa astral.",
        )

    chart_data = astro["chart_data"]
    svg_content = astro["svg"]

    form_answers = {
        "vida_agora": body.form_vida_agora or "",
        "carrega_tempo": body.form_carrega_tempo or "",
        "espera_descobrir": body.form_espera_descobrir or "",
    }

    # Registra a tentativa no histórico de logs para auditoria no admin
    gen_log = GenerationLog(
        name=body.name,
        email=body.email,
        whatsapp=body.whatsapp or "",
        birth_city=body.birth_city,
        birth_date=str(body.birth_date),
        birth_time=f"{hour}:{minute}",
        status="in_progress",
        model_used="gpt-4o",
    )
    db.add(gen_log)
    db.commit()

    try:
        sections_dict = await generate_sections(
            chart_data=chart_data,
            form_answers=form_answers,
            focus_areas=body.focus_areas,
            name=body.name,
        )
        gen_log.status = "success"
        db.commit()
    except Exception as e:
        err_msg = str(e)
        if "credit_balance_exhausted" in err_msg or "429" in err_msg:
            gen_log.error_message = "Créditos da OpenAI esgotados (credit_balance_exhausted)"
        else:
            gen_log.error_message = f"Erro na IA: {err_msg[:200]}"
        gen_log.status = "failed"
        db.commit()
        logger.error(f"Erro no ai_service: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar a leitura do mapa.",
        )

    import random
    password = f"sirius{random.randint(100000, 999999)}"
    
    if existing_user:
        # Usuário já cadastrado — atualiza os dados de nascimento, mantém o role (inclusive admin) e gera um novo mapa
        user = existing_user
        user.name = body.name
        user.whatsapp = body.whatsapp or ""
        user.password_hash = hash_password(password)
        user.birth_date = body.birth_date
        user.birth_time = time(hour, minute)
        user.birth_city = body.birth_city
        user.birth_state = body.birth_state or ""
        user.birth_country = body.birth_country or "Brasil"
        user.tz_str = tz_str
        user.lat = coords["lat"]
        user.lng = coords["lng"]
        user.sun_sign = chart_data["sun"]["sign"]
        user.moon_sign = chart_data["moon"]["sign"]
        user.rising_sign = chart_data["rising"]["sign"]
        user.focus_areas = body.focus_areas
        user.form_vida_agora = body.form_vida_agora or ""
        user.form_carrega_tempo = body.form_carrega_tempo or ""
        user.form_espera_descobrir = body.form_espera_descobrir or ""
        
        # Remove mapas antigos e suas seções para evitar duplicados
        old_charts = db.query(Chart).filter(Chart.user_id == user.id).all()
        for oc in old_charts:
            db.query(ChartSection).filter(ChartSection.chart_id == oc.id).delete()
            db.delete(oc)
        db.flush()
    else:
        # Novo usuário
        user = User(
            name=body.name,
            email=body.email,
            whatsapp=body.whatsapp or "",
            password_hash=hash_password(password),
            birth_date=body.birth_date,
            birth_time=time(hour, minute),
            birth_city=body.birth_city,
            birth_state=body.birth_state or "",
            birth_country=body.birth_country or "Brasil",
            tz_str=tz_str,
            lat=coords["lat"],
            lng=coords["lng"],
            sun_sign=chart_data["sun"]["sign"],
            moon_sign=chart_data["moon"]["sign"],
            rising_sign=chart_data["rising"]["sign"],
            focus_areas=body.focus_areas,
            form_vida_agora=body.form_vida_agora or "",
            form_carrega_tempo=body.form_carrega_tempo or "",
            form_espera_descobrir=body.form_espera_descobrir or "",
            role="client",
        )
        db.add(user)
        db.flush()

    chart = Chart(
        user_id=user.id,
        svg_content=svg_content,
        chart_data=chart_data,
        status="ready",
        sun_sign=chart_data["sun"]["sign"],
        moon_sign=chart_data["moon"]["sign"],
        rising_sign=chart_data["rising"]["sign"],
        delivered_at=datetime.utcnow(),
    )
    db.add(chart)
    db.flush()

    for order, key in enumerate(SECTION_ORDER):
        db.add(ChartSection(
            chart_id=chart.id,
            section_key=key,
            content=sections_dict.get(key, ""),
            section_order=order,
        ))

    db.commit()

    # Envia email de boas-vindas com credenciais (falha silenciosa — não bloqueia o fluxo)
    email_sent = await asyncio.to_thread(
        send_boas_vindas,
        to_email=body.email,
        name=body.name,
        password=password,
        sun_sign=chart_data["sun"]["sign"],
    )

    # Grava status do email
    user.email_status = "sent" if email_sent else "failed"
    user.email_sent_at = datetime.utcnow() if email_sent else None
    db.commit()

    token = create_token(user.id, user.role)
    return {
        "token": token,
        "user_id": user.id,
        "sun_sign": user.sun_sign,
        "moon_sign": user.moon_sign,
        "rising_sign": user.rising_sign,
        "password": password,
        "message": "Seu mapa está pronto",
    }


@router.get("/beta-test")
async def beta_test(db: Session = Depends(get_db)):
    """
    Beta Tester: Executa testes de integração de ponta a ponta
    para garantir que todos os componentes do sistema estão funcionando.
    Verifica: Banco de Dados, Geocodificação, Astrologia e IA (OpenAI).
    """
    results = {}
    
    # 1. Teste de Banco de Dados
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        results["database"] = {"status": "success", "message": "Conexão com o banco de dados OK."}
    except Exception as e:
        results["database"] = {"status": "failed", "message": f"Erro no banco de dados: {str(e)}"}

    # 2. Teste de Geocodificação (Open-Meteo + Nominatim)
    try:
        from services.geocoding_service import search_cities
        cities = search_cities("Passo Fundo")
        if cities:
            results["geocoding"] = {
                "status": "success", 
                "message": f"Geocodificação funcionando. Cidades encontradas: {len(cities)}",
                "sample": cities[0]["display"]
            }
        else:
            results["geocoding"] = {"status": "failed", "message": "Nenhum resultado retornado para Passo Fundo."}
    except Exception as e:
        results["geocoding"] = {"status": "failed", "message": f"Erro na geocodificação: {str(e)}"}

    # 3. Teste de Astrologia (Kerykeion / generate_birth_chart)
    try:
        from services.astro_service import generate_birth_chart
        # Dados de teste (São Paulo, 1995-05-15 12:00)
        astro = generate_birth_chart(
            name="Teste Beta",
            year=1995,
            month=5,
            day=15,
            hour=12,
            minute=0,
            lat=-23.5475,
            lng=-46.6361,
            tz_str="America/Sao_Paulo",
            is_dst=False,
            city_name="São Paulo",
            country_name="Brasil"
        )
        results["astrology"] = {
            "status": "success",
            "message": "Cálculo astrológico e geração de SVG OK.",
            "sun_sign": astro["chart_data"]["sun"]["sign"],
            "rising_sign": astro["chart_data"]["rising"]["sign"]
        }
    except Exception as e:
        results["astrology"] = {"status": "failed", "message": f"Erro no cálculo astrológico: {str(e)}"}

    # 4. Teste de Inteligência Artificial (OpenAI gpt-4o)
    try:
        from services.ai_service import client, _SYSTEM_PROMPT
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": "Olá, isto é um teste do sistema de leitura. Responda apenas com a palavra 'OK' se você me ouve."}
            ],
            max_completion_tokens=10,
            temperature=0.0
        )
        ai_response = response.choices[0].message.content.strip()
        results["ai"] = {
            "status": "success",
            "message": f"Conexão com a OpenAI e modelo gpt-4o OK. Resposta: {ai_response}"
        }
    except Exception as e:
        results["ai"] = {"status": "failed", "message": f"Erro na conexão com a OpenAI: {str(e)}"}

    # Determina o status geral do sistema
    all_success = all(v["status"] == "success" for v in results.values())
    
    return {
        "status": "operational" if all_success else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "components": results
    }

