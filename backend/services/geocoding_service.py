"""
Geocoding via Nominatim (OpenStreetMap) — sem API key necessária.
Suporte global: Brasil, Argentina e qualquer país.
Detecta timezone via timezonefinder usando lat/lng.
"""

import time
import logging
import requests
import pytz
from datetime import datetime
from timezonefinder import TimezoneFinder
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

logger = logging.getLogger(__name__)

_geolocator = Nominatim(user_agent="bussola-astrologica/1.0")
_tf = TimezoneFinder()

STATE_NAMES = {
    "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
    "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal",
    "ES": "Espírito Santo", "GO": "Goiás", "MA": "Maranhão",
    "MT": "Mato Grosso", "MS": "Mato Grosso do Sul", "MG": "Minas Gerais",
    "PA": "Pará", "PB": "Paraíba", "PR": "Paraná", "PE": "Pernambuco",
    "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima",
    "SC": "Santa Catarina", "SP": "São Paulo", "SE": "Sergipe",
    "TO": "Tocantins",
}

COUNTRY_FLAGS = {
    "BR": "🇧🇷", "AR": "🇦🇷", "UY": "🇺🇾", "PY": "🇵🇾", "BO": "🇧🇴",
    "CL": "🇨🇱", "PE": "🇵🇪", "CO": "🇨🇴", "VE": "🇻🇪", "EC": "🇪🇨",
    "US": "🇺🇸", "MX": "🇲🇽", "PT": "🇵🇹", "ES": "🇪🇸", "DE": "🇩🇪",
    "FR": "🇫🇷", "IT": "🇮🇹", "GB": "🇬🇧", "JP": "🇯🇵", "CN": "🇨🇳",
}


def _get_timezone_from_coords(lat: float, lng: float) -> str:
    """Detecta timezone a partir de coordenadas."""
    try:
        tz = _tf.timezone_at(lat=lat, lng=lng)
        return tz or "UTC"
    except Exception:
        return "UTC"


def search_cities(query: str) -> list[dict]:
    """
    Busca cidades em qualquer país.
    Tenta primeiro via Open-Meteo Geocoding API (rápido, sem rate limits rígidos, inclui timezone).
    Caso falhe ou retorne vazio, usa Nominatim (OpenStreetMap) como fallback.
    Retorna lista de dicts com city, state, country, lat, lng, tz_str.
    """
    if not query or len(query.strip()) < 2:
        return []

    cities = []
    seen: set[str] = set()

    # Tentativa 1: Open-Meteo Geocoding API
    try:
        resp = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={
                "name": query.strip(),
                "count": 10,
                "language": "pt",
                "format": "json",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [])
            for r in results:
                lat = float(r.get("latitude", 0.0))
                lng = float(r.get("longitude", 0.0))
                city = r.get("name")
                state = r.get("admin1") or ""
                country = r.get("country") or ""
                country_code = r.get("country_code", "").upper()
                tz_str = r.get("timezone") or _get_timezone_from_coords(lat, lng)

                if not city:
                    continue

                key = f"{city.lower()}|{state.lower()}|{country_code}"
                if key in seen:
                    continue
                seen.add(key)

                flag = COUNTRY_FLAGS.get(country_code, "🌍")
                parts = [p for p in [city, state, country] if p]
                display = ", ".join(parts)

                cities.append({
                    "display": display,
                    "flag": flag,
                    "city": city,
                    "state": state,
                    "country": country,
                    "country_code": country_code,
                    "lat": round(lat, 6),
                    "lng": round(lng, 6),
                    "tz_str": tz_str,
                })
            
            if cities:
                logger.info(f"search_cities via Open-Meteo OK para '{query}': {len(cities)} resultados")
                return cities[:6]
    except Exception as e:
        logger.warning(f"search_cities via Open-Meteo falhou para '{query}': {e}")

    # Fallback / Tentativa 2: Nominatim (original)
    try:
        time.sleep(0.5)  # respeita rate limit
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": query.strip(),
                "format": "json",
                "limit": 8,
                "addressdetails": 1,
                "featuretype": "city",
                "accept-language": "pt-BR,pt,en",
            },
            headers={"User-Agent": "bussola-astrologica/1.0"},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json()
    except Exception as e:
        logger.warning(f"search_cities via Nominatim falhou para '{query}': {e}")
        return []

    for r in results:
        lat = float(r["lat"])
        lng = float(r["lon"])
        addr = r.get("address", {})

        city = (
            addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("municipality")
            or addr.get("county")
            or r.get("display_name", "").split(",")[0].strip()
        )
        state = (
            addr.get("state")
            or addr.get("province")
            or addr.get("region")
            or addr.get("state_district")
            or ""
        )
        country = addr.get("country") or ""
        country_code = addr.get("country_code", "").upper()

        if not city:
            continue

        key = f"{city.lower()}|{state.lower()}|{country_code}"
        if key in seen:
            continue
        seen.add(key)

        tz_str = _get_timezone_from_coords(lat, lng)
        flag = COUNTRY_FLAGS.get(country_code, "🌍")

        parts = [p for p in [city, state, country] if p]
        display = ", ".join(parts)

        cities.append({
            "display": display,
            "flag": flag,
            "city": city,
            "state": state,
            "country": country,
            "country_code": country_code,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "tz_str": tz_str,
        })

    logger.info(f"search_cities via Nominatim OK para '{query}': {len(cities)} resultados")
    return cities[:6]


def check_dst_status(year: int, month: int, day: int, hour: int, minute: int, tz_str: str) -> dict:
    """
    Verifica o status de horário de verão para uma data/hora/timezone específica.

    Retorna:
      - active: bool — se DST estava em vigor naquele momento
      - ambiguous: bool — se a hora é ambígua (ocorre 2x no "recuo" do relógio)
      - nonexistent: bool — se a hora não existe (pulada no "avanço" do relógio)
      - utc_offset: str — offset UTC (ex: "-02:00")
      - dst_offset_hours: float — quanto DST adicionou (ex: 1.0)
      - tz_name: str — nome do timezone (ex: "America/Sao_Paulo")
    """
    try:
        tz = pytz.timezone(tz_str)
        dt = datetime(year, month, day, hour, minute)

        # Tentativa normal (is_dst=None levanta erro se ambíguo)
        try:
            localized = tz.localize(dt, is_dst=None)
            dst_active = bool(localized.dst()) and localized.dst().total_seconds() != 0
            utc_offset = localized.strftime("%z")
            formatted_offset = f"{utc_offset[:3]}:{utc_offset[3:]}" if len(utc_offset) == 5 else utc_offset
            dst_hours = localized.dst().total_seconds() / 3600 if dst_active else 0.0

            return {
                "active": dst_active,
                "ambiguous": False,
                "nonexistent": False,
                "utc_offset": formatted_offset,
                "dst_offset_hours": dst_hours,
                "tz_name": tz_str,
            }

        except pytz.exceptions.AmbiguousTimeError:
            # Hora ocorre 2x: no "recuo" do relógio (fim do horário de verão)
            # Ex: 23:30 do Brasil no retorno do DST
            localized_dst = tz.localize(dt, is_dst=True)
            utc_offset = localized_dst.strftime("%z")
            formatted_offset = f"{utc_offset[:3]}:{utc_offset[3:]}"
            return {
                "active": None,  # ambíguo — precisa confirmar
                "ambiguous": True,
                "nonexistent": False,
                "utc_offset": formatted_offset,
                "dst_offset_hours": 1.0,
                "tz_name": tz_str,
            }

        except pytz.exceptions.NonExistentTimeError:
            # Hora não existe: foi pulada no "avanço" do relógio (início do DST)
            # Ex: 00:30 do Brasil quando DST começa
            return {
                "active": True,
                "ambiguous": False,
                "nonexistent": True,
                "utc_offset": None,
                "dst_offset_hours": 1.0,
                "tz_name": tz_str,
            }

    except Exception as e:
        logger.warning(f"check_dst_status erro: {e}")
        return {
            "active": False,
            "ambiguous": False,
            "nonexistent": False,
            "utc_offset": None,
            "dst_offset_hours": 0.0,
            "tz_name": tz_str,
        }


def city_to_coordinates(city: str, state: str = "", country: str = "Brazil") -> dict:
    """
    Geocodifica cidade → lat/lng + tz_str.
    Tenta primeiro via Open-Meteo Geocoding API.
    Caso falhe, usa Nominatim via geopy ou HTTP direto.
    """
    state_name = STATE_NAMES.get(state.upper(), state) if state else state
    query_parts = [p for p in [city, state_name, country] if p]
    query = ", ".join(query_parts)

    # Tentativa 1: Open-Meteo Geocoding API
    try:
        resp = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={
                "name": city,
                "count": 5,
                "language": "pt",
                "format": "json",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [])
            best_match = None
            if results:
                if state:
                    state_lower = state.lower()
                    for r in results:
                        r_state = r.get("admin1") or ""
                        if state_lower in r_state.lower() or r_state.lower() in state_lower:
                            best_match = r
                            break
                if not best_match:
                    best_match = results[0]

                lat = float(best_match["latitude"])
                lng = float(best_match["longitude"])
                tz_str = best_match.get("timezone") or _get_timezone_from_coords(lat, lng)
                logger.info(f"Geocoding Open-Meteo OK: '{query}' → {lat}, {lng} [{tz_str}]")
                return {"lat": lat, "lng": lng, "tz_str": tz_str}
    except Exception as e:
        logger.warning(f"Geocoding Open-Meteo falhou para '{query}': {e}")

    # Tentativa 2: geopy
    try:
        location = _geolocator.geocode(query, timeout=10, language="pt")
        if location:
            lat, lng = location.latitude, location.longitude
            tz_str = _get_timezone_from_coords(lat, lng)
            logger.info(f"Geocoding geopy OK: '{query}' → {lat}, {lng} [{tz_str}]")
            return {"lat": lat, "lng": lng, "tz_str": tz_str}
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        logger.warning(f"geopy falhou para '{query}': {e}")

    # Tentativa 3: HTTP direto
    time.sleep(1.1)
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "addressdetails": 0},
            headers={"User-Agent": "bussola-astrologica/1.0"},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json()
        if results:
            lat = float(results[0]["lat"])
            lng = float(results[0]["lon"])
            tz_str = _get_timezone_from_coords(lat, lng)
            logger.info(f"Geocoding HTTP OK: '{query}' → {lat}, {lng} [{tz_str}]")
            return {"lat": lat, "lng": lng, "tz_str": tz_str}
    except Exception as e:
        logger.warning(f"Nominatim HTTP falhou para '{query}': {e}")

    cidade_estado = f"{city}, {state}" if state else city
    raise ValueError(
        f"Não foi possível encontrar as coordenadas de '{cidade_estado}, {country}'. "
        "Use o campo de busca para selecionar a cidade correta."
    )
