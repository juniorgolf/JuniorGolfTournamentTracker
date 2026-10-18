// 画面デザインの切り替え（くわしくは docs/DESIGN.md）
//   "techo"   … おやこ手帳（2026-10-18 採用）
//   "classic" … それまでのデザイン
// 元に戻すときは DESIGN_DEFAULT を "classic" に書き換える。
// URL に ?design=classic を付けると、その場だけ別のデザインで見られる。
const DESIGN_DEFAULT = "techo";
const DESIGNS = ["techo", "classic"];

(() => {
  const asked = new URLSearchParams(location.search).get("design");
  const design = DESIGNS.includes(asked) ? asked : DESIGN_DEFAULT;
  document.documentElement.dataset.design = design;
  if (design === "techo") {
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&display=swap";
    document.head.append(font);
  }
})();
