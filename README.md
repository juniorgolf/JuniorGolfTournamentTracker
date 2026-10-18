# ジュニアゴルフ大会カレンダー（試作）

全国の小学生・中学生が出られるジュニアゴルフ大会の日程と申込期間を一覧にする静的サイト。

## 構成
- `design.js` / `techo.css`：画面デザインの切り替え。いまは「おやこ手帳」デザイン（techo）。`design.js` の `DESIGN_DEFAULT` を `"classic"` にすると元のデザインに戻る。くわしくは `docs/DESIGN.md`。
- `index.html` / `style.css` / `app.js`：画面。月ごとの一覧（開催日・大会名・会場・主催・申込状況）と、大会名クリックで開く詳細。`#大会ID` 付きURLで詳細を直接開ける。ビルド不要。
- `map.js`：地図タブ。OpenStreetMap の地図（Leaflet）に会場ごとのピンを立てる。経路・地点は Google マップのリンクに渡す（Google の API キーは不要）。
- `cal.js`：申込カレンダータブ。月ごとに申込締切・受付開始・開催日を表示し、表示中の月の予定を .ics で書き出せる。スマホでは今日以降の予定がある日だけを縦に並べる。
- `data/venues.json`：会場の住所と緯度・経度。キーは会場名から空白を除いたもの。住所は公式ページ等で確認し、緯度・経度は国土地理院の住所検索で求める。位置が分からない会場は載せない（その大会は一覧にだけ出る）。
- `vendor/`：Leaflet 1.9.4（BSD-2-Clause）と Leaflet.markercluster 1.5.3（MIT）。ライセンスは各フォルダ内。
- `data/tournaments.json`：大会データ（唯一の元データ）。1件ごとに公式URLと最終確認日を持つ。
- `scripts/build_ics.py`：全大会のカレンダー（`calendar.ics`）を作る。データを変えたら実行する。

## 大会を追加・更新する
1. 公式ページで確認した内容を `data/tournaments.json` に追記する。分からない項目は `null` のままにする（推測で埋めない）。新しい会場なら `data/venues.json` にも住所と緯度・経度を足す。
2. `python3 scripts/build_ics.py`
3. 手元確認：`python3 -m http.server` → http://localhost:8000

## データ項目
id, name, organizer, pref（都道府県の短い名前。複数県にまたがる大会は「関東」など地方名。app.js の REGIONS で地方に分類）, venue, start, end, entry_open, entry_close, entry_state（確認時点の受付状況。期間不明時のみ）, grades, levels（出られる学校段階。["小学生","中学生"] のように持ち、画面の「対象」で絞り込む）, stage（予選/決勝）, url, note, verified, results（終了大会の結果リンク [{label,url}]）, results_note, expected・window_from（日程未発表の大会）

## デザイン資料
- `docs/DESIGN.md`：2つのデザインの決めごと、主催者の種類（7分類）、切り替え方
- `docs/design/proposals/`：検討したデザイン案の元ファイル

## 調査資料
- `docs/research/`：情報源一覧（関東: kanto_sources.csv、関東以外: japan_sources.csv、中学生の大会: jhs_sources.csv）と調査メモ

## 地図について
- 地図タイルは OpenStreetMap 財団のタイルサーバーを使う（帰属表示「© OpenStreetMap contributors」を地図右下に表示）。アクセスが増えて利用規約の目安を超えそうなら、地理院タイルなどに切り替える。
