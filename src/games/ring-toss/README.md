# Ring Toss

Toss rings onto the necks of the bottles at the back of the booth before you run out.

## How to play

- Move the mouse to aim, and click to throw a ring. One ring is in the air at a time.
- The power meter on the right swings up and down. The fuller it is when you click,
  the further the ring flies.
- You have 8 rings. The round ends when the last ring has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands on a bottle's neck. Bottles further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

A ring that misses every neck scores nothing. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwRing`, `step`, `powerAt`, `isRinger`)
  and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
