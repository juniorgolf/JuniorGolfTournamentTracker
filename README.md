# 関東ジュニアゴルフ大会カレンダー（試作）

関東の小学生が出られるジュニアゴルフ大会の日程と申込期間を一覧にする静的サイト。

## 構成
- `index.html` / `style.css` / `app.js`：画面。月ごとの一覧（開催日・大会名・会場・主催・申込状況）と、大会名クリックで開く詳細。`#大会ID` 付きURLで詳細を直接開ける。ビルド不要。
- `data/tournaments.json`：大会データ（唯一の元データ）。1件ごとに公式URLと最終確認日を持つ。
- `scripts/build_ics.py`：全大会のカレンダー（`calendar.ics`）を作る。データを変えたら実行する。

## 大会を追加・更新する
1. 公式ページで確認した内容を `data/tournaments.json` に追記する。分からない項目は `null` のままにする（推測で埋めない）。
2. `python3 scripts/build_ics.py`
3. 手元確認：`python3 -m http.server` → http://localhost:8000

## データ項目
id, name, organizer, pref, venue, start, end, entry_open, entry_close, entry_state（確認時点の受付状況。期間不明時のみ）, grades, stage（予選/決勝）, url, note, verified

## 調査資料
- `docs/research/`：関東の情報源一覧（kanto_sources.csv）と調査メモ
