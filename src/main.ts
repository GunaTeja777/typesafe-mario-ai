import './style.css';
import { Simulation } from './engine/simulation';
import { CanvasRenderer } from './render/canvasRenderer';
import { NetworkVisualizer } from './render/networkVisualizer';
import { ChartRenderer } from './render/chartRenderer';
import { ModalManager } from './ui/modal';
import { ControlsManager } from './ui/controls';
import { Ticker } from './ui/ticker';
import { birdSprites } from './render/sprites';

function initApp() {
  const sim = new Simulation();
  const gameCanvas = document.getElementById('game') as HTMLCanvasElement;
  const renderer = new CanvasRenderer(gameCanvas);

  const chartCanvas = document.getElementById('chart') as HTMLCanvasElement;
  const chartRenderer = new ChartRenderer(chartCanvas);

  const ticker = new Ticker(document.getElementById('ticker')!);
  sim.onMessage = (msg: string) => ticker.notify(msg);

  // Logo rendering
  const logoCanvas = document.getElementById('logo') as HTMLCanvasElement;
  if (logoCanvas) {
    const lctx = logoCanvas.getContext('2d')!;
    lctx.drawImage(birdSprites[0][1], 0, 0, 148, 148);
  }

  // Generate species cards & network visualizers
  const netsContainer = document.getElementById('nets')!;
  const visualizers: NetworkVisualizer[] = [];

  sim.speciesList.forEach((sp, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="chead">
        <canvas class="face" width="76" height="76"></canvas>
        <b>${sp.name}, ${sp.arch}</b>
        <span class="wins" id="w${i}">wins 0</span>
      </div>
      <div class="csub" id="s${i}"></div>
      <canvas class="net" id="n${i}"></canvas>
      <div class="cfoot">4 inputs, ${sp.h} ${sp.activation || 'tanh'} neurons, 1 sigmoid output. ${6 * sp.h + 1} weights in total.</div>
    `;

    netsContainer.insertBefore(card, netsContainer.lastElementChild);

    const faceCanvas = card.querySelector('.face') as HTMLCanvasElement;
    const fctx = faceCanvas.getContext('2d')!;
    fctx.drawImage(birdSprites[i][0], 0, 0, 76, 76);

    const netCanvas = card.querySelector('.net') as HTMLCanvasElement;
    visualizers.push(new NetworkVisualizer(netCanvas, sp));
  });

  const onThemeChange = (themeName: 'cartoon' | 'neon' | 'sunset') => {
    document.documentElement.setAttribute('data-theme', themeName);
    renderer.buildStaticLayers(themeName);
  };

  const modals = new ModalManager(sim, onThemeChange);
  new ControlsManager(sim, modals);

  function updateCards() {
    for (let s = 0; s < sim.speciesList.length; s++) {
      let aliveCount = 0;
      for (const b of sim.birds) {
        if (b.sp === s && b.alive) aliveCount++;
      }
      const v = sim.viewer[s];
      const sEl = document.getElementById(`s${s}`);
      const wEl = document.getElementById(`w${s}`);

      if (sEl) {
        if (aliveCount && v) {
          let mutatedCount = 0;
          for (let i = 0; i < v.brain.n; i++) mutatedCount += v.brain.m[i];
          sEl.textContent = `Showing 1 of ${aliveCount} alive, fitness ${Math.round(v.fit)}. ${mutatedCount} of ${v.brain.n} weights mutated.`;
        } else {
          sEl.textContent = 'Every bird with this brain has crashed.';
        }
      }

      if (wEl) {
        wEl.textContent = `wins ${sim.wins[s]}`;
      }
    }
  }

  let uiTick = 0;

  function loop(timeMs: number) {
    if (!sim.paused) {
      const stepsCount = sim.speeds[sim.speedIdx];
      for (let i = 0; i < stepsCount; i++) {
        sim.step();
      }
    }

    sim.pickViewers();
    renderer.render(sim);

    for (let i = 0; i < visualizers.length; i++) {
      visualizers[i].draw(sim.viewer[i], timeMs);
    }

    if (++uiTick % 6 === 0) {
      updateCards();
      chartRenderer.draw(sim.history, sim.speciesList);
    }

    requestAnimationFrame(loop);
  }

  // Initial draw
  chartRenderer.draw(sim.history, sim.speciesList);
  updateCards();
  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', initApp);
