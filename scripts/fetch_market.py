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

def safe_num(v):
    if v == "-" or v is None: return None
    try: return float(v)
    except: return None

def fetch_stocks():
    url = ("https://push2.eastmoney.com/api/qt/clist/get"
           "?pn=1&pz=2000&po=1&np=1&fltt=2&invt=2"
           "&fields=f2,f3,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f23,f100"
           "&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23")
    data = fetch_json(url)
    items = data.get("data", {}).get("diff", [])
    stocks = []
    for item in items:
        market_cap = safe_num(item.get("f20"))
        stocks.append({
            "code": str(item.get("f12", "")),
            "name": str(item.get("f14", "")),
            "price": safe_num(item.get("f2")),
            "change_pct": safe_num(item.get("f3")),
            "turnover_pct": safe_num(item.get("f8")),
            "pe_ttm": safe_num(item.get("f9")),
            "volume_ratio": safe_num(item.get("f10")),
            "high": safe_num(item.get("f15")),
            "low": safe_num(item.get("f16")),
            "open": safe_num(item.get("f17")),
            "pre_close": safe_num(item.get("f18")),
            "market_cap_yi": market_cap / 1e8 if market_cap else None,
            "pb": safe_num(item.get("f23")),
            "industry": str(item.get("f100", "") or ""),
        })
    return stocks

def fetch_indices():
    url = ("https://push2.eastmoney.com/api/qt/ulist.np/get"
           "?fields=f2,f3,f4,f12,f14"
           "&secids=1.000001,0.399001,0.399006,0.399300")
    try:
        data = fetch_json(url)
        items = data.get("data", {}).get("diff", [])
        return [{
            "code": str(item.get("f12", "")),
            "name": str(item.get("f14", "")),
            "price": safe_num(item.get("f2")),
            "change_pct": safe_num(item.get("f3")),
            "change_amount": safe_num(item.get("f4")),
        } for item in items]
    except Exception as e:
        print(f"Warning: indices failed: {e}")
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
