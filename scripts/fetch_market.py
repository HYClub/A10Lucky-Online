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
    if v == "-" or v is None:
        return None
    try:
        return float(v)
    except:
        return None

def fetch_industry_map():
    """Fetch Eastmoney industry sector list and build {code: name} mapping.
    f100 returns 'market.numeric_id' (e.g. '90.9829892863').
    We match the numeric_id suffix against the sector list's f12/f14.
    """
    mapping = {}
    try:
        url = ("https://push2.eastmoney.com/api/qt/clist/get"
               "?pn=1&pz=500&po=1&np=1&fltt=2&invt=2"
               "&fields=f12,f14"
               "&fs=m:90+t:2")
        data = fetch_json(url)
        items = data.get("data", {}).get("diff", [])
        for item in items:
            code = str(item.get("f12", "") or "")
            name = str(item.get("f14", "") or "")
            if code and name:
                mapping[code] = name
        print(f"Fetched industry mapping: {len(mapping)} sectors")
    except Exception as e:
        print(f"Warning: industry map failed: {e}")
    return mapping


def resolve_industry(f100_val, industry_map):
    """Resolve industry code (f100) to Chinese name using the mapping."""
    raw = str(f100_val or "").strip()
    if not raw or raw == "-":
        return ""
    # Direct match on full value
    if raw in industry_map:
        return industry_map[raw]
    # Match on suffix after '90.' (Eastmoney industry market prefix)
    if raw.startswith("90."):
        suffix = raw[3:]
        for code, name in industry_map.items():
            if code.endswith(suffix) or suffix in code:
                return name
    return raw


BASE_FIELDS = "f2,f3,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f23,f100"
BASE_FS = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23"

def fetch_page(page, page_size, industry_map):
    url = ("https://push2.eastmoney.com/api/qt/clist/get"
           f"?pn={page}&pz={page_size}&po=1&np=1&fltt=2&invt=2"
           f"&fields={BASE_FIELDS}&fs={BASE_FS}")
    return fetch_json(url)

def fetch_stocks(industry_map):
    page_size = 100
    data = fetch_page(1, page_size, industry_map)
    total = data.get("data", {}).get("total", 0)
    items = data.get("data", {}).get("diff", [])
    print(f"Stocks API total={total}, page1={len(items)}")
    stocks = []
    def parse_item(item):
        market_cap = safe_num(item.get("f20"))
        return {
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
            "industry": resolve_industry(item.get("f100"), industry_map),
        }
    stocks.extend(parse_item(it) for it in items)
    total_pages = min(50, (total + page_size - 1) // page_size)
    for p in range(2, total_pages + 1):
        try:
            d = fetch_page(p, page_size, industry_map)
            its = d.get("data", {}).get("diff", [])
            stocks.extend(parse_item(it) for it in its)
            print(f"  page {p}/{total_pages}: +{len(its)}")
        except Exception as e:
            print(f"  page {p} failed: {e}")
            break
    return stocks


def fetch_indices():
    url = ("https://push2.eastmoney.com/api/qt/ulist.np/get"
           "?fields=f2,f3,f4,f12,f14"
           "&secids=1.000001,0.399001,0.399006,0.399300")
    try:
        data = fetch_json(url)
        items = data.get("data", {}).get("diff", [])
        def _idx_num(v):
            n = safe_num(v)
            return n / 100 if n is not None else None
        return [{
            "code": str(item.get("f12", "")),
            "name": str(item.get("f14", "")),
            "price": _idx_num(item.get("f2")),
            "change_pct": _idx_num(item.get("f3")),
            "change_amount": _idx_num(item.get("f4")),
        } for item in items]
    except Exception as e:
        print(f"Warning: indices failed: {e}")
        return []


def main():
    now = datetime.now(CST)
    industry_map = fetch_industry_map()
    stocks = fetch_stocks(industry_map)
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
