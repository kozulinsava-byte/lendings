import json, urllib.request, urllib.parse

def q(search, page=1, extra=""):
    url = ("https://api.openverse.org/v1/audio/?" + urllib.parse.urlencode(
        {"q": search, "page_size": 12, "page": page, "license": "cc0,pdm", "category": "music"}) + extra)
    req = urllib.request.Request(url, headers={"User-Agent": "probe"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"error": str(e)[:100]}

for term in ["ambient electronic", "corporate instrumental", "cinematic tech", "upbeat electronic", "dark synth"]:
    print("=" * 60)
    print(term)
    d = q(term)
    if "error" in d:
        print("  ERR", d["error"]); continue
    print("  всего:", d.get("result_count"))
    for r in d.get("results", [])[:8]:
        print(f"  - {r.get('title','')[:46]:48} {r.get('duration',0):>6}s  {r.get('url','')[:78]}")