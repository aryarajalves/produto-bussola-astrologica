import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Boolean, Date, Time,
    Text, Integer, ForeignKey, DateTime, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    whatsapp = Column(String)
    password_hash = Column(String, nullable=False)
    birth_date = Column(Date)
    birth_time = Column(Time)
    birth_city = Column(String)
    birth_state = Column(String)
    birth_country = Column(String, default="Brasil")
    tz_str = Column(String, default="America/Sao_Paulo")
    lat = Column(Float)
    lng = Column(Float)
    sun_sign = Column(String)
    moon_sign = Column(String)
    rising_sign = Column(String)
    focus_areas = Column(ARRAY(Text), default=list)
    form_vida_agora = Column(Text, default="")
    form_carrega_tempo = Column(Text, default="")
    form_espera_descobrir = Column(Text, default="")
    role = Column(String, default="client")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    email_status = Column(String, default="not_sent")   # not_sent | sent | failed
    email_sent_at = Column(DateTime, nullable=True)

    charts = relationship("Chart", back_populates="user")


class Chart(Base):
    __tablename__ = "charts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    svg_content = Column(Text)
    chart_data = Column(JSONB)
    status = Column(String, default="pending")
    sun_sign = Column(String)
    moon_sign = Column(String)
    rising_sign = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime)

    user = relationship("User", back_populates="charts")
    sections = relationship("ChartSection", back_populates="chart", order_by="ChartSection.section_order")


class ChartSection(Base):
    __tablename__ = "chart_sections"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    chart_id = Column(UUID(as_uuid=False), ForeignKey("charts.id"), nullable=False)
    section_key = Column(String, nullable=False)
    content = Column(Text)
    section_order = Column(Integer)

    chart = relationship("Chart", back_populates="sections")


class GenerationLog(Base):
    __tablename__ = "generation_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    created_at = Column(DateTime, default=datetime.utcnow)
    name = Column(String)
    email = Column(String)
    whatsapp = Column(String)
    birth_city = Column(String)
    birth_date = Column(String)
    birth_time = Column(String)
    status = Column(String, default="in_progress")  # in_progress | success | failed
    error_message = Column(Text, default="")
    model_used = Column(String, default="gpt-4o")


class UserInvite(Base):
    __tablename__ = "user_invites"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    token = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False, default="client")
    validity_type = Column(String, nullable=False, default="never")
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    is_used = Column(Boolean, nullable=False, default=False)
    used_at = Column(DateTime, nullable=True)
    used_by_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)


class RegistrationVerification(Base):
    __tablename__ = "registration_verifications"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    whatsapp = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    invite_token = Column(String(255), nullable=False)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class BackupConfig(Base):
    __tablename__ = "backup_configs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    is_active = Column(Boolean, default=True)
    frequency_hours = Column(Integer, default=6)
    b2_folder = Column(String(255), default="AreaDeMembros/backups/")
    retention_max = Column(Integer, default=30)
    last_backup_at = Column(DateTime, nullable=True)
    next_backup_at = Column(DateTime, nullable=True)
    last_backup_status = Column(String(50), default="idle")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

