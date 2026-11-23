# Hook a Duck

Rubber ducks float round a stream in a loop. Lower the hook onto one as it passes
to catch it.

## How to play

- Move the mouse to hold the hook over the stream, and click to lower it. The hook
  takes half a second to reach the water, and the ducks keep floating while it
  drops, so aim a little ahead of the duck you want.
- A duck is caught when the hook reaches the water close to its middle. Caught
  ducks leave the stream and sit on the island.
- You have 6 casts. The round ends when the last cast reaches the water.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, which you see once you catch it. A caught duck
scores its number:

| Number | Ducks on the stream |
| ------ | ------------------- |
| 10     | 5                   |
| 20     | 3                   |
| 30     | 1                   |
| 50     | 1                   |

A cast that catches no duck scores nothing. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `castHook`, `step`, `duckPosition`,
  `duckAt`) and the `hookADuck` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
