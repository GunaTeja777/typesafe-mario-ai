import { Simulation } from '../engine/simulation';
import { ModalManager } from './modal';
import { sounds } from '../audio/soundEffects';

export class ControlsManager {
  private sim: Simulation;
  private modals: ModalManager;
  private speedLbl: HTMLElement;
  private pauseBtn: HTMLElement;
  private humanBtn: HTMLElement;
  private soundBtn: HTMLElement;

  constructor(sim: Simulation, modals: ModalManager) {
    this.sim = sim;
    this.modals = modals;
    this.speedLbl = document.getElementById('speedLbl')!;
    this.pauseBtn = document.getElementById('pause')!;
    this.humanBtn = document.getElementById('humanMode')!;
    this.soundBtn = document.getElementById('soundToggle')!;
    this.bindButtons();
    this.bindKeyboard();
  }

  private bindButtons() {
    const $ = (id: string) => document.getElementById(id)!;

    this.pauseBtn.onclick = () => {
      this.sim.paused = !this.sim.paused;
      this.pauseBtn.textContent = this.sim.paused ? '▶ Resume' : '⏸ Pause';
      sounds.playClick();
    };

    $('speed').oninput = (e: Event) => {
      const idx = parseInt((e.target as HTMLInputElement).value, 10);
      this.setSpeed(idx);
    };

    $('hard').onchange = (e: Event) => {
      this.sim.settings.difficultyRamp = (e.target as HTMLInputElement).checked;
      sounds.playClick();
    };

    $('skip').onclick = () => {
      this.sim.skipGen();
      sounds.playClick();
    };

    $('reset').onclick = () => {
      this.sim.restart();
      sounds.playClick();
    };

    this.humanBtn.onclick = () => {
      this.toggleHumanMode();
      sounds.playClick();
    };

    this.soundBtn.onclick = () => {
      const isEnabled = !sounds.isEnabled();
      sounds.setEnabled(isEnabled);
      this.soundBtn.textContent = isEnabled ? '🔊 Sound On' : '🔇 Muted';
      if (isEnabled) sounds.playClick();
    };

    $('openLab').onclick = () => {
      this.modals.openLab();
      sounds.playClick();
    };

    $('openVault').onclick = () => {
      this.modals.openVault();
      sounds.playClick();
    };

    $('openHelp').onclick = () => {
      this.modals.openHelp();
      sounds.playClick();
    };

    $('cine').onclick = () => {
      document.body.classList.add('cine');
      sounds.playClick();
    };

    $('exitCine').onclick = () => {
      document.body.classList.remove('cine');
      sounds.playClick();
    };

    // Canvas click in human mode triggers flap
    const gameCanvas = document.getElementById('game')!;
    gameCanvas.addEventListener('pointerdown', () => {
      if (this.sim.settings.humanMode) {
        this.sim.human.flap();
      }
    });
  }

  public toggleHumanMode() {
    this.sim.settings.humanMode = !this.sim.settings.humanMode;
    this.humanBtn.classList.toggle('active', this.sim.settings.humanMode);
    this.humanBtn.textContent = this.sim.settings.humanMode ? '🎮 Human: ACTIVE' : '🎮 Play vs AI';

    if (this.sim.settings.humanMode) {
      if (!this.sim.birds.some(b => b.isHuman)) {
        this.sim.birds.push(this.sim.human.init(320));
      }
      this.sim.human.flap();
    }
  }

  public setSpeed(idx: number) {
    this.sim.speedIdx = Math.max(0, Math.min(this.sim.speeds.length - 1, idx));
    (document.getElementById('speed') as HTMLInputElement).value = this.sim.speedIdx.toString();
    this.speedLbl.textContent = `${this.sim.speeds[this.sim.speedIdx]}x`;
  }

  private bindKeyboard() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.sim.settings.humanMode) {
          this.sim.human.flap();
        } else {
          this.sim.paused = !this.sim.paused;
          this.pauseBtn.textContent = this.sim.paused ? '▶ Resume' : '⏸ Pause';
        }
      } else if (e.key === 'h' || e.key === 'H') {
        this.toggleHumanMode();
      } else if (e.key === 'n' || e.key === 'N') {
        this.sim.skipGen();
      } else if (e.key === 'r' || e.key === 'R') {
        this.sim.restart();
      } else if (e.key === 'm' || e.key === 'M') {
        const isEnabled = !sounds.isEnabled();
        sounds.setEnabled(isEnabled);
        this.soundBtn.textContent = isEnabled ? '🔊 Sound On' : '🔇 Muted';
      } else if (e.key === 'c' || e.key === 'C') {
        document.body.classList.toggle('cine');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setSpeed(this.sim.speedIdx + 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setSpeed(this.sim.speedIdx - 1);
      }
    });
  }
}
