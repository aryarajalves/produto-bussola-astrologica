# -*- coding: utf-8 -*-
"""Regenera apenas section-essencia.jpg com prompt seguro."""
import os, sys, base64
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from openai import OpenAI
except ImportError:
    os.system("pip install openai -q"); from openai import OpenAI

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
api_key = None
if os.path.exists(env_path):
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("OPENAI_API_KEY="):
                api_key = line.strip().split("=", 1)[1]; break

if not api_key:
    print("OPENAI_API_KEY nao encontrado"); sys.exit(1)

client = OpenAI(api_key=api_key)
OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "public")

prompt = (
    "Mystical cosmic nebula landscape in widescreen: a luminous aurora of violet and indigo "
    "light rising from the horizon like a living energy column, "
    "surrounded by sacred geometry patterns made of glowing constellation lines, "
    "thousands of stars scattered in deep space, soft cosmic dust clouds in shades of blue and purple, "
    "ethereal translucent energy waves flowing upward like a soul ascending, "
    "deep dark navy background, cinematic wide composition, "
    "transcendent and sacred atmosphere, hyper detailed, no figures, no text"
)

dest = os.path.join(OUTPUT, "section-essencia.jpg")
print("Gerando section-essencia.jpg ...")
try:
    resp = client.images.generate(
        model="gpt-image-2", prompt=prompt,
        size="1536x1024", quality="high", n=1,
    )
    b64 = resp.data[0].b64_json
    with open(dest, "wb") as f:
        f.write(base64.b64decode(b64))
    kb = os.path.getsize(dest) // 1024
    print(f"OK! ({kb} KB) -> {dest}")
except Exception as e:
    print(f"ERRO: {e}")
