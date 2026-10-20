import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import edge_tts.communicate as ec
import voice_engine as ve

OUT = r"C:\Users\user\AppData\Local\Temp\opencode\voice_test"
os.makedirs(OUT, exist_ok=True)
TEXT = "Дружелюбно, с улыбкой, как в рекламе."

VARIANTS = [
    ("dmitry-cheerful", "ru-RU-DmitryNeural", "cheerful"),
    ("dmitry-friendly", "ru-RU-DmitryNeural", "friendly"),
    ("dmitry-serious",  "ru-RU-DmitryNeural", "serious"),
    ("dmitry-narr",     "ru-RU-DmitryNeural", "narration-relaxed"),
    ("dmitry-news",     "ru-RU-DmitryNeural", "newscast"),
    ("svet-cheerful",   "ru-RU-SvetlanaNeural", "cheerful"),
    ("svet-affect",     "ru-RU-SvetlanaNeural", "affectionate"),
    ("svet-narr",       "ru-RU-SvetlanaNeural", "narration-relaxed"),
]

async def main():
    for name, voice, style in VARIANTS:
        dest = os.path.join(OUT, name + ".mp3")
        try:
            await ve.synth(TEXT, voice, "+0%", "+0Hz", "+0%", style, dest)
            d = ve.dur(dest)
            print(f"  {name:18} {style:20} -> {d:5.2f}s {'OK' if d > 0.4 else 'ПУСТО'}")
        except Exception as e:
            msg = str(e)[:70]
            print(f"  {name:18} {style:20} -> ОШИБКА {msg}")

asyncio.run(main())