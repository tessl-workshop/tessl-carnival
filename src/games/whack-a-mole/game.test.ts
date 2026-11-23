import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  POINTS_PER_MOLE,
  POP_INTERVAL,
  ROUND_TIME,
  ROWS,
  UP_TIME,
  WHACKED_TIME,
  createState,
  isEmpty,
  popIntervalAt,
  popMole,
  step,
  upTimeAt,
  whack,
} from './game';

describe('whack-a-mole', () => {
  it('starts with a full grid of empty holes and no score', () => {
    const state = createState();
    expect(state.holes).toHaveLength(ROWS * COLUMNS);
    expect(state.holes.every(isEmpty)).toBe(true);
    expect(state.score).toBe(0);
    expect(state.time).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('pops a mole up in an empty hole', () => {
    const state = createState();
    const hole = popMole(state, 0);
    expect(hole).toBe(state.holes[0]);
    expect(hole?.up).toBeCloseTo(UP_TIME.start);
  });

  it('never pops two moles in the same hole', () => {
    const state = createState();
    for (let i = 0; i < ROWS * COLUMNS; i++) popMole(state, 0);
    expect(state.holes.every((h) => h.up > 0)).toBe(true);
    expect(popMole(state, 0)).toBeNull();
  });

  it('scores a whack on a mole that is up', () => {
    const state = createState();
    const hole = popMole(state, 0)!;
    expect(whack(state, hole.x + 10, hole.y + 10)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(state.whacks).toBe(1);
    expect(hole.up).toBe(0);
  });

  it('scores nothing for a whack on an empty hole or a mole already whacked', () => {
    const state = createState();
    const hole = state.holes[4];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    popMole(state, 0);
    const up = state.holes[0];
    whack(state, up.x, up.y);
    expect(whack(state, up.x, up.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_MOLE);
  });

  it('drops a mole back down once its time is up', () => {
    const state = createState();
    const hole = popMole(state, 0)!;
    state.nextPop = 100;
    step(state, UP_TIME.start + 0.01);
    expect(hole.up).toBe(0);
    expect(whack(state, hole.x, hole.y)).toBe(false);
  });

  it('frees a whacked hole after a moment', () => {
    const state = createState();
    const hole = popMole(state, 0)!;
    whack(state, hole.x, hole.y);
    expect(isEmpty(hole)).toBe(false);
    state.nextPop = 100;
    step(state, WHACKED_TIME + 0.01);
    expect(isEmpty(hole)).toBe(true);
  });

  it('pops moles up as time passes', () => {
    const state = createState();
    step(state, POP_INTERVAL.start + 0.01, () => 0);
    expect(state.holes.filter((h) => h.up > 0)).toHaveLength(1);
  });

  it('pops moles faster, for less time, as the round goes on', () => {
    expect(popIntervalAt(0)).toBeCloseTo(POP_INTERVAL.start);
    expect(popIntervalAt(ROUND_TIME)).toBeCloseTo(POP_INTERVAL.end);
    expect(popIntervalAt(ROUND_TIME / 2)).toBeLessThan(popIntervalAt(0));
    expect(upTimeAt(ROUND_TIME)).toBeLessThan(upTimeAt(0));
  });

  it('ends the round when the time runs out, with every mole down', () => {
    const state = createState();
    for (let t = 0; t < ROUND_TIME - 0.1; t += 0.05) step(state, 0.05, () => 0.5);
    expect(state.phase).toBe('playing');
    step(state, 0.2);
    expect(state.phase).toBe('over');
    expect(state.time).toBe(ROUND_TIME);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('ignores whacks once the round is over', () => {
    const state = createState();
    const hole = popMole(state, 0)!;
    state.phase = 'over';
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
