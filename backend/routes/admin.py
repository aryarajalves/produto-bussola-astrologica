import io
import uuid
import logging
import asyncio
from datetime import date, time, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session

from models.models import User, Chart, ChartSection, GenerationLog, UserInvite
from database import get_db
from routes.auth import require_admin, hash_password, create_token
from services.geocoding_service import city_to_coordinates
from services.astro_service import generate_birth_chart
from services.ai_service import generate_sections, generate_missing_sections
from services.pdf_service import generate_pdf
from services.email_service import send_boas_vindas

from services.client_service import get_client_detail_polymorphic

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)

SECTION_ORDER = [
    "portal", "essencia", "ferida_e_dom",
    "dons_esquecidos", "luz_e_sombra", "reencontro",
    "rituais", "afirmagias",
]


@router.get("/generation-logs")
def list_generation_logs(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    logs = db.query(GenerationLog).order_by(GenerationLog.created_at.desc()).limit(limit).all()
    out = []
    for l in logs:
        # Tenta resolver o client_id através do email do log
        resolved_client_id = None
        if l.email:
            matched_user = db.query(User).filter(func.lower(User.email) == l.email.strip().lower()).first()
            if matched_user:
                resolved_client_id = str(matched_user.id)

        created_str = None
        if l.created_at:
            created_str = l.created_at.isoformat()
            if not created_str.endswith("Z"):
                created_str += "Z"

        out.append({
            "id": l.id,
            "created_at": created_str,
            "name": l.name,
            "email": l.email,
            "whatsapp": l.whatsapp,
            "birth_city": l.birth_city,
            "birth_date": l.birth_date,
            "birth_time": l.birth_time,
            "status": l.status,
            "error_message": l.error_message,
            "model_used": l.model_used,
            "client_id": resolved_client_id,
        })
    return out

# Chaves legadas (clientes antigos) → chaves novas
_KEY_MIGRATION = {
    "introducao":      "portal",
    "primeiro_portal": "essencia",
    "segundo_portal":  "ferida_e_dom",
    "terceiro_portal": "dons_esquecidos",
    "quarto_portal":   "luz_e_sombra",
    "quinto_portal":   "reencontro",
}


# ── Dashboard ──────────────────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard(admin=Depends(require_admin), db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=7)

    total = db.query(func.count(User.id)).filter(User.role == "client").scalar()
    new_today = (
        db.query(func.count(User.id))
        .filter(User.role == "client", cast(User.created_at, Date) == today)
        .scalar()
    )
    this_week = (
        db.query(func.count(User.id))
        .filter(User.role == "client", User.created_at >= week_start)
        .scalar()
    )
    pending = db.query(func.count(Chart.id)).filter(Chart.status == "pending").scalar()
    ready = db.query(func.count(Chart.id)).filter(Chart.status == "ready").scalar()
    conversion_rate = round((ready / total * 100) if total else 0, 1)

    dist_rows = (
        db.query(User.sun_sign, func.count(User.id))
        .filter(User.role == "client", User.sun_sign.isnot(None))
        .group_by(User.sun_sign)
        .all()
    )
    distribution_by_sign = [{"sign": row[0], "count": row[1]} for row in dist_rows]

    return {
        "total_clients": total,
        "new_today": new_today,
        "this_week": this_week,
        "pending": pending,
        "ready": ready,
        "conversion_rate": conversion_rate,
        "distribution_by_sign": distribution_by_sign,
    }


# ── Clients list ───────────────────────────────────────────────────────────

@router.get("/clients")
def list_clients(
    sign: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(User).filter(User.role == "client")
    if sign:
        q = q.filter(User.sun_sign == sign)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (User.name.ilike(like)) | (User.email.ilike(like)) | (User.sun_sign.ilike(like))
        )
    if status_filter:
        q = q.join(Chart, Chart.user_id == User.id).filter(Chart.status == status_filter)
    if start_date:
        q = q.filter(cast(User.created_at, Date) >= start_date)
    if end_date:
        q = q.filter(cast(User.created_at, Date) <= end_date)

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    results = []
    for u in users:
        chart = (
            db.query(Chart).filter(Chart.user_id == u.id).order_by(Chart.created_at.desc()).first()
        )
        results.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "whatsapp": u.whatsapp,
            "sun_sign": u.sun_sign,
            "moon_sign": u.moon_sign,
            "rising_sign": u.rising_sign,
            "birth_date": str(u.birth_date) if u.birth_date else None,
            "birth_time": str(u.birth_time)[:5] if u.birth_time else None,
            "birth_city": u.birth_city,
            "birth_state": u.birth_state,
            "birth_country": u.birth_country or "Brasil",
            "tz_str": u.tz_str,
            "status": chart.status if chart else None,
            "focus_areas": u.focus_areas,
            "lat": u.lat,
            "lng": u.lng,
            "created_at": u.created_at,
            "email_status": u.email_status or "not_sent",
            "email_sent_at": u.email_sent_at,
        })

    return {"total": total, "page": page, "limit": limit, "items": results}


# ── Panel Users (Gestão de Usuários) ─────────────────────────────────────────

class UpdatePanelUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    whatsapp: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class BatchDeleteUsersRequest(BaseModel):
    ids: List[str]


@router.get("/users")
def list_panel_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lista todos os usuários do sistema identificando super administradores."""
    import os
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()

    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            (User.name.ilike(like)) | (User.email.ilike(like)) | (User.whatsapp.ilike(like))
        )

    users = q.order_by(User.created_at.desc()).all()
    items = []
    for u in users:
        is_super = (u.email.strip().lower() == super_admin_email) if u.email else False
        is_cur = (str(u.id) == str(current_user.id))
        items.append({
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "whatsapp": u.whatsapp,
            "role": u.role,
            "is_active": u.is_active,
            "is_super_admin": is_super,
            "is_current_user": is_cur,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "sun_sign": u.sun_sign,
            "birth_city": u.birth_city,
        })

    # Super admin no topo
    items.sort(key=lambda x: (not x["is_super_admin"],))

    return {"items": items, "total": len(items)}


@router.put("/users/{user_id}")
def update_panel_user(
    user_id: str,
    body: UpdatePanelUserRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Atualiza as informações de um usuário do painel, impedindo edição do Super Admin."""
    import os
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    if user.email and user.email.strip().lower() == super_admin_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido alterar as credenciais ou papel do Super Admin.",
        )

    if body.email:
        clean_email = str(body.email).strip().lower()
        conflict = db.query(User).filter(func.lower(User.email) == clean_email, User.id != user_id).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este e-mail já está sendo utilizado por outro usuário.",
            )
        user.email = clean_email

    if body.name is not None:
        user.name = body.name.strip()
    if body.whatsapp is not None:
        user.whatsapp = body.whatsapp.strip() or None
    if body.role is not None:
        user.role = body.role.strip()
    if body.is_active is not None:
        user.is_active = body.is_active

    db.commit()
    db.refresh(user)

    is_super = (user.email.strip().lower() == super_admin_email) if user.email else False
    is_cur = (str(user.id) == str(current_user.id))

    return {
        "success": True,
        "message": "Usuário atualizado com sucesso.",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "whatsapp": user.whatsapp,
            "role": user.role,
            "is_active": user.is_active,
            "is_super_admin": is_super,
            "is_current_user": is_cur,
        },
    }


@router.delete("/users/batch")
@router.post("/users/batch-delete")
def delete_panel_users_batch(
    body: BatchDeleteUsersRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Exclui múltiplos usuários em lote, protegendo o Super Admin e o próprio usuário logado."""
    if not body.ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum usuário informado para exclusão.",
        )

    import os
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()

    super_admin_protected = False
    deleted_count = 0

    try:
        for uid in body.ids:
            # Não deleta o próprio admin logado
            if str(uid) == str(current_user.id):
                super_admin_protected = True
                continue

            target_user = db.query(User).filter(User.id == uid).first()
            if not target_user:
                continue

            if target_user.email and target_user.email.strip().lower() == super_admin_email:
                super_admin_protected = True
                continue

            # Remove mapas e seções vinculados
            charts = db.query(Chart).filter(Chart.user_id == target_user.id).all()
            for ch in charts:
                db.query(ChartSection).filter(ChartSection.chart_id == ch.id).delete(synchronize_session=False)
                db.delete(ch)

            # Desvincula convites para evitar violação de integridade referencial (FK)
            db.query(UserInvite).filter(UserInvite.used_by_id == target_user.id).update(
                {"used_by_id": None}, synchronize_session=False
            )
            db.query(UserInvite).filter(UserInvite.created_by_id == target_user.id).update(
                {"created_by_id": None}, synchronize_session=False
            )

            db.delete(target_user)
            deleted_count += 1

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao excluir usuários em lote: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir usuários: {str(e)}",
        )

    return {
        "success": True,
        "deleted_count": deleted_count,
        "super_admin_protected": super_admin_protected,
        "message": f"{deleted_count} usuário(s) excluído(s) com sucesso.",
    }


# ── Complete missing sections (registrado ANTES de /{client_id}) ──────────

@router.post("/clients/{client_id}/complete-sections")
async def complete_client_sections(
    client_id: str,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Gera apenas as seções faltantes (rituais, afirmagias) para clientes
    antigos, sem refazer o mapa completo.
    """
    user = db.query(User).filter(User.id == client_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")

    chart = (
        db.query(Chart).filter(Chart.user_id == user.id).order_by(Chart.created_at.desc()).first()
    )
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapa não encontrado para este cliente.")

    if not chart.chart_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dados astrológicos não disponíveis — não é possível completar o mapa.",
        )

    # Carrega seções existentes e normaliza chaves legadas
    existing_db = (
        db.query(ChartSection)
        .filter(ChartSection.chart_id == chart.id)
        .all()
    )
    existing_by_new_key: dict[str, str] = {}
    for s in existing_db:
        new_key = _KEY_MIGRATION.get(s.section_key, s.section_key)
        existing_by_new_key[new_key] = s.content

    # Descobre quais seções estão faltando
    missing_keys = [
        k for k in SECTION_ORDER
        if not existing_by_new_key.get(k, "").strip()
    ]

    if not missing_keys:
        return {"message": "Todas as seções já estão preenchidas.", "added": []}

    form_answers = {
        "vida_agora":       user.form_vida_agora or "",
        "carrega_tempo":    user.form_carrega_tempo or "",
        "espera_descobrir": user.form_espera_descobrir or "",
    }

    try:
        new_sections = await generate_missing_sections(
            chart_data=chart.chart_data,
            form_answers=form_answers,
            focus_areas=user.focus_areas or [],
            name=user.name,
            existing_sections=existing_by_new_key,
            missing_keys=missing_keys,
        )
    except Exception as e:
        logger.error(f"Erro ao completar seções para '{user.name}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar as seções: {str(e)}",
        )

    # Salva as novas seções no banco
    added: list[str] = []
    for key in missing_keys:
        content = new_sections.get(key, "").strip()
        if not content:
            logger.warning(f"Seção '{key}' veio vazia na complementação de '{user.name}'")
            continue
        order = SECTION_ORDER.index(key)
        db.add(ChartSection(
            chart_id=chart.id,
            section_key=key,
            content=content,
            section_order=order,
        ))
        added.append(key)

    db.commit()

    all_sections = (
        db.query(ChartSection)
        .filter(ChartSection.chart_id == chart.id)
        .order_by(ChartSection.section_order)
        .all()
    )

    return {
        "message": f"Seções adicionadas: {added}" if added else "Nenhuma seção nova foi gerada.",
        "added": added,
        "sections": [
            {"section_key": s.section_key, "section_order": s.section_order, "content": s.content}
            for s in all_sections
        ],
    }


# ── Client PDF download  (registrado ANTES de /{client_id} para evitar shadowing) ──

@router.get("/clients/{client_id}/pdf")
def download_client_pdf(
    client_id: str,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == client_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")

    chart = (
        db.query(Chart).filter(Chart.user_id == user.id).order_by(Chart.created_at.desc()).first()
    )

    sections_dict: dict = {}
    if chart:
        db_sections = (
            db.query(ChartSection)
            .filter(ChartSection.chart_id == chart.id)
            .order_by(ChartSection.section_order)
            .all()
        )
        sections_dict = {s.section_key: s.content for s in db_sections}

    birth_date_str = ""
    if user.birth_date:
        try:
            birth_date_str = user.birth_date.strftime("%d/%m/%Y")
        except Exception:
            birth_date_str = str(user.birth_date)

    try:
        pdf_bytes = generate_pdf(
            name=user.name,
            sun_sign=user.sun_sign or "",
            moon_sign=user.moon_sign or "",
            rising_sign=user.rising_sign or "",
            birth_date=birth_date_str,
            birth_city=user.birth_city or "",
            birth_country=getattr(user, "birth_country", "Brasil") or "Brasil",
            sections=sections_dict,
            svg_content=chart.svg_content if chart else "",
        )
    except Exception as e:
        logger.error(f"Erro ao gerar PDF para '{user.name}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar o PDF: {str(e)}",
        )

    safe_name = user.name.lower().replace(" ", "-")
    filename = f"mapa-astral-{safe_name}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Client detail ──────────────────────────────────────────────────────────

@router.get("/clients/{client_id}")
def get_client(client_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    data = get_client_detail_polymorphic(client_id, db)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")
    return data


# ── Delete client ──────────────────────────────────────────────────────────

@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Remove permanentemente um cliente e todos os seus dados (mapa + seções).
    """
    user = db.query(User).filter(User.id == client_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")

    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não é possível apagar um usuário admin.",
        )

    # Apaga seções, mapas e desvincula convites antes de excluir o usuário
    try:
        charts = db.query(Chart).filter(Chart.user_id == client_id).all()
        for chart in charts:
            db.query(ChartSection).filter(ChartSection.chart_id == chart.id).delete(synchronize_session=False)
            db.delete(chart)

        # Desvincula convites para evitar violação de Foreign Key
        db.query(UserInvite).filter(UserInvite.used_by_id == user.id).update(
            {"used_by_id": None}, synchronize_session=False
        )
        db.query(UserInvite).filter(UserInvite.created_by_id == user.id).update(
            {"created_by_id": None}, synchronize_session=False
        )

        db.delete(user)
        db.commit()
        logger.info("Cliente '%s' (%s) removido pelo admin.", user.name, user.email)
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao excluir cliente {client_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir cliente: {str(e)}",
        )


# ── Reenviar acesso ────────────────────────────────────────────────────────

@router.post("/clients/{client_id}/resend-access")
async def resend_access(
    client_id: str,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Gera nova senha para o cliente, atualiza o banco, reenvia o email
    e retorna a nova senha em texto claro para o admin ver uma única vez.
    """
    import random
    user = db.query(User).filter(User.id == client_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")
    if user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Não é possível alterar senha de admin.")

    new_password = f"sirius{random.randint(100000, 999999)}"
    user.password_hash = hash_password(new_password)
    db.commit()

    email_sent = await asyncio.to_thread(
        send_boas_vindas,
        to_email=user.email,
        name=user.name,
        password=new_password,
        sun_sign=user.sun_sign or "",
    )

    user.email_status = "sent" if email_sent else "failed"
    user.email_sent_at = datetime.utcnow() if email_sent else user.email_sent_at
    db.commit()

    logger.info(
        "Acesso reenviado para '%s' (%s) | email_sent=%s",
        user.name, user.email, email_sent,
    )

    return {
        "message": "Nova senha gerada e email reenviado com sucesso." if email_sent else "Nova senha gerada (email falhou — envie manualmente).",
        "email": user.email,
        "new_password": new_password,
        "email_sent": email_sent,
    }


# ── Update email ───────────────────────────────────────────────────────────

class EmailUpdate(BaseModel):
    email: EmailStr


@router.patch("/clients/{client_id}/email")
async def update_email(
    client_id: str,
    body: EmailUpdate,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Atualiza o email do cliente e reenvia o email de boas-vindas
    com nova senha para o endereço atualizado.
    """
    user = db.query(User).filter(User.id == client_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Não é possível alterar email de administradores.")

    # Verifica se o novo email já pertence a outro usuário
    existing = db.query(User).filter(User.email == body.email, User.id != client_id).first()
    if existing:
        if existing.role == "admin":
            raise HTTPException(
                status_code=409,
                detail=f"Este email já está cadastrado na conta de administrador '{existing.name}'. Para usá-lo aqui, primeiro altere o email da conta admin.",
            )
        raise HTTPException(status_code=409, detail=f"Este email já está cadastrado para o cliente '{existing.name}'.")

    old_email = user.email
    import random
    new_password = f"sirius{random.randint(100000, 999999)}"

    user.email = body.email
    user.password_hash = hash_password(new_password)
    user.email_status = "not_sent"
    db.commit()

    # Reenvia email para o novo endereço
    import asyncio
    email_sent = await asyncio.to_thread(
        send_boas_vindas,
        to_email=user.email,
        name=user.name,
        password=new_password,
        sun_sign=user.sun_sign or "",
    )
    user.email_status = "sent" if email_sent else "failed"
    user.email_sent_at = __import__("datetime").datetime.utcnow() if email_sent else user.email_sent_at
    db.commit()

    logger.info(
        "Admin atualizou email de '%s': %s → %s (email_sent=%s)",
        user.name, old_email, user.email, email_sent,
    )

    return {
        "message": f"Email atualizado para {user.email}.",
        "email_sent": email_sent,
        "password": new_password,
    }


# ── Update birth data ──────────────────────────────────────────────────────

class BirthDataUpdate(BaseModel):
    birth_date: Optional[date] = None
    birth_time: Optional[str] = None
    birth_city: Optional[str] = None
    birth_state: Optional[str] = None


@router.patch("/clients/{client_id}/birth-data")
async def update_birth_data(
    client_id: str,
    body: BirthDataUpdate,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Atualiza dados de nascimento do cliente sem regenerar o mapa."""
    user = db.query(User).filter(User.id == client_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")

    if body.birth_date is not None:
        user.birth_date = body.birth_date
    if body.birth_time is not None:
        try:
            hour, minute = [int(p) for p in body.birth_time.split(":")]
            user.birth_time = time(hour, minute)
        except Exception:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Formato de hora inválido. Use HH:MM.")
    if body.birth_city is not None:
        user.birth_city = body.birth_city
    if body.birth_state is not None:
        user.birth_state = body.birth_state

    db.commit()
    logger.info("Dados de nascimento de '%s' atualizados pelo admin.", user.name)
    return {"message": "Dados de nascimento atualizados com sucesso."}


# ── Regenerate chart ────────────────────────────────────────────────────────

@router.post("/clients/{client_id}/regenerate")
async def regenerate_chart(
    client_id: str,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Regenera mapa astral e leitura completa com os dados de nascimento atuais."""
    user = db.query(User).filter(User.id == client_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")

    if not user.birth_date or not user.birth_time:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Data e hora de nascimento são obrigatórias para regenerar o mapa.")

    # Geocodificação
    try:
        coords = await asyncio.to_thread(
            city_to_coordinates,
            user.birth_city or "",
            user.birth_state or "",
            getattr(user, "birth_country", "Brasil") or "Brasil",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    tz_str = coords.get("tz_str") or "America/Sao_Paulo"
    hour = user.birth_time.hour
    minute = user.birth_time.minute

    # Gera novo mapa astral
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
            city_name=user.birth_city or "",
            country_name=getattr(user, "birth_country", "Brasil") or "Brasil",
        )
    except Exception as e:
        logger.error(f"Erro no astro_service (regenerate): {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao gerar o mapa astral.")

    chart_data = astro["chart_data"]
    svg_content = astro["svg"]

    form_answers = {
        "vida_agora":       user.form_vida_agora or "",
        "carrega_tempo":    user.form_carrega_tempo or "",
        "espera_descobrir": user.form_espera_descobrir or "",
    }

    # Gera novas seções
    try:
        sections_dict = await generate_sections(
            chart_data=chart_data,
            form_answers=form_answers,
            focus_areas=user.focus_areas or [],
            name=user.name,
        )
    except Exception as e:
        logger.error(f"Erro no ai_service (regenerate): {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao gerar a leitura do mapa.")

    # Atualiza signos e coords do usuário
    user.lat = coords["lat"]
    user.lng = coords["lng"]
    user.tz_str = tz_str
    user.sun_sign = chart_data["sun"]["sign"]
    user.moon_sign = chart_data["moon"]["sign"]
    user.rising_sign = chart_data["rising"]["sign"]

    # Remove chart antigo
    old_chart = (
        db.query(Chart).filter(Chart.user_id == user.id).order_by(Chart.created_at.desc()).first()
    )
    if old_chart:
        db.query(ChartSection).filter(ChartSection.chart_id == old_chart.id).delete()
        db.delete(old_chart)
        db.flush()

    # Cria novo chart
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
    db.refresh(user)
    logger.info("Mapa de '%s' regenerado pelo admin.", user.name)

    return {
        "message": "Mapa da Alma regenerado com sucesso!",
        "sun_sign": user.sun_sign,
        "moon_sign": user.moon_sign,
        "rising_sign": user.rising_sign,
    }


# ── Status patch ───────────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    status: str


@router.patch("/clients/{client_id}/status")
def update_status(
    client_id: str,
    body: StatusUpdate,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if body.status not in ("ready", "pending"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Status deve ser 'ready' ou 'pending'.")

    chart = (
        db.query(Chart)
        .join(User, User.id == Chart.user_id)
        .filter(User.id == client_id)
        .order_by(Chart.created_at.desc())
        .first()
    )
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapa não encontrado.")

    chart.status = body.status
    db.commit()
    return {"status": chart.status}
