import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

/** Seconds in a round. */
export const ROUND_TIME = 30;
export const POINTS_PER_MOLE = 10;
export const COLUMNS = 3;
export const ROWS = 3;
/** How close to a hole's centre a click must land to whack its mole. */
export const HOLE_RADIUS = 48;
/** Seconds between moles popping up, at the start and at the end of a round. */
export const POP_INTERVAL = { start: 0.9, end: 0.35 } as const;
/** Seconds a mole stays up, at the start and at the end of a round. */
export const UP_TIME = { start: 1.2, end: 0.6 } as const;
/** Seconds a whacked mole shows stars before its hole is free again. */
export const WHACKED_TIME = 0.3;

const HOLE_SPACING_X = 200;
const HOLE_SPACING_Y = 120;
const FIRST_HOLE_Y = 130;

export interface Hole {
  x: number;
  y: number;
  /** Seconds the mole in this hole has left up; 0 when the hole is empty. */
  up: number;
  /** Seconds left showing a whacked mole; 0 when it wasn't whacked. */
  whacked: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  score: number;
  whacks: number;
  /** Seconds since the round started. */
  time: number;
  /** Seconds until the next mole pops up. */
  nextPop: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const firstX = WIDTH / 2 - (HOLE_SPACING_X * (COLUMNS - 1)) / 2;
  const holes = Array.from({ length: ROWS * COLUMNS }, (_, i) => ({
    x: firstX + HOLE_SPACING_X * (i % COLUMNS),
    y: FIRST_HOLE_Y + HOLE_SPACING_Y * Math.floor(i / COLUMNS),
    up: 0,
    whacked: 0,
  }));
  return { holes, score: 0, whacks: 0, time: 0, nextPop: POP_INTERVAL.start, phase: 'playing' };
}

/** How far through the round `time` is, from 0 to 1. */
function progress(time: number): number {
  return Math.min(Math.max(time / ROUND_TIME, 0), 1);
}

/** Seconds between pops at this point in the round. Moles come faster as it goes on. */
export function popIntervalAt(time: number): number {
  return POP_INTERVAL.start + (POP_INTERVAL.end - POP_INTERVAL.start) * progress(time);
}

/** Seconds a mole that pops up now stays up. */
export function upTimeAt(time: number): number {
  return UP_TIME.start + (UP_TIME.end - UP_TIME.start) * progress(time);
}

export function isEmpty(hole: Hole): boolean {
  return hole.up === 0 && hole.whacked === 0;
}

/**
 * Pops a mole up in one of the empty holes, picked with `random` (0 to 1).
 * Returns the hole, or null if every hole is busy.
 */
export function popMole(state: WhackAMoleState, random: number): Hole | null {
  const empty = state.holes.filter(isEmpty);
  if (empty.length === 0) return null;
  const hole = empty[Math.min(Math.floor(random * empty.length), empty.length - 1)];
  hole.up = upTimeAt(state.time);
  return hole;
}

/** Whacks the mole under the point, if one is up there. Returns true on a hit. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => h.up > 0 && Math.hypot(x - h.x, y - h.y) <= HOLE_RADIUS);
  if (!hole) return false;
  hole.up = 0;
  hole.whacked = WHACKED_TIME;
  state.score += POINTS_PER_MOLE;
  state.whacks += 1;
  return true;
}

/** Advances the game by `dt` seconds. `random` picks the hole for any mole that pops up. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  if (state.phase !== 'playing') return;
  state.time += dt;

  for (const hole of state.holes) {
    hole.up = Math.max(hole.up - dt, 0);
    hole.whacked = Math.max(hole.whacked - dt, 0);
  }

  if (state.time >= ROUND_TIME) {
    state.time = ROUND_TIME;
    for (const hole of state.holes) hole.up = 0;
    state.phase = 'over';
    return;
  }

  state.nextPop -= dt;
  while (state.nextPop <= 0) {
    popMole(state, random());
    state.nextPop += popIntervalAt(state.time);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The board the holes are cut into.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(80, 60, WIDTH - 160, HEIGHT - 120);

  for (const hole of state.holes) {
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 20, HOLE_RADIUS, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0 || hole.whacked > 0) {
      // The mole's head, rising out of the hole.
      ctx.fillStyle = colors.muted;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 30, Math.PI, 0);
      ctx.lineTo(hole.x + 30, hole.y + 20);
      ctx.lineTo(hole.x - 30, hole.y + 20);
      ctx.fill();
      ctx.fillStyle = colors.background;
      if (hole.whacked > 0) {
        ctx.font = canvasFont('body', 'bold');
        ctx.textAlign = 'center';
        ctx.fillText('x x', hole.x, hole.y);
        ctx.fillStyle = colors.accent;
        ctx.fillText('*', hole.x - 26, hole.y - 30);
        ctx.fillText('*', hole.x + 26, hole.y - 30);
      } else {
        ctx.fillRect(hole.x - 12, hole.y - 10, 6, 6);
        ctx.fillRect(hole.x + 6, hole.y - 10, 6, 6);
        ctx.fillStyle = colors.stripeA;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y + 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(ROUND_TIME - state.time)}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description:
    'Whack the moles before they drop back down. They come faster as the clock runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
