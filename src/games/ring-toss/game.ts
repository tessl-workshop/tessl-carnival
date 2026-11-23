import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** Seconds for the power meter to swing from empty to full and back. */
export const POWER_PERIOD = 1.6;
export const MIN_REACH = 120;
export const MAX_REACH = 440;
/** How close to a bottle's neck a ring must land to ring it. */
export const NECK_RADIUS = 14;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;

/** Rows from the back of the booth to the front. Bottles further back score more. */
const ROWS = [
  { y: 130, points: 30 },
  { y: 190, points: 20 },
  { y: 250, points: 10 },
];
const BOTTLES_PER_ROW = 5;
const BOTTLE_SPACING = 120;

export interface Bottle {
  /** The top of the bottle's neck, where a ring has to land. */
  x: number;
  y: number;
  points: number;
  /** How many rings have landed on this bottle this round. */
  ringers: number;
}

export interface Flight {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Progress through the throw, from 0 to 1. */
  t: number;
}

export interface Landing {
  x: number;
  y: number;
  hit: boolean;
}

export interface RingTossState {
  bottles: Bottle[];
  flight: Flight | null;
  landings: Landing[];
  rings: number;
  score: number;
  /** Seconds since the round started; drives the power meter. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const firstX = WIDTH / 2 - (BOTTLE_SPACING * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: firstX + BOTTLE_SPACING * i,
      y: row.y,
      points: row.points,
      ringers: 0,
    })),
  );
  return {
    bottles,
    flight: null,
    landings: [],
    rings: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** The power meter, from 0 to 1, swinging up and down every POWER_PERIOD seconds. */
export function powerAt(time: number): number {
  const phase = (((time / POWER_PERIOD) % 1) + 1) % 1;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

/** How far a ring thrown at this power travels. */
export function reachFor(power: number): number {
  return MIN_REACH + power * (MAX_REACH - MIN_REACH);
}

export function isRinger(x: number, y: number, bottle: Bottle): boolean {
  return Math.hypot(x - bottle.x, y - bottle.y) <= NECK_RADIUS;
}

/**
 * Throws one ring towards the aim point, as far as the power meter says.
 * Returns false if nothing was thrown.
 */
export function throwRing(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.flight) return false;
  const dx = aimX - THROWER.x;
  const dy = Math.min(aimY - THROWER.y, -1);
  const length = Math.hypot(dx, dy);
  const reach = reachFor(powerAt(state.time));
  state.flight = {
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: THROWER.x + (dx / length) * reach,
    toY: THROWER.y + (dy / length) * reach,
    t: 0,
  };
  state.rings -= 1;
  return true;
}

/** Where a ring in flight is now, lifted into an arc above its path. */
export function ringPosition(flight: Flight): { x: number; y: number } {
  const lift = Math.sin(flight.t * Math.PI) * 60;
  return {
    x: flight.fromX + (flight.toX - flight.fromX) * flight.t,
    y: flight.fromY + (flight.toY - flight.fromY) * flight.t - lift,
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const flight = state.flight;
  if (flight) {
    flight.t += dt / FLIGHT_TIME;
    if (flight.t >= 1) {
      const bottle = state.bottles.find((b) => isRinger(flight.toX, flight.toY, b));
      if (bottle) {
        bottle.ringers += 1;
        state.score += bottle.points;
      }
      state.landings.push({ x: flight.toX, y: flight.toY, hit: Boolean(bottle) });
      state.flight = null;
    }
  }

  if (state.rings === 0 && !state.flight) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = theme.colors.stripeA;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The table the bottles stand on.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(60, 100, WIDTH - 120, 190);

  // Misses lie on the table; ringers are drawn on their bottles.
  for (const landing of state.landings) {
    if (!landing.hit) {
      ctx.globalAlpha = 0.5;
      drawRing(ctx, landing.x, landing.y);
      ctx.globalAlpha = 1;
    }
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12, bottle.y + 14, 24, 26);
    ctx.fillRect(bottle.x - 5, bottle.y, 10, 16);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(bottle.x - 6, bottle.y - 3, 12, 5);
    for (let i = 0; i < bottle.ringers; i++) drawRing(ctx, bottle.x, bottle.y + 8 + i * 3);
  }

  ctx.fillStyle = colors.muted;
  ctx.font = canvasFont('small');
  ctx.textAlign = 'left';
  for (const row of ROWS) ctx.fillText(`${row.points}`, 72, row.y + 30);

  // Aim line from the thrower's hand.
  const dx = aim.x - THROWER.x;
  const dy = Math.min(aim.y - THROWER.y, -1);
  const length = Math.hypot(dx, dy);
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(THROWER.x, THROWER.y);
  ctx.lineTo(THROWER.x + (dx / length) * 90, THROWER.y + (dy / length) * 90);
  ctx.stroke();
  ctx.setLineDash([]);

  if (state.flight) {
    const ring = ringPosition(state.flight);
    drawRing(ctx, ring.x, ring.y);
  } else if (state.phase === 'playing' && state.rings > 0) {
    drawRing(ctx, THROWER.x, THROWER.y);
  }

  // Power meter.
  const meter = { x: WIDTH - 46, y: HEIGHT - 200, width: 22, height: 150 };
  const power = powerAt(state.time);
  ctx.fillStyle = colors.surface;
  ctx.fillRect(meter.x, meter.y, meter.width, meter.height);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(meter.x, meter.y + meter.height * (1 - power), meter.width, meter.height * power);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 70, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Toss rings onto the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: 0 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        throwRing(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
