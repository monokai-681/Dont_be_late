# Commuting Game

## 1. Pitch
This is a time-management game about surviving a brutal work schedule with too little sleep. The player must make it through the final 10 workdays of the year without being late in order to earn a small "punctuality bonus" of 250 yuan.

## 2. Win / Lose Conditions
- Win: complete all 10 workdays without a recorded late arrival.
- Lose: receive a recorded late arrival with no bribe available, or refuse the bribe when late.

### The Bribe
- If the player is late, they can bribe their superior to erase the lateness.
- Refuse the bribe: instant loss.
- Pay the bribe: the game continues as if the lateness never happened.
- The bribe can be used only once per run.
- A second late arrival after the bribe has been used ends the game.
- The bribe has a cost that is deducted from the player’s balance.

## 3. Core Loop
The game begins on Sunday evening at bedtime. Each day is split into two phases.

### Phase 1: Bedtime
1. View the next day’s forecast, including weather and any events that may affect traffic.
2. Buy sleep items to reduce sleep onset latency and improve actual sleep.
3. Set the alarm. Earlier alarms give a larger commute buffer but less sleep. Later alarms give more sleep but increase the risk of being late.

### Phase 2: Morning
1. The game reveals the total morning routine time at the door, including snoozing and getting ready.
2. The player chooses how to commute with the time remaining before clock-in.
3. The game resolves the commute, including any delays, and shows the exact clock-in time.
4. If the player is late, the bribe screen appears.
5. The day ends and the game returns to bedtime at 0:00.

## 4. Core Mechanic: Sleep Debt
- Sleep onset latency: the time it takes the player to fall asleep, reduced by sleep items.
- Total sleep time: the actual sleep the player gets.
- Target sleep: 8 hours per night.
- Sleep debt: if total sleep time is below 8 hours, the shortfall becomes sleep debt.
- Morning routine time: more sleep debt makes the next morning longer, which reduces the commute buffer.

### Sleep Formula
- `TST = (alarm time - bedtime) - SOL`
- `sleepDebt = max(0, targetSleep - TST)`

The exact conversion from sleep debt to extra morning routine time is still TBD.

## 5. Fixed Anchors
- Bedtime: 00:00, always.
- Clock-in time: 09:00. Arriving after this is late.

### Morning Routine
- Base routine: 15 minutes.
- Sleep debt penalty: added on top of the base routine in a deterministic way.
- Small RNG: a modest random variance is added to reflect grogginess and morning unpredictability.
- Reveal moment: the total routine time is shown at the door, right before the commute choice.
- Flavor text such as "you snoozed twice" is cosmetic and maps to the same routine total.

### Time Budget
- Midnight to 09:00 = 9 hours.
- Target sleep = 8 hours.
- This leaves 60 minutes of room for sleep onset latency, snoozing, and the commute.
- All values are subject to tuning.

## 6. Commute Options
Weather and city events are revealed at bedtime, so the player can plan with full information. Metro is the safe baseline and is never affected by traffic events.

1. Metro
   - Cost: cheap.
   - Reliability: total.
   - Special risk: none.
2. Drive
   - Cost: free.
   - Reliability: low.
   - Special risk: traffic jams and accidents when sleep debt is high.
3. Uber
   - Cost: mid.
   - Reliability: low.
   - Special risk: cancellation and traffic jams.
4. Uber Black
   - Cost: expensive.
   - Reliability: high.
   - Special risk: traffic jams only.

*Note: "Uber Black" is a placeholder and may later be replaced with a more locally appropriate label.*

### Risk Details
- Cancellation risk: Uber can cancel, costing about 10 minutes to find a new driver.
- Traffic jam risk: Drive, Uber, and Uber Black can be slowed by city traffic.
- Traffic jam triggers: major city events, the last day before a holiday, or bad weather.
- Driving fatigue risk: if sleep debt is high enough, driving can cause an accident and a time penalty.

## 7. Economy / Scoring
### Option A: Traditional
The player starts with a default balance and receives daily income every day, including weekends. This creates 11 income days to spend, except for the final day because there is no more workday after it.

This is intuitive, but it is not especially realistic because salary is usually not paid daily.

### Option B: Advanced Payment
The player is told they must spend the bonus they have not earned yet. This can produce a negative balance at the end of the game and turn the score into a high-score style system.

## 8. Sleep Items
Delivery rule: everything except sleeping pills arrives the next day. Sleeping pills are available the same night and are the only instant purchase.

### SOL Reducers
- Soft pillow: reusable, reduces SOL.
- Eye cover: reusable, reduces SOL.
- Ear plugs: reusable, reduces SOL.
- Zolpidem: consumable, strong SOL reduction; tolerance increases with total uses.
- DORA: consumable, reduces SOL with no side effects, but is more expensive.

### Snooze-Penalty Reducers
- Smart bedside lamp (sunrise light): reusable, gently wakes the player and reduces auto-snooze penalty.

All prices and exact effect values are TBD and should be tuned so the items compete for limited money.

## 9. Platform, Screens, and Flow
- Platform: web game, mobile-first, but responsive on desktop.

### Screens
- Introduction Screen: explains the premise, goal, and key rules.
- Bedtime Screen: shows the next day’s forecast, the shop, and the alarm-setting UI.
- Sleep Screen: runs automatically; the player has no control.
- Wake-up Screen: shows the time, sleep result, sleep debt, and alarm snooze behavior, then moves to commute selection.
- Office Screen: shows whether the player was late and presents the bribe choice if needed, then returns to bedtime.
