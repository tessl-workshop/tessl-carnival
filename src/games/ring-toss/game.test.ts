import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  MAX_REACH,
  MIN_REACH,
  NECK_RADIUS,
  POWER_PERIOD,
  RINGS_PER_ROUND,
  THROWER,
  createState,
  isRinger,
  powerAt,
  step,
  throwRing,
  type Bottle,
  type Flight,
} from './game';

function flightTo(x: number, y: number): Flight {
  return { fromX: THROWER.x, fromY: THROWER.y, toX: x, toY: y, t: 0 };
}

describe('ring toss', () => {
  it('starts with a full set of rings and no score', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles.length).toBeGreaterThan(0);
  });

  it('stands bottles further back worth more', () => {
    const { bottles } = createState();
    const back = bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(throwRing(state, 400, 0)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.flight).not.toBeNull();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    throwRing(state, 400, 0);
    expect(throwRing(state, 400, 0)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(throwRing(state, 400, 0)).toBe(false);
    expect(state.flight).toBeNull();
  });

  it('throws as far as the power meter says, towards the aim', () => {
    const empty = createState();
    throwRing(empty, THROWER.x, 0);
    expect(empty.flight!.toX).toBeCloseTo(THROWER.x);
    expect(empty.flight!.toY).toBeCloseTo(THROWER.y - MIN_REACH);

    const full = createState();
    full.time = POWER_PERIOD / 2;
    throwRing(full, THROWER.x, 0);
    expect(full.flight!.toY).toBeCloseTo(THROWER.y - MAX_REACH);
  });

  it('never throws backwards, even when aimed below the thrower', () => {
    const state = createState();
    throwRing(state, THROWER.x + 100, THROWER.y + 100);
    expect(state.flight!.toY).toBeLessThan(THROWER.y);
  });

  it('swings the power meter between empty and full', () => {
    expect(powerAt(0)).toBe(0);
    expect(powerAt(POWER_PERIOD / 4)).toBeCloseTo(0.5);
    expect(powerAt(POWER_PERIOD / 2)).toBeCloseTo(1);
    expect(powerAt(POWER_PERIOD)).toBeCloseTo(0);
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    state.flight = flightTo(bottle.x + 5, bottle.y - 5);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringers).toBe(1);
    expect(state.flight).toBeNull();
    expect(state.landings).toEqual([{ x: bottle.x + 5, y: bottle.y - 5, hit: true }]);
  });

  it('scores nothing for a ring that misses every bottle', () => {
    const state = createState();
    state.flight = flightTo(10, 10);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.landings[0].hit).toBe(false);
  });

  it('scores nothing until the ring lands', () => {
    const state = createState();
    const bottle = state.bottles[0];
    state.flight = flightTo(bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.flight).not.toBeNull();
  });

  it('ends the round when the last ring has landed', () => {
    const state = createState();
    state.rings = 0;
    state.flight = flightTo(10, 10);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('over');
  });

  it('detects a ringer on the neck and a miss beside it', () => {
    const bottle: Bottle = { x: 400, y: 200, points: 10, ringers: 0 };
    expect(isRinger(400 + NECK_RADIUS - 1, 200, bottle)).toBe(true);
    expect(isRinger(400 + NECK_RADIUS + 1, 200, bottle)).toBe(false);
  });
});
