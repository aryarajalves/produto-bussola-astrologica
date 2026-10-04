import logging
import pytz
from datetime import datetime
from typing import Optional
from kerykeion import AstrologicalSubjectFactory
from kerykeion.chart_data_factory import ChartDataFactory
from kerykeion.charts.chart_drawer import ChartDrawer

logger = logging.getLogger(__name__)

SIGN_MAP = {
    "Ari": "Áries", "Tau": "Touro", "Gem": "Gêmeos", "Can": "Câncer",
    "Leo": "Leão", "Vir": "Virgem", "Lib": "Libra", "Sco": "Escorpião",
    "Sag": "Sagitário", "Cap": "Capricórnio", "Aqu": "Aquário", "Pis": "Peixes",
}

HOUSE_WORDS = {
    "First": "1", "Second": "2", "Third": "3", "Fourth": "4",
    "Fifth": "5", "Sixth": "6", "Seventh": "7", "Eighth": "8",
    "Ninth": "9", "Tenth": "10", "Eleventh": "11", "Twelfth": "12",
}


def _pt_sign(sign: str) -> str:
    return SIGN_MAP.get(sign, sign)


def _house_num(point) -> str:
    try:
        word = point.house.split("_")[0]
        return HOUSE_WORDS.get(word, point.house)
    except Exception:
        return ""


def _retrograde(point) -> bool:
    try:
        return bool(point.retrograde)
    except Exception:
        return False


def _resolve_local_hour_minute(
    year: int, month: int, day: int,
    hour: int, minute: int,
    tz_str: str,
    is_dst: Optional[bool],
) -> tuple[int, int]:
    """
    Resolve hora/minuto levando em conta DST.

    Se is_dst é None → usa pytz automático (correto para horário civil da certidão).
    Se is_dst é True/False → força a interpretação DST ou padrão para horas ambíguas.
    Se a hora não existe (spring-forward), avança 1h automaticamente.

    Retorna (hour, minute) — inalterados na maioria dos casos (pytz já converte para UTC
    internamente), mas loga o UTC offset para rastreabilidade.
    """
    try:
        tz = pytz.timezone(tz_str)
        dt = datetime(year, month, day, hour, minute)
        try:
            localized = tz.localize(dt, is_dst=is_dst)
        except pytz.exceptions.NonExistentTimeError:
            # Hora pulada (spring-forward): avança 1 minuto para sair do gap
            from datetime import timedelta
            dt_fixed = dt + timedelta(hours=1)
            localized = tz.localize(dt_fixed, is_dst=True)
            logger.warning(
                f"Hora {hour:02d}:{minute:02d} não existe em {tz_str} (spring-forward). "
                f"Ajustando para {dt_fixed.hour:02d}:{dt_fixed.minute:02d}."
            )
        except pytz.exceptions.AmbiguousTimeError:
            # Hora ambígua (fall-back): default para DST=True se não especificado
            dst_flag = True if is_dst is None else is_dst
            localized = tz.localize(dt, is_dst=dst_flag)
            logger.warning(
                f"Hora {hour:02d}:{minute:02d} é ambígua em {tz_str} (fall-back). "
                f"Usando is_dst={dst_flag}."
            )

        logger.info(
            f"Timezone resolvido: {tz_str} | local={hour:02d}:{minute:02d} | "
            f"UTC offset={localized.strftime('%z')} | DST={localized.dst()}"
        )
        return hour, minute

    except Exception as e:
        logger.warning(f"Erro ao resolver DST para {tz_str}: {e}")
        return hour, minute


def generate_birth_chart(
    name: str,
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    lat: float,
    lng: float,
    tz_str: str = "America/Sao_Paulo",
    is_dst: Optional[bool] = None,
    city_name: str = "",
    country_name: str = "",
) -> dict:
    """
    Gera mapa natal completo com suporte a timezone internacional e DST.
    Retorna {"svg": str, "chart_data": dict}.

    tz_str: timezone IANA correto para o local de nascimento (ex: "America/Argentina/Buenos_Aires")
    is_dst: None=automático (pytz decide), True=forçar horário de verão, False=forçar padrão
            Relevante apenas para horas ambíguas (fall-back do DST).
    city_name / country_name: exibidos no SVG do mapa (ex: "Posadas", "Argentina")
    """
    # Resolve hora considerando DST
    hour, minute = _resolve_local_hour_minute(year, month, day, hour, minute, tz_str, is_dst)

    subject = AstrologicalSubjectFactory.from_birth_data(
        name=name,
        year=year,
        month=month,
        day=day,
        hour=hour,
        minute=minute,
        lat=lat,
        lng=lng,
        tz_str=tz_str,
        city=city_name or "Desconhecida",
        nation=country_name or "BR",
        online=False,
        zodiac_type="Tropical",
        houses_system_identifier="P",
    )

    chart_data_obj = ChartDataFactory.create_natal_chart_data(subject)
    drawer = ChartDrawer(chart_data=chart_data_obj, theme="dark", chart_language="PT")

    svg_string = drawer.generate_svg_string()

    lp = subject.lunar_phase
    lunar_phase_name = lp.moon_phase_name if lp and hasattr(lp, "moon_phase_name") else "Desconhecida"

    chart_data = {
        "sun":        {"sign": _pt_sign(subject.sun.sign),                   "house": _house_num(subject.sun)},
        "moon":       {"sign": _pt_sign(subject.moon.sign),                  "house": _house_num(subject.moon)},
        "rising":     {"sign": _pt_sign(subject.first_house.sign)},
        "mercury":    {"sign": _pt_sign(subject.mercury.sign),               "house": _house_num(subject.mercury),  "retrograde": _retrograde(subject.mercury)},
        "venus":      {"sign": _pt_sign(subject.venus.sign),                 "house": _house_num(subject.venus)},
        "mars":       {"sign": _pt_sign(subject.mars.sign),                  "house": _house_num(subject.mars)},
        "jupiter":    {"sign": _pt_sign(subject.jupiter.sign),               "house": _house_num(subject.jupiter)},
        "saturn":     {"sign": _pt_sign(subject.saturn.sign),                "house": _house_num(subject.saturn),   "retrograde": _retrograde(subject.saturn)},
        "chiron":     {"sign": _pt_sign(subject.chiron.sign),                "house": _house_num(subject.chiron)},
        "pluto":      {"sign": _pt_sign(subject.pluto.sign),                 "house": _house_num(subject.pluto),    "retrograde": _retrograde(subject.pluto)},
        "lilith":     {"sign": _pt_sign(subject.mean_lilith.sign),           "house": _house_num(subject.mean_lilith)},
        "north_node": {"sign": _pt_sign(subject.true_north_lunar_node.sign), "house": _house_num(subject.true_north_lunar_node)},
        "south_node": {"sign": _pt_sign(subject.true_south_lunar_node.sign)},
        "mc":         {"sign": _pt_sign(subject.tenth_house.sign)},
        "lunar_phase": lunar_phase_name,
        "elements": {
            "fire":  int(drawer.fire),
            "earth": int(drawer.earth),
            "air":   int(drawer.air),
            "water": int(drawer.water),
        },
        "tz_str": tz_str,
    }

    logger.info(
        "Mapa gerado para '%s': Sol=%s, Lua=%s, Asc=%s [%s]",
        name, chart_data["sun"]["sign"], chart_data["moon"]["sign"],
        chart_data["rising"]["sign"], tz_str,
    )

    return {"svg": svg_string, "chart_data": chart_data}
