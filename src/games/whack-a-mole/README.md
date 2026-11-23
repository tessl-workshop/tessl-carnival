# Whack-a-Mole

Moles pop up from a grid of holes and drop back down again. Whack as many as you can
before the clock runs out.

## How to play

- Click a mole while it's up to whack it. A whacked mole sees stars, then ducks back
  down.
- A mole you miss drops back into its hole on its own after a moment.
- The round lasts 30 seconds. Moles pop up faster, and stay up for less time, as the
  round goes on: at the start a new mole pops up every 0.9 seconds and stays up for
  1.2 seconds; by the end it's every 0.35 seconds for 0.6 seconds.
- Click again on the game over screen to play another round.

## Scoring

Every mole you whack scores 10 points. Clicking an empty hole costs nothing. Your final
score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `popMole`, `whack`, `step`, `popIntervalAt`,
  `upTimeAt`) and the `whackAMole` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
