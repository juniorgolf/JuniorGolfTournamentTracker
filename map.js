// 地図タブ：OpenStreetMap（Leaflet）に会場ごとのピンを立て、経路は Google マップに渡す
// app.js の esc / fmt / entryStatus / isPast / TECHO / orgType を使う

const LEAFLET = ROOT + "vendor/leaflet/";
const CLUSTER = ROOT + "vendor/leaflet.markercluster/";
const venueKey = (s) => String(s || "").replace(/[\s　]/g, "");

// Google マップの経路・地点リンク（会場名＋都道府県で検索させると、ゴルフ場の正しい入口へ案内されやすい）
const gmapsDir = (t) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${t.venue} ${t.pref}`)}`;
const gmapsPlace = (t) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${t.venue} ${t.pref}`)}`;

function loadOnce(tag, attrs) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tag);
    Object.assign(el, attrs);
    el.onload = resolve;
    el.onerror = reject;
    document.head.append(el);
  });
}
let leafletReady = null;
function loadLeaflet() {
  leafletReady ||= Promise.all([
    loadOnce("link", { rel: "stylesheet", href: LEAFLET + "leaflet.css" }),
    loadOnce("link", { rel: "stylesheet", href: CLUSTER + "MarkerCluster.css" }),
    loadOnce("script", { src: LEAFLET + "leaflet.js" }),
  ]).then(() => loadOnce("script", { src: CLUSTER + "leaflet.markercluster.js" }));
  return leafletReady;
}

let venues = null;
async function loadVenues() {
  if (!venues) {
    try {
      venues = (await (await fetch(ROOT + "data/venues.json", { cache: "no-cache" })).json()).venues;
    } catch {
      venues = {};
    }
  }
  return venues;
}

// 会場ごとにまとめる。位置が分からない会場の大会は別に数える
function groupByVenue(list) {
  const groups = new Map();
  const missing = [];
  let abroad = 0;
  // 国内の大会と混ざっているときは海外の大会を地図に出さない（日本地図が世界地図に縮むため）。
  // エリアで「海外」や国名を選んだときは、海外の会場を地図に出す
  const domestic = list.some((t) => !t.overseas);
  for (const t of list) {
    if (t.overseas && domestic) { abroad++; continue; }
    // 日程発表待ちの大会は前年の会場（prev_venue）に出す
    const k = venueKey(t.start ? t.venue : t.prev_venue);
    const v = venues[k];
    if (!v || v.lat == null) { missing.push(t); continue; }
    if (!groups.has(k)) groups.set(k, { v, items: [] });
    groups.get(k).items.push(t);
  }
  return { groups: [...groups.values()], missing, abroad };
}

function popupHtml(g) {
  // 会場名は会場データから（日程発表待ちの大会の venue は「未発表（前年は…）」のため）
  const first = { venue: g.v.name || g.items[0].venue, pref: g.v.pref || g.items[0].pref };
  const place = placeName(first.pref, g.items[0].overseas);
  const rows = g.items.map((t) => {
    if (!t.start) return `<li><button class="pop-name" data-id="${esc(t.id)}">${tr("日程未定（前年の会場）", "TBA (last year’s venue)")} ${esc(nameOf(t))}</button><span class="pop-st st-unknown">${tr("日程発表待ち", "Dates TBA")}</span></li>`;
    const st = entryStatus(t);
    return `<li><button class="pop-name" data-id="${esc(t.id)}">${esc(fmt(t.start))} ${esc(nameOf(t))}</button><span class="pop-st st-${st.kind}">${esc(st.label)}</span></li>`;
  }).join("");
  return `<div class="pop">
    <p class="pop-venue"${EN ? ' lang="ja"' : ""}>${esc(first.venue)}<span>${esc(place)}</span></p>
    <ul class="pop-list">${rows}</ul>
    <div class="pop-actions">
      <a href="${esc(gmapsDir(first))}" target="_blank" rel="noopener">${tr("経路を調べる（Googleマップ）", "Directions (Google Maps)")}</a>
      <a href="${esc(gmapsPlace(first))}" target="_blank" rel="noopener">${tr("Googleマップで見る", "View on Google Maps")}</a>
    </div>
  </div>`;
}

let map = null;
let layer = null;
let lastGroups = [];
let onVisible = null;

// list: 表示する大会（これからの大会を絞り込んだもの）。fit: 絞り込みが変わったら全体が見える位置へ動かす
async function showMap(container, list, { fit, onListChange }) {
  onVisible = onListChange;
  container.querySelector(".map-status").textContent = tr("地図を読み込んでいます…", "Loading the map…");
  try {
    await Promise.all([loadLeaflet(), loadVenues()]);
  } catch {
    container.querySelector(".map-status").textContent = tr("地図を読み込めませんでした。通信状況をご確認ください。", "The map could not be loaded. Check your connection.");
    return;
  }
  const L = window.L;
  if (!map) {
    map = L.map(container.querySelector(".map-canvas"), { scrollWheelZoom: false }).setView([36.2, 137.5], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.on("moveend", reportVisible);
  }
  map.invalidateSize();
  const { groups, missing, abroad } = groupByVenue(list);
  lastGroups = groups;
  if (layer) layer.remove();
  layer = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 48 });
  for (const g of groups) {
    const live = g.items.some((t) => entryStatus(t).kind === "open");
    // おやこ手帳デザインでは、ピンの色を主催者の種類（その会場で最初に開かれる大会）に合わせる
    const type = TECHO ? ` ot-${orgType([...g.items].sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999"))[0].organizer)}` : "";
    const icon = L.divIcon({ className: "", html: `<span class="pin${type}${live ? " pin-open" : ""}">${g.items.length}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    layer.addLayer(L.marker([g.v.lat, g.v.lng], { icon, title: g.items[0].venue }).bindPopup(popupHtml(g), { maxWidth: 320 }));
  }
  layer.addTo(map);
  if (fit && groups.length) map.fitBounds(L.latLngBounds(groups.map((g) => [g.v.lat, g.v.lng])).pad(0.15), { maxZoom: 11 });
  container.querySelector(".map-status").textContent = [
    missing.length ? tr(`会場の位置を確認中の大会が${missing.length}件あり、地図には出ていません（一覧タブには表示されます）。`, `${missing.length} tournament${missing.length === 1 ? " is" : "s are"} not on the map because the venue location is not confirmed yet (see the list tabs). `) : "",
    abroad ? tr(`海外の大会${abroad}件は、エリアで「海外」か国名を選ぶと地図に出ます。`, `${abroad} overseas tournament${abroad === 1 ? "" : "s"} appear on the map when you choose “Overseas” or a country in Area.`) : "",
  ].join("");
  reportVisible();
}

// 地図に見えている範囲の大会を、開催日順でリストに渡す
function reportVisible() {
  if (!map || !onVisible) return;
  const b = map.getBounds();
  const items = lastGroups.filter((g) => b.contains([g.v.lat, g.v.lng])).flatMap((g) => g.items);
  onVisible(items);
}
