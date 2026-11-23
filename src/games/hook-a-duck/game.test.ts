import { describe, expect, it } from 'vitest';
import {
  CASTS_PER_ROUND,
  CAST_TIME,
  CATCH_RADIUS,
  LOOP_PERIOD,
  castHook,
  createState,
  duckAt,
  duckPosition,
  step,
} from './game';

describe('hook a duck', () => {
  it('starts with a full set of casts, a stream of ducks and no score', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.length).toBeGreaterThan(CASTS_PER_ROUND);
    expect(state.ducks.every((d) => !d.caught && d.points > 0)).toBe(true);
  });

  it('floats every duck once round the loop and back to where it started', () => {
    const duck = createState().ducks[3];
    const start = duckPosition(duck, 0);
    const halfway = duckPosition(duck, LOOP_PERIOD / 2);
    const around = duckPosition(duck, LOOP_PERIOD);
    expect(Math.hypot(halfway.x - start.x, halfway.y - start.y)).toBeGreaterThan(100);
    expect(around.x).toBeCloseTo(start.x);
    expect(around.y).toBeCloseTo(start.y);
  });

  it('uses one cast each time the hook is lowered', () => {
    const state = createState();
    expect(castHook(state, 100, 100)).toBe(true);
    expect(state.casts).toBe(CASTS_PER_ROUND - 1);
    expect(state.cast).not.toBeNull();
  });

  it('lowers one hook at a time', () => {
    const state = createState();
    castHook(state, 100, 100);
    expect(castHook(state, 100, 100)).toBe(false);
    expect(state.casts).toBe(CASTS_PER_ROUND - 1);
  });

  it('cannot cast once the casts run out', () => {
    const state = createState();
    state.casts = 0;
    expect(castHook(state, 100, 100)).toBe(false);
    expect(state.cast).toBeNull();
  });

  it('catches the duck under the hook when it reaches the water and scores its number', () => {
    const state = createState();
    const duck = state.ducks[3];
    const where = duckPosition(duck, CAST_TIME);
    castHook(state, where.x, where.y);
    step(state, CAST_TIME);
    expect(duck.caught).toBe(true);
    expect(state.score).toBe(duck.points);
    expect(state.catches).toEqual([duck.points]);
    expect(state.lastCatch).toBe(duck.points);
    expect(state.cast).toBeNull();
  });

  it('misses a duck that has floated on by the time the hook lands', () => {
    const state = createState();
    const duck = state.ducks[3];
    const where = duckPosition(duck, 0);
    castHook(state, where.x, where.y);
    step(state, CAST_TIME);
    expect(duck.caught).toBe(false);
    expect(state.score).toBe(0);
    expect(state.lastCatch).toBe(0);
  });

  it('checks for a duck at the moment the hook lands, not at the end of the frame', () => {
    const state = createState();
    const duck = state.ducks[3];
    const where = duckPosition(duck, CAST_TIME);
    castHook(state, where.x + CATCH_RADIUS - 1, where.y);
    // 32 frames of 0.016s cross the landing time and end at 0.512s, when the
    // duck has floated out of reach.
    for (let i = 0; i < 32; i++) step(state, 0.016);
    expect(duck.caught).toBe(true);
    expect(state.score).toBe(duck.points);
    expect(state.time).toBeCloseTo(0.512);
  });

  it('scores nothing until the hook reaches the water', () => {
    const state = createState();
    const where = duckPosition(state.ducks[0], 0);
    castHook(state, where.x, where.y);
    step(state, CAST_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.cast).not.toBeNull();
  });

  it('cannot catch a duck twice', () => {
    const state = createState();
    const duck = state.ducks[0];
    duck.caught = true;
    const where = duckPosition(duck, 0);
    expect(duckAt(state, where.x, where.y)).toBeUndefined();
  });

  it('catches a duck within the catch radius and not beyond it', () => {
    const state = createState();
    const duck = state.ducks[0];
    const { x, y } = duckPosition(duck, 0);
    expect(duckAt(state, x, y + CATCH_RADIUS - 1)).toBe(duck);
    expect(duckAt(state, x, y + CATCH_RADIUS + 1)).toBeUndefined();
  });

  it('ends the round when the last cast reaches the water', () => {
    const state = createState();
    castHook(state, 0, 0);
    state.casts = 0;
    step(state, CAST_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, CAST_TIME / 2);
    expect(state.phase).toBe('over');
  });
});
