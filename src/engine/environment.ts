export interface EnvironmentTheme {
  name: 'cartoon' | 'neon' | 'sunset';
  skyTop: string;
  skyBot: string;
  sunColor: string;
  cloudFarColor: string;
  cloudNearColor: string;
  hillFarColor: string;
  hillNearColor: string;
  groundColor: string;
  groundSubColor: string;
  pipeColor: string;
  pipeHighlight: string;
  pipeShadow: string;
  pipeCap: string;
  pipeCapTop: string;
  pipeWindowLit: string;
  pipeWindowDark: string;
}

export const THEMES: Record<'cartoon' | 'neon' | 'sunset', EnvironmentTheme> = {
  cartoon: {
    name: 'cartoon',
    skyTop: '#4fb0ea',
    skyBot: '#dff4fb',
    sunColor: '#fff3a6',
    cloudFarColor: 'rgba(255, 255, 255, 0.7)',
    cloudNearColor: 'rgba(255, 255, 255, 0.92)',
    hillFarColor: '#a6dcae',
    hillNearColor: '#74c479',
    groundColor: '#5cbb59',
    groundSubColor: '#3f9448',
    pipeColor: '#c9c3b3',
    pipeHighlight: '#e3decf',
    pipeShadow: '#a8a290',
    pipeCap: '#545a72',
    pipeCapTop: '#7d84a0',
    pipeWindowLit: '#ffd76a',
    pipeWindowDark: '#2d4468'
  },
  neon: {
    name: 'neon',
    skyTop: '#090b1c',
    skyBot: '#15193c',
    sunColor: '#00f0ff',
    cloudFarColor: 'rgba(56, 189, 248, 0.25)',
    cloudNearColor: 'rgba(192, 132, 252, 0.35)',
    hillFarColor: '#1e1b4b',
    hillNearColor: '#311042',
    groundColor: '#4c1d95',
    groundSubColor: '#2e1065',
    pipeColor: '#1e293b',
    pipeHighlight: '#0ea5e9',
    pipeShadow: '#0f172a',
    pipeCap: '#ec4899',
    pipeCapTop: '#f472b6',
    pipeWindowLit: '#00ffcc',
    pipeWindowDark: '#0f172a'
  },
  sunset: {
    name: 'sunset',
    skyTop: '#fd5e53',
    skyBot: '#ffe66d',
    sunColor: '#ffdd59',
    cloudFarColor: 'rgba(255, 175, 189, 0.65)',
    cloudNearColor: 'rgba(255, 195, 160, 0.85)',
    hillFarColor: '#9b5de5',
    hillNearColor: '#f15bb5',
    groundColor: '#7209b7',
    groundSubColor: '#3f37c9',
    pipeColor: '#5c4d7d',
    pipeHighlight: '#7b68a6',
    pipeShadow: '#3e3455',
    pipeCap: '#e63946',
    pipeCapTop: '#ff4d6d',
    pipeWindowLit: '#ffbe0b',
    pipeWindowDark: '#2b1e3a'
  }
};

export class EnvironmentEngine {
  public wind: number = 0;
  private windTarget: number = 0;
  private windTimer: number = 0;

  public update(windEnabled: boolean, windForceMax: number = 1.2) {
    if (!windEnabled) {
      this.wind = 0;
      return;
    }

    this.windTimer++;
    if (this.windTimer > 180) {
      this.windTimer = 0;
      this.windTarget = (Math.random() * 2 - 1) * windForceMax;
    }
    this.wind += (this.windTarget - this.wind) * 0.02;
  }
}
