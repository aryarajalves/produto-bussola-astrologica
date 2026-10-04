import logging
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.models import User, BackupConfig
from routes.auth import require_admin
from services import backup_service

logger = logging.getLogger("routes.backups")

router = APIRouter(prefix="/admin/backups", tags=["backups"])


class BackupConfigUpdateRequest(BaseModel):
    is_active: bool = Field(..., description="Ativa ou desativa o backup automático")
    frequency_hours: int = Field(6, ge=1, le=168, description="Frequência em horas (ex: 6, 12, 24)")
    b2_folder: str = Field("AreaDeMembros/backups/", description="Pasta de destino no bucket B2")
    retention_max: int = Field(30, ge=1, le=100, description="Máximo de dumps a manter")


@router.get("/status")
def get_backup_status(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retorna o status geral dos backups: conexão B2, último backup, próximo e retenção."""
    try:
        config = backup_service.get_or_create_config(db)
        b2_conn = backup_service.test_b2_connection()
        
        # Obter contagem de backups no B2
        backups = []
        if b2_conn["connected"]:
            try:
                backups = backup_service.list_backups(folder_prefix=config.b2_folder)
            except Exception as e:
                logger.warning(f"Erro ao listar backups para status: {e}")

        # Se houver backups no B2 e config não tiver last_backup_at, sincroniza com o mais recente
        last_backup_date = None
        if config.last_backup_at:
            last_backup_date = config.last_backup_at.isoformat()
        elif backups:
            last_backup_date = backups[0]["created_at"]

        next_backup_date = None
        if config.is_active:
            if config.next_backup_at:
                next_backup_date = config.next_backup_at.isoformat()
            else:
                next_backup_date = (datetime.utcnow() + timedelta(hours=config.frequency_hours)).isoformat()

        return {
            "b2_connected": b2_conn["connected"],
            "b2_bucket": b2_conn["bucket"],
            "b2_endpoint": b2_conn["endpoint"],
            "b2_error": b2_conn["error"],
            "last_backup_at": last_backup_date,
            "last_backup_status": config.last_backup_status,
            "next_backup_at": next_backup_date,
            "is_auto_active": config.is_active,
            "frequency_hours": config.frequency_hours,
            "retention_current": len(backups),
            "retention_max": config.retention_max,
            "b2_folder": config.b2_folder,
        }
    except Exception as e:
        logger.error(f"Erro ao obter status de backup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status do backup: {str(e)}",
        )


@router.get("")
def list_all_backups(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lista todos os arquivos de backup salvos no Backblaze B2."""
    config = backup_service.get_or_create_config(db)
    try:
        backups = backup_service.list_backups(folder_prefix=config.b2_folder)
        return {
            "total": len(backups),
            "backups": backups,
        }
    except Exception as e:
        logger.error(f"Erro ao listar backups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao conectar com Backblaze B2 para listar backups: {str(e)}",
        )


@router.post("/manual")
def create_manual_backup(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Executa a criação imediata de um backup manual do PostgreSQL e envia para o Backblaze B2."""
    try:
        result = backup_service.create_backup(backup_type="manual", db=db)
        return result
    except Exception as e:
        logger.error(f"Erro ao executar backup manual: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao gerar e enviar backup manual: {str(e)}",
        )


@router.get("/download/{filename}")
def get_backup_download_url(
    filename: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Gera uma URL pré-assinada segura para download direto do arquivo de backup do Backblaze B2."""
    config = backup_service.get_or_create_config(db)
    try:
        url = backup_service.get_download_presigned_url(filename, folder_prefix=config.b2_folder)
        return {"download_url": url, "filename": filename}
    except Exception as e:
        logger.error(f"Erro ao gerar URL de download para {filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Não foi possível obter o link de download: {str(e)}",
        )


@router.delete("/{filename}")
def delete_backup_file(
    filename: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Remove permanentemente um arquivo de backup do bucket Backblaze B2."""
    config = backup_service.get_or_create_config(db)
    try:
        result = backup_service.delete_backup(filename, folder_prefix=config.b2_folder)
        return result
    except Exception as e:
        logger.error(f"Erro ao excluir backup {filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao excluir backup: {str(e)}",
        )


@router.post("/restore/{filename}")
def restore_backup_file(
    filename: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Restaura o banco de dados PostgreSQL a partir de um backup existente no Backblaze B2."""
    config = backup_service.get_or_create_config(db)
    try:
        result = backup_service.restore_backup(filename, folder_prefix=config.b2_folder)
        return result
    except Exception as e:
        logger.error(f"Erro ao restaurar banco a partir de {filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha na restauração do backup: {str(e)}",
        )


@router.post("/upload")
async def upload_external_backup(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Recebe upload de arquivo de backup (.dump, .dump.gz, .sql, .sql.gz) e armazena no Backblaze B2."""
    allowed_extensions = (".dump", ".dump.gz", ".sql", ".sql.gz")
    filename = file.filename or "backup-externo"
    if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de arquivo inválido. Suportados: .dump, .dump.gz, .sql, .sql.gz",
        )

    config = backup_service.get_or_create_config(db)
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O arquivo enviado está vazio.",
            )

        result = backup_service.import_external_backup(
            file_content=content,
            original_filename=filename,
            folder_prefix=config.b2_folder,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao importar backup externo {filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao enviar backup externo para o Backblaze B2: {str(e)}",
        )


@router.get("/config")
def get_backup_config(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retorna as preferências configuradas de agendamento automático."""
    config = backup_service.get_or_create_config(db)
    return {
        "is_active": config.is_active,
        "frequency_hours": config.frequency_hours,
        "b2_folder": config.b2_folder,
        "retention_max": config.retention_max,
        "last_backup_at": config.last_backup_at.isoformat() if config.last_backup_at else None,
        "next_backup_at": config.next_backup_at.isoformat() if config.next_backup_at else None,
    }


@router.put("/config")
def update_backup_config(
    body: BackupConfigUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Atualiza as preferências de agendamento automático e retenção."""
    config = backup_service.get_or_create_config(db)
    config.is_active = body.is_active
    config.frequency_hours = body.frequency_hours
    config.b2_folder = body.b2_folder.strip("/") + "/"
    config.retention_max = body.retention_max

    now = datetime.utcnow()
    if config.is_active:
        config.next_backup_at = now + timedelta(hours=config.frequency_hours)
    else:
        config.next_backup_at = None

    db.commit()
    db.refresh(config)

    return {
        "success": True,
        "message": "Configurações de backup salvas com sucesso!",
        "config": {
            "is_active": config.is_active,
            "frequency_hours": config.frequency_hours,
            "b2_folder": config.b2_folder,
            "retention_max": config.retention_max,
            "next_backup_at": config.next_backup_at.isoformat() if config.next_backup_at else None,
        }
    }
