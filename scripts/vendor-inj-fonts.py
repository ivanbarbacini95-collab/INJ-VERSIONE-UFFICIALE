#!/usr/bin/env python3
"""Vendor five SIL-OFL font files for INJ Node as optimized WOFF2 assets.
Sources: google/fonts pinned revision, license texts copied unmodified.
No user-uploaded/proprietary font files are included.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

from fontTools.ttLib import TTFont

GOOGLE_FONTS_COMMIT = "6157dfaa640ca5738b4d1a7070fe389c3036d7fc"
BASE = "https://raw.githubusercontent.com/google/fonts/" + GOOGLE_FONTS_COMMIT + "/"
FONTS = {
    "inj-geist.woff2": "ofl/geist/Geist[wght].ttf",
    "inj-space-grotesk.woff2": "ofl/spacegrotesk/SpaceGrotesk[wght].ttf",
    "inj-ibm-plex-mono-regular.woff2": "ofl/ibmplexmono/IBMPlexMono-Regular.ttf",
    "inj-ibm-plex-mono-medium.woff2": "ofl/ibmplexmono/IBMPlexMono-Medium.ttf",
    "inj-oxanium.woff2": "ofl/oxanium/Oxanium[wght].ttf",
}
LICENSES = {
    "OFL-Geist.txt": "ofl/geist/OFL.txt",
    "OFL-Space-Grotesk.txt": "ofl/spacegrotesk/OFL.txt",
    "OFL-IBM-Plex-Mono.txt": "ofl/ibmplexmono/OFL.txt",
    "OFL-Oxanium.txt": "ofl/oxanium/OFL.txt",
}
DEST = Path("assets/fonts")
DEST.mkdir(parents=True, exist_ok=True)
(DEST / "licenses").mkdir(parents=True, exist_ok=True)

def fetch(path: str) -> bytes:
    url = BASE + quote(path, safe="/")
    request = Request(url, headers={"User-Agent": "INJNode-font-vendor/1"})
    with urlopen(request, timeout=45) as response:
        return response.read()

for target, source in FONTS.items():
    data = fetch(source)
    font = TTFont(BytesIO(data))
    font.flavor = "woff2"
    path = DEST / target
    font.save(str(path))
    TTFont(str(path)).close()
    print(f"Vendored {path}: {path.stat().st_size:,} bytes")

for target, source in LICENSES.items():
    data = fetch(source)
    path = DEST / "licenses" / target
    path.write_bytes(data)
    print(f"License {path}")
