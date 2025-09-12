// 楕円卓レイアウトの座標計算

export function layoutSeatsEllipse(container: HTMLElement, players: number, mySeatIndex: number) {
  const seats = Array.from(container.querySelectorAll<HTMLElement>(".seat"));
  if (!seats.length) return;

  const rect = container.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  // 背景８の見た目に合わせて軸長を調整（外枠と内枠の"間"）
  // a=水平方向半径, b=垂直方向半径
  const a = rect.width * 0.40;   // 0.38〜0.42 で微調整可
  const b = rect.height * 0.32;  // 0.30〜0.34 で微調整可

  // 自分を最下（θ=90°）に置き、他は等間隔で時計回り
  // θi = 90° + 360° * ((i - mySeatIndex) / players)
  for (let i = 0; i < players; i++) {
    const order = (i - mySeatIndex + players) % players;
    const theta = (Math.PI / 2) + (2 * Math.PI * (order / players));
    const x = cx + a * Math.cos(theta);
    const y = cy + b * Math.sin(theta);

    const el = seats[i];
    if (el) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }
}
