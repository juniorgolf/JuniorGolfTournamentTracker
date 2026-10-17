"""data/tournaments.json から全大会の calendar.ics を作る（大会日・申込開始・申込締切を終日予定として出力）。"""
import datetime as dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def txt(s):
    return str(s).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def event(uid, start, end, summary, desc, stamp):
    nxt = (dt.date.fromisoformat(end) + dt.timedelta(days=1)).strftime("%Y%m%d")
    return "\r\n".join([
        "BEGIN:VEVENT", f"UID:{uid}@kanto-junior-golf", f"DTSTAMP:{stamp}",
        f"DTSTART;VALUE=DATE:{start.replace('-', '')}", f"DTEND;VALUE=DATE:{nxt}",
        f"SUMMARY:{txt(summary)}", f"DESCRIPTION:{txt(desc)}", "END:VEVENT",
    ])


def main():
    data = json.loads((ROOT / "data/tournaments.json").read_text(encoding="utf-8"))
    stamp = data["updated"].replace("-", "") + "T000000Z"
    out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//japan-junior-golf//JA", "X-WR-CALNAME:全国ジュニアゴルフ大会"]
    for t in data["tournaments"]:
        if not t.get("start"):  # 日程未発表の大会はカレンダーに入れない
            continue
        out.append(event(t["id"], t["start"], t.get("end") or t["start"], f"【大会】{t['name']}", f"{t['venue']}\n{t['url']}", stamp))
        if t.get("entry_open"):
            out.append(event(t["id"] + "-open", t["entry_open"], t["entry_open"], f"【申込開始】{t['name']}", t["url"], stamp))
        if t.get("entry_close"):
            out.append(event(t["id"] + "-close", t["entry_close"], t["entry_close"], f"【申込締切】{t['name']}", t["url"], stamp))
    out.append("END:VCALENDAR")
    (ROOT / "calendar.ics").write_text("\r\n".join(out) + "\r\n", encoding="utf-8")
    print(f"{len(data['tournaments'])} tournaments -> calendar.ics")


if __name__ == "__main__":
    main()
