import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS_PER_ROUND = 6;
/** Seconds for the hook to drop from the rod down to the water. */
export const CAST_TIME = 0.5;
/** Seconds for a duck to float once round the stream. */
export const LOOP_PERIOD = 14;
/** How close to a duck's middle the hook must land to catch it. */
export const CATCH_RADIUS = 22;
/** How high above the water the hook hangs before a cast. */
export const HOOK_LIFT = 70;
/** The stream is a loop round an oval island; ducks float along its middle. */
export const STREAM = { x: WIDTH / 2, y: 255, radiusX: 300, radiusY: 140, width: 70 } as const;

/** The number on the base of each duck, in order round the stream. */
const DUCK_POINTS = [10, 20, 10, 50, 10, 20, 10, 30, 10, 20];

export interface Duck {
  /** Where the duck sits round the loop at time 0, from 0 to 1. */
  offset: number;
  points: number;
  caught: boolean;
}

export interface Cast {
  x: number;
  y: number;
  /** Progress of the hook down to the water, from 0 to 1. */
  t: number;
}

export interface HookADuckState {
  ducks: Duck[];
  cast: Cast | null;
  /** The points of every duck caught this round, in the order they were caught. */
  catches: number[];
  /** What the last cast did: the duck's points, 0 for a miss, or null before the first. */
  lastCatch: number | null;
  casts: number;
  score: number;
  /** Seconds since the round started; moves the ducks round the stream. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  return {
    ducks: DUCK_POINTS.map((points, i) => ({
      offset: i / DUCK_POINTS.length,
      points,
      caught: false,
    })),
    cast: null,
    catches: [],
    lastCatch: null,
    casts: CASTS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** Where a duck is on the stream at this time. Ducks float round anticlockwise. */
export function duckPosition(duck: Duck, time: number): { x: number; y: number } {
  const angle = -2 * Math.PI * (duck.offset + time / LOOP_PERIOD);
  return {
    x: STREAM.x + STREAM.radiusX * Math.cos(angle),
    y: STREAM.y + STREAM.radiusY * Math.sin(angle),
  };
}

/**
 * The duck still on the stream nearest the point at this time, if one is
 * within CATCH_RADIUS.
 */
export function duckAt(
  state: HookADuckState,
  x: number,
  y: number,
  time = state.time,
): Duck | undefined {
  let nearest: Duck | undefined;
  let nearestDistance = CATCH_RADIUS;
  for (const duck of state.ducks) {
    if (duck.caught) continue;
    const position = duckPosition(duck, time);
    const distance = Math.hypot(x - position.x, y - position.y);
    if (distance <= nearestDistance) {
      nearest = duck;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * Lowers the hook towards the water at this point. Returns false if no cast
 * was made.
 */
export function castHook(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.cast) return false;
  state.cast = { x, y, t: 0 };
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  const start = state.time;
  state.time += dt;

  const cast = state.cast;
  if (cast) {
    // The hook can land partway through the frame; look for a duck there.
    const landing = start + (1 - cast.t) * CAST_TIME;
    cast.t += dt / CAST_TIME;
    if (cast.t >= 1) {
      const duck = duckAt(state, cast.x, cast.y, landing);
      if (duck) {
        duck.caught = true;
        state.catches.push(duck.points);
        state.score += duck.points;
      }
      state.lastCatch = duck ? duck.points : 0;
      state.cast = null;
    }
  }

  if (state.casts === 0 && !state.cast) state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, 18, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10, y - 13, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + 18, y - 15);
  ctx.lineTo(x + 26, y - 12);
  ctx.lineTo(x + 18, y - 9);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + 12, y - 15, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHook(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { colors } = theme;
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 40);
  ctx.lineTo(x, y - 8);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y);
  ctx.arc(x - 6, y, 6, 0, Math.PI);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // The stream: a ring of water round a wooden island.
  ctx.fillStyle = colors.water;
  ctx.beginPath();
  ctx.ellipse(
    STREAM.x,
    STREAM.y,
    STREAM.radiusX + STREAM.width / 2,
    STREAM.radiusY + STREAM.width / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(
    STREAM.x,
    STREAM.y,
    STREAM.radiusX - STREAM.width / 2,
    STREAM.radiusY - STREAM.width / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  for (const duck of state.ducks) {
    if (duck.caught) continue;
    const { x, y } = duckPosition(duck, state.time);
    drawDuck(ctx, x, y);
  }

  // The ducks caught so far sit on the island, numbers up.
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  state.catches.forEach((points, i) => {
    const x = STREAM.x - ((state.catches.length - 1) * 56) / 2 + i * 56;
    drawDuck(ctx, x - 6, STREAM.y + 8);
    ctx.fillStyle = colors.text;
    ctx.fillText(`${points}`, x - 6, STREAM.y + 40);
  });

  if (state.lastCatch !== null && state.phase === 'playing') {
    ctx.fillStyle = state.lastCatch > 0 ? colors.accent : colors.muted;
    ctx.font = canvasFont('body', 'bold');
    ctx.fillText(
      state.lastCatch > 0 ? `Caught a ${state.lastCatch}!` : 'Missed!',
      STREAM.x,
      STREAM.y - 30,
    );
  }

  // Booth awning, with the rod's line hanging from it.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  if (state.cast) {
    drawHook(ctx, state.cast.x, state.cast.y - HOOK_LIFT * (1 - state.cast.t));
  } else if (state.phase === 'playing') {
    drawHook(ctx, aim.x, Math.max(aim.y - HOOK_LIFT, 50));
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Lower the hook onto a passing duck. The number on its base is your score.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y + STREAM.radiusY };

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
        castHook(state, aim.x, aim.y);
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
        recordScore(hookADuck.id, state.score);
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

export default hookADuck;
