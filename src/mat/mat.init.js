// MẮT – init script trong tab app: ghi lại chữ đang hiện trên màn hình.
//  - chữ vẽ lên canvas (fillText / strokeText) – coi là "đang thấy" nếu được vẽ trong 300 ms gần nhất
//  - chữ trong DOM đang hiển thị (đọc innerText của body – trình duyệt tự bỏ phần ẩn)
// Node đọc qua window.__botMat.thay().
(() => {
  if (location.pathname.startsWith('/__bot/')) return;
  const CON_THAY_MS = 300;
  const canvasChu = new Map();   // chữ → lần vẽ cuối (performance.now)
  const ghi = t => { if (typeof t === 'string'){ const s = t.trim(); if (s) canvasChu.set(s, performance.now()); } };
  for (const P of [window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, window.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype]){
    if (!P) continue;
    for (const ten of ['fillText', 'strokeText']){
      const goc = P[ten];
      P[ten] = function (text, ...r){ ghi(text); return goc.call(this, text, ...r); };
    }
  }
  window.__botMat = {
    thay(){
      const bay = performance.now();
      const canvas = [];
      for (const [s, t] of canvasChu){ if (bay - t <= CON_THAY_MS) canvas.push(s); else if (bay - t > 10000) canvasChu.delete(s); }
      const dom = document.body ? document.body.innerText.split('\n').map(s => s.trim()).filter(Boolean) : [];
      return { canvas, dom };
    },
  };
})();
