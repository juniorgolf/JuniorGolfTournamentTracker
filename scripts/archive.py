"""終わった大会を data/tournaments.json から data/past/<開催年>.json へ移す。

使い方: python3 scripts/archive.py
終了日（無ければ開始日）が今日より前の大会を、開始日の年のファイルへ移し、
data/past/index.json の年一覧を更新する。何度実行しても同じ結果になる。
"""
import json
import os
from datetime import date

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
iso = date.today().isoformat()


def load(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")


main_path = os.path.join(ROOT, "tournaments.json")
main = load(main_path, None)
done = [t for t in main["tournaments"] if t.get("start") and (t.get("end") or t["start"]) < iso]
if done:
    os.makedirs(os.path.join(ROOT, "past"), exist_ok=True)
    by_year = {}
    for t in done:
        by_year.setdefault(t["start"][:4], []).append(t)
    for year, items in by_year.items():
        path = os.path.join(ROOT, "past", f"{year}.json")
        past = load(path, {"year": int(year), "tournaments": []})
        ids = {t["id"] for t in items}
        past["tournaments"] = sorted([t for t in past["tournaments"] if t["id"] not in ids] + items,
                                     key=lambda t: (t["start"], t["id"]))
        save(path, past)
    gone = {t["id"] for t in done}
    main["tournaments"] = [t for t in main["tournaments"] if t["id"] not in gone]
    save(main_path, main)

years = sorted((int(f[:4]) for f in os.listdir(os.path.join(ROOT, "past")) if f[:4].isdigit()), reverse=True) \
    if os.path.isdir(os.path.join(ROOT, "past")) else []
save(os.path.join(ROOT, "past", "index.json"), {"years": years})
print(f"moved {len(done)}; years {years}; remaining {len(main['tournaments'])}")
