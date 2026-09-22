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
  x.translate(24, 26);

  // Red Cap (Front-facing with M emblem)
  x.fillStyle = '#e52521';
  x.strokeStyle = INK;
  x.lineWidth = 2;

  // Cap Dome
  x.beginPath();
  x.ellipse(0, -14, 13, 8, 0, Math.PI, Math.PI * 2);
  x.lineTo(13, -10);
  x.quadraticCurveTo(0, -8, -13, -10);
  x.closePath();
  x.fill();
  x.stroke();

  // Cap Visor
  x.beginPath();
  x.ellipse(0, -10, 11, 3.5, 0, 0, Math.PI * 2);
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

  // Peach Face
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.arc(0, -4, 9, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Big Peach Nose in Center
  x.beginPath();
  x.ellipse(0, -4, 4.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Classic Brown Mustache
  x.fillStyle = '#4a2505';
  x.beginPath();
  x.ellipse(0, -1, 7, 2.8, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Shocked Open Eyes
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.ellipse(-4, -7, 2.5, 3.5, 0, 0, Math.PI * 2);
  x.ellipse(4, -7, 2.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = '#0055d4';
  x.beginPath();
  x.arc(-4, -7, 1.3, 0, Math.PI * 2);
  x.arc(4, -7, 1.3, 0, Math.PI * 2);
  x.fill();

  // Hair Sideburns
  x.fillStyle = '#4a2505';
  x.beginPath();
  x.arc(-8, -5, 3, 0, Math.PI * 2);
  x.arc(8, -5, 3, 0, Math.PI * 2);
  x.fill();

  // Red Shirt Sleeves
  x.fillStyle = '#e52521';
  x.strokeStyle = INK;
  x.lineWidth = 1.8;
  x.beginPath();
  x.roundRect(-14, 4, 7, 5, 2);
  x.roundRect(7, 4, 7, 5, 2);
  x.fill();
  x.stroke();

  // Outstretched White Gloves
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(-13, 7, 3.8, 0, Math.PI * 2);
  x.arc(13, 7, 3.8, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Blue Overalls Body
  x.fillStyle = '#0055d4';
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.beginPath();
  x.roundRect(-7, 3, 14, 11, 3);
  x.fill();
  x.stroke();

  // Yellow Buttons
  x.fillStyle = '#ffd700';
  x.beginPath();
  x.arc(-3, 6, 1.5, 0, Math.PI * 2);
  x.arc(3, 6, 1.5, 0, Math.PI * 2);
  x.fill();

  // Blue Legs
  x.fillStyle = '#0055d4';
  x.beginPath();
  x.roundRect(-7, 13, 5, 4, 1);
  x.roundRect(2, 13, 5, 4, 1);
  x.fill();
  x.stroke();

  // Brown Boots
  x.fillStyle = '#6b3e15';
  x.beginPath();
  x.ellipse(-5, 16, 4.5, 3, 0, 0, Math.PI * 2);
  x.ellipse(5, 16, 4.5, 3, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  return c;
}

export function makeMarioFall(): HTMLCanvasElement {
  const [c, x] = mk(48, 48);
  x.translate(24, 28);

  // Red Cap
  x.fillStyle = '#e52521';
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.beginPath();
  x.ellipse(0, -13, 12, 7, 0.08, Math.PI, Math.PI * 2);
  x.lineTo(13, -10);
  x.quadraticCurveTo(0, -8, -13, -10);
  x.closePath();
  x.fill();
  x.stroke();

  // Cap Visor
  x.beginPath();
  x.ellipse(7, -10, 7, 3, 0.1, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Face
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.arc(0, -4, 9, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Eye
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.ellipse(3, -6, 2.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = '#0055d4';
  x.beginPath();
  x.arc(4.2, -6, 1.4, 0, Math.PI * 2);
  x.fill();

  // Nose & Mustache
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.ellipse(7, -4, 4.5, 3.5, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  x.fillStyle = '#4a2505';
  x.beginPath();
  x.ellipse(4, -1, 6.5, 3, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Body
  x.fillStyle = '#0055d4';
  x.beginPath();
  x.roundRect(-7, 3, 14, 10, 3);
  x.fill();
  x.stroke();

  // Arms out for landing
  x.fillStyle = '#ffffff';
  x.strokeStyle = INK;
  x.lineWidth = 1.8;
  x.beginPath();
  x.arc(-9, 8, 3.5, 0, Math.PI * 2);
  x.arc(9, 8, 3.5, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Legs slightly spread forward/back for landing
  x.fillStyle = '#6b3e15';
  x.lineWidth = 2;
  x.beginPath();
  x.ellipse(-5, 14, 4.5, 3.5, 0, 0, Math.PI * 2);
  x.ellipse(5, 14, 4.5, 3.5, 0, 0, Math.PI * 2);
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

export function makeSuperMushroom(): HTMLCanvasElement {
  const [c, x] = mk(32, 32);
  x.translate(16, 16);
  x.lineJoin = 'round';
  x.lineCap = 'round';

  // Red Cap
  x.fillStyle = '#e52521';
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(0, -2, 13, Math.PI, Math.PI * 2);
  x.closePath();
  x.fill();
  x.stroke();

  // White Spots
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(0, -9, 4.5, 0, Math.PI * 2);
  x.arc(-9, -4, 3, 0, Math.PI * 2);
  x.arc(9, -4, 3, 0, Math.PI * 2);
  x.fill();

  // Stem (Peach)
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.roundRect(-7, -2, 14, 11, 3);
  x.fill();
  x.stroke();

  // Eyes
  x.fillStyle = INK;
  x.fillRect(-4, 1, 2, 4);
  x.fillRect(2, 1, 2, 4);

  return c;
}

export function makeBrickBlock(): HTMLCanvasElement {
  const [c, x] = mk(36, 36);
  x.translate(18, 18);

  x.fillStyle = '#b85c18';
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.fillRect(-14, -14, 28, 28);
  x.strokeRect(-14, -14, 28, 28);

  // Brick lines
  x.fillStyle = '#d8782a';
  x.fillRect(-12, -12, 11, 10);
  x.fillRect(1, -12, 11, 10);
  x.fillRect(-12, 2, 24, 10);

  x.strokeStyle = '#6b3e15';
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(-14, 0); x.lineTo(14, 0);
  x.moveTo(0, -14); x.lineTo(0, 0);
  x.stroke();

  return c;
}

export function makeKoopa(frame: number): HTMLCanvasElement {
  const [c, x] = mk(36, 36);
  x.translate(18, 20);

  // Green Shell Body
  x.fillStyle = '#00a800';
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.beginPath();
  x.ellipse(0, 2, 11, 12, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Yellow Belly Rim
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.ellipse(-2, 2, 6, 8, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Head
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.arc(6, -8, 6, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Eye
  x.fillStyle = INK;
  x.beginPath();
  x.arc(8, -9, 1.5, 0, Math.PI * 2);
  x.fill();

  // Feet
  x.fillStyle = '#f8931f';
  const f = frame === 0 ? 2 : -2;
  x.beginPath();
  x.ellipse(-7, 12 + f, 4, 3, 0, 0, Math.PI * 2);
  x.ellipse(7, 12 - f, 4, 3, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  return c;
}

export function makeKoopaShell(): HTMLCanvasElement {
  const [c, x] = mk(32, 32);
  x.translate(16, 16);

  x.fillStyle = '#00a800';
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(0, 0, 11, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(0, 0, 5, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  return c;
}

export function makeEmptyBlock(): HTMLCanvasElement {
  const [c, x] = mk(36, 36);
  x.translate(18, 18);

  // Brown Empty Used Block Body
  x.fillStyle = '#8b5a2b';
  x.strokeStyle = INK;
  x.lineWidth = 2.5;
  x.beginPath();
  x.roundRect(-14, -14, 28, 28, 4);
  x.fill();
  x.stroke();

  // Inner Shaded Surface
  x.fillStyle = '#6e451e';
  x.fillRect(-12, -12, 24, 24);

  // Corner Rivets
  x.fillStyle = '#3a200a';
  for (const [rx, ry] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
    x.fillRect(rx - 1.5, ry - 1.5, 3, 3);
  }

  return c;
}

export function makePiranhaPlant(frame: number): HTMLCanvasElement {
  const [c, x] = mk(36, 46);
  x.translate(18, 24);

  // Stem (Green)
  x.fillStyle = '#00a800';
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.fillRect(-4, 0, 8, 20);
  x.strokeRect(-4, 0, 8, 20);

  // Leaves
  x.beginPath();
  x.ellipse(-10, 12, 7, 3.5, -0.4, 0, Math.PI * 2);
  x.ellipse(10, 12, 7, 3.5, 0.4, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Head (Red bulbous jaws with white polka dots)
  x.fillStyle = '#e52521';
  x.lineWidth = 2;

  if (frame === 0) {
    // Open Mouth
    // Top jaw
    x.beginPath();
    x.ellipse(0, -10, 13, 10, -0.2, Math.PI * 0.9, Math.PI * 2.1);
    x.fill();
    x.stroke();

    // Bottom jaw
    x.beginPath();
    x.ellipse(0, 0, 12, 8, 0.2, 0, Math.PI * 1.1);
    x.fill();
    x.stroke();

    // Black Mouth Interior
    x.fillStyle = '#111111';
    x.beginPath();
    x.ellipse(2, -4, 9, 6, 0, 0, Math.PI * 2);
    x.fill();

    // White Sharp Teeth
    x.fillStyle = '#ffffff';
    // Upper teeth
    for (let i = -6; i <= 6; i += 4) {
      x.beginPath();
      x.moveTo(i - 2, -9);
      x.lineTo(i + 2, -9);
      x.lineTo(i, -5);
      x.closePath();
      x.fill();
    }
    // Lower teeth
    for (let i = -4; i <= 4; i += 4) {
      x.beginPath();
      x.moveTo(i - 2, 1);
      x.lineTo(i + 2, 1);
      x.lineTo(i, -3);
      x.closePath();
      x.fill();
    }
  } else {
    // Closed / Champing Mouth
    x.beginPath();
    x.ellipse(0, -6, 13, 13, 0, 0, Math.PI * 2);
    x.fill();
    x.stroke();

    // White Lips Rim
    x.strokeStyle = '#ffffff';
    x.lineWidth = 3;
    x.beginPath();
    x.ellipse(0, -5, 11, 4, 0, 0, Math.PI * 2);
    x.stroke();
  }

  // White Polka Dots on Head
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(-6, -12, 2.5, 0, Math.PI * 2);
  x.arc(6, -14, 2, 0, Math.PI * 2);
  x.arc(-7, -4, 2, 0, Math.PI * 2);
  x.arc(7, -2, 2.5, 0, Math.PI * 2);
  x.fill();

  return c;
}

export function makeSuperStar(frame: number): HTMLCanvasElement {
  const [c, x] = mk(36, 36);
  x.translate(18, 18);

  const colors = ['#ffd700', '#ffe600', '#fff066', '#ffc400'];
  const color = colors[frame % colors.length];

  // Draw 5-pointed star
  x.fillStyle = color;
  x.strokeStyle = INK;
  x.lineWidth = 2.2;
  x.lineJoin = 'round';

  x.beginPath();
  const spikes = 5;
  const outerRadius = 14;
  const innerRadius = 6.5;
  let rot = (Math.PI / 2) * 3;
  let step = Math.PI / spikes;

  x.moveTo(0, -outerRadius);
  for (let i = 0; i < spikes; i++) {
    let px = Math.cos(rot) * outerRadius;
    let py = Math.sin(rot) * outerRadius;
    x.lineTo(px, py);
    rot += step;

    px = Math.cos(rot) * innerRadius;
    py = Math.sin(rot) * innerRadius;
    x.lineTo(px, py);
    rot += step;
  }
  x.lineTo(0, -outerRadius);
  x.closePath();
  x.fill();
  x.stroke();

  // Star Eyes (Two classic vertical ovals)
  x.fillStyle = INK;
  x.beginPath();
  x.ellipse(-3.5, -1, 1.6, 4, 0, 0, Math.PI * 2);
  x.ellipse(3.5, -1, 1.6, 4, 0, 0, Math.PI * 2);
  x.fill();

  // Eye White Highlights
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(-3.5, -3, 0.9, 0, Math.PI * 2);
  x.arc(3.5, -3, 0.9, 0, Math.PI * 2);
  x.fill();

  return c;
}

export const marioRunSprites = [
  makeMarioRunFrame(0),
  makeMarioRunFrame(1),
  makeMarioRunFrame(2)
];
export const marioJumpSprite = makeMarioJump();
export const marioFallSprite = makeMarioFall();
export const marioDeadSprite = makeMarioDead();
export const goombaSprites = [makeGoomba(0), makeGoomba(1)];
export const koopaSprites = [makeKoopa(0), makeKoopa(1)];
export const koopaShellSprite = makeKoopaShell();
export const piranhaSprites = [makePiranhaPlant(0), makePiranhaPlant(1)];
export const starSprites = [
  makeSuperStar(0),
  makeSuperStar(1),
  makeSuperStar(2),
  makeSuperStar(3)
];
export const questionBlockSprite = makeQuestionBlock();
export const emptyBlockSprite = makeEmptyBlock();
export const brickBlockSprite = makeBrickBlock();
export const mushroomSprite = makeSuperMushroom();
export const coinSprites = [
  makeCoinFrame(0),
  makeCoinFrame(1),
  makeCoinFrame(2),
  makeCoinFrame(3)
];
