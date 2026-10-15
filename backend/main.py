import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import engine
from models.models import Base
from routes import auth, funnel, members, admin, geocoding, admin_chart, backups, docker_logs, invites

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")

from sqlalchemy import func
from database import SessionLocal, engine
from models.models import Base, User
from routes.auth import hash_password

Base.metadata.create_all(bind=engine)

def seed_admin():
    db = SessionLocal()
    try:
        super_email = os.getenv("SUPER_ADMIN_EMAIL", "aryarajmarketing@gmail.com").strip().lower()
        super_pass = os.getenv("SUPER_ADMIN_PASSWORD", "123456")
        super_name = os.getenv("SUPER_ADMIN_NAME", "Aryaraj")

        admin_configs = [
            (super_email, super_pass, super_name),
            ("admin@bussola.com", "bussola123", "Crassus Gobbi"),
            ("admin@local.dev", "admin123", "Admin Bússola"),
        ]

        for email, pwd, name in admin_configs:
            user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
            if user:
                user.role = "admin"
                user.password_hash = hash_password(pwd)
                logging.info(f"🔑 Conta de Admin atualizada no banco: {email}")
            else:
                new_admin = User(
                    name=name,
                    email=email,
                    password_hash=hash_password(pwd),
                    role="admin",
                )
                db.add(new_admin)
                logging.info(f"🔑 Nova conta de Admin criada no banco: {email}")
        db.commit()
    except Exception as e:
        logging.error(f"Erro ao atualizar conta de admin: {e}")
    finally:
        db.close()

seed_admin()

app = FastAPI(title="Bússola Astrológica API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Produção
        "https://bussolaastrologica.com.br",
        "https://www.bussolaastrologica.com.br",
        "https://bussola-astrologica.vercel.app",
        "https://resonant-hummingbird-3ae859.netlify.app",
        # Desenvolvimento local
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(funnel.router)
app.include_router(members.router)
app.include_router(admin.router)
app.include_router(geocoding.router)
app.include_router(admin_chart.router)
app.include_router(backups.router)
app.include_router(docker_logs.router)
app.include_router(invites.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Bússola Astrológica API"}
