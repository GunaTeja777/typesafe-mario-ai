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
  gameCanvas.addEventListener('pointerdown', () => {
    sim.jump();
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      sim.jump();
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
