import type { BirdState, SpeciesSpec } from '../types';

const NW = 420;
const NH = 220;
const IN_X = 120;
const H_X = 236;
const OUT_X = 334;

const INPUT_NAMES = ['bird y', 'pipe x', 'gap top', 'gap bot'];
const F_UI = '"IBM Plex Sans", system-ui, sans-serif';
const F_MONO = '"IBM Plex Mono", ui-monospace, monospace';

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}

export class NetworkVisualizer {
  private ctx: CanvasRenderingContext2D;
  private spec: SpeciesSpec;

  constructor(canvas: HTMLCanvasElement, spec: SpeciesSpec) {
    canvas.width = NW * 2;
    canvas.height = NH * 2;
    this.ctx = canvas.getContext('2d')!;
    this.spec = spec;
  }

  public draw(viewer: BirdState | null, timeMs: number) {
    const c = this.ctx;
    const h = this.spec.h;

    c.setTransform(2, 0, 0, 2, 0, 0);
    c.clearRect(0, 0, NW, NH);

    if (!viewer || !viewer.alive) {
      c.fillStyle = '#98a0d4';
      c.font = '500 13px ' + F_UI;
      c.textAlign = 'center';
      c.fillText('All birds of this species have crashed.', NW / 2, NH / 2 - 6);
      c.fillText('Waiting for next generation to breed...', NW / 2, NH / 2 + 14);
      c.textAlign = 'left';
      return;
    }

    const b = viewer.brain;
    const p = b.p;
    const cy = NH / 2 + 8;
    const span = Math.min(NH - 56, (h - 1) * 26);

    const iy = (k: number) => cy - 60 + k * 40;
    const hy = (j: number) => (h > 1 ? cy - span / 2 + (j * span) / (h - 1) : cy);
    const phase = (timeMs / 1100) % 1;

    c.lineCap = 'round';

    // Column titles
    c.font = '600 10.5px ' + F_UI;
    c.textAlign = 'center';
    c.fillStyle = '#7f88c4';
    c.fillText('inputs', IN_X, 14);
    c.fillText(`hidden (${this.spec.activation || 'tanh'})`, H_X, 14);
    c.fillText('output (sigmoid)', OUT_X, 14);

    // Draw Synaptic Connections
    const drawEdge = (x1: number, y1: number, x2: number, y2: number, weight: number, mut: number, src: number, idx: number) => {
      const base = Math.min(1, Math.abs(weight) / 1.8);
      const s = Math.min(1, Math.abs(src));
      let a = (0.12 + 0.6 * base) * (0.3 + 0.7 * s);
      if (mut) a = Math.max(a, 0.85);

      const col = mut ? '255, 210, 63' : weight > 0 ? '95, 211, 141' : '255, 107, 107';
      c.strokeStyle = `rgba(${col}, ${a.toFixed(3)})`;
      c.lineWidth = 0.5 + base * 2.2;
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();

      // Animated electrical pulse packet
      if (Math.abs(weight * src) > 0.45) {
        const f = (phase + idx * 0.137) % 1;
        c.fillStyle = `rgba(${col}, 1)`;
        c.beginPath();
        c.arc(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 2, 0, Math.PI * 2);
        c.fill();
      }
    };

    // Layer 0 -> 1 Connections
    for (let j = 0; j < h; j++) {
      for (let k = 0; k < 4; k++) {
        drawEdge(IN_X, iy(k), H_X, hy(j), p[j * 4 + k], b.m[j * 4 + k], b.a0[k], j * 4 + k);
      }
    }

    // Layer 1 -> 2 Connections
    for (let j = 0; j < h; j++) {
      drawEdge(H_X, hy(j), OUT_X, cy, p[5 * h + j], b.m[5 * h + j], b.a1[j], j + 3);
    }

    // Input Nodes
    for (let k = 0; k < 4; k++) {
      const y = iy(k);
      const val = b.a0[k];
      c.fillStyle = `rgba(214, 218, 255, ${(0.3 + 0.7 * val).toFixed(2)})`;
      c.beginPath();
      c.arc(IN_X, y, 6, 0, Math.PI * 2);
      c.fill();

      c.textAlign = 'right';
      c.fillStyle = '#98a0d4';
      c.font = '500 11px ' + F_UI;
      c.fillText(INPUT_NAMES[k], IN_X - 46, y + 4);

      c.fillStyle = '#f4f5ff';
      c.font = '600 11px ' + F_MONO;
      c.fillText(val.toFixed(2), IN_X - 14, y + 4);
    }

    // Hidden Nodes
    const hr = h > 8 ? 3.6 : h > 4 ? 5 : 6.5;
    for (let j = 0; j < h; j++) {
      const a = b.a1[j];
      const y = hy(j);

      c.fillStyle =
        a > 0
          ? this.spec.color + Math.round(70 + 185 * Math.min(1, a)).toString(16).padStart(2, '0')
          : `rgba(150, 120, 230, ${(0.25 + 0.75 * Math.min(1, -a)).toFixed(2)})`;

      c.beginPath();
      c.arc(H_X, y, hr, 0, Math.PI * 2);
      c.fill();

      // Bias ring
      const bi = p[4 * h + j];
      const mu = b.m[4 * h + j];
      c.strokeStyle = mu ? '#ffd23f' : bi > 0 ? '#5fd38d' : '#ff6b6b';
      c.lineWidth = (mu ? 2 : 1) + Math.min(1.2, Math.abs(bi) * 0.6);
      c.beginPath();
      c.arc(H_X, y, hr + 1.6, 0, Math.PI * 2);
      c.stroke();
    }

    // Output Node
    const willFlap = b.out > 0.5;
    c.fillStyle = willFlap ? '#5fd38d' : '#9aa3d6';
    c.beginPath();
    c.arc(OUT_X, cy, 10, 0, Math.PI * 2);
    c.fill();

    const ob = p[6 * h];
    const om = b.m[6 * h];
    c.strokeStyle = om ? '#ffd23f' : ob > 0 ? '#5fd38d' : '#ff6b6b';
    c.lineWidth = om ? 2.5 : 1.5;
    c.beginPath();
    c.arc(OUT_X, cy, 12.5, 0, Math.PI * 2);
    c.stroke();

    c.textAlign = 'left';
    c.fillStyle = willFlap ? '#8ee8b1' : '#c8ceef';
    c.font = '600 12px ' + F_MONO;
    c.fillText(`${willFlap ? 'FLAP ' : 'WAIT '} ${b.out.toFixed(2)}`, OUT_X + 20, cy + 1);

    // Decision Meter
    rr(c, OUT_X + 20, cy + 9, 54, 6, 3);
    c.fillStyle = 'rgba(255, 255, 255, 0.16)';
    c.fill();

    rr(c, OUT_X + 20, cy + 9, Math.max(4, 54 * b.out), 6, 3);
    c.fillStyle = willFlap ? '#5fd38d' : '#9aa3d6';
    c.fill();

    // 0.5 Decision Marker
    c.fillStyle = '#ffffff';
    c.fillRect(OUT_X + 20 + 27, cy + 6, 1.5, 12);
  }
}
