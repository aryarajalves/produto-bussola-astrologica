"""
pdf_service.py  —  Bússola Astrológica  |  Edição Tática Editorial
Bússola Astrológica  |  dark tactical theme, sacred geometry, custom fonts
"""
import io
import re
import math
import random
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable, KeepTogether,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Optional SVG embedding (svglib) ──────────────────────────────────────────
try:
    from svglib.svglib import svg2rlg
    from reportlab.graphics import renderPDF as _renderPDF
    _SVGLIB_OK = True
except ImportError:
    _SVGLIB_OK = False

# ── Font registration ──────────────────────────────────────────────────────────
_FONTS_DIR = Path(__file__).parent.parent / "fonts"

_FONT_DEFS = [
    ("Garamond",        "EBGaramond-Regular"),
    ("Garamond-Bold",   "EBGaramond-Bold"),
    ("Garamond-Italic", "EBGaramond-Italic"),
    ("Cinzel",          "Cinzel-Regular"),
    ("Cinzel-Bold",     "Cinzel-Bold"),
    ("Poppins",         "Poppins-Regular"),
    ("Poppins-Light",   "Poppins-Light"),
]

_FALLBACK = {
    "Garamond":        "Helvetica",
    "Garamond-Bold":   "Helvetica-Bold",
    "Garamond-Italic": "Helvetica-Oblique",
    "Cinzel":          "Helvetica-Bold",
    "Cinzel-Bold":     "Helvetica-Bold",
    "Poppins":         "Helvetica",
    "Poppins-Light":   "Helvetica",
}

_loaded: set = set()

def _reg():
    for alias, fname in _FONT_DEFS:
        if alias in _loaded:
            continue
        path = _FONTS_DIR / f"{fname}.ttf"
        if path.exists():
            try:
                pdfmetrics.registerFont(TTFont(alias, str(path)))
                _loaded.add(alias)
            except Exception:
                pass

_reg()


def F(name: str) -> str:
    """Return font alias if registered, else safe fallback."""
    if name in _loaded:
        return name
    return _FALLBACK.get(name, "Helvetica")


# ── Palette — alinhada exatamente com o sistema ───────────────────────────────
BG         = colors.HexColor("#0f0b1e")   # sistema: bg
BG_CARD    = colors.HexColor("#1a1535")   # sistema: card
PRI        = colors.HexColor("#7F77DD")   # sistema: primary
LIGHT      = colors.HexColor("#AFA9EC")   # sistema: light
DARK_PUR   = colors.HexColor("#3C3489")   # sistema: dark
GOLD       = colors.HexColor("#EF9F27")   # sistema: gold (apenas badges Sol/Lua/Asc)
ACCENT     = LIGHT                         # acento principal → roxo claro
TEXT       = colors.HexColor("#f0eeff")   # sistema: text
BODY       = colors.HexColor("#cdc9ef")
MUTED      = colors.HexColor("#8b87b8")   # sistema: muted
WHITE      = colors.white

def _c(hex_color, a=1.0):
    """HexColor with alpha."""
    c = hex_color
    return colors.Color(c.red, c.green, c.blue, a)


# ── Section metadata ──────────────────────────────────────────────────────────
SECTION_ORDER = [
    "portal",
    "essencia",
    "ferida_e_dom",
    "dons_esquecidos",
    "luz_e_sombra",
    "reencontro",
    "rituais",
    "afirmagias",
]

# Altura UTILIZÁVEL do frame (A4 menos margens e padding interno do Frame)
# topMargin=2.5cm  bottomMargin=2.0cm  Frame._topPadding=6pt  Frame._bottomPadding=6pt
_FRAME_H = A4[1] - 2.5 * cm - 2.0 * cm - 12   # ≈ 702 pt  (12 = 2×6pt padding)

SECTION_META = {
    "portal":          {"roman": "",     "label": "ABERTURA",      "title": "O Inicio da Jornada", "symbol": "flower"},
    "essencia":        {"roman": "I",    "label": "PORTAL  I",     "title": "Essencia",             "symbol": "moon"},
    "ferida_e_dom":    {"roman": "II",   "label": "PORTAL  II",    "title": "A Ferida e o Dom",     "symbol": "star5"},
    "dons_esquecidos": {"roman": "III",  "label": "PORTAL  III",   "title": "Dons Esquecidos",      "symbol": "arrow"},
    "luz_e_sombra":    {"roman": "IV",   "label": "PORTAL  IV",    "title": "Luz e Sombra",         "symbol": "halfmoon"},
    "reencontro":      {"roman": "V",    "label": "PORTAL  V",     "title": "O Reencontro",         "symbol": "spiral"},
    "rituais":         {"roman": "VI",   "label": "PORTAL  VI",    "title": "Rituais de Integracao","symbol": "flower"},
    "afirmagias":      {"roman": "VII",  "label": "PORTAL  VII",   "title": "Afirmagias",           "symbol": "star5"},
}


# ── SVG pre-processing ───────────────────────────────────────────────────────

# Cores base para variáveis DaisyUI / kerykeion-theme que podem não estar
# definidas dentro do próprio SVG (dependem do CSS da página host).
_KERYKEION_COLOR_DEFAULTS: dict[str, str] = {
    "--kerykeion-color-primary":          "#7F77DD",
    "--kerykeion-color-secondary":        "#AFA9EC",
    "--kerykeion-color-accent":           "#EF9F27",
    "--kerykeion-color-neutral":          "#3C3489",
    "--kerykeion-color-neutral-content":  "#f0eeff",
    "--kerykeion-color-base-100":         "#0f0b1e",
    "--kerykeion-color-base-200":         "#1a1535",
    "--kerykeion-color-base-300":         "#3C3489",
    "--kerykeion-color-base-content":     "#f0eeff",
    "--kerykeion-color-info":             "#60a5fa",
    "--kerykeion-color-success":          "#4ade80",
    "--kerykeion-color-warning":          "#EF9F27",
    "--kerykeion-color-error":            "#f87171",
    "--kerykeion-color-info-content":     "#f0eeff",
    "--kerykeion-color-success-content":  "#f0eeff",
    "--kerykeion-color-warning-content":  "#0f0b1e",
    "--kerykeion-color-error-content":    "#f0eeff",
}


def _preprocess_svg(svg: str) -> str:
    """
    Substitui CSS custom properties (var(--xxx)) por valores reais antes de
    passar ao svglib. O kerykeion usa variáveis que se encadeiam em múltiplos
    níveis (DaisyUI theming), então é necessário iterar até convergência.
    """
    if "var(--" not in svg:
        return svg

    # Extrai TODAS as definições de variáveis CSS dos blocos <style>
    css_vars: dict = dict(_KERYKEION_COLOR_DEFAULTS)   # começamos com os defaults
    for style_m in re.finditer(r"<style[^>]*>(.*?)</style>", svg, re.DOTALL | re.IGNORECASE):
        for var_m in re.finditer(r"--([a-zA-Z0-9_-]+)\s*:\s*([^;}\n]+)", style_m.group(1)):
            key = f"--{var_m.group(1).strip()}"
            val = var_m.group(2).strip()
            css_vars[key] = val   # sobrescreve defaults com valores reais do SVG

    def _replace(m: re.Match) -> str:
        inner = m.group(1).strip()
        if "," in inner:
            name, fallback = inner.split(",", 1)
            return css_vars.get(name.strip(), fallback.strip())
        return css_vars.get(inner, "#888888")

    # Itera até convergência (resolve cadeias var→var→valor concreto)
    for _ in range(6):
        if "var(--" not in svg:
            break
        new_svg = re.sub(r"var\(([^)]+)\)", _replace, svg)
        if new_svg == svg:
            break
        svg = new_svg

    return svg


# ── Text helpers ──────────────────────────────────────────────────────────────

# Padrões de linhas "meta" que a IA às vezes injeta no conteúdo
# (cabeçalhos repetidos, subtítulos, separadores) — devem ser ignorados no PDF
_META_PATTERNS = re.compile(
    r"""
    ^\s*(
        # "✦ NOME DA SEÇÃO ✦" — cabeçalho repetido com ✦
        [✦★•◆]\s*[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{4,}\s*[✦★•◆]
        |
        # "Subtítulo:" ou "Título:" seguido de qualquer texto
        (Sub)?[Tt][íi]tulo\s*:
        |
        # "Seção N:" ou "Portal N:" ou "PORTAL VI:"
        (Seção|Portal|PORTAL|SEÇÃO)\s*[\w\s]*\s*:
        |
        # Linhas de separação puras: "---", "===", "***"
        [-=*]{3,}
    )
    """,
    re.VERBOSE | re.UNICODE,
)


def _is_meta_line(para: str) -> bool:
    """Retorna True se o parágrafo é um cabeçalho/subtítulo injetado pela IA."""
    stripped = para.strip()
    if not stripped:
        return True
    # Linha curta (≤ 120 chars) que bate em algum padrão meta
    if len(stripped) <= 120 and _META_PATTERNS.match(stripped):
        return True
    return False


def _clean(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*(.+?)\*",     r"<i>\1</i>", text)
    text = re.sub(r"  +", " ", text)
    return text.strip()


# ── Sacred geometry helpers ───────────────────────────────────────────────────
def _seed(name: str) -> int:
    return sum(ord(c) * (i + 1) for i, c in enumerate(name)) % 99991


def _draw_stars(cv, W, H, seed_val, n=140):
    rng = random.Random(seed_val)
    for _ in range(n):
        x = rng.uniform(0, W)
        y = rng.uniform(0, H)
        r = rng.uniform(0.2, 1.4)
        a = rng.uniform(0.08, 0.65)
        cv.setFillColor(_c(WHITE, a))
        cv.circle(x, y, r, fill=1, stroke=0)
    # a few bigger bright stars
    rng2 = random.Random(seed_val + 7)
    for _ in range(18):
        x = rng2.uniform(0, W)
        y = rng2.uniform(0, H)
        a = rng2.uniform(0.5, 0.9)
        cv.setFillColor(_c(WHITE, a))
        cv.circle(x, y, 1.6, fill=1, stroke=0)
    cv.setFillAlpha(1.0)


def _draw_nebula(cv, cx, cy, max_r, base_color, layers=14):
    r, g, b = base_color.red, base_color.green, base_color.blue
    for i in range(layers, 0, -1):
        rad = max_r * i / layers
        alpha = 0.018
        cv.setFillColor(colors.Color(r, g, b, alpha))
        cv.circle(cx, cy, rad, fill=1, stroke=0)
    cv.setFillAlpha(1.0)


def _draw_ring(cv, cx, cy, r, color, lw=0.5, alpha=1.0):
    cv.setStrokeColor(_c(color, alpha))
    cv.setLineWidth(lw)
    cv.circle(cx, cy, r, fill=0, stroke=1)


def _draw_star_path(cv, cx, cy, r, points, inner_ratio, color, alpha=1.0):
    """Draw a star polygon (fill only)."""
    cv.setFillColor(_c(color, alpha))
    p = cv.beginPath()
    for i in range(points * 2):
        angle = math.pi * i / points - math.pi / 2
        rad = r if i % 2 == 0 else r * inner_ratio
        x = cx + rad * math.cos(angle)
        y = cy + rad * math.sin(angle)
        if i == 0:
            p.moveTo(x, y)
        else:
            p.lineTo(x, y)
    p.close()
    cv.drawPath(p, fill=1, stroke=0)


def _draw_mandala(cv, cx, cy, r):
    """Sacred geometry mandala: concentric rings + radial spokes."""
    # outer ring
    for fr in (1.0, 0.72, 0.50, 0.34):
        _draw_ring(cv, cx, cy, r * fr, PRI, lw=0.4, alpha=0.35)
    # 12 radial spokes
    cv.setStrokeColor(_c(PRI, 0.18))
    cv.setLineWidth(0.35)
    for i in range(12):
        angle = math.pi * 2 * i / 12
        cv.line(
            cx + r * 0.34 * math.cos(angle),
            cy + r * 0.34 * math.sin(angle),
            cx + r * 1.0 * math.cos(angle),
            cy + r * 1.0 * math.sin(angle),
        )
    # central 6-pointed star glow
    _draw_star_path(cv, cx, cy, r * 0.22, 6, 0.5, ACCENT, alpha=0.18)
    _draw_star_path(cv, cx, cy, r * 0.14, 6, 0.5, ACCENT, alpha=0.55)
    _draw_star_path(cv, cx, cy, r * 0.08, 6, 0.5, ACCENT, alpha=0.90)


# ── Section symbols (3-layer galactic glow) ───────────────────────────────────
def _glow_layers(cv, cx, cy, draw_fn, r):
    """Draw symbol with halo → glow → core layers."""
    draw_fn(cv, cx, cy, r * 2.5, alpha=0.04)
    draw_fn(cv, cx, cy, r * 1.6, alpha=0.13)
    draw_fn(cv, cx, cy, r,       alpha=0.90)


def _sym_moon(cv, cx, cy, r, alpha=0.90):
    """Crescent moon: full circle minus offset circle."""
    cv.setFillColor(_c(ACCENT, alpha))
    cv.circle(cx, cy, r, fill=1, stroke=0)
    # carve crescent
    cv.setFillColor(BG)
    cv.circle(cx + r * 0.38, cy, r * 0.80, fill=1, stroke=0)


def _sym_star5(cv, cx, cy, r, alpha=0.90):
    _draw_star_path(cv, cx, cy, r, 5, 0.38, ACCENT, alpha)


def _sym_flower(cv, cx, cy, r, alpha=0.90):
    """6-petal flower of life."""
    _draw_star_path(cv, cx, cy, r, 6, 0.6, ACCENT, alpha)
    cv.setStrokeColor(_c(ACCENT, alpha * 0.5))
    cv.setLineWidth(0.6)
    for i in range(6):
        angle = math.pi * 2 * i / 6
        px = cx + r * 0.6 * math.cos(angle)
        py = cy + r * 0.6 * math.sin(angle)
        cv.circle(px, py, r * 0.55, fill=0, stroke=1)


def _sym_arrow(cv, cx, cy, r, alpha=0.90):
    """Upward arrow / compass north."""
    cv.setFillColor(_c(ACCENT, alpha))
    p = cv.beginPath()
    p.moveTo(cx, cy + r)            # top
    p.lineTo(cx + r * 0.5, cy - r * 0.3)
    p.lineTo(cx + r * 0.18, cy - r * 0.1)
    p.lineTo(cx + r * 0.18, cy - r)
    p.lineTo(cx - r * 0.18, cy - r)
    p.lineTo(cx - r * 0.18, cy - r * 0.1)
    p.lineTo(cx - r * 0.5, cy - r * 0.3)
    p.close()
    cv.drawPath(p, fill=1, stroke=0)


def _sym_halfmoon(cv, cx, cy, r, alpha=0.90):
    """Half circle (yin side) + ring."""
    cv.setFillColor(_c(ACCENT, alpha))
    # Right half-circle arc (filled)
    p = cv.beginPath()
    p.moveTo(cx, cy - r)
    p.arcTo(cx - r, cy - r, cx + r, cy + r, 270, 180)
    p.lineTo(cx, cy - r)
    p.close()
    cv.drawPath(p, fill=1, stroke=0)
    # outer ring complement
    cv.setStrokeColor(_c(ACCENT, alpha * 0.5))
    cv.setLineWidth(1.0)
    cv.circle(cx, cy, r, fill=0, stroke=1)


def _sym_spiral(cv, cx, cy, r, alpha=0.90):
    """Concentric arcs forming an outward spiral (8-pointed star)."""
    _draw_star_path(cv, cx, cy, r, 8, 0.42, ACCENT, alpha)
    cv.setStrokeColor(_c(ACCENT, alpha * 0.45))
    cv.setLineWidth(0.7)
    cv.circle(cx, cy, r * 0.62, fill=0, stroke=1)


_SYMBOL_FN = {
    "moon":     _sym_moon,
    "star5":    _sym_star5,
    "flower":   _sym_flower,
    "arrow":    _sym_arrow,
    "halfmoon": _sym_halfmoon,
    "spiral":   _sym_spiral,
}

def _draw_section_symbol(cv, cx, cy, sym_key, r=1.4 * cm):
    fn = _SYMBOL_FN.get(sym_key, _sym_star5)
    _glow_layers(cv, cx, cy, fn, r)


# ── Cover page ────────────────────────────────────────────────────────────────
def _make_cover(name, sun_sign, moon_sign, rising_sign, birth_date, birth_city, birth_country):
    def _draw(cv, doc):
        W, H = A4
        cv.saveState()

        # Background
        cv.setFillColor(BG)
        cv.rect(0, 0, W, H, fill=1, stroke=0)

        # Star field (seed from name)
        _draw_stars(cv, W, H, _seed(name))

        # Nebulae — apenas nos cantos, sem nebulosa central (evita anéis visíveis)
        _draw_nebula(cv, W * 0.18, H * 0.78, 5.0 * cm, PRI)
        _draw_nebula(cv, W * 0.85, H * 0.25, 4.0 * cm, DARK_PUR)
        _draw_nebula(cv, W * 0.10, H * 0.20, 3.5 * cm, DARK_PUR)
        _draw_nebula(cv, W * 0.90, H * 0.80, 3.0 * cm, PRI)

        cx = W / 2

        # ── Top band ──────────────────────────────────────────
        cv.setFillColor(BG_CARD)
        cv.rect(0, H - 2.5 * cm, W, 2.5 * cm, fill=1, stroke=0)
        cv.setStrokeColor(_c(PRI, 0.5))
        cv.setLineWidth(0.6)
        cv.line(0, H - 2.5 * cm, W, H - 2.5 * cm)

        cv.setFont(F("Poppins-Light"), 8)
        cv.setFillColor(LIGHT)
        cv.drawCentredString(cx, H - 1.4 * cm, "B Ú S S O L A   A S T R O L Ó G I C A")
        cv.setFont(F("Poppins"), 7)
        cv.setFillColor(MUTED)
        cv.drawCentredString(cx, H - 2.0 * cm, "por Crassus Gobbi")

        # ── Central decorative zone ───────────────────────────
        mid_y = H * 0.54

        # Thin ornamental rule above title
        cv.setStrokeColor(_c(GOLD, 0.5))
        cv.setLineWidth(0.5)
        cv.line(cx - 4.2 * cm, mid_y + 5.6 * cm, cx + 4.2 * cm, mid_y + 5.6 * cm)

        # "Mapa da Alma" — grande, Garamond Italic, dourado
        cv.setFont(F("Garamond-Italic"), 46)
        cv.setFillColor(GOLD)
        cv.drawCentredString(cx, mid_y + 4.5 * cm, "Mapa da Alma")

        # Thin rule below title
        cv.setStrokeColor(_c(GOLD, 0.45))
        cv.setLineWidth(0.5)
        cv.line(cx - 4.2 * cm, mid_y + 3.8 * cm, cx + 4.2 * cm, mid_y + 3.8 * cm)

        # "LEITURA PERSONALIZADA DE"
        cv.setFont(F("Poppins-Light"), 7.5)
        cv.setFillColor(LIGHT)
        cv.drawCentredString(cx, mid_y + 3.2 * cm,
                             "L E I T U R A   P E R S O N A L I Z A D A   D E")

        # Nome da cliente — Garamond (não Cinzel) para elegância editorial
        cv.setFont(F("Garamond"), 26)
        cv.setFillColor(TEXT)
        cv.drawCentredString(cx, mid_y + 2.3 * cm, name)

        # "Bem-vinda à sua Carta Sagrada" — Garamond Italic suave
        cv.setFont(F("Garamond-Italic"), 11)
        cv.setFillColor(_c(LIGHT, 0.75))
        cv.drawCentredString(cx, mid_y + 1.55 * cm, "✦  Bem-vinda \xe0 sua Carta Sagrada  ✦")

        # Thin rule below welcome line
        cv.setStrokeColor(_c(LIGHT, 0.25))
        cv.setLineWidth(0.4)
        cv.line(2.5 * cm, mid_y + 1.0 * cm, W - 2.5 * cm, mid_y + 1.0 * cm)

        # ── Sign cards (abaixo da régua de boas-vindas) ──────
        signs = [("SOL", sun_sign or "-"), ("LUA", moon_sign or "-"), ("ASCENDENTE", rising_sign or "-")]
        card_w = (W - 5 * cm) / 3
        x0 = 2.5 * cm
        card_y = mid_y - 0.5 * cm   # desceu em relação ao layout anterior

        for i, (label, value) in enumerate(signs):
            bx = x0 + i * card_w
            # card background
            cv.setFillColor(BG_CARD)
            cv.roundRect(bx + 0.15 * cm, card_y - 1.3 * cm, card_w - 0.3 * cm, 1.9 * cm, 5, fill=1, stroke=0)
            cv.setStrokeColor(_c(PRI, 0.35))
            cv.setLineWidth(0.5)
            cv.roundRect(bx + 0.15 * cm, card_y - 1.3 * cm, card_w - 0.3 * cm, 1.9 * cm, 5, fill=0, stroke=1)
            # label
            cv.setFont(F("Poppins-Light"), 7)
            cv.setFillColor(MUTED)
            cv.drawCentredString(bx + card_w / 2, card_y + 0.35 * cm, label)
            # value
            cv.setFont(F("Garamond"), 13)
            cv.setFillColor(GOLD)
            cv.drawCentredString(bx + card_w / 2, card_y - 0.65 * cm, value)

        # ── Birth info ────────────────────────────────────────
        info_y = mid_y - 2.4 * cm
        parts = []
        if birth_date:
            parts.append(birth_date)
        if birth_city:
            loc = birth_city
            if birth_country and birth_country.lower() not in ("brasil", "brazil"):
                loc += f", {birth_country}"
            parts.append(loc)
        if parts:
            cv.setFont(F("Garamond-Italic"), 10)
            cv.setFillColor(MUTED)
            cv.drawCentredString(cx, info_y, "  |  ".join(parts))

        cv.setFont(F("Poppins-Light"), 7)
        cv.setFillColor(_c(MUTED, 0.6))
        cv.drawCentredString(cx, info_y - 0.55 * cm,
                             f"gerado em {datetime.now().strftime('%d/%m/%Y')}")

        # ── Ornamental dots row ───────────────────────────────
        dot_y = mid_y - 2.5 * cm
        for di in range(-3, 4):
            dx = cx + di * 0.5 * cm
            a = 0.6 if di == 0 else (0.35 if abs(di) == 1 else 0.15)
            cv.setFillColor(_c(LIGHT, a))
            cv.circle(dx, dot_y, 1.2, fill=1, stroke=0)

        # ── Bottom band ───────────────────────────────────────
        cv.setFillColor(BG_CARD)
        cv.rect(0, 0, W, 2.2 * cm, fill=1, stroke=0)
        cv.setStrokeColor(_c(PRI, 0.5))
        cv.setLineWidth(0.6)
        cv.line(0, 2.2 * cm, W, 2.2 * cm)

        cv.setFont(F("Poppins-Light"), 7)
        cv.setFillColor(MUTED)
        cv.drawCentredString(cx, 0.85 * cm,
                             "Este material e exclusivo e intransferivel")
        cv.drawCentredString(cx, 0.35 * cm,
                             "Bússola Astrológica  |  bussolaastrologica.com.br")

        cv.restoreState()

    return _draw


# ── Content page background / footer ─────────────────────────────────────────
def _on_content_page(cv, doc):
    W, H = A4
    cv.saveState()
    cv.setFillColor(BG)
    cv.rect(0, 0, W, H, fill=1, stroke=0)

    # Very subtle corner nebulae for depth
    _draw_nebula(cv, 0, H, 8 * cm, PRI)
    _draw_nebula(cv, W, 0, 8 * cm, DARK_PUR)

    # Bottom band
    cv.setFillColor(BG_CARD)
    cv.rect(0, 0, W, 1.5 * cm, fill=1, stroke=0)
    cv.setStrokeColor(_c(PRI, 0.4))
    cv.setLineWidth(0.5)
    cv.line(0, 1.5 * cm, W, 1.5 * cm)

    cv.setFont(F("Poppins-Light"), 7)
    cv.setFillColor(MUTED)
    cv.drawString(2.5 * cm, 0.55 * cm, "Bússola Astrológica  —  Navegação Tática")
    cv.drawRightString(W - 2.5 * cm, 0.55 * cm, f"{doc.page}")

    cv.restoreState()


# ── Platypus styles ───────────────────────────────────────────────────────────
def _styles() -> dict:
    portal_lbl = ParagraphStyle(
        "PortalLabel",
        fontName=F("Poppins-Light"),
        fontSize=8,
        leading=12,
        textColor=PRI,
        alignment=TA_LEFT,
        spaceBefore=0,
        spaceAfter=3,
        letterSpacing=2,
    )
    sec_title = ParagraphStyle(
        "SecTitle",
        fontName=F("Cinzel-Bold"),
        fontSize=22,
        leading=28,
        textColor=LIGHT,
        alignment=TA_LEFT,
        spaceBefore=0,
        spaceAfter=4,
    )
    body = ParagraphStyle(
        "Body",
        fontName=F("Garamond"),
        fontSize=12,
        leading=20,
        textColor=BODY,
        alignment=TA_JUSTIFY,
        spaceAfter=10,
        firstLineIndent=0,
    )
    bold_body = ParagraphStyle(
        "BoldBody",
        parent=body,
        fontName=F("Garamond-Bold"),
        textColor=TEXT,
    )
    intro_body = ParagraphStyle(
        "IntroBody",
        fontName=F("Garamond-Italic"),
        fontSize=12,
        leading=20,
        textColor=BODY,
        alignment=TA_JUSTIFY,
        spaceAfter=10,
    )
    # ── Rituais ──────────────────────────────────────────────────────────────
    ritual_name = ParagraphStyle(
        "RitualName",
        fontName=F("Cinzel"),
        fontSize=13,
        leading=18,
        textColor=LIGHT,
        alignment=TA_LEFT,
        spaceBefore=16,
        spaceAfter=4,
    )
    ritual_body = ParagraphStyle(
        "RitualBody",
        fontName=F("Garamond"),
        fontSize=11,
        leading=18,
        textColor=BODY,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
        leftIndent=12,
    )
    # ── Afirmagias ───────────────────────────────────────────────────────────
    affirmation = ParagraphStyle(
        "Affirmation",
        fontName=F("Garamond-Italic"),
        fontSize=14,
        leading=22,
        textColor=TEXT,
        alignment=TA_CENTER,
        spaceBefore=18,
        spaceAfter=4,
    )
    aff_source = ParagraphStyle(
        "AffSource",
        fontName=F("Poppins-Light"),
        fontSize=8,
        leading=12,
        textColor=MUTED,
        alignment=TA_CENTER,
        spaceBefore=0,
        spaceAfter=14,
    )
    aff_intro = ParagraphStyle(
        "AffIntro",
        fontName=F("Garamond"),
        fontSize=12,
        leading=20,
        textColor=BODY,
        alignment=TA_JUSTIFY,
        spaceAfter=10,
    )
    return {
        "portal_label": portal_lbl,
        "section_title": sec_title,
        "body": body,
        "body_bold": bold_body,
        "intro": intro_body,
        "ritual_name": ritual_name,
        "ritual_body": ritual_body,
        "affirmation": affirmation,
        "aff_source": aff_source,
        "aff_intro": aff_intro,
    }


# ── Section content story ─────────────────────────────────────────────────────

def _header_block(meta: dict, st: dict) -> list:
    """Portal label + section title + gold rule."""
    return [
        Spacer(1, 0.5 * cm),
        Paragraph(meta["label"], st["portal_label"]),
        Paragraph(meta["title"], st["section_title"]),
        HRFlowable(width="100%", thickness=0.7, color=PRI, spaceAfter=14, spaceBefore=2),
    ]


def _story_rituais(content: str, st: dict) -> list:
    """
    Rituais: detecta nomes de ritual em negrito (**Nome**) e renderiza
    em Cinzel dourado; demais parágrafos em corpo recuado.
    """
    items = []
    paras = list(_iter_paras(content))
    for para in paras:
        # Parágrafo é nome de ritual se começa com **
        if para.startswith("**") and para.count("**") >= 2:
            # Remove marcação bold e usa estilo ritual_name
            name = re.sub(r"\*\*(.+?)\*\*", r"\1", para).strip()
            name = name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            if name:
                items.append(Paragraph(name, st["ritual_name"]))
        else:
            cleaned = _clean(para)
            if cleaned:
                items.append(Paragraph(cleaned, st["ritual_body"]))
    return items


def _story_afirmagias(content: str, st: dict) -> list:
    """
    Afirmagias: cada afirmação é um parágrafo longo em itálico/quotes,
    seguido de parágrafo de origem em itálico curto (entre parênteses ou em *itálico*).
    Detecta o padrão: linha de afirmação → linha de origem.
    """
    items = []
    paras = list(_iter_paras(content))
    for para in paras:
        stripped = para.strip()
        # Origem do mapa: parágrafo curto, em itálico (*...*) ou entre parênteses
        if (stripped.startswith("*") and stripped.endswith("*") and len(stripped) < 120) or \
           (stripped.startswith("(") and stripped.endswith(")") and len(stripped) < 120):
            # Linha de origem — Poppins-Light muted centralizado
            source = stripped.strip("*").strip("()").strip()
            source = source.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            items.append(Paragraph(f"— {source}", st["aff_source"]))
        elif stripped.startswith('"') or stripped.startswith('“') or len(stripped) > 30:
            # Afirmação principal ou parágrafo intro/fechamento
            cleaned = _clean(stripped)
            if cleaned:
                # Parágrafos curtos (afirmações) → estilo afirmação centralizada
                if len(stripped) < 200 and not stripped.endswith(".") and not stripped.endswith(":"):
                    items.append(Paragraph(cleaned, st["affirmation"]))
                else:
                    items.append(Paragraph(cleaned, st["aff_intro"]))
        else:
            cleaned = _clean(stripped)
            if cleaned:
                items.append(Paragraph(cleaned, st["aff_intro"]))
    return items


def _safe_paragraph(text: str, style) -> "Paragraph | None":
    """Cria Paragraph com tratamento de erro para markup inválido."""
    try:
        return Paragraph(text, style)
    except Exception:
        # Fallback: remove toda marcação e tenta novamente como texto puro
        try:
            plain = re.sub(r"<[^>]+>", "", text)
            return Paragraph(plain, style)
        except Exception:
            logger.warning("Parágrafo descartado por erro de markup: %.80r", text)
            return None


def _iter_paras(content: str):
    """Itera parágrafos do conteúdo, pulando linhas meta da IA."""
    for para in content.split("\n\n"):
        para = para.strip()
        if para and not _is_meta_line(para):
            yield para


def _section_content_story(key: str, content: str, st: dict) -> list:
    meta = SECTION_META.get(key, {"label": "", "title": key, "roman": ""})
    items = _header_block(meta, st)

    if key == "rituais":
        items.extend(_story_rituais(content, st))
    elif key == "afirmagias":
        items.extend(_story_afirmagias(content, st))
    else:
        is_intro = key in ("portal", "introducao")
        para_style = st["intro"] if is_intro else st["body"]
        for para in _iter_paras(content):
            cleaned = _clean(para)
            if cleaned:
                p = _safe_paragraph(cleaned, para_style)
                if p:
                    items.append(p)

    return items


# ── Opener page as a Flowable ─────────────────────────────────────────────────
from reportlab.platypus.flowables import Flowable

class _SectionOpenerPage(Flowable):
    """
    Section opener: draws within the frame area.
    The dark background comes from _on_content_page (onLaterPages).
    Stars + rings + symbol + title are rendered here.
    Portal section has no symbol — clean opening page.
    """
    def __init__(self, key: str, meta: dict, seed_val: int):
        super().__init__()
        self.key  = key
        self.meta = meta
        self.seed = seed_val
        self._W   = 0
        self._H   = _FRAME_H

    def wrap(self, availW, availH):
        # Sempre requisita o frame completo → ReportLab descarta para próxima
        # página quando availH < _FRAME_H (i.e., estamos no meio de uma página)
        self._W = availW
        self._H = _FRAME_H
        return availW, _FRAME_H

    def draw(self):
        cv = self.canv
        cv.saveState()          # ← isolate canvas state from surrounding flowables
        try:
            W  = self._W
            H  = self._H

            is_portal = self.key == "portal"

            # Stars within frame (deterministic seed per section)
            key_offset = sum(ord(c) * (i + 1) for i, c in enumerate(self.key)) % 9999
            n_stars = 55 if is_portal else 85
            _draw_stars(cv, W, H, self.seed + key_offset, n=n_stars)

            cx = W / 2
            cy = H * 0.56

            if not is_portal:
                # Nebula + rings (somente nos capítulos 2–8)
                _draw_nebula(cv, cx, cy, 4.5 * cm, PRI)
                _draw_ring(cv, cx, cy, 3.6 * cm, PRI, lw=0.4, alpha=0.22)
                _draw_ring(cv, cx, cy, 3.0 * cm, PRI, lw=0.3, alpha=0.14)

                # Tick marks
                cv.setStrokeColor(_c(PRI, 0.18))
                cv.setLineWidth(0.35)
                for i in range(12):
                    angle = math.pi * 2 * i / 12
                    r_in  = 3.0 * cm if i % 3 == 0 else 3.2 * cm
                    cv.line(
                        cx + r_in  * math.cos(angle), cy + r_in  * math.sin(angle),
                        cx + 3.6 * cm * math.cos(angle), cy + 3.6 * cm * math.sin(angle),
                    )

                # Central symbol (3-layer glow)
                _draw_section_symbol(cv, cx, cy, self.meta["symbol"], r=1.15 * cm)
            else:
                # Portal: nebula suave sem símbolo — abertura limpa e elegante
                _draw_nebula(cv, cx, cy + 1.5 * cm, 5.5 * cm, PRI)

            # Portal label
            lbl_y = cy - (2.8 * cm if not is_portal else 3.5 * cm)
            cv.setFont(F("Poppins-Light"), 8)
            cv.setFillColor(PRI)
            cv.drawCentredString(cx, lbl_y, self.meta["label"])

            # Divider
            line_w = 2.8 * cm if is_portal else 3.2 * cm
            cv.setStrokeColor(_c(LIGHT, 0.45))
            cv.setLineWidth(0.5)
            cv.line(cx - line_w, lbl_y - 0.32 * cm, cx + line_w, lbl_y - 0.32 * cm)

            # Section title — Garamond para Portal, Cinzel para outros
            if is_portal:
                cv.setFont(F("Garamond-Italic"), 32)
                cv.setFillColor(GOLD)
            else:
                cv.setFont(F("Cinzel"), 26)
                cv.setFillColor(TEXT)
            cv.drawCentredString(cx, lbl_y - 1.15 * cm, self.meta["title"])

            # Subtle dot row
            dot_y = lbl_y - 2.0 * cm
            for di in range(-2, 3):
                dx = cx + di * 0.45 * cm
                a = 0.50 if di == 0 else (0.25 if abs(di) == 1 else 0.10)
                cv.setFillColor(_c(LIGHT, a))
                cv.circle(dx, dot_y, 1.0, fill=1, stroke=0)

        except Exception:
            logger.exception("Erro ao desenhar opener da seção '%s'", self.key)
        finally:
            cv.restoreState()   # ← always restore, even on error


# ── Astrological chart page (SVG embedded via svglib) ────────────────────────
# ── Astrological chart page (SVG embedded via svglib / headless browser) ─────
class _ChartPageFlowable(Flowable):
    """
    Full-frame flowable that embeds the kerykeion SVG birth chart.
    Dark cosmos background comes from _on_content_page.
    """
    def __init__(self, svg_content: str, name: str, seed_val: int):
        super().__init__()
        self.svg_content = svg_content
        self.name        = name
        self.seed        = seed_val
        self._W          = 0
        self._H          = 0

    def wrap(self, availW, availH):
        self._W = availW
        self._H = _FRAME_H
        return availW, _FRAME_H

    def draw(self):
        import tempfile, os as _os, subprocess
        cv = self.canv
        cv.saveState()          # ← isolate canvas state from surrounding flowables
        try:
            W  = self._W
            H  = self._H

            # Subtle stars behind the wheel
            _draw_stars(cv, W, H, self.seed + 997, n=60)

            # Soft nebulae (corners)
            _draw_nebula(cv, 0,     H,     3.5 * cm, PRI)
            _draw_nebula(cv, W,     0,     3.0 * cm, DARK_PUR)
            _draw_nebula(cv, W / 2, H / 2, 6.0 * cm, PRI)

            cx = W / 2

            # ── Header ──────────────────────────────────────────────────────────
            header_h = 1.8 * cm

            cv.setFont(F("Poppins-Light"), 8)
            cv.setFillColor(PRI)
            cv.drawCentredString(cx, H - 0.55 * cm, "C A R T A   N A T A L")

            cv.setFont(F("Cinzel"), 17)
            cv.setFillColor(TEXT)
            cv.drawCentredString(cx, H - 1.35 * cm, self.name)

            cv.setStrokeColor(_c(PRI, 0.40))
            cv.setLineWidth(0.5)
            cv.line(0, H - header_h, W, H - header_h)

            # ── SVG chart ────────────────────────────────────────────────────────
            rendered_via_browser = False
            if self.svg_content:
                try:
                    # Resolve CSS variables (kerykeion usa var(--xxx) que svglib não suporta)
                    clean_svg = _preprocess_svg(self.svg_content)

                    # ── Headless Browser Rendering (Edge/Chrome) ──────────────────
                    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body {{
    margin: 0;
    padding: 0;
    width: 890px;
    height: 580px;
    overflow: hidden;
    background-color: #0f0b1e;
  }}
  svg {{
    width: 890px;
    height: 580px;
    display: block;
  }}
</style>
</head>
<body>
  {clean_svg}
</body>
</html>
"""
                    # Usa diretório de trabalho do processo — o Edge só grava em paths
                    # acessíveis ao processo; tempfile em AppData/Temp pode falhar.
                    _work_dir = _os.path.dirname(_os.path.abspath(__file__))
                    import uuid as _uuid
                    _uid = _uuid.uuid4().hex[:12]
                    html_path = _os.path.join(_work_dir, f"_chart_{_uid}.html")
                    png_path  = _os.path.join(_work_dir, f"_chart_{_uid}.png")

                    try:
                        with open(html_path, 'w', encoding='utf-8') as f:
                            f.write(html_content)
                        # NÃO cria o arquivo PNG — o Edge precisa criá-lo do zero

                        # Caminhos absolutos (Windows)
                        browsers = [
                            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                        ]

                        browser_exe = None
                        for b in browsers:
                            if _os.path.exists(b):
                                browser_exe = b
                                break

                        if not browser_exe:
                            import platform as _platform
                            is_windows = _platform.system() == "Windows"
                            # Windows: usa where; Linux/Mac: usa which
                            _finder = "where" if is_windows else "which"
                            _candidates = (
                                ["msedge", "chrome"] if is_windows
                                else ["chromium-browser", "chromium", "google-chrome-stable", "google-chrome", "chrome"]
                            )
                            try:
                                for fallback in _candidates:
                                    res = subprocess.run([_finder, fallback], capture_output=True, text=True)
                                    if res.returncode == 0:
                                        lines = res.stdout.strip().split("\n")
                                        candidate = lines[0].strip()
                                        if candidate and (_os.path.exists(candidate) or not is_windows):
                                            browser_exe = candidate
                                            break
                            except Exception:
                                pass

                        if browser_exe:
                            import pathlib as _pl
                            file_url = _pl.Path(html_path).as_uri()
                            cmd = [
                                browser_exe,
                                "--headless",
                                "--disable-gpu",
                                "--no-sandbox",
                                f"--screenshot={png_path}",
                                "--window-size=890,580",
                                file_url,
                            ]

                            logger.info(f"Renderizando mandala via headless browser: {_os.path.basename(browser_exe)}")
                            subprocess.run(cmd, capture_output=True, text=True, timeout=20)
                            # Edge escreve o arquivo de forma assíncrona; aguarda até 8 s
                            import time as _time
                            for _wait in range(16):
                                _time.sleep(0.5)
                                if _os.path.exists(png_path) and _os.path.getsize(png_path) > 0:
                                    break

                            if _os.path.exists(png_path) and _os.path.getsize(png_path) > 0:
                                avail_w = W
                                avail_h = H - header_h - 0.4 * cm
                                svg_w = 890
                                svg_h = 580
                                scale = min(avail_w / svg_w, avail_h / svg_h) * 0.96
                                dw = svg_w * scale
                                dh = svg_h * scale
                                x = (W - dw) / 2
                                y = (avail_h - dh) / 2

                                cv.drawImage(png_path, x, y, width=dw, height=dh)
                                rendered_via_browser = True
                                logger.info("Mandala renderizada com sucesso via headless browser")
                    finally:
                        try:
                            if _os.path.exists(html_path):
                                _os.unlink(html_path)
                        except Exception:
                            pass
                        try:
                            if _os.path.exists(png_path):
                                _os.unlink(png_path)
                        except Exception:
                            pass
                except Exception:
                    logger.exception("Erro ao renderizar mandala via headless browser. Caindo de volta para svglib.")

                # Fallback clássico (svglib) — injeta fundo escuro antes de renderizar
                if not rendered_via_browser and _SVGLIB_OK:
                    try:
                        import re as _re

                        # Injeta <rect> de fundo escuro dentro da tag <svg>
                        bg_rect = '<rect width="100%" height="100%" fill="#0f0b1e"/>'
                        svg_with_bg = _re.sub(
                            r'(<svg[^>]*>)',
                            r'\1' + bg_rect,
                            clean_svg,
                            count=1,
                        )

                        tmp = tempfile.NamedTemporaryFile(
                            suffix=".svg", mode="w", encoding="utf-8", delete=False
                        )
                        tmp.write(svg_with_bg)
                        tmp.close()
                        drawing = svg2rlg(tmp.name)
                        _os.unlink(tmp.name)

                        if drawing and drawing.width > 0 and drawing.height > 0:
                            avail_w = W
                            avail_h = H - header_h - 0.4 * cm
                            scale   = min(avail_w / drawing.width, avail_h / drawing.height) * 0.96
                            dw = drawing.width  * scale
                            dh = drawing.height * scale
                            x  = (W - dw) / 2
                            y  = (avail_h - dh) / 2

                            # Pinta fundo escuro na área do mapa antes de desenhar o SVG
                            cv.setFillColor(BG)
                            cv.rect(0, 0, W, avail_h + 0.4 * cm, fill=1, stroke=0)

                            drawing.transform = (scale, 0, 0, scale, 0, 0)
                            drawing.width  = dw
                            drawing.height = dh
                            _renderPDF.draw(drawing, cv, x, y)
                            logger.info("Mandala renderizada via svglib com fundo escuro")
                        else:
                            logger.warning("SVG convertido mas drawing vazio (width=%s, height=%s)",
                                           drawing.width if drawing else "N/A",
                                           drawing.height if drawing else "N/A")
                    except Exception:
                        logger.exception("Erro ao embutir SVG no PDF (svglib)")
                elif not rendered_via_browser and not _SVGLIB_OK:
                    logger.warning("Nenhum renderizador disponível — página de carta natal sem SVG")

        except Exception:
            logger.exception("Erro em _ChartPageFlowable.draw()")
        finally:
            cv.restoreState()   # ← always restore, even on error


# ── Entry point ───────────────────────────────────────────────────────────────
def generate_pdf(
    name: str,
    sun_sign: str,
    moon_sign: str = "",
    rising_sign: str = "",
    birth_date: str = "",
    birth_city: str = "",
    birth_country: str = "Brasil",
    sections: dict = None,
    svg_content: str = "",
) -> bytes:
    """
    Gera PDF Mapa da Alma — Luxury Edition.
    Retorna bytes do PDF.
    """
    if sections is None:
        sections = {}

    # ── Retrocompatibilidade: migra chaves antigas → novas ────────────────
    _KEY_MIGRATION = {
        "introducao":      "portal",
        "primeiro_portal": "essencia",
        "segundo_portal":  "ferida_e_dom",
        "terceiro_portal": "dons_esquecidos",
        "quarto_portal":   "luz_e_sombra",
        "quinto_portal":   "reencontro",
    }
    original_keys = sorted(sections.keys())
    # Coerce None → "" e migra chaves legadas
    sections = {_KEY_MIGRATION.get(k, k): (v or "") for k, v in sections.items()}

    keys_with_content = [k for k in SECTION_ORDER if (sections.get(k) or "").strip()]
    logger.info(
        "generate_pdf: cliente='%s' | chaves originais=%s | seções com conteúdo=%s",
        name, original_keys, keys_with_content,
    )
    if not keys_with_content:
        logger.warning(
            "generate_pdf: NENHUMA seção com conteúdo para '%s' — PDF ficará vazio!",
            name,
        )

    seed_val = _seed(name)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.0 * cm,
        title=f"Mapa da Alma — {name}",
        author="Bússola Astrológica",
        subject="Leitura Astrologica Personalizada",
    )

    st = _styles()

    # ── Cover (page 1): drawn entirely via canvas callback ──
    story = [PageBreak()]

    # ── Chart page (page 2): kerykeion SVG birth chart ────────
    # _ChartPageFlowable.wrap() retorna _FRAME_H → preenche página inteira
    # → próximo flowable vai automaticamente para página 3 sem PageBreak extra
    if svg_content:
        story.append(_ChartPageFlowable(svg_content, name, seed_val))

    # ── Section pages ─────────────────────────────────────────
    # Lógica anti-páginas-em-branco:
    # • NÃO há PageBreak antes do opener — wrap() retorna _FRAME_H então se
    #   não couber na página atual vai para a próxima automaticamente
    # • PageBreak DEPOIS do opener → conteúdo começa em página limpa
    # • NÃO há PageBreak após o conteúdo → próximo opener empurra para nova
    #   página via wrap() sem criar página em branco intermediária
    for key in SECTION_ORDER:
        content = sections.get(key, "").strip()
        if not content:
            continue

        # Opener ocupa a página inteira (wrap devolve _FRAME_H)
        story.append(_SectionOpenerPage(key, SECTION_META[key], seed_val))
        story.append(PageBreak())  # conteúdo começa na próxima página

        # Conteúdo — sem PageBreak final (evita página em branco)
        story.extend(_section_content_story(key, content, st))

    # Build
    cover_fn = _make_cover(
        name=name,
        sun_sign=sun_sign,
        moon_sign=moon_sign,
        rising_sign=rising_sign,
        birth_date=birth_date,
        birth_city=birth_city,
        birth_country=birth_country,
    )

    # Track which pages are opener pages for background
    doc.build(
        story,
        onFirstPage=cover_fn,
        onLaterPages=_on_content_page,
    )
    return buffer.getvalue()
