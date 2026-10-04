import asyncio
import logging
from fastapi import APIRouter, Query, HTTPException

from services.geocoding_service import search_cities, check_dst_status

router = APIRouter(prefix="/geocoding", tags=["geocoding"])
logger = logging.getLogger(__name__)


@router.get("/search")
async def geocoding_search(q: str = Query(..., min_length=2, description="Nome da cidade")):
    """
    Busca cidades em qualquer país.
    Retorna lista com city, state, country, lat, lng, tz_str, flag.
    """
    try:
        results = await asyncio.to_thread(search_cities, q)
        return results
    except Exception as e:
        logger.error(f"Erro na busca de cidades: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar cidades.")


@router.get("/check-dst")
def geocoding_check_dst(
    year: int = Query(...),
    month: int = Query(...),
    day: int = Query(...),
    hour: int = Query(default=12),
    minute: int = Query(default=0),
    tz: str = Query(..., description="Timezone string (ex: America/Sao_Paulo)"),
):
    """
    Verifica se uma data/hora específica está em horário de verão para um timezone.
    Retorna: active, ambiguous, nonexistent, utc_offset, dst_offset_hours, tz_name.
    """
    try:
        result = check_dst_status(year, month, day, hour, minute, tz)
        return result
    except Exception as e:
        logger.error(f"Erro ao verificar DST: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao verificar horário de verão.")
