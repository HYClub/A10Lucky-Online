"""Fetch A-share market data from Eastmoney APIs (no external dependencies)."""
import json
import os
import urllib.request
from datetime import datetime, timezone, timedelta

CST = timezone(timedelta(hours=8))
OUTPUT = "docs/data/market/latest.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://quote.eastmoney.com/",
}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))

def fetch_stocks():
    url = ("https://push2.eastmoney.com/api/qt/clist/get"
           "?pn=1&pz=2000&po=1&np=1&fltt=2&invt=2"
           "&fields=f2,f3,f8,f12,f14,f15,f16,f17,f18,f20,f21,f23,f57,f58"
           "&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23")
    data = fetch_json(url)
    items = data.get("data", {}).get("diff", [])
    stocks = []
    for item in items:
        stocks.append({
            "code": str(item.get("f12", "")),
            "name": str(item.get("f14", "")),
            "price": item.get("f2"),
            "change_pct": item.get("f3"),
            "turnover_pct": item.get("f23"),
            "volume_ratio": item.get("f8"),
            "high": item.get("f15"),
            "low": item.get("f16"),
            "open": item.get("f17"),
            "pre_close": item.get("f18"),
            "market_cap_yi": item.get("f20"),
            "pe_ttm": item.get("f21"),
            "industry": str(item.get("f57", "") or ""),
        })
    return stocks

def fetch_indices():
    url = ("https://push2.eastmoney.com/api/qt/ulist.np/get"
           "?fields=f2,f3,f4,f12,f14"
           "&secids=1.000001,0.399001,0.399006")
    try:
        data = fetch_json(url)
        items = data.get("data", {}).get("diff", [])
        return [{
            "code": str(item.get("f12", "")),
            "name": str(item.get("f14", "")),
            "price": item.get("f2"),
            "change_pct": item.get("f3"),
            "change_amount": item.get("f4"),
        } for item in items]
    except Exception as e:
        print(f"Warning: failed to fetch indices: {e}")
        return []

def main():
    now = datetime.now(CST)
    stocks = fetch_stocks()
    indices = fetch_indices()
    data = {
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%S"),
        "date": now.strftime("%Y-%m-%d"),
        "indices": indices,
        "stocks": stocks,
    }
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(stocks)} stocks, {len(indices)} indices to {OUTPUT}")

if __name__ == "__main__":
    main()
