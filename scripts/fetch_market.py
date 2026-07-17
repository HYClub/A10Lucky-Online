"""Fetch A-share market data from multiple APIs in parallel."""
import json
import os
import time
import urllib.request
import concurrent.futures
import threading
from datetime import datetime, timezone, timedelta

CST = timezone(timedelta(hours=8))
OUTPUT = "docs/data/market/latest.json"
EM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://quote.eastmoney.com/",
}
TENCENT_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://qt.gtimg.cn/",
}
_print_lock = threading.Lock()

def log(msg):
    with _print_lock:
        print(msg)

def fetch_json(url, headers=None, retries=3, timeout=20):
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers or EM_HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                wait = 2 ** attempt
                log(f"  retry {attempt+1}/{retries} after {wait}s: {e}")
                time.sleep(wait)
    raise last_err

def fetch_json_parsed(url, headers=None, retries=3):
    return json.loads(fetch_json(url, headers, retries))

def safe_num(v):
    if v in ("-", "", None):
        return None
    try:
        return float(v)
    except:
        return None

# ── industry mapping ──────────────────────────────────────────

def fetch_industry_map():
    mapping = {}
    for host in ["push2.eastmoney.com", "push2delay.eastmoney.com"]:
        try:
            url = (f"https://{host}/api/qt/clist/get"
                   "?pn=1&pz=500&po=1&np=1&fltt=2&invt=2"
                   "&fields=f12,f14&fs=m:90+t:2")
            data = fetch_json_parsed(url, retries=2)
            items = data.get("data", {}).get("diff", [])
            for item in items:
                code = str(item.get("f12", "") or "")
                name = str(item.get("f14", "") or "")
                if code and name:
                    mapping[code] = name
            log(f"Industry mapping: {len(mapping)} sectors")
            if mapping:
                return mapping
        except Exception as e:
            log(f"  industry map {host}: {e}")
    log("Warning: industry map failed")
    return mapping

def resolve_industry(f100_val, industry_map):
    raw = str(f100_val or "").strip()
    if not raw or raw == "-":
        return ""
    if raw in industry_map:
        return industry_map[raw]
    if raw.startswith("90."):
        suffix = raw[3:]
        for code, name in industry_map.items():
            if code.endswith(suffix) or suffix in code:
                return name
    return raw

# ── Eastmoney market categories ───────────────────────────────

EM_FIELDS = "f2,f3,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f23,f100"
# Group categories by host so each host gets sequential (not concurrent) requests.
# push2delay has more generous rate limits.
EM_CATEGORIES = {
    "push2delay.eastmoney.com": ["m:0+t:6", "m:0+t:80", "m:1+t:2", "m:1+t:23"],
}

def parse_em_item(item, industry_map):
    mcap = safe_num(item.get("f20"))
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
        "market_cap_yi": mcap / 1e8 if mcap else None,
        "pb": safe_num(item.get("f23")),
        "industry": resolve_industry(item.get("f100"), industry_map),
    }

def fetch_em_category(host, fs, industry_map, page_size=100, delay=7):
    """Fetch one market category with pagination. Each category is fetched
    sequentially (rate-limited), but categories run in parallel via threads."""
    results = []
    page = 1
    consecutive_failures = 0
    while True:
        if page > 1:
            time.sleep(delay)
        url = (f"https://{host}/api/qt/clist/get"
               f"?pn={page}&pz={page_size}&po=1&np=1&fltt=2&invt=2"
               f"&fields={EM_FIELDS}&fs={fs}")
        try:
            resp = fetch_json_parsed(url)
            items = resp.get("data", {}).get("diff", [])
            if not items:
                log(f"  [{fs}] page {page}: empty, done")
                break
            parsed = [parse_em_item(it, industry_map) for it in items]
            results.extend(parsed)
            log(f"  [{fs}] page {page}: +{len(parsed)} (total {len(results)})")
            consecutive_failures = 0
            page += 1
        except Exception as e:
            consecutive_failures += 1
            log(f"  [{fs}] page {page} failed ({consecutive_failures}): {e}")
            if consecutive_failures >= 3:
                log(f"  [{fs}] gave up after {consecutive_failures} failures")
                break
            time.sleep(delay * 2)
    return results

# ── Tencent batch quotes ──────────────────────────────────────

def tx_market(code):
    if code.startswith(("5", "6", "9")):
        return "sh"
    return "sz"

def parse_tencent_line(line):
    """Parse a single stock from Tencent's batch response."""
    parts = line.split("~")
    if len(parts) < 47:
        return None
    code = parts[2] or ""
    if not code:
        return None
    return {
        "code": code,
        "name": parts[1] or "",
        "price": safe_num(parts[3]),
        "change_pct": safe_num(parts[32]),
        "turnover_pct": safe_num(parts[38]),
        "volume_ratio": safe_num(parts[39]),
        "high": safe_num(parts[33]),
        "low": safe_num(parts[34]),
        "open": safe_num(parts[5]),
        "pre_close": safe_num(parts[4]),
        "market_cap_yi": safe_num(parts[45]),
        "pb": safe_num(parts[46]),
    }

def fetch_tencent_batch(codes_batch):
    """Fetch a batch of up to ~50 stock codes from Tencent."""
    if not codes_batch:
        return []
    tx_codes = [f"{tx_market(c)}{c}" for c in codes_batch]
    url = f"https://qt.gtimg.cn/q={','.join(tx_codes)}"
    try:
        text = fetch_json(url, headers=TENCENT_HEADERS, retries=2, timeout=10)
        stocks = []
        for line in text.strip().split("\n"):
            s = parse_tencent_line(line)
            if s and s["code"]:
                stocks.append(s)
        return stocks
    except Exception as e:
        log(f"  Tencent batch failed ({len(codes_batch)} codes): {e}")
        return []

def fetch_tencent_all(all_codes, batch_size=50):
    """Fetch all stocks from Tencent in parallel batches."""
    if not all_codes:
        return []
    codes_list = list(all_codes)
    batches = [codes_list[i:i+batch_size] for i in range(0, len(codes_list), batch_size)]
    log(f"Tencent: {len(codes_list)} stocks in {len(batches)} batches")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        fut_to_batch = {ex.submit(fetch_tencent_batch, b): i for i, b in enumerate(batches)}
        for fut in concurrent.futures.as_completed(fut_to_batch):
            batch = fut_to_batch[fut]
            try:
                stocks = fut.result()
                results.extend(stocks)
                log(f"  Tencent batch {batch+1}/{len(batches)}: +{len(stocks)}")
            except Exception as e:
                log(f"  Tencent batch {batch+1} failed: {e}")
    return results

# ── Merge ─────────────────────────────────────────────────────

def merge_stocks(em_stocks, tx_stocks):
    """Merge Eastmoney and Tencent data, preferring EM fields."""
    em_map = {s["code"]: s for s in em_stocks}
    tx_map = {s["code"]: s for s in tx_stocks}
    merged = {}
    for code, s in em_map.items():
        merged[code] = s
    for code, s in tx_map.items():
        if code in merged:
            existing = merged[code]
            # Fill missing fields from Tencent
            for key in ("price", "change_pct", "turnover_pct", "market_cap_yi", "pb"):
                if existing.get(key) is None and s.get(key) is not None:
                    existing[key] = s[key]
            if not existing.get("name") and s.get("name"):
                existing["name"] = s["name"]
        else:
            merged[code] = s
    log(f"Merged: {len(em_stocks)} EM + {len(tx_stocks)} TX = {len(merged)} unique")
    return list(merged.values())

# ── Indices ───────────────────────────────────────────────────

def fetch_indices():
    url = ("https://push2.eastmoney.com/api/qt/ulist.np/get"
           "?fields=f2,f3,f4,f12,f14"
           "&secids=1.000001,0.399001,0.399006,0.399300")
    try:
        data = fetch_json_parsed(url)
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
        log(f"Warning: indices failed: {e}")
        return []

# ── Main ──────────────────────────────────────────────────────

def fetch_host_categories(host, categories, industry_map):
    """Sequentially fetch all categories assigned to one host."""
    all_stocks = []
    codes = set()
    for fs in categories:
        cat_stocks = fetch_em_category(host, fs, industry_map)
        all_stocks.extend(cat_stocks)
        for s in cat_stocks:
            codes.add(s["code"])
        log(f"  [{host}] [{fs}] done: {len(cat_stocks)} stocks")
    return all_stocks, codes


def main():
    now = datetime.now(CST)
    industry_map = fetch_industry_map()

    # Phase 1: Fetch Eastmoney — one thread per host, categories sequential per host
    log("Phase 1: Eastmoney (sequential per host, parallel across hosts)")
    stocks_em = []
    stock_codes_seen = set()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        fut_to_host = {}
        for host, cats in EM_CATEGORIES.items():
            fut = ex.submit(fetch_host_categories, host, cats, industry_map)
            fut_to_host[fut] = host
        for fut in concurrent.futures.as_completed(fut_to_host):
            host = fut_to_host[fut]
            try:
                cat_stocks, codes = fut.result()
                stocks_em.extend(cat_stocks)
                stock_codes_seen.update(codes)
                log(f"  [{host}] all done: {len(cat_stocks)} stocks")
            except Exception as e:
                log(f"  [{host}] thread failed: {e}")

    log(f"EM total: {len(stocks_em)} unique: {len(stock_codes_seen)}")

    # Phase 2: Tencent fallback
    log("Phase 2: Tencent bulk fetch for missing stocks")
    try:
        url = ("https://push2delay.eastmoney.com/api/qt/clist/get"
               "?pn=1&pz=6000&po=1&np=1&fltt=2&invt=2"
               "&fields=f12,f14"
               "&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23")
        data = fetch_json_parsed(url, retries=5)
        total = data.get("data", {}).get("total", 0)
        items = data.get("data", {}).get("diff", [])
        all_codes = set()
        for item in items:
            c = str(item.get("f12", ""))
            if c:
                all_codes.add(c)
        log(f"EM universe: total={total}, codes_fetched={len(all_codes)}")
        missing_codes = all_codes - stock_codes_seen
        log(f"Missing from EM: {len(missing_codes)} stocks")
        if missing_codes:
            tx_stocks = fetch_tencent_all(missing_codes)
            log(f"Tencent fetched: {len(tx_stocks)} stocks")
        else:
            tx_stocks = []
    except Exception as e:
        log(f"Warning: universe scan failed: {e}, skipping Tencent fallback")
        tx_stocks = []

    stocks = merge_stocks(stocks_em, tx_stocks)
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
    log(f"Saved {len(stocks)} stocks, {len(indices)} indices to {OUTPUT}")


if __name__ == "__main__":
    main()
