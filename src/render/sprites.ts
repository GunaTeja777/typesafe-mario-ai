import { DEFAULT_SPECIES, HUMAN_SPECIES } from '../ai/presets';

const INK = '#141a3a';

function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w * 2;
  c.height = h * 2;
  const x = c.getContext('2d')!;
  x.scale(2, 2);
  return [c, x];
}

export function makeBirdSprite(
  palette: { body: string; dark: string; belly: string },
  wingUp: boolean,
  isHuman: boolean = false
): HTMLCanvasElement {
  const [c, x] = mk(64, 64);
  x.translate(28, 33);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  x.lineWidth = 2.5;
  x.strokeStyle = INK;

  // Tail feathers
  x.fillStyle = palette.dark;
  for (const a of [-0.4, 0, 0.4]) {
    x.save();
    x.translate(-11, 3);
    x.rotate(Math.PI + a);
    x.beginPath();
    x.moveTo(0, -3.6);
    x.lineTo(13, 0);
    x.lineTo(0, 3.6);
    x.closePath();
    x.fill();
    x.stroke();
    x.restore();
  }

  // Head tuft or pilot helmet
  if (isHuman) {
    // Aviator goggles / headband
    x.fillStyle = '#ffbe0b';
    x.beginPath();
    x.rect(-10, -16, 20, 7);
    x.fill();
    x.stroke();
  } else {
    x.beginPath();
    x.moveTo(-7, -11);
    x.lineTo(-10, -21);
    x.lineTo(-3, -14.5);
    x.lineTo(0, -24);
    x.lineTo(3, -14);
    x.lineTo(9, -20);
    x.lineTo(8, -10);
    x.closePath();
    x.fillStyle = palette.dark;
    x.fill();
    x.stroke();
  }

  // Body
  x.fillStyle = palette.body;
  x.beginPath();
  x.arc(0, 0, 14, 0, Math.PI * 2);
  x.fill();

  // Belly
  x.save();
  x.beginPath();
  x.arc(0, 0, 14, 0, Math.PI * 2);
  x.clip();
  x.fillStyle = palette.belly;
  x.beginPath();
  x.ellipse(4, 9, 10, 7, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();

  x.beginPath();
  x.arc(0, 0, 14, 0, Math.PI * 2);
  x.stroke();

  // Wing
  x.save();
  x.translate(-6, 4);
  x.rotate(wingUp ? 0.9 : -0.35);
  x.fillStyle = palette.dark;
  x.beginPath();
  x.ellipse(-4, 0, 9.5, 5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.restore();

  // Eyes
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(3, -2.5, 4.4, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  x.beginPath();
  x.arc(11, -2.5, 4.4, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Pupils
  x.fillStyle = INK;
  x.beginPath();
  x.arc(4.6, -1.8, 1.9, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.arc(12.4, -1.8, 1.9, 0, Math.PI * 2);
  x.fill();

  // Angry brows (or determined pilot brows)
  x.lineWidth = 4.2;
  x.strokeStyle = INK;
  x.beginPath();
  x.moveTo(-3, -10);
  x.lineTo(6.5, -6.2);
  x.stroke();

  x.beginPath();
  x.moveTo(16.5, -9.5);
  x.lineTo(8, -6.2);
  x.stroke();

  // Beak
  x.lineWidth = 2.5;
  x.fillStyle = '#ffb02e';
  x.beginPath();
  x.moveTo(11, 2);
  x.lineTo(24.5, 6);
  x.lineTo(11, 11);
  x.closePath();
  x.fill();
  x.stroke();

  return c;
}

// Generate bird sprites for all default species + human
export const birdSprites: HTMLCanvasElement[][] = [
  ...DEFAULT_SPECIES.map(s => [makeBirdSprite(s.palette, false), makeBirdSprite(s.palette, true)]),
  [makeBirdSprite(HUMAN_SPECIES.palette, false, true), makeBirdSprite(HUMAN_SPECIES.palette, true, true)]
];
