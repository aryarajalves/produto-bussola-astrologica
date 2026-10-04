import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import engine

def migrate():
    print("Iniciando migração: criação da tabela registration_verifications...")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS registration_verifications (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                whatsapp VARCHAR(50),
                password_hash VARCHAR(255) NOT NULL,
                invite_token VARCHAR(255) NOT NULL,
                code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS ix_registration_verifications_email ON registration_verifications (email);
        """))
    print("Tabela registration_verifications criada com sucesso!")

if __name__ == "__main__":
    migrate()
