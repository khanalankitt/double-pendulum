/**
 * Lightweight scientific overlays drawn to 2D canvases:
 *   - phase space (theta1 vs theta2, wrapped to [-pi, pi])
 *   - kinetic vs potential energy over a sliding window
 *   - angular velocities over time
 */

const W = 300;
const H = 80;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

function makeCanvas(label: string, container: HTMLElement): CanvasRenderingContext2D {
  const card = document.createElement('div');
  card.className = 'graph-card';
  const lab = document.createElement('div');
  lab.className = 'label';
  lab.textContent = label;
  const cvs = document.createElement('canvas');
  cvs.width = W * DPR;
  cvs.height = H * DPR;
  card.appendChild(lab);
  card.appendChild(cvs);
  container.appendChild(card);
  const ctx = cvs.getContext('2d')!;
  ctx.scale(DPR, DPR);
  return ctx;
}

const HIST = 360;

export class Graphs {
  private host: HTMLElement;
  private phaseCtx: CanvasRenderingContext2D;
  private energyCtx: CanvasRenderingContext2D;
  private omegaCtx: CanvasRenderingContext2D;

  private phaseHist = new Float32Array(HIST * 2);
  private phaseIdx = 0;
  private phaseCount = 0;

  private ke = new Float32Array(HIST);
  private pe = new Float32Array(HIST);
  private eIdx = 0;
  private eCount = 0;
  private eRange = 1;

  private w1Hist = new Float32Array(HIST);
  private w2Hist = new Float32Array(HIST);
  private wIdx = 0;
  private wCount = 0;
  private wMax = 4;

  visible = false;

  constructor(container: HTMLElement) {
    this.host = container;
    this.phaseCtx = makeCanvas('Phase Space  θ₁ vs θ₂', container);
    this.energyCtx = makeCanvas('Energy  (KE blue · PE orange)', container);
    this.omegaCtx = makeCanvas('Angular Velocity  ω₁ ω₂', container);
    this.setVisible(false);
  }

  setVisible(v: boolean) {
    this.visible = v;
    this.host.style.display = v ? 'flex' : 'none';
  }

  push(t1: number, t2: number, w1: number, w2: number, ke: number, pe: number) {
    const wrap = (a: number) => {
      let x = (a + Math.PI) % (2 * Math.PI);
      if (x < 0) x += 2 * Math.PI;
      return x - Math.PI;
    };
    this.phaseHist[this.phaseIdx * 2] = wrap(t1);
    this.phaseHist[this.phaseIdx * 2 + 1] = wrap(t2);
    this.phaseIdx = (this.phaseIdx + 1) % HIST;
    if (this.phaseCount < HIST) this.phaseCount++;

    this.ke[this.eIdx] = ke;
    this.pe[this.eIdx] = pe;
    this.eIdx = (this.eIdx + 1) % HIST;
    if (this.eCount < HIST) this.eCount++;
    const peak = Math.max(Math.abs(ke), Math.abs(pe));
    if (peak > this.eRange) this.eRange = peak;
    else this.eRange = this.eRange * 0.995 + peak * 0.005;

    this.w1Hist[this.wIdx] = w1;
    this.w2Hist[this.wIdx] = w2;
    this.wIdx = (this.wIdx + 1) % HIST;
    if (this.wCount < HIST) this.wCount++;
    const wp = Math.max(Math.abs(w1), Math.abs(w2));
    if (wp > this.wMax) this.wMax = wp;
    else this.wMax = this.wMax * 0.995 + wp * 0.005;
  }

  draw() {
    if (!this.visible) return;
    this.drawPhase();
    this.drawEnergy();
    this.drawOmega();
  }

  private gridify(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(20, 28, 42, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(140, 180, 230, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (H / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.strokeStyle = 'rgba(140, 180, 230, 0.18)';
    ctx.stroke();
  }

  private drawPhase() {
    const ctx = this.phaseCtx;
    this.gridify(ctx);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    const sx = W / (2 * Math.PI);
    const sy = H / (2 * Math.PI);
    ctx.strokeStyle = 'rgba(140, 180, 230, 0.12)';
    ctx.beginPath();
    ctx.moveTo(-W / 2, 0); ctx.lineTo(W / 2, 0);
    ctx.moveTo(0, -H / 2); ctx.lineTo(0, H / 2);
    ctx.stroke();

    const n = this.phaseCount;
    const start = (this.phaseIdx - n + HIST) % HIST;
    for (let i = 0; i < n; i++) {
      const idx = (start + i) % HIST;
      const x = this.phaseHist[idx * 2] * sx;
      const y = -this.phaseHist[idx * 2 + 1] * sy;
      const a = i / n;
      ctx.fillStyle = `rgba(${Math.round(111 + 144 * a)}, ${Math.round(182 - 100 * a)}, ${Math.round(255 - 200 * a)}, ${0.15 + 0.85 * a})`;
      ctx.fillRect(x - 0.6, y - 0.6, 1.6, 1.6);
    }
    ctx.restore();
  }

  private drawEnergy() {
    const ctx = this.energyCtx;
    this.gridify(ctx);
    const n = this.eCount;
    const start = (this.eIdx - n + HIST) % HIST;
    const range = Math.max(1e-3, this.eRange) * 1.05;
    const drawSeries = (arr: Float32Array, color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < n; i++) {
        const idx = (start + i) % HIST;
        const x = (i / (HIST - 1)) * W;
        const v = arr[idx] / range;
        const y = H / 2 - v * (H / 2 - 4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    drawSeries(this.ke, 'rgba(111, 182, 255, 0.95)');
    drawSeries(this.pe, 'rgba(255, 154, 85, 0.95)');
  }

  private drawOmega() {
    const ctx = this.omegaCtx;
    this.gridify(ctx);
    const n = this.wCount;
    const start = (this.wIdx - n + HIST) % HIST;
    const range = Math.max(1e-3, this.wMax) * 1.05;
    const drawSeries = (arr: Float32Array, color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < n; i++) {
        const idx = (start + i) % HIST;
        const x = (i / (HIST - 1)) * W;
        const v = arr[idx] / range;
        const y = H / 2 - v * (H / 2 - 4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    drawSeries(this.w1Hist, 'rgba(180, 230, 255, 0.95)');
    drawSeries(this.w2Hist, 'rgba(255, 180, 120, 0.95)');
  }
}
