"""Archive daily market snapshot for historical reference."""
import json
import os
from datetime import datetime, timezone, timedelta
import shutil

CST = timezone(timedelta(hours=8))
LATEST = "docs/data/market/latest.json"
ARCHIVE_DIR = "docs/data/archive"

def main():
    if not os.path.exists(LATEST):
        print("No latest.json found, skipping archive")
        return
    with open(LATEST, encoding="utf-8") as f:
        data = json.load(f)
    date = data.get("date") or datetime.now(CST).strftime("%Y-%m-%d")
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    archive_path = os.path.join(ARCHIVE_DIR, f"{date}.json")
    with open(archive_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Update index
    index_path = os.path.join(ARCHIVE_DIR, "index.json")
    entries = []
    if os.path.exists(index_path):
        with open(index_path, encoding="utf-8") as f:
            entries = json.load(f)
    # Add/replace entry for this date
    for e in entries:
        if e["date"] == date:
            e["count"] = len(data.get("stocks", []))
            break
    else:
        entries.append({
            "date": date,
            "count": len(data.get("stocks", [])),
        })
    entries.sort(key=lambda x: x["date"], reverse=True)
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f"Archived {date} ({len(data.get('stocks', []))} stocks)")

if __name__ == "__main__":
    main()
