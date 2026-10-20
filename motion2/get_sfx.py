"""
Саунддизайн: скачиваем музыкальный бед и SFX (Freesound, CC0/CC-BY через Openverse).
Каждый кандидат сохраняем отдельным файлом, потом собираем микс.
"""
import json, os, re, urllib.request, urllib.parse, subprocess

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
OUT = r"C:\Users\user\AppData\Local\Temp\opencode\motion2\sfx"
os.makedirs(OUT, exist_ok=True)

# группа -> поисковые запросы
GROUPS = {
    "music":  ["electronic beat", "dark synth loop", "trailer music epic", "tech corporate music", "cinematic tension"],
    "riser":  ["riser sweep up", "transition whoosh build", "tension riser"],
    "impact": ["impact hit boom", "bass drop hit", "cinematic impact"],
    "whoosh": ["whoosh transition", "swish fast", "wind swoosh"],
    "click":  ["ui click pop", "interface blip", "notification ping"],
    "sub":    ["sub bass hit", "low boom drop", "60hz thump"],
}

def search(term, page_size=10):
    url = "https://api.openverse.org/v1/audio/?" + urllib.parse.urlencode(
        {"q": term, "page_size": page_size, "license": "cc0,pdm,by"})
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode()).get("results", [])
    except Exception:
        return []

def dl(url, dest):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        if len(data) < 3000:
            return False
        with open(dest, "wb") as f:
            f.write(data)
        return True
    except Exception:
        return False

manifest = {}
for group, terms in GROUPS.items():
    gdir = os.path.join(OUT, group)
    os.makedirs(gdir, exist_ok=True)
    seen, n = set(), 0
    for term in terms:
        for res in search(term):
            url = res.get("url") or ""
            if not url.endswith(".mp3") or url in seen:
                continue
            seen.add(url)
            name = re.sub(r"[^A-Za-z0-9]+", "_", str(res.get("title", "x")))[:44]
            dest = os.path.join(gdir, f"{n:02d}_{name}.mp3")
            if dl(url, dest):
                manifest[dest] = {"group": group, "title": res.get("title"), "url": url,
                                  "license": res.get("license"), "creator": res.get("creator"),
                                  "duration": res.get("duration"), "landing": res.get("foreign_landing_url")}
                print(f"  {group:7} {name[:46]:48} {res.get('duration', 0):>6}s")
                n += 1
            if n >= 8:
                break
        if n >= 8:
            break

with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f"\nВсего скачано: {len(manifest)}")