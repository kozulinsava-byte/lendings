import asyncio, json, ssl
import aiohttp

WSS = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1"

async def probe():
    for url in [
        "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4",
        "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4",
    ]:
        try:
            async with aiohttp.ClientSession() as s:
                async with s.get(url, timeout=aiohttp.ClientTimeout(total=20)) as r:
                    body = (await r.text())[:200]
                    print(f"HTTP {r.status}  {url[:70]}")
                    print("   ", body.replace("\n", " ")[:160])
        except Exception as e:
            print(f"ERR  {url[:70]}")
            print("   ", str(e)[:160])

asyncio.run(probe())