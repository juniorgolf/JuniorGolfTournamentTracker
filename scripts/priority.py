"""定期更新で確認する大会を、見落としの影響が大きい順に並べて表示する。

使い方: python3 scripts/priority.py [件数]   （既定は各区分20件）
A 申込締切が近い → B 日程発表の時期が来た → C 結果待ち → D 確認が古い の順。
"""
import json
import sys
from datetime import date, timedelta

N = int(sys.argv[1]) if len(sys.argv) > 1 else 20
today = date.today()
iso = today.isoformat()
plus = lambda d: (today + timedelta(days=d)).isoformat()
ts = json.load(open("data/tournaments.json", encoding="utf-8"))["tournaments"]
# 終わった大会は data/past/<年>.json に移してある。結果待ち（C）を探すため今年と前年の分も読む
for y in (today.year, today.year - 1):
    try:
        ts += json.load(open(f"data/past/{y}.json", encoding="utf-8"))["tournaments"]
    except FileNotFoundError:
        pass


def show(title, items, key):
    print(f"\n## {title}（{len(items)}件）")
    for t in sorted(items, key=key)[:N]:
        print(f"- {t['id']}\t{t.get('start') or '未定'}\t締切 {t.get('entry_close') or '-'}\t確認 {t.get('verified') or '-'}\t{t['name'][:40]}")


# A: 開催前で、申込締切が45日以内（締切不明なら開催が60日以内）。直近に確認済みのものは除く
a = [t for t in ts if t.get("start") and t["start"] >= iso and (
    (t.get("entry_close") and iso <= t["entry_close"] <= plus(45))
    or (not t.get("entry_close") and t["start"] <= plus(60)))
    # 7日以内に確認済みなら、締切・開催が7日以内のものだけ再確認する（D に枠を残すため）
    and ((t.get("verified") or "") < plus(-7) or (t.get("entry_close") or t["start"]) <= plus(7))]
show("A 申込締切・開催が近い", a, lambda t: t.get("entry_close") or t["start"])

# B: 日程発表待ちで、注意する時期（window_from）が30日以内か過ぎている
b = [t for t in ts if not t.get("start") and t.get("window_from") and t["window_from"] <= plus(30)]
show("B 日程発表の時期が来た", b, lambda t: (t.get("verified") or "", t["window_from"]))

# C: 過去30日以内に終わり、結果リンクが無い
c = [t for t in ts if t.get("start") and plus(-30) <= (t.get("end") or t["start"]) < iso and not t.get("results")]
show("C 結果待ち", c, lambda t: t.get("end") or t["start"])

# D: 上のどれにも入らず、確認日が古い順（終了した大会は除く）
seen = {t["id"] for t in a + b + c}
d = [t for t in ts if t["id"] not in seen and (not t.get("start") or (t.get("end") or t["start"]) >= iso)]
show("D 確認が古い", d, lambda t: t.get("verified") or "")
