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
  const musicBtn = document.getElementById('musicBtn') as HTMLButtonElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

  const updateAudioButtons = () => {
    soundBtn.textContent = sounds.isSfxEnabled() ? '🔊 SFX' : '🔇 SFX Off';
    soundBtn.classList.toggle('active', sounds.isSfxEnabled());
    musicBtn.textContent = sounds.isMusicEnabled() ? '🎵 Music' : '🔇 Music Off';
    musicBtn.classList.toggle('active', sounds.isMusicEnabled());
  };
  updateAudioButtons();

  const restartGame = () => {
    sim.restart();
    sounds.playClick();
  };

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
    sounds.init();
    const enabled = !sounds.isSfxEnabled();
    sounds.setSfxEnabled(enabled);
    updateAudioButtons();
    if (enabled) sounds.playClick();
  };

  musicBtn.onclick = () => {
    sounds.init();
    const enabled = !sounds.isMusicEnabled();
    sounds.setMusicEnabled(enabled);
    updateAudioButtons();
    if (enabled) sounds.playClick();
  };

  resetBtn.onclick = restartGame;

  // Pointer down & up for variable jump
  gameCanvas.addEventListener('pointerdown', (e: MouseEvent) => {
    sounds.init();
    if (e.button === 2) {
      sim.shoot();
    } else {
      sim.jump();
    }
  });

  window.addEventListener('pointerup', () => {
    sim.releaseJump();
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    sounds.init();
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
      restartGame();
    } else if (e.key === 'm' || e.key === 'M') {
      const enabled = !sounds.isMusicEnabled();
      sounds.setMusicEnabled(enabled);
      updateAudioButtons();
    } else if (e.key === 's' || e.key === 'S') {
      const enabled = !sounds.isSfxEnabled();
      sounds.setSfxEnabled(enabled);
      updateAudioButtons();
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      sim.releaseJump();
    }
  });

  function loop(timeMs: number) {
    sim.step(timeMs);
    renderer.render(sim);

    if (sim.fireAmmo > 0) {
      shootBtn.textContent = `🔥 Shoot (${sim.fireAmmo})`;
      shootBtn.classList.add('has-ammo');
      shootBtn.classList.remove('no-ammo');
      shootBtn.title = `You have ${sim.fireAmmo} fire bullets! Click or press [X] / [F] / [Ctrl] to shoot!`;
    } else {
      shootBtn.textContent = `🔥 Shoot (0)`;
      shootBtn.classList.remove('has-ammo');
      shootBtn.classList.add('no-ammo');
      shootBtn.title = 'Hit ? boxes with Mario\'s head to get +5 shooting bullets!';
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', initApp);
