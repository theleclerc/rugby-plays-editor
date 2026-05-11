# Rugby union positional knowledge

Common-sense positioning reference for designing realistic plays. Vocabulary in this file is documented in [vocabulary.md](vocabulary.md); JSON shapes and canvas coordinates are in [schema.md](schema.md).

## Offside — where non-active players legally stand

- **Lineout** — non-participating players (backs from both teams) must be 10 m back from the line of touch.
- **Scrum** — backs must be 5 m behind the hindmost foot of their own scrum.
- **Ruck / maul** — each team's offside line is the hindmost foot of their last player in the ruck. Defenders must be behind that line until the ruck ends.
- **Open play** — a player is offside if in front of a teammate carrying the ball, or in front of the teammate who last played the ball.
- **Kicking** — anyone in front of the kicker at the moment of the kick is offside until put onside (by the kicker / another teammate running ahead of them).

## Standard back-line alignment (attacking)

| # | Position | Typical spot |
|---|---|---|
| 9 | Scrum-half (SH) | Base of ruck / scrum / lineout, on the ball side |
| 10 | Fly-half (FH) | 5–8 m back and 5–10 m wide of 9, first receiver |
| 12 | Inside centre | Outside 10, often a flatter / harder runner |
| 13 | Outside centre | Outside 12, faster, distributor or strike runner |
| 11 / 14 | Wings | Finishing positions, usually within a few metres of touch |
| 15 | Fullback | Deepest, behind the line, covering kicks and backfield |

Lateral spacing between adjacent backs is typically 5–10 m.

### Back-line shapes

- **Flat line** — all backs at similar depth. Fast ball, attacking the gain line, riskier on a miss-pass.
- **Escalier (stepped)** — each successive back deeper than the previous one. Gives time and outside angles for passes.
- **Mixed** — common in modern rugby: pod at one depth, outside backs in escalier behind it.

## Defensive shapes

- **Drift (glissée)** — line slides outward with the attack: outside defender takes the ball-carrier, inside ones cover next runners.
- **Blitz / rush (montée agressive / umbrella)** — line comes up fast and flat, compresses space. Vulnerable to miss-passes.
- **Jam (défendre en inversé)** — outside defender cuts hard infield to force play back inside.
- **13-defence (défense à 13)** — 13 players in the front line, 2 covering the backfield (usually 15 + one wing).
- **Pillar** — defender stationed next to the breakdown (often a forward).
- **Post** — second defender out from the breakdown.
- **Sweeper (couvreur arrière)** — back-field cover behind the front line.

## Pod systems for forwards

Forwards organise into "pods" (typically of 3) around the field:

- **1-3-3-1** — one forward at the ruck (pillar), pod of 3 mid-field, pod of 3 on the far side, one wider out.
- **2-4-2** — 2 close, 4 in midfield, 2 on the edge.

Within a pod, the **centre player** is usually the receiver / distributor; the other two are runners (crash options) on either shoulder.

## Set-piece specifics

### Lineout
- Players stand between the **5 m line and the 15 m line** from touch — the 10 m channel.
- Hooker throws from the touch line; throw goes straight down the line of touch.
- Both teams' lineout players stand at the line of touch with a 1 m gap between them.
- The receiver (often the 9 of the attacking side) stands 2 m off the back of the lineout, on their team's side.

### Scrum
- Formed at the mark; 8 forwards from each team bind together.
- SH (9) puts the ball in from the side where their team wins it (typically left of the scrum).
- 10 is positioned on the ball side; 12 and 13 in normal back-line shape.
- Opposing 9 marks the put-in side; defending forwards control the channel on their side.

### Kickoff / restart
- Kicker behind halfway.
- Chase line tries to win contestable ball at the **10 m line** (the ball must travel 10 m).
- Receiver typically stands around halfway / the 22 m line depending on the kick.

## Field landmarks players orient by

- **Try line** (0 m), **5 m line**, **22 m line**, **10 m line** (= 40 m from a try line), **halfway** (50 m).
- The **15 m line** marks the maximum width of the lineout channel.
- The **5 m channel** between touch and the 5 m line is where the lineout cannot reach.
- Touch lines define the field's lateral edges.

## Common positional misalignments (flag these in a render)

- Two players closer than the minimum spacing (≈25 px ≈ 2 m in our canvas) — visually overlapping.
- Forwards offside at the ruck (in front of the hindmost foot on their team's side).
- 9 not at base of ruck when ball is being ejected.
- 10 too flat (less than 5 m back from 9) — easy target for a hard-rushing defence.
- Wings too narrow — more than 10 m off touch when the play is going wide.
- 15 too far from cover position after a kick.
- Pod centre on the wrong shoulder (the carrier is supposed to be in the middle, not outside).

## Tactical-kick positioning

- **Box kick (chandelle de poche)** — 9 kicks from base of ruck. Chasers must be onside behind the kicker.
- **Grubber (rasant)** — kicker close to the gain line. Ball bounces just behind the defensive line.
- **Cross-field kick (coup de pied diagonal)** — kicker (usually 10 or 12) kicks diagonally to a wing in space.
- **Up-and-under (chandelle)** — high contestable kick. Chasers must time their arrival under the ball.
- **Touch finder (coup de pied en touche)** — long kick into touch, usually from defending half.
