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
 * Procedural Super Mario Sprite with animated Flying Cape / Wings
 */
export function makeMarioSprite(wingUp: boolean, isCrash: boolean = false): HTMLCanvasElement {
  const [c, x] = mk(64, 64);
  x.translate(28, 32);
  x.lineJoin = 'round';
  x.lineCap = 'round';

  // Super Mario Yellow Flying Cape (behind body)
  x.save();
  x.fillStyle = '#ffcc00';
  x.strokeStyle = '#b8860b';
  x.lineWidth = 2.5;

  x.beginPath();
  if (wingUp) {
    // Cape arched upwards during flap
    x.moveTo(-6, -2);
    x.quadraticCurveTo(-22, -26, -14, -30);
    x.quadraticCurveTo(-2, -18, 2, -4);
  } else {
    // Cape trailing smoothly during glide
    x.moveTo(-8, 2);
    x.quadraticCurveTo(-26, 12, -20, 22);
    x.quadraticCurveTo(-6, 16, 2, 8);
  }
  x.closePath();
  x.fill();
  x.stroke();
  x.restore();

  // Brown boots
  x.fillStyle = '#6b3e15';
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.beginPath();
  x.ellipse(-6, 18, 6, 4, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.beginPath();
  x.ellipse(4, 18, 6, 4, 0, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Blue Overalls & Red Shirt Body
  x.fillStyle = '#0055d4'; // Mario blue
  x.strokeStyle = INK;
  x.lineWidth = 2.5;
  x.beginPath();
  x.roundRect(-10, 4, 20, 15, 6);
  x.fill();
  x.stroke();

  // Red Shirt Sleeves
  x.fillStyle = '#e52521'; // Mario red
  x.beginPath();
  x.arc(-11, 8, 5, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Yellow overall buttons
  x.fillStyle = '#ffd700';
  x.beginPath();
  x.arc(-4, 9, 2, 0, Math.PI * 2);
  x.arc(4, 9, 2, 0, Math.PI * 2);
  x.fill();

  // Mario Head & Face
  // Peach skin
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.arc(0, -3, 11, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Big Mario Nose
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.ellipse(8, -2, 5.5, 4.5, 0.1, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Mustache
  x.fillStyle = '#4a2505';
  x.beginPath();
  x.ellipse(5, 2, 8, 4, -0.1, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Ear
  x.fillStyle = '#fcd0a1';
  x.beginPath();
  x.arc(-7, -2, 3.5, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Sideburn / hair
  x.fillStyle = '#4a2505';
  x.beginPath();
  x.arc(-6, -6, 4, 0, Math.PI * 2);
  x.fill();

  // Eye
  if (isCrash) {
    // Cross / dizzy eye on crash
    x.strokeStyle = INK;
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(2, -7);
    x.lineTo(8, -3);
    x.moveTo(8, -7);
    x.lineTo(2, -3);
    x.stroke();
  } else {
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.ellipse(4, -5, 3.2, 4.2, 0, 0, Math.PI * 2);
    x.fill();
    x.stroke();

    // Pupil
    x.fillStyle = '#0055d4';
    x.beginPath();
    x.arc(5.2, -5, 1.8, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(5.8, -6, 0.7, 0, Math.PI * 2);
    x.fill();
  }

  // Mario Classic Red Cap
  x.fillStyle = '#e52521';
  x.strokeStyle = INK;
  x.lineWidth = 2.5;
  // Cap dome
  x.beginPath();
  x.ellipse(0, -11, 13, 8, 0, Math.PI, Math.PI * 2);
  x.lineTo(14, -7);
  x.quadraticCurveTo(0, -6, -14, -7);
  x.closePath();
  x.fill();
  x.stroke();

  // Cap Visor / Brim
  x.beginPath();
  x.ellipse(7, -8, 8.5, 3, 0.15, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // White "M" emblem circle
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(0, -11, 4.5, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  // Red "M" letter
  x.fillStyle = '#e52521';
  x.font = 'bold 6px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('M', 0, -11);

  // White Glove Hand
  x.fillStyle = '#ffffff';
  x.strokeStyle = INK;
  x.beginPath();
  x.arc(8, 12, 4.2, 0, Math.PI * 2);
  x.fill();
  x.stroke();

  return c;
}

export const marioSprites = [
  makeMarioSprite(false, false), // gliding
  makeMarioSprite(true, false),  // flapping cape
  makeMarioSprite(false, true)   // crashed
];
