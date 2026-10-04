# -*- coding: utf-8 -*-
"""
Sirius Academy — Design Agent | gpt-image-2
Gera todos os assets visuais do sistema com DNA visual consistente.
Execute: python generate-assets.py
Imagens ja existentes sao puladas automaticamente.
"""
import os, sys, base64, shutil

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from openai import OpenAI
except ImportError:
    os.system("pip install openai -q")
    from openai import OpenAI

# ── Config ────────────────────────────────────────────────────────────────────
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
api_key = None
if os.path.exists(env_path):
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("OPENAI_API_KEY="):
                api_key = line.strip().split("=", 1)[1]; break

if not api_key:
    print("OPENAI_API_KEY nao encontrado em backend/.env"); sys.exit(1)

client  = OpenAI(api_key=api_key)
ROOT    = os.path.dirname(os.path.abspath(__file__))
ASSET   = os.path.join(ROOT, "sirius-asset")
PUBLIC  = os.path.join(ROOT, "frontend", "public")
os.makedirs(PUBLIC, exist_ok=True)

# ── DNA Visual — bloco incluido em todos os prompts ──────────────────────────
DNA = (
    "Visual identity of Sirius Academy. "
    "Luxury cosmic aesthetic inspired by Sirius star system. "
    "Deep cosmic navy background (#07041A). "
    "Sirius blue (#54D7FF) as primary light source. "
    "Moon white (#F7F4FF) highlights. "
    "Subtle nebula blue-violet accents. "
    "Astronomical sophistication. "
    "No orange. No gold. No warm tones. "
    "No zodiac symbols. No mystical cliches. "
    "No fantasy RPG style. No cartoon. No bright purple dominance. "
    "Apple-level premium design. "
    "Interstellar film inspired atmosphere. "
    "Elegant celestial lighting. Sacred geometry. "
    "Ultra detailed. 8K quality. "
    "Dark premium background. Consistent visual language. "
)

# ── Asset list ────────────────────────────────────────────────────────────────
# Formato: (categoria, nome_arquivo, tamanho, prompt_especifico, nome_publico)
ASSETS = [

    # BRAND ───────────────────────────────────────────────────────────────────
    (
        "BRAND", "icone-sirius.png", "1024x1024",
        (
            "An eight-pointed Sirius star icon. "
            "Perfect geometric symmetry. "
            "Luxury minimal icon design. "
            "Brilliant blue-white celestial glow radiating from center. "
            "Crisp sharp edges with subtle light diffusion. "
            "Premium technology brand icon. "
            "Transparent-style dark background. "
            "Ultra sharp. No text. No additional elements. "
        ),
        "icone-sirius.png",
    ),

    # BACKGROUNDS ─────────────────────────────────────────────────────────────
    (
        "BACKGROUNDS", "background-main.png", "1536x1024",
        (
            "Deep cosmic universe panorama inspired by Sirius star system. "
            "Vast dark navy space (#07041A) stretching infinitely. "
            "Subtle blue nebula clouds drifting across the scene. "
            "Ethereal particle field of distant stars and cosmic dust. "
            "A single dominant Sirius-like blue-white star in upper area "
            "casting gentle rays across the scene. "
            "Elegant cinematic atmosphere. "
            "No planets. No people. No figures. No text. "
            "Designed as ultra-premium SaaS platform background. "
        ),
        "background-main.png",
    ),

    # HERO ────────────────────────────────────────────────────────────────────
    (
        "HERO", "hero-sirius-woman.png", "1536x1024",
        (
            "A mystical woman standing in right-profile silhouette "
            "against a colossal Sirius planet that dominates the right side. "
            "The planet emits brilliant blue-white (#54D7FF) celestial light. "
            "Sirius blue energy wisps flow elegantly around her body. "
            "Cosmic silk fabric effect surrounds her figure. "
            "Deep navy space background with subtle star field. "
            "Figure positioned on right side, left side open for text overlay. "
            "Cinematic wide composition. Ultra premium. "
            "No text. No face visible. "
        ),
        "hero-sirius-woman.png",
    ),

    # JOURNEY — Secoes do Mapa da Alma ────────────────────────────────────────
    (
        "JOURNEY", "essencia.png", "1024x1024",
        (
            "A luminous eight-pointed Sirius star emerging from the center "
            "of two ethereal cosmic hands cupped upward. "
            "Sacred geometry patterns radiate from the star outward. "
            "Blue-white (#54D7FF) celestial energy pulses from the core. "
            "Deep cosmic navy background with particle field. "
            "Elegant spiritual symbolism of one's core essence. "
            "Luxury illustration. No text. "
        ),
        "essencia.png",
    ),
    (
        "JOURNEY", "ferida-dom.png", "1024x1024",
        (
            "A celestial crystal or geode floating in dark space, split vertically in half. "
            "Left side: deep dark cosmic navy, shadow, dormant. "
            "Right side: brilliantly illuminated by Sirius blue (#54D7FF) light "
            "pouring through the crystal facets. "
            "Transformation and duality symbolism. "
            "Luxury cosmic illustration. Deep navy background. "
            "Crystal-clear facets catching celestial light. "
            "No text. "
        ),
        "ferida-dom.png",
    ),
    (
        "JOURNEY", "luz-sombra.png", "1024x1024",
        (
            "Perfect celestial duality composition: "
            "left half radiates pure Sirius blue (#54D7FF) light energy beams "
            "representing solar consciousness and illumination, "
            "right half fades into deep cosmic navy shadows "
            "representing lunar mystery and hidden depths. "
            "At the center a luminous vertical veil of blue-white particle mist "
            "where both energies meet and harmonize. "
            "Sacred geometry circle framing the scene. "
            "Elegant spiritual symbolism. Luxury cosmic illustration. "
            "No text. "
        ),
        "luz-sombra.png",
    ),
    (
        "JOURNEY", "dons-esquecidos.png", "1024x1024",
        (
            "An ancient constellation pattern awakening in deep space. "
            "Individual stars flicker to life and reconnect "
            "through luminous Sirius blue (#54D7FF) celestial lines "
            "forming a sacred geometric constellation map. "
            "Blue-white energy pulses travel along the connecting lines. "
            "Stars of varying brightness scattered across dark navy. "
            "Elegant sacred symbolism of rediscovering forgotten gifts. "
            "Luxury illustration. No text. "
        ),
        "dons-esquecidos.png",
    ),
    (
        "JOURNEY", "reencontro.png", "1024x1024",
        (
            "Two streams of Sirius blue (#54D7FF) celestial energy "
            "flowing from opposite sides of the frame, "
            "spiraling and merging into one radiant Sirius star at center. "
            "Where they merge: brilliant white-blue nova burst. "
            "Sacred geometry spirals accompany each stream. "
            "Symbol of soul reunion and convergence. "
            "Deep cosmic navy background with star particles. "
            "Luxury cosmic artwork. No text. "
        ),
        "reencontro.png",
    ),
    (
        "JOURNEY", "rituais.png", "1024x1024",
        (
            "A perfect sacred geometric circle floating in deep space. "
            "Intricate mandala-like patterns inscribed within it "
            "made of fine blue-white light lines. "
            "Sirius blue (#54D7FF) celestial energy rotates clockwise "
            "around the outer ring like a sacred orbit. "
            "Four points of concentrated light at cardinal directions. "
            "Dark navy background with subtle cosmic atmosphere. "
            "Elegant ritual symbolism. Luxury cosmic illustration. No text. "
        ),
        "rituais.png",
    ),
    (
        "JOURNEY", "afirmacoes.png", "1024x1024",
        (
            "A floating celestial manuscript or scroll made of pure light "
            "in deep cosmic space. "
            "Words and script dissolve and transform into stars and light particles "
            "rising upward like luminous smoke. "
            "Sirius blue (#54D7FF) glow illuminates the manuscript from within. "
            "Sacred geometry frames the scene. "
            "Deep cosmic navy background. "
            "Luxury spiritual illustration of words becoming cosmic reality. "
            "No readable text. No Latin script. Only abstract light patterns. "
        ),
        "afirmacoes.png",
    ),

    # COMPONENTS ──────────────────────────────────────────────────────────────
    (
        "COMPONENTS", "triade-sagrada.png", "1024x1024",
        (
            "Three luminous celestial spheres arranged in a perfect sacred triangle. "
            "Top sphere: largest, moon-textured with blue-white illumination. "
            "Bottom-left sphere: medium, deep Sirius blue (#54D7FF) glow. "
            "Bottom-right sphere: smaller, brilliant star-white light. "
            "Connected by elegant glowing geometric lines forming a sacred triangle diagram. "
            "Orbital dotted paths around each sphere. "
            "Deep cosmic navy background. "
            "Luxury cosmic sacred geometry diagram. No text. "
        ),
        "triade-sagrada.png",
    ),
    (
        "COMPONENTS", "podcast-da-alma.png", "1024x1024",
        (
            "A luminous eight-pointed Sirius star at center "
            "transforming and dissolving into elegant concentric sound wave rings "
            "expanding outward through cosmic space. "
            "Waves made of Sirius blue (#54D7FF) and moon white (#F7F4FF) light. "
            "Each wave ring slightly fainter than the last. "
            "Cosmic frequencies expanding through dark navy space. "
            "Premium audio meets celestial symbolism. "
            "Luxury illustration. Dark navy background. No text. "
        ),
        "podcast-da-alma.png",
    ),
]

# ── Generator ─────────────────────────────────────────────────────────────────
print("=" * 60)
print("  Sirius Academy — Design Agent | gpt-image-2")
print("=" * 60)
print(f"\n  Total de assets: {len(ASSETS)}")
print("  Imagens existentes serao puladas\n")
print("=" * 60 + "\n")

success, skipped, errors = 0, 0, 0

for i, (category, filename, size, specific_prompt, public_name) in enumerate(ASSETS, 1):
    category_dir = os.path.join(ASSET, category)
    os.makedirs(category_dir, exist_ok=True)

    dest_asset  = os.path.join(category_dir, filename)
    dest_public = os.path.join(PUBLIC, public_name)

    # Pula se ja existe em ambos os destinos
    if os.path.exists(dest_asset) and os.path.exists(dest_public):
        kb = os.path.getsize(dest_asset) // 1024
        print(f"[{i:02d}/{len(ASSETS)}] {category}/{filename}")
        print(f"         JA EXISTE ({kb} KB) — pulando\n")
        skipped += 1
        continue

    full_prompt = specific_prompt + DNA
    print(f"[{i:02d}/{len(ASSETS)}] {category}/{filename} ({size})")
    print(f"         Gerando com gpt-image-2...")

    try:
        resp = client.images.generate(
            model="gpt-image-2",
            prompt=full_prompt,
            size=size,
            quality="high",
            n=1,
        )
        b64 = resp.data[0].b64_json
        img_bytes = base64.b64decode(b64)

        # Salva em sirius-asset/CATEGORY/
        with open(dest_asset, "wb") as f:
            f.write(img_bytes)

        # Copia para frontend/public/
        shutil.copy2(dest_asset, dest_public)

        kb = os.path.getsize(dest_asset) // 1024
        print(f"         OK — {kb} KB -> sirius-asset/{category}/ + frontend/public/\n")
        success += 1

    except Exception as e:
        print(f"         ERRO: {e}\n")
        errors += 1

print("=" * 60)
print(f"  Resultado: {success} geradas | {skipped} puladas | {errors} erros")
print("=" * 60)

if success > 0:
    print("\n  Para publicar:")
    print("    git add frontend/public/ sirius-asset/")
    print('    git commit -m "feat: sirius design system assets"')
    print("    git push origin main")
