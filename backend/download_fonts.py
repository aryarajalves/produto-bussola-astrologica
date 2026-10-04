#!/usr/bin/env python3
"""
Baixa as fontes necessárias para o PDF do Mapa da Alma.
Execute uma vez: python download_fonts.py
"""
import os, re, sys
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests nao encontrado. Instale: pip install requests")

FONTS_DIR = Path(__file__).parent / "fonts"
FONTS_DIR.mkdir(exist_ok=True)

# User-Agent antigo -> Google Fonts retorna TTF (nao WOFF2)
TTF_UA = "Mozilla/4.0 (compatible; MSIE 5.0; Windows NT 5.0)"

FONTS = [
    ("EBGaramond-Regular",   "EB+Garamond",          "400"),
    ("EBGaramond-Bold",      "EB+Garamond",          "700"),
    ("EBGaramond-Italic",    "EB+Garamond",          "400italic"),
    ("Cinzel-Regular",       "Cinzel",               "400"),
    ("Cinzel-Bold",          "Cinzel",               "700"),
    ("Poppins-Light",        "Poppins",              "300"),
    ("Poppins-Regular",      "Poppins",              "400"),
    ("Poppins-LightItalic",  "Poppins",              "300italic"),
    ("NotoSansSymbols2",     "Noto+Sans+Symbols+2",  "400"),
]

def download(name, family, weight):
    dest = FONTS_DIR / f"{name}.ttf"
    if dest.exists():
        print(f"  ok   {name}.ttf  (ja existe)")
        return True

    css_url = f"https://fonts.googleapis.com/css?family={family}:{weight}"
    try:
        r = requests.get(css_url, headers={"User-Agent": TTF_UA}, timeout=15)
        # Google Fonts pode retornar URL proxy sem extensao .ttf
        urls = re.findall(r"url\((https://fonts\.gstatic\.com[^)]+)\)", r.text)
        if not urls:
            print(f"  ERR  {name}: sem URL na resposta CSS")
            print(f"       resposta: {r.text[:300]}")
            return False
        font_url = urls[0]
        fr = requests.get(font_url, headers={"User-Agent": TTF_UA}, timeout=30)
        if len(fr.content) < 1000:
            print(f"  ERR  {name}: resposta invalida ({len(fr.content)} bytes)")
            return False
        dest.write_bytes(fr.content)
        print(f"  dl   {name}.ttf  ({len(fr.content)//1024} KB)")
        return True
    except Exception as e:
        print(f"  ERR  {name}: {e}")
        return False

if __name__ == "__main__":
    print(f"\nBaixando fontes para: {FONTS_DIR}\n")
    ok = sum(download(*f) for f in FONTS)
    print(f"\n{ok}/{len(FONTS)} fontes prontas.\n")
    if ok < len(FONTS):
        print("Fontes faltando usarao Helvetica como fallback.")
