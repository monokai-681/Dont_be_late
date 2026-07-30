# Commuting Game

## 1. Pitch
This is a game that forces the player to balance sleep and being on time for work. The player works a brutal schedule that allows very little sleep time. The player has to survive the last ten workdays (two weeks) of the year without being late, to win a "punctuality bonus" of a mere 250 yuan.

## 2. Win / Lose Condition
- **Win:** Complete all 10 workdays without a recorded late arrival.
- **Lose:** Get a recorded late arrival with no bribe available, or if the player refuses to bribe.
- **The Bribe (one-time save)**
  - If the player is late, they are offered a choice: bribe the superior to fake the clock-in record, or refuse.
  - Refuse -> instant loss.
  - Bribe -> the lateness is erased; the game continues.
  - The bribe can be used only once per game. A second late arrival with no bribe left = loss.
  - The bribe has a price, deducted from the balance.

## 3. Core Loop
The game begins on Sunday evening (bedtime). Each day-cycle splits into two phases:

### Phase 1 — Bedtime
1. View the next day's events (including weather, possible factors on road traffic).
2. Sleep Items — buy items to reduce SOL, gaining more actual sleep. (Shop items below.)
3. Set the Alarm — the core balancing act. Earlier alarm = less sleep but a bigger commute buffer; later alarm = more sleep but a tighter margin to clock in on time.

### Phase 2 — Morning
1. Player is shown the “at the door” time: how long was `routine`, including the snooze and the preparation before setting out for work. Player needs to decide at this time how to commute within the time left before the clock-in time.
2. Player is notified the result of the commute: whether an event happened that delayed the arrival at the office, the exact time of clock-in, and whether the player is actually late.
3. Possible bribe screen.
4. Returns home; returns to bedtime scene at 0:00.

## 4. Core Mechanic: Sleep Debt (SD)
- **Sleep formula:** `$[TST = (\text{alarm time} - \text{bedtime}) - SOL]$`
- `sleepOnsetLatency`: time to fall asleep, reduced by sleep items.
- `totalSleepTime`: the actual sleep the player gets.
- `targetSleep`: the player needs 8 hours of `totalSleepTime` per night.
- `sleepDebt`: if TST is less than 8 hours, the player accrues Sleep Debt (SD) equal to the shortfall.
- **Morning `routine` time (deterministic + small RNG):** The more SD the player has, the longer their Morning Routine takes the next day. SD adds time on top of the fixed base, deterministically, plus a small random variance. This eats into the commute buffer. (See Section 5 for details.)
- Exact formula for how much SD maps to how many 10-minute snoozes is TBD.

## 5. Rules & Mechanics: Fixed Anchors
- `bedTime`: 00:00 (midnight), sharp. Bedtime decisions happen here.
- `clockIn`: 9:00. Arrive after this = late.

**Morning Routine (unified):**
- Base routine: **15 minutes** (fixed).
- SD penalty: `sleepDebt` adds time on top of the base, deterministically. Exact formula TBD.
- Small RNG: a modest random variance on top (± a few minutes) to reflect the unpredictability of a groggy morning.
- Reveal moment: the total routine time is shown to the player **at the door**, right before the commute choice. Example: "Your routine took 38 minutes today (you snoozed twice). You have 22 minutes to make it to work."
- Flavor like "you snoozed X times" is narrated for feel, but mechanically it is all rolled into the single routine number.
- The sleep window: midnight until the alarm. SOL eats into this, squeezing `totalSleepTime` below the 8-hour target.

**Time Budget**
- Midnight → 9:00 AM = 9
- Target TST = 8 hours.
- Remaining cushion = 60 minutes to absorb SOL + auto-snoozes + commute.
- (All numbers to be tuned through testing.)

## 6. Commute Options
Events, including weather, are revealed at bedtime, so the player plans with full information. Metro is a pure safe anchor and is never affected by events.

1. **Metro** — Money: cheap. Certainty: total (safe anchor). Special risk: none.
2. **Drive** — Money: free. Certainty: low. Special risk: traffic jam + accident (time penalty) when SD is high.
3. **Uber** — Money: mid. Certainty: low. Special risk: cancellation (+10 min) + traffic jam.
4. **Uber Black** — Money: expensive. Certainty: high. Special risk: traffic jam only (driver won't cancel).

*Note: "Uber Black" is a placeholder name, to be revisited later (likely mapping to Chinese 快车 / 专车).*

**Risk Details**
- Cancellation risk (Uber only): driver cancels -> +10 minutes to find a new driver.
- Traffic jam risk (Uber, Uber Black, Drive): can slow the ride, potentially slower than Metro.
- Traffic jam triggers (TBD, event-based): major event in the city, last day before a holiday, bad weather.
- Driving fatigue risk (SD-based): with enough SD, driving carries a chance of an accident -> time penalty (risks lateness).

## 7. Economy / Scoring
### A: Traditional
The player starts with `defaultBalance` and is given `dailyIncome` per day, including Saturday and Sunday. Therefore there will be 11 days of income to spend (except the last day because there is no more workday left in the game).

Very intuitive but not really realistic, as salary are generally not paid daily.

### B: Advanced Payment
The player is told he has to expend the `bonus` the player hasn’t earned yet. This can result in a negative balance at the end of the game, turning the game into a “high-score” mechanism.

## 8. Sleep Items (Shop)
**Delivery rule:** Everything except sleeping pills arrives the next day. Sleeping pills are available the same night (the only instant fix).

### SOL Reducers
- **Soft pillow** — reusable — reduce SOL.
- **Eye cover** — reusable — reduce SOL.
- **Ear plugs** — reusable — reduce SOL.
- **Zolpidem** — consumable — strong SOL reduction; tolerance by total uses (full on uses 1–3, half on uses 4–5, none from use 6).
- **DORA** — consumable — SOL reduction; no side effects, more expensive.

### Snooze-Penalty Reducers
- **Smart bedside lamp (sunrise light)** — reusable — gently wakes the player, reducing the auto-snooze penalty.

(All prices and exact effect values TBD, to be balanced so items compete for the player's limited money.)

## 9. Platform, Screens & Flow
- **Platform:** Web game, designed mobile-first (opens in a mobile browser), adapts to desktop screens.
- **Screens:**
  - **Introduction Screen** — tells the player the basic info they need to know (premise, goal, key rules). (Content TBD.)
  - **Bedtime Screen** — shows next day's events (including weather); shop; set the alarm.
  - **Sleep Screen** — plays out automatically; player has no control.
  - **Wake-up Screen** — shows the time, sleep result (TST), SD, and whether/how much the alarm auto-snoozed; then the commute choice.
  - **Office Screen** — shows late or not (-> bribe choice if late); then transitions back to Bedtime.
