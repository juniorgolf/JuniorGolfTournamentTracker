"""これからの大会・日程発表待ちに、同じ大会の前回の結果（prev_results）を付ける。

使い方: python3 scripts/prev_link.py
data/past/*.json の終わった大会のうち、名前（回数・年を除く）と都道府県が同じで、
結果リンクがあるものを探す。会場が同じ回があればそれを優先する（石川遼カップの地区大会のように
会場ごとに開かれるシリーズ向け）。すでに会場ごとの前回結果が付いている大会は変えない。
"""
import glob
import json
import re

norm = lambda s: re.sub(r"[\s　・／/（）()「」『』\-–—:：]", "",
                        re.sub(r"20\d\d|令和\s*\d+\s*年度?|第\s*\d+\s*回|（?次回）?", "", s or ""))
vkey = lambda s: re.sub(r"[\s　]", "", s or "")

past = []
for f in glob.glob("data/past/[0-9]*.json"):
    past += [t for t in json.load(open(f, encoding="utf-8"))["tournaments"] if t.get("results")]
idx = {}
for t in past:
    idx.setdefault((norm(t["name"]), t["pref"]), []).append(t)

path = "data/tournaments.json"
data = json.load(open(path, encoding="utf-8"))
changed = 0
for t in data["tournaments"]:
    cands = [p for p in idx.get((norm(t["name"]), t["pref"]), []) if not t.get("start") or p["start"] < t["start"]]
    if not cands:
        continue
    same = [p for p in cands if vkey(p.get("venue")) == vkey(t.get("venue"))]
    cur = t.get("prev_results")
    if cur and (not same or any(l["url"].endswith(".pdf") for l in cur.get("links", []))):
        continue  # 付いている前回結果を、会場の一致しない候補で上書きしない
    p = max(same or cands, key=lambda p: p["start"])
    t["prev_results"] = {"year": int(p["start"][:4]), "name": p["name"] + (f"（{p['venue']}）" if same else ""), "links": p["results"]}
    changed += 1

if changed:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
print(f"prev_results set: {changed}")
