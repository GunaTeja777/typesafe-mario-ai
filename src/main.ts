import './style.css';
import { Simulation } from './engine/simulation';
import { CanvasRenderer } from './render/canvasRenderer';
import { JevDashboard } from './ui/jevDashboard';
import { sounds } from './audio/soundEffects';

function initApp() {
  const sim = new Simulation();
  const gameCanvas = document.getElementById('game') as HTMLCanvasElement;
  const renderer = new CanvasRenderer(gameCanvas);

  const jevContainer = document.getElementById('jevDashboardContainer')!;
  new JevDashboard(jevContainer);

  const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
  const humanBtn = document.getElementById('humanBtn') as HTMLButtonElement;
  const shootBtn = document.getElementById('shootBtn') as HTMLButtonElement;
  const soundBtn = document.getElementById('soundBtn') as HTMLButtonElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

  pauseBtn.onclick = () => {
    sim.paused = !sim.paused;
    pauseBtn.textContent = sim.paused ? '▶ Resume' : '⏸ Pause';
    sounds.playClick();
  };

  humanBtn.onclick = () => {
    sim.humanControl = !sim.humanControl;
    humanBtn.classList.toggle('active', sim.humanControl);
    humanBtn.textContent = sim.humanControl ? '🎮 Manual: ACTIVE' : '🎮 Manual Play';
    sounds.playClick();
  };

  shootBtn.onclick = () => {
    sim.shoot();
  };

  soundBtn.onclick = () => {
    const enabled = !sounds.isEnabled();
    sounds.setEnabled(enabled);
    soundBtn.textContent = enabled ? '🔊 Sound' : '🔇 Muted';
    if (enabled) sounds.playClick();
  };

  resetBtn.onclick = () => {
    sim.restart();
    sounds.playClick();
  };

  // Canvas click & Space key triggers jump in manual mode or testing
  gameCanvas.addEventListener('pointerdown', (e: MouseEvent) => {
    if (e.button === 2) {
      sim.shoot();
    } else {
      sim.jump();
    }
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;

    if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      sim.jump();
    } else if (e.key === 'x' || e.key === 'X' || e.key === 'f' || e.key === 'F' || e.key === 'Control') {
      e.preventDefault();
      sim.shoot();
    } else if (e.key === 'p' || e.key === 'P') {
      sim.paused = !sim.paused;
      pauseBtn.textContent = sim.paused ? '▶ Resume' : '⏸ Pause';
    } else if (e.key === 'r' || e.key === 'R') {
      sim.restart();
    } else if (e.key === 'm' || e.key === 'M') {
      const enabled = !sounds.isEnabled();
      sounds.setEnabled(enabled);
      soundBtn.textContent = enabled ? '🔊 Sound' : '🔇 Muted';
    }
  });

  function loop(timeMs: number) {
    sim.step(timeMs);
    renderer.render(sim);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', initApp);
