import json, urllib.request, urllib.parse, re

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

def get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

print("=" * 70)
print("OPENVERSE AUDIO (без фильтра по категории)")
for term in ["ambient", "electronic instrumental", "synth", "corporate"]:
    url = "https://api.openverse.org/v1/audio/?" + urllib.parse.urlencode(
        {"q": term, "page_size": 8, "license": "cc0,pdm"})
    try:
        d = json.loads(get(url).decode())
        print(f"\n  {term}: всего {d.get('result_count')}")
        for r in d.get("results", [])[:5]:
            print(f"    - {str(r.get('title'))[:40]:42} {r.get('duration',0):>6}s  {r.get('url','')[:70]}")
    except Exception as e:
        print(f"  {term}: ERR {str(e)[:70]}")

print("\n" + "=" * 70)
print("ARCHIVE.ORG — поиск CC0 музыки")
q = 'mediatype:(audio) AND (collection:(opensource_audio) OR licenseurl:*creativecommons*) AND (title:(ambient) OR title:(electronic))'
url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(
    {"q": q, "fl[]": ["identifier", "title", "licenseurl", "creator"], "rows": 12, "output": "json"})
try:
    d = json.loads(get(url, 30).decode())
    docs = d.get("response", {}).get("docs", [])
    print(f"  найдено: {d.get('response',{}).get('numFound')}")
    for doc in docs[:10]:
        print(f"    - {str(doc.get('title'))[:44]:46} | {doc.get('identifier')}")
except Exception as e:
    print("  ERR", str(e)[:120])