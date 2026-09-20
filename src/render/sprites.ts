const INK = '#000000';

function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w * 2;
  c.height = h * 2;
  const x = c.getContext('2d')!;
  x.scale(2, 2);
  return [c, x];
}

/**
 * Super Mario Sprites (Run cycle 3 frames, Jump 1 frame, Dead 1 frame)
 */
export function makeMarioRunFrame(frame: number): HTMLCanvasElement {
  const [c, x] = mk(48, 48);
  x.translate(24, 28);

  // Red Cap
  x.fillStyle = '#e52521';
  x.strokeStyle = INK;
  x.lineWidth = 2;

  // Cap dome
  x.beginPath();
  x.ellipse(0, -14, 12, 7, 0, Math.PI, Math.PI * 2);
  x.lineTo(13, -11);
  x.quadraticCurveTo(0, -9, -13, -11);
  x.closePath();
  x.fill();
  x.stroke();

  // Cap Visor
  x.beginPath();
  x.ellipse(7, -11, 7, 3, 0.1, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // White "M" Emblem
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(0, -14, 4, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = '#e52521';
  x.font = 'bold 5px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('M', 0, -14);

  // Head / Face (Peach skin)
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.arc(0, -5, 9, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Big Nose
  x.beginPath();
  x.ellipse(7, -5, 4.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Brown Mustache
  x.fillStyle = '#4a2505';
  x.beginPath();
  x.ellipse(4, -2, 6.5, 3, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Eye
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.ellipse(3, -7, 2.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = '#0055d4';
  x.beginPath();
  x.arc(4.2, -7, 1.4, 0, Math.PI * 2);
  x.fill();

  // Hair / Sideburn
  x.fillStyle = '#4a2505';
  x.beginPath();
  x.arc(-5, -7, 3.5, 0, Math.PI * 2);
  x.fill();

  // Red Shirt
  x.fillStyle = '#e52521';
  x.beginPath();
  x.roundRect(-8, 2, 16, 10, 3);
  x.fill();
  x.stroke();

  // Blue Overalls
  x.fillStyle = '#0055d4';
  x.beginPath();
  x.roundRect(-7, 5, 14, 9, 3);
  x.fill();
  x.stroke();

  // Yellow Buttons
  x.fillStyle = '#ffd700';
  x.beginPath();
  x.arc(-3, 7, 1.5, 0, Math.PI * 2);
  x.arc(3, 7, 1.5, 0, Math.PI * 2);
  x.fill();

  // Animated Arms & White Gloves
  x.fillStyle = '#ffffff';
  x.strokeStyle = INK;
  x.lineWidth = 1.8;
  const armOffset = frame === 0 ? -4 : (frame === 1 ? 0 : 4);
  x.beginPath();
  x.arc(-7 - armOffset, 7, 3.5, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.beginPath();
  x.arc(7 + armOffset, 7, 3.5, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Animated Legs & Brown Boots (Running cycle)
  x.fillStyle = '#6b3e15';
  x.strokeStyle = INK;
  x.lineWidth = 2;

  let leg1X = -5, leg1Y = 14, leg2X = 5, leg2Y = 14;
  if (frame === 0) {
    leg1X = -7; leg1Y = 13;
    leg2X = 7; leg2Y = 16;
  } else if (frame === 2) {
    leg1X = 7; leg1Y = 13;
    leg2X = -7; leg2Y = 16;
  }

  x.beginPath();
  x.ellipse(leg1X, leg1Y, 5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  x.beginPath();
  x.ellipse(leg2X, leg2Y, 5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  return c;
}

export function makeMarioJump(): HTMLCanvasElement {
  const [c, x] = mk(48, 48);
  x.translate(24, 28);

  // Jump pose: Right fist raised high into the air!
  x.fillStyle = '#ffffff';
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(10, -20, 4.5, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Sleeve
  x.fillStyle = '#e52521';
  x.beginPath();
  x.roundRect(6, -17, 6, 8, 2);
  x.fill();
  x.stroke();

  // Red Cap
  x.fillStyle = '#e52521';
  x.beginPath();
  x.ellipse(0, -14, 12, 7, -0.1, Math.PI, Math.PI * 2);
  x.lineTo(13, -11);
  x.quadraticCurveTo(0, -9, -13, -11);
  x.closePath();
  x.fill();
  x.stroke();

  // Cap Visor
  x.beginPath();
  x.ellipse(7, -11, 7, 3, 0.1, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Face
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.arc(0, -5, 9, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Eye
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.ellipse(3, -7, 2.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = '#0055d4';
  x.beginPath();
  x.arc(4.2, -7, 1.4, 0, Math.PI * 2);
  x.fill();

  // Nose & Mustache
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.ellipse(7, -5, 4.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  x.fillStyle = '#4a2505';
  x.beginPath();
  x.ellipse(4, -2, 6.5, 3, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Body
  x.fillStyle = '#0055d4';
  x.beginPath();
  x.roundRect(-7, 3, 14, 10, 3);
  x.fill();
  x.stroke();

  // Legs tucked in jump
  x.fillStyle = '#6b3e15';
  x.beginPath();
  x.ellipse(-6, 12, 5, 3.5, -0.3, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  x.beginPath();
  x.ellipse(6, 11, 5, 3.5, 0.3, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  return c;
}

export function makeMarioDead(): HTMLCanvasElement {
  const [c, x] = mk(48, 48);
  x.translate(24, 28);

  // Shocked eyes
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.arc(0, -5, 9, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(1, -9); x.lineTo(7, -5);
  x.moveTo(7, -9); x.lineTo(1, -5);
  x.stroke();

  // Cap askew
  x.fillStyle = '#e52521';
  x.beginPath();
  x.ellipse(-3, -16, 11, 6, -0.3, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Body
  x.fillStyle = '#0055d4';
  x.beginPath();
  x.roundRect(-6, 3, 12, 9, 3);
  x.fill();
  x.stroke();

  return c;
}

/**
 * Super Mario Goomba Sprite (2-frame waddle)
 */
export function makeGoomba(frame: number): HTMLCanvasElement {
  const [c, x] = mk(36, 36);
  x.translate(18, 20);
  x.lineJoin = 'round';
  x.lineCap = 'round';

  // Brown Mushroom Head
  x.fillStyle = '#9b4a1b';
  x.strokeStyle = INK;
  x.lineWidth = 2;

  x.beginPath();
  x.moveTo(-13, 4);
  x.quadraticCurveTo(-15, -14, 0, -15);
  x.quadraticCurveTo(15, -14, 13, 4);
  x.closePath();
  x.fill();
  x.stroke();

  // Angry Eyebrows
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(-10, -5); x.lineTo(-2, -1);
  x.moveTo(10, -5); x.lineTo(2, -1);
  x.stroke();

  // Eyes
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.ellipse(-5, 0, 3, 4.5, 0.2, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  x.beginPath();
  x.ellipse(5, 0, 3, 4.5, -0.2, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Pupils
  x.fillStyle = INK;
  x.beginPath();
  x.arc(-4, 0, 1.5, 0, Math.PI * 2);
  x.arc(4, 0, 1.5, 0, Math.PI * 2);
  x.fill();

  // White Fangs
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.moveTo(-7, 4); x.lineTo(-5, 0); x.lineTo(-3, 4); x.closePath();
  x.fill();
  x.stroke();
  x.beginPath();
  x.moveTo(3, 4); x.lineTo(5, 0); x.lineTo(7, 4); x.closePath();
  x.fill();
  x.stroke();

  // Feet (Waddling animation)
  x.fillStyle = '#3a1e05';
  x.lineWidth = 1.8;
  const fOffset = frame === 0 ? 2 : -2;

  x.beginPath();
  x.ellipse(-8, 9 + fOffset, 5.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  x.beginPath();
  x.ellipse(8, 9 - fOffset, 5.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  return c;
}

/**
 * Super Mario Question Mark `?` Block
 */
export function makeQuestionBlock(): HTMLCanvasElement {
  const [c, x] = mk(36, 36);
  x.translate(18, 18);

  // Golden Box Body
  x.fillStyle = '#f8931f';
  x.strokeStyle = INK;
  x.lineWidth = 2.5;
  x.beginPath();
  x.roundRect(-14, -14, 28, 28, 4);
  x.fill();
  x.stroke();

  // Inner Highlight
  x.fillStyle = '#fbb034';
  x.fillRect(-12, -12, 24, 24);

  // Corner Rivets
  x.fillStyle = '#6b3e15';
  for (const [rx, ry] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
    x.fillRect(rx - 1.5, ry - 1.5, 3, 3);
  }

  // Question Mark `?`
  x.fillStyle = '#ffffff';
  x.strokeStyle = '#6b3e15';
  x.lineWidth = 2.5;
  x.font = 'bold 20px "Lilita One", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.strokeText('?', 0, -1);
  x.fillText('?', 0, -1);

  return c;
}

/**
 * Super Mario Spinning Golden Coin (4 frames)
 */
export function makeCoinFrame(frame: number): HTMLCanvasElement {
  const [c, x] = mk(28, 28);
  x.translate(14, 14);

  const widths = [10, 7, 3, 7];
  const w = widths[frame % 4];

  x.fillStyle = '#ffd700';
  x.strokeStyle = '#b8860b';
  x.lineWidth = 2;

  x.beginPath();
  x.ellipse(0, 0, Math.max(1, w), 11, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  if (w > 4) {
    x.fillStyle = '#ffffff';
    x.fillRect(-1, -7, 2, 14);
  }

  return c;
}

export const marioRunSprites = [
  makeMarioRunFrame(0),
  makeMarioRunFrame(1),
  makeMarioRunFrame(2)
];
export const marioJumpSprite = makeMarioJump();
export const marioDeadSprite = makeMarioDead();
export const goombaSprites = [makeGoomba(0), makeGoomba(1)];
export const questionBlockSprite = makeQuestionBlock();
export const coinSprites = [
  makeCoinFrame(0),
  makeCoinFrame(1),
  makeCoinFrame(2),
  makeCoinFrame(3)
];
