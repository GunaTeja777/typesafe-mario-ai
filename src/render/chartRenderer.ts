import type { SpeciesSpec } from '../types';

const CW = 420;
const CH = 180;
const F_UI = '"IBM Plex Sans", system-ui, sans-serif';

export class ChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CW * 2;
    this.canvas.height = CH * 2;
    this.ctx = canvas.getContext('2d')!;
  }

  public draw(history: number[][], speciesList: SpeciesSpec[]) {
    const c = this.ctx;
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.clearRect(0, 0, CW, CH);

    const n = history[0]?.length || 0;
    c.font = '500 11px ' + F_UI;

    if (!n) {
      c.fillStyle = '#98a0d4';
      c.textAlign = 'center';
      c.fillText('Curves will appear when Generation 1 completes.', CW / 2, CH / 2);
      c.textAlign = 'left';
      return;
    }

    const view = Math.min(n, 40);
    const start = n - view;

    let maxScore = 5;
    for (let s = 0; s < speciesList.length; s++) {
      for (let i = start; i < n; i++) {
        if (history[s] && history[s][i] !== undefined) {
          maxScore = Math.max(maxScore, history[s][i]);
        }
      }
    }
    maxScore = Math.ceil(maxScore * 1.15);

    const l = 34;
    const r = 14;
    const t = 12;
    const b = 24;
    const w = CW - l - r;
    const h = CH - t - b;

    // Grid lines & labels
    c.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    c.fillStyle = '#98a0d4';
    c.lineWidth = 1;
    c.textAlign = 'right';

    for (let g = 0; g <= 4; g++) {
      const y = t + h * (1 - g / 4);
      c.beginPath();
      c.moveTo(l, y);
      c.lineTo(l + w, y);
      c.stroke();
      c.fillText(Math.round((maxScore * g) / 4).toString(), l - 6, y + 4);
    }

    c.textAlign = 'left';
    c.fillText(`Gen ${start + 1}`, l, CH - 6);
    c.textAlign = 'right';
    c.fillText(`Gen ${n}`, l + w, CH - 6);

    const calcX = (i: number) => (view > 1 ? l + (i / (view - 1)) * w : l + w / 2);
    const calcY = (val: number) => t + h * (1 - val / maxScore);

    // Render Species lines
    speciesList.forEach((spec, s) => {
      if (!history[s] || history[s].length === 0) return;
      c.strokeStyle = spec.color;
      c.lineWidth = 2.5;
      c.lineJoin = 'round';
      c.beginPath();

      for (let i = 0; i < view; i++) {
        const x = calcX(i);
        const y = calcY(history[s][start + i]);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();

      // Current endpoint dot
      c.fillStyle = spec.color;
      c.strokeStyle = '#0f1538';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(calcX(view - 1), calcY(history[s][n - 1]), 4.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    });
  }
}
