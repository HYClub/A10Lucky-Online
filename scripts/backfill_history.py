"""One-time backfill of historical market data.
Usage: python scripts/backfill_history.py
Runs from GitHub Actions on first deploy only.
"""
import json
import os
import urllib.request
from datetime import datetime, timezone, timedelta

CST = timezone(timedelta(hours=8))
ARCHIVE_DIR = "docs/data/archive"
DAYS = 90

def fetch_kline(code, days=100):
    end = datetime.now(CST)
    start = end - timedelta(days=days)
    url = (f"https://push2his.eastmoney.com/api/qt/stock/kline/get"
           f"?secids=1.{code}"
           f"&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58"
           f"&klt=101&fqt=1"
           f"&beg={start.strftime('%Y%m%d')}&end={end.strftime('%Y%m%d')}")
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0", "Referer": "https://quote.eastmoney.com/"
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.loads(r.read().decode("utf-8"))
    klines = data.get("data", {}).get("klines", [])
    result = []
    for line in klines:
        parts = line.split(",")
        if len(parts) >= 6:
            result.append({
                "date": parts[0],
                "open": float(parts[1]),
                "close": float(parts[2]),
                "high": float(parts[3]),
                "low": float(parts[4]),
                "volume": float(parts[5]),
            })
    return result

def main():
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    print("Backfill: This feature requires the HYClub/A10Lucky repo for strategy data.")
    print("For now, archive will be built incrementally by daily_archive.yml.")
    index_path = os.path.join(ARCHIVE_DIR, "index.json")
    if not os.path.exists(index_path):
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump([], f)
        print("Created empty archive index")

if __name__ == "__main__":
    main()
