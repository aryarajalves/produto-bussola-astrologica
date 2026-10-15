import os
import gzip
import shutil
import tempfile
import subprocess
import logging
from datetime import datetime, timedelta
from urllib.parse import urlparse
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session
from models.models import BackupConfig

# Garante que as variáveis do arquivo .env estejam carregadas
load_dotenv(override=False)

logger = logging.getLogger("backup_service")


def get_b2_config():
    """Retorna as configurações do Backblaze B2 sempre atualizadas do ambiente."""
    return {
        "endpoint_url": os.getenv("BACKBLAZE_ENDPOINT_URL", "https://s3.us-west-004.backblazeb2.com"),
        "key_id": os.getenv("BACKBLAZE_KEY_ID", ""),
        "application_key": os.getenv("BACKBLAZE_APPLICATION_KEY", ""),
        "bucket_name": os.getenv("BACKBLAZE_BUCKET_NAME", "zap-voice"),
        "folder": os.getenv("B2_FOLDER", "AreaDeMembros/backups/").strip("/") + "/",
        "retention_max": int(os.getenv("B2_RETENTION_MAX", "30")),
    }


def get_b2_client():
    """Cria e retorna o cliente S3 configurado para o Backblaze B2."""
    cfg = get_b2_config()
    return boto3.client(
        "s3",
        endpoint_url=cfg["endpoint_url"],
        aws_access_key_id=cfg["key_id"],
        aws_secret_access_key=cfg["application_key"],
    )


_initial_cfg = get_b2_config()
B2_ENDPOINT_URL = _initial_cfg["endpoint_url"]
B2_KEY_ID = _initial_cfg["key_id"]
B2_APPLICATION_KEY = _initial_cfg["application_key"]
B2_BUCKET_NAME = _initial_cfg["bucket_name"]
B2_FOLDER = _initial_cfg["folder"]
B2_RETENTION_MAX = _initial_cfg["retention_max"]


def test_b2_connection():
    """Testa a conexão com o Backblaze B2 e verifica se o bucket está acessível."""
    cfg = get_b2_config()
    try:
        if not cfg["key_id"] or not cfg["application_key"] or not cfg["bucket_name"]:
            return {
                "connected": False,
                "bucket": cfg["bucket_name"],
                "endpoint": cfg["endpoint_url"],
                "error": "Credenciais do Backblaze B2 não configuradas no ambiente.",
            }
        s3 = get_b2_client()
        s3.head_bucket(Bucket=cfg["bucket_name"])
        return {
            "connected": True,
            "bucket": cfg["bucket_name"],
            "endpoint": cfg["endpoint_url"],
            "error": None,
        }
    except Exception as e:
        logger.error(f"Erro ao conectar com Backblaze B2: {e}")
        return {
            "connected": False,
            "bucket": B2_BUCKET_NAME,
            "endpoint": B2_ENDPOINT_URL,
            "error": str(e),
        }


def get_db_connection_params():
    """Extrai os parâmetros de conexão do banco a partir de DATABASE_URL."""
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:bussola123@localhost:5432/bussolaapp_db")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Trata redirecionamento de host dentro de contêineres Docker
    if (os.path.exists("/.dockerenv") or os.environ.get("HOSTNAME")) and "@localhost:5432" in db_url:
        db_url = db_url.replace("@localhost:5432", "@postgres:5432")
    elif (os.path.exists("/.dockerenv") or os.environ.get("HOSTNAME")) and "@127.0.0.1:5432" in db_url:
        db_url = db_url.replace("@127.0.0.1:5432", "@postgres:5432")

    parsed = urlparse(db_url)
    return {
        "user": parsed.username or "postgres",
        "password": parsed.password or "bussola123",
        "host": parsed.hostname or "postgres",
        "port": str(parsed.port or 5432),
        "dbname": (parsed.path or "/bussolaapp_db").lstrip("/"),
    }


def format_size(bytes_size: int) -> str:
    """Formata tamanho de bytes em formato legível (KB, MB, GB)."""
    if bytes_size < 1024:
        return f"{bytes_size} B"
    elif bytes_size < 1024 * 1024:
        return f"{bytes_size / 1024:.1f} KB"
    elif bytes_size < 1024 * 1024 * 1024:
        return f"{bytes_size / (1024 * 1024):.1f} MB"
    else:
        return f"{bytes_size / (1024 * 1024 * 1024):.2f} GB"


def get_or_create_config(db: Session) -> BackupConfig:
    """Obtém ou cria a configuração persistida de backup no banco."""
    config = db.query(BackupConfig).first()
    if not config:
        config = BackupConfig(
            is_active=True,
            frequency_hours=6,
            b2_folder=B2_FOLDER,
            retention_max=B2_RETENTION_MAX,
            last_backup_status="idle",
            next_backup_at=datetime.utcnow() + timedelta(hours=6),
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def list_backups(folder_prefix: str = None):
    """Lista todos os backups presentes no bucket Backblaze B2."""
    prefix = (folder_prefix or B2_FOLDER).strip("/") + "/"
    s3 = get_b2_client()

    try:
        paginator = s3.get_paginator("list_objects_v2")
        backups = []
        for page in paginator.paginate(Bucket=B2_BUCKET_NAME, Prefix=prefix):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                filename = key[len(prefix):]
                if not filename or filename.endswith("/"):
                    continue

                # Determina o tipo de backup a partir do nome
                b_type = "Automático"
                if "manual" in filename.lower():
                    b_type = "Manual"
                elif "externo" in filename.lower() or "external" in filename.lower():
                    b_type = "Externo"

                backups.append({
                    "key": key,
                    "filename": filename,
                    "size_bytes": obj["Size"],
                    "size_formatted": format_size(obj["Size"]),
                    "type": b_type,
                    "created_at": obj["LastModified"].isoformat(),
                    "raw_date": obj["LastModified"],
                })

        # Ordena do mais recente para o mais antigo
        backups.sort(key=lambda x: x["raw_date"], reverse=True)
        for b in backups:
            del b["raw_date"]

        return backups
    except Exception as e:
        logger.error(f"Erro ao listar backups do Backblaze B2: {e}")
        raise e


def apply_retention_policy(retention_max: int = None, folder_prefix: str = None):
    """Remove backups mais antigos se o total exceder o limite de retenção."""
    max_dumps = retention_max or B2_RETENTION_MAX
    backups = list_backups(folder_prefix)
    if len(backups) > max_dumps:
        to_delete = backups[max_dumps:]
        s3 = get_b2_client()
        for b in to_delete:
            try:
                logger.info(f"Aplicando retenção: excluindo backup antigo {b['key']}")
                s3.delete_object(Bucket=B2_BUCKET_NAME, Key=b["key"])
            except Exception as e:
                logger.error(f"Erro ao excluir backup por retenção {b['key']}: {e}")


def create_backup(backup_type: str = "manual", db: Session = None):
    """Gera um dump do PostgreSQL comprimido e faz upload para o Backblaze B2."""
    now = datetime.utcnow()
    timestamp_str = now.strftime("%Y-%m-%dT%H-%M-%S")
    type_slug = "manual" if backup_type.lower() == "manual" else "auto"
    filename = f"backup-{type_slug}-{timestamp_str}.dump.gz"
    
    db_params = get_db_connection_params()
    s3 = get_b2_client()
    
    config = None
    if db:
        config = get_or_create_config(db)
        config.last_backup_status = "in_progress"
        db.commit()

    temp_dump = None
    temp_gz = None

    try:
        # Cria arquivos temporários
        with tempfile.NamedTemporaryFile(suffix=".dump", delete=False) as f_dump:
            temp_dump = f_dump.name
        temp_gz = temp_dump + ".gz"

        env = os.environ.copy()
        env["PGPASSWORD"] = db_params["password"]

        # Executa pg_dump com formato customizado (-Fc) para dump robusto
        cmd = [
            "pg_dump",
            "-h", db_params["host"],
            "-p", db_params["port"],
            "-U", db_params["user"],
            "-d", db_params["dbname"],
            "-Fc",
            "-f", temp_dump,
        ]
        logger.info(f"Iniciando pg_dump para {db_params['dbname']}@{db_params['host']}...")
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)

        # Comprime com gzip
        logger.info(f"Comprimindo dump para {filename}...")
        with open(temp_dump, "rb") as f_in:
            with gzip.open(temp_gz, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)

        gz_size = os.path.getsize(temp_gz)
        target_folder = config.b2_folder if config else B2_FOLDER
        target_key = f"{target_folder.strip('/')}/{filename}"

        # Upload para Backblaze B2
        logger.info(f"Enviando backup para Backblaze B2: {target_key} ({format_size(gz_size)})...")
        with open(temp_gz, "rb") as f_upload:
            s3.upload_fileobj(
                f_upload,
                B2_BUCKET_NAME,
                target_key,
                ExtraArgs={"ContentType": "application/gzip"},
            )

        logger.info(f"Backup {filename} enviado com sucesso para o Backblaze B2!")

        # Aplica política de retenção
        retention = config.retention_max if config else B2_RETENTION_MAX
        apply_retention_policy(retention, target_folder)

        # Atualiza status no banco
        if db and config:
            config.last_backup_at = now
            config.last_backup_status = "success"
            if config.is_active:
                config.next_backup_at = now + timedelta(hours=config.frequency_hours)
            db.commit()

        return {
            "success": True,
            "filename": filename,
            "key": target_key,
            "size_bytes": gz_size,
            "size_formatted": format_size(gz_size),
            "created_at": now.isoformat(),
            "type": "Manual" if type_slug == "manual" else "Automático",
        }

    except subprocess.CalledProcessError as e:
        error_msg = f"Erro no pg_dump: {e.stderr or e.stdout or str(e)}"
        logger.error(error_msg)
        if db and config:
            config.last_backup_status = "error"
            db.commit()
        raise RuntimeError(error_msg)
    except Exception as e:
        logger.error(f"Erro ao gerar backup: {e}")
        if db and config:
            config.last_backup_status = "error"
            db.commit()
        raise e
    finally:
        # Limpa arquivos temporários
        if temp_dump and os.path.exists(temp_dump):
            os.remove(temp_dump)
        if temp_gz and os.path.exists(temp_gz):
            os.remove(temp_gz)


def delete_backup(filename: str, folder_prefix: str = None):
    """Exclui um arquivo de backup do Backblaze B2."""
    prefix = (folder_prefix or B2_FOLDER).strip("/") + "/"
    key = f"{prefix}{filename}"
    s3 = get_b2_client()
    logger.info(f"Excluindo backup do Backblaze B2: {key}")
    s3.delete_object(Bucket=B2_BUCKET_NAME, Key=key)
    return {"success": True, "message": f"Backup {filename} excluído com sucesso."}


def get_download_presigned_url(filename: str, folder_prefix: str = None, expires_in: int = 3600):
    """Gera uma URL pré-assinada para download direto do Backblaze B2."""
    prefix = (folder_prefix or B2_FOLDER).strip("/") + "/"
    key = f"{prefix}{filename}"
    s3 = get_b2_client()
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": B2_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )
    return url


def restore_backup(filename: str, folder_prefix: str = None):
    """Restaura o banco de dados PostgreSQL a partir de um backup do Backblaze B2."""
    prefix = (folder_prefix or B2_FOLDER).strip("/") + "/"
    key = f"{prefix}{filename}"
    s3 = get_b2_client()
    db_params = get_db_connection_params()

    temp_gz = None
    temp_dump = None

    try:
        logger.info(f"Iniciando download do backup para restauração: {key}")
        with tempfile.NamedTemporaryFile(suffix=".gz", delete=False) as f_gz:
            temp_gz = f_gz.name
            s3.download_fileobj(B2_BUCKET_NAME, key, f_gz)

        # Se for .gz, descomprime
        if filename.endswith(".gz"):
            temp_dump = temp_gz[:-3]
            logger.info(f"Descomprimindo {filename}...")
            with gzip.open(temp_gz, "rb") as f_in:
                with open(temp_dump, "wb") as f_out:
                    shutil.copyfileobj(f_in, f_out)
        else:
            temp_dump = temp_gz

        env = os.environ.copy()
        env["PGPASSWORD"] = db_params["password"]

        # Restaura usando pg_restore ou psql conforme o formato
        logger.info(f"Restaurando base de dados {db_params['dbname']}...")
        if filename.endswith(".dump") or filename.endswith(".dump.gz"):
            cmd = [
                "pg_restore",
                "-h", db_params["host"],
                "-p", db_params["port"],
                "-U", db_params["user"],
                "-d", db_params["dbname"],
                "--clean",
                "--if-exists",
                "--no-owner",
                "--no-privileges",
                temp_dump,
            ]
            # pg_restore pode retornar avisos não críticos (exit code 1)
            proc = subprocess.run(cmd, env=env, capture_output=True, text=True)
            if proc.returncode > 1:
                raise RuntimeError(f"Erro no pg_restore: {proc.stderr}")
        else:
            # Formato SQL puro
            cmd = [
                "psql",
                "-h", db_params["host"],
                "-p", db_params["port"],
                "-U", db_params["user"],
                "-d", db_params["dbname"],
                "-f", temp_dump,
            ]
            subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)

        logger.info(f"Restauração do backup {filename} concluída com sucesso!")
        return {"success": True, "message": f"Backup {filename} restaurado com sucesso."}

    except Exception as e:
        logger.error(f"Erro durante restauração do backup {filename}: {e}")
        raise e
    finally:
        if temp_gz and os.path.exists(temp_gz):
            os.remove(temp_gz)
        if temp_dump and temp_dump != temp_gz and os.path.exists(temp_dump):
            os.remove(temp_dump)


def import_external_backup(file_content: bytes, original_filename: str, folder_prefix: str = None):
    """Importa um backup externo enviado pelo usuário e envia para o Backblaze B2."""
    prefix = (folder_prefix or B2_FOLDER).strip("/") + "/"
    now = datetime.utcnow()
    timestamp_str = now.strftime("%Y-%m-%dT%H-%M-%S")
    clean_name = os.path.basename(original_filename).replace(" ", "_")
    
    # Se já não tiver gz ou dump, mantém o nome
    target_filename = f"backup-externo-{timestamp_str}-{clean_name}"
    target_key = f"{prefix}{target_filename}"

    s3 = get_b2_client()
    logger.info(f"Enviando backup externo importado para o B2: {target_key}")
    s3.put_object(
        Bucket=B2_BUCKET_NAME,
        Key=target_key,
        Body=file_content,
        ContentType="application/octet-stream",
    )

    return {
        "success": True,
        "filename": target_filename,
        "key": target_key,
        "size_bytes": len(file_content),
        "size_formatted": format_size(len(file_content)),
        "created_at": now.isoformat(),
        "type": "Externo",
    }


async def run_backup_scheduler():
    """Loop assíncrono em background que verifica e executa backups periódicos automaticamente."""
    import asyncio
    from database import SessionLocal

    logger.info("⏰ Agendador de Backup Automático inicializado com sucesso.")
    while True:
        try:
            await asyncio.sleep(60)
            db = SessionLocal()
            try:
                config = get_or_create_config(db)
                if config and config.is_active:
                    now = datetime.utcnow()
                    if not config.next_backup_at:
                        config.next_backup_at = now + timedelta(hours=config.frequency_hours)
                        db.commit()
                    elif now >= config.next_backup_at:
                        logger.info("⏰ Disparando execução periódica de Backup Automático...")
                        create_backup(backup_type="auto", db=db)
            except Exception as e:
                logger.error(f"Erro no ciclo do agendador de backup: {e}")
            finally:
                db.close()
        except asyncio.CancelledError:
            logger.info("Agendador de backup finalizado.")
            break
        except Exception as e:
            logger.error(f"Erro inesperado no agendador de backup: {e}")

