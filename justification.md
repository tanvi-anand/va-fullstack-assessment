# Vehicle Analytics Fullstack Assessment – Justification

Most of my decisions came from one question: what would actually happen on a real car, and how do real teams handle it? Something that looks good in theory but wouldn't hold up with a real car on a real track doesn't help the team. So whenever I had two options, I pictured the car at the far end of the track, a sensor misbehaving, or the pit laptop losing its link, and picked the option that still made sense there.

When options conflicted, I used these priorities, in this order:

1. Stay alive. A system that partly works is better than one that refuses to run because one piece isn't ready.

2. Don't lose or corrupt data.

3. Be honest about what's broken. If the API can't check something, it says so instead of guessing "ok".


## API

### 1. Overall API design

| Method | Path | Returns |
|---|---|---|
| GET | `/health` | { status, emulator }. 200 if the emulator is reachable, 503 if not (kept from the template). |
| GET | `/sensors` | A list of { sensorId, sensorName, unit, min, max }. 503 + { error } if metadata hasn't loaded yet. |
| GET | `/telemetry/latest` | A list of { sensorId, value, timestamp, status, alarm }, the latest reading per sensor. [] if no readings yet. |

Six files were created, with one job each: types.ts, state.ts (data more than one file uses), validation.ts (Task 2), ranges.ts (Task 3), emulator.ts (metadata fetch and WebSocket) and server.ts (routes and start-up).

**Metadata is fetched once at startup, kept in a Map, and retried every 2s until it works.** Names and units never change, so asking the emulator on every request is wasted work, and a Map gives the ID to name lookup that every reading needs for its range check. The retry is there because `docker-compose.yml` uses the short form of depends_on`, which only waits for the emulator's container to start, not for its server to be ready.

- Rejected idea: don't start the server until metadata loads. If the emulator is down, the whole API is dead and `/health` can't report the problem. That's the whole telemetry system refusing to boot because one part isn't ready.

- Trade offs: readings that arrive in the first few seconds, before names load, are stored but not range checked. To my knowledge, in real life the pit software is running well before the car leaves the garage, so this costs very little.

**Tje WebSocket reconnects by itself.** When the connection closes, the API waits 2 seconds and connects again. 

- Rejected idea: retrying after exponential amounts of time, eg: retry after 2s, then 4s, then 8s, then 16s ... This protects a server from thousands of reconnecting clients. However there iss one API and one emulator here.

**Only the latest reading per sensor is kept.** One Map entry per sensor, is overwritten each time. That's what the pit wall needs ("what's the tyre pressure right now?"), and memory stays fixed however long the car runs.

- Rejected idea: keeping every reading in memory. It's tens of thousands of readings an hour, so on an endurance run the server would eventually slow down or crash. Real teams do keep everything to analyse later, but not in the live server's memory.


### 2. Data vs metadata separation

**How clients should use it:** call `/sensors` once for names, units and ranges, then poll `/telemetry/latest` and match readings by `sensorId`. My frontend polls every second.

I didn't copy sensorName and unit into each reading, even though it would save the frontend one call. They never change, so resending them every poll is like the car radioing "this is the tyre pressure sensor, in kPa" with every packet.

/sensors includes min and max. The frontend needs them to draw gauges and to say ABOVE MAX or BELOW MIN (on a car, low tyre pressure means a leak and high means overheating, which need different actions). Ranges are metadata like names and units, so they go in the metadata route, and the range table stays in one place (SENSOR_RANGES in ranges.ts).

**503 vs an empty list.** Before metadata loads, /sensors returns 503 with { error: "Metadata for the sensors has not loaded yet. Please try again in a moment." }. An empty list would be ambiguous (no sensors, or not loaded yet?). /telemetry/latest returns 200 with [] when there are no readings, because "0 sensors" is never true for a car, but "0 readings" is (it's in the garage).

**status and alarm on each reading.**

- status: is this reading in range right now? "ok", "out_of_range" or "unknown".

- alarm: is the Task 3 alarm on, meaning the sensor has been misbehaving over the last few seconds?

With only status, a one-off blip looks the same as a failing sensor. With only alarm, 585 V could show in normal colours because the alarm hasn't reached 4 yet. "ok" with alarm: true just means "fine right now, but out of range a lot in the last few seconds". I asked myself whether two fields was overengineering, and the test answered it: in one snapshot, 5 of 12 sensors had them disagreeing. This one shows all four combinations:

```
{"sensorId":3000000060102,"value":-120.004,"timestamp":1790519854.273,"status":"ok","alarm":true}
{"sensorId":3000000060001,"value":441.36172960312166,"timestamp":1790519854.223,"status":"out_of_range","alarm":true}
{"sensorId":2000000051202,"value":286.90044582504106,"timestamp":1790519854.016,"status":"out_of_range","alarm":false}
{"sensorId":3000000060003,"value":23.626215934580085,"timestamp":1790519854.041,"status":"ok","alarm":false}
```

**Other shape choices.** Both routes return plain lists. I considered wrapping them ({ sensors: [...] }), but there's nothing to put beside the list yet. I'd wrap it for something like a config version, since setups change between seasons.

**Polling instead of streaming.** The dashboard shows one number per sensor, and with streaming the fastest sensor would redraw about 7 times a second, which is unreadable, so I'd have to slow it down anyway. Faster polling doesn't collect more data either (the API keeps latest only). Streaming (SSE) is the right choice for history graphs, where every point is plotted, so that's what I'd use for the history screen.

**Future extension: filtering.** (e.g. /sensors?group=battery). I assume that real FSAE EVs log much more than 12 signals. With 12 sensors, this isn't needed yet. Also, the emulator gives no group information, so I'd be guessing groups from name prefixes.


### 3. Emulator (read-only)

- Confirm you did not modify the emulator service (`emulator/`) or its `sensor-config.json`. If you needed to work around anything, note it here: No changes made.


### 4. OpenAPI / Swagger

**Where it is:** `api/openapi.yaml`

**How to view it:** open https://editor.swagger.io, then File -> Import file. With the stack running, expand a route, then click 'Try it out' and 'Execute' to call the real API on `localhost:4000`.

**What it covers:** the three routes, grouped as Health, Metadata and Telemetry, so the metadata vs data split shows in the docs too. Each shape is defined once in components/schemas and reused. Every example is copied from real API output, and both 503s are documented.

**Checked:** I ran every route from Swagger's Try it out against the real API, including /health with the emulator stopped (it returned the documented 503). Every response matched the spec.


### 5. Testing and error handling

I tested everything by hand against the real emulator and tried to break it on purpose: stopping the emulator mid-run, starting the API before the emulator, and removing a range from the table.

- **Before:** /telemetry/latest had 21 entries instead of 12. 8 sensors appeared twice, once with a numeric ID and once with a string ID. One entry had no sensorId, and one value was stored as a string.

- The string-ID copies went stale. "2000000051201" was 6 seconds older than the real 2000000051201, because its slot only updated when another string ID reading for that tyre happened to arrive. A dashboard would have shown a 6 second old tyre pressure as live. That's why I recoverd numeric strings instead of just dropping them. The recovered reading lands in the sensor's real slot.

- **After:** exactly 12 entries, all plain numbers. Out of range values were still stored, which is correct, since they're well formed and Task 3 flags them.

**Failure tests:**

- **Emulator stopped for about 67 seconds mid-run:** the API retried every 2 seconds without crashing, /health returned {"status":"unhealthy","emulator":false}, the last values were kept, and it reconnected on its own.

```
Connection to emulator closed. Retrying in 2000ms.
WebSocket error: ECONNREFUSED
... (every 2s for about a minute, no crash)
Connected to the emulator!
```

- **API started before the emulator:** /sensors returned the 503, then loaded all 12 by itself once the emulator was up.

- **"unknown" test:** with MOTOR_TEMPERATURE's range commented out, its readings came back "status":"unknown","alarm":false while every other sensor kept working.

- **Edge values:** PACK_VOLTAGE 499.98 -> ok (max 500), PACK_SOC 1.40 -> ok (min 0), VEHICLE_SPEED -50.5 -> out_of_range (min 0).

**Bugs caught during testing:**

- **/sensors kept returning 503 after metadata loaded.** I'd never set the loaded flag to true. The dev server runs with ts-node-dev --transpile-only, which skips type-checking, so nothing flagged it until I tested the route. I now run npx tsc --noEmit before testing.

- **Validation said "recovered", but the duplicates were still there.** The storing line wasn't converting with Number(), so sorting a reading and converting it are two separate steps, and both have to be there.

**Error handling:**

- JSON.parse in try/catch, because one garbled packet shouldn't take down the feed.

- The whole message has to be an object. JSON.parse("null") succeeds, and then reading .sensorId would throw, so this is the check that prevents a crash.

- Short error logs. My first reconnect test printed a ~25 line error dump every 2 seconds, which would bury everything during an outage, so it now prints just the code (ECONNREFUSED). I also removed the per reading log from the template, since at 12 sensors it floods the console.

**Docker:** I ran the full stack with docker compose up --build from the repo root, and it worked first time. The emulator, API and dashboard all started, and the dashboard at localhost:3000 showed live data.

### 6. Invalid data from the emulator (Task 2)

**How I detect it.** Instead of listing bad cases, I describe what a valid reading looks like and reject everything else. The emulator is a black box, and on a real car firmware changes without telling the pit software, so a list of bad cases never ends. One rule, applied to each of sensorId, value, and timestamp:

- A real number -> **accepted**

- A non-blank string that converts to a real number -> **recovered** (converted with Number())

- Anything else -> **dropped**

| Input | Result |
|---|---|
| `164.48` | accepted |
| `"164.480"` | recovered |
| `"V5CYU1"`, `"NaNish175"` | dropped (NaN) |
| missing, `null`, `true`, `[1, 2]`, `{}` | dropped (not a number or string) |
| `""`, `"   "` | dropped (blank) |
| `"Infinity"` | dropped (not a real number) |

The order matters. The type check comes first because Number(null) is 0 and Number(true) is 1, so converting first would let them through as real readings. The blank check is there because Number("") is also 0. And Number.isFinite rejects both NaN and Infinity without converting anything.

Other checks:

- **Unknown sensorId:** dropped. A corrupted CAN ID passes every type check and would create a ghost sensor. This check is skipped until metadata loads, which I accepted rather than dropping every reading until then.

- **Several problems at once:** the worst outcome wins (dropped > recovered > accepted).

**What I do with it, and why.**

- **Recover** numeric strings, because the value is fine and the stale-duplicate problem (section 5) shows why it matters where it lands.

- **Drop** anything that can't be trusted.

- **Count** every message as accepted, recovered or dropped, so the three always add up to the total. Out-of-range readings count as accepted. I count recoveries even though they're fixed, because a rising recovery rate means something is getting worse.

- **No console line per bad reading.** About 15% of readings are invalid, which is 1-3 lines a second, and that would bury the Task 3 warnings. The only drop that prints is unreadable JSON, which would mean something is seriously wrong and has never happened.

- **Trade-off:** the counts aren't exposed through a route yet (see Frontend section 5).

**Known limitations:** Number() accepts "0x10" and "1e3", so these count as recovered.


### 7. Out-of-range values per sensor (Task 3)

**The range table.** `SENSOR_RANGES` is a Map from sensor name to `{ min, max }`, keyed by name because the IDs are unreadable. min and max are inclusive: a battery rated 20-80 °C is still within rating at exactly 80.

While reviewing it, I found my tyre rows said `TYRE_TEMPERATURE_*` instead of `TYRE_PRESSURE_*`. After fixing it, I added a check that runs once when metadata loads and prints `No range set for <name>` for any sensor missing from the table. It also catches a real-car case: a firmware update adding a sensor nobody has given a range to yet.

**The 5-second window.** Each sensor has a list of the timestamps of its recent out-of-range readings. A new out-of-range reading is added to the end, then entries more than 5 seconds older than the current reading are removed from the front. More than 3 left means it's over the limit. For example, `[100.0, 102.0, 104.5]` plus a new one at 106.0 becomes `[102.0, 104.5, 106.0]` once 100.0 is removed, which is 3, so not over. The window uses each reading's own timestamp, and the clean-up runs on every reading from a known sensor, otherwise a sensor that stopped going out of range would never clear.

**Logging, and the question the README doesn't answer.** The README says to log when a sensor goes over 3 in 5 seconds, but not what happens if it stays bad. The fastest sensor sends about 33 readings every 5 seconds, so even at 20% out of range it's over the limit almost constantly.

1. **Warn every time:** more than one line per second from one sensor, which buries everything.

2. **Warn, then cooldown:** limits output, but the cooldown length is a made-up number, it hides whatever happens during it, and it never says the sensor recovered, so silence could mean "fixed" or "the check broke".

3. **Alarm on/off:** warn once when the sensor goes bad, stay quiet while it stays bad, and report when it recovers.

I went with option 3 because that's how a warning light on a dash works: it comes on, stays on while the fault exists, and goes off when it clears. The engineer gets the start and end of the problem, and there's no made-up number.

The alarm turns on at more than 3 out-of-range readings in 5 seconds, but only turns off at zero. If it turned off as soon as the count dropped to 3, a sensor hovering around 3-4 would flip on, off, on, off, which is just spam in a different form. The sensors with their alarm on are kept in a Set, and `/telemetry/latest` reads `alarm` straight from it, so the API and the console always agree.

Each message has the timestamp, the sensor name and its ID:

```
[2026-09-27T14:14:13.577Z] OUT OF RANGE: PACK_VOLTAGE (3000000060002) was out of range 4 times in the last 5s. Alarm stays on until 5s pass with no out-of-range readings.
[2026-09-27T14:14:28.447Z] BACK IN RANGE: PACK_VOLTAGE (3000000060002) had no out-of-range readings for 5s.
[2026-09-27T14:15:24.460Z] OUT OF RANGE: PACK_SOC (3000000060003) was out of range 4 times in the last 5s. Alarm stays on until 5s pass with no out-of-range readings.
[2026-09-27T14:15:29.513Z] BACK IN RANGE: PACK_SOC (3000000060003) had no out-of-range readings for 5s.
```

- **Result:** in about 3 minutes, all 12 sensors together printed 24 lines, and no sensor ever printed two ONs in a row. Option 1 would have printed more than one line per second from one sensor alone.

## Frontend

### 1. Figma mockup

**Link:** https://www.figma.com/proto/YjigL34oGiE2atGpwG2Nkt/Redback-Telemetry-Dashboard?node-id=22-1054&p=f&t=vNt8hJH4S1HmIOe3-1&scaling=min-zoom&content-scaling=fixed&page-id=6%3A2

**four screens** at 1440x900: the main dashboard (built), Link lost (API unreachable), Starting up (`/sensors` returning 503), and a sensor history screen labelled as not built. All four show the same moment from the same drive, so you can compare how one situation looks in each state.

**Change during the build:** my first version had the alarm in amber and a single out-of-range reading in red. I swapped them, because an alarm (4+ bad readings in 5 seconds) is more serious than one bad reading, and car dashes use amber for caution and red for act now. I updated the Figma to match.

**Differences from the build:** I used the template's palette and fonts instead of the exact Figma ones, so shades differ slightly but every colour means the same thing. Starting up is a simple card instead of the checklist in the Figma, and the history screen isn't built.


### 2. Layout and information hierarchy

- **Left, "All sensors":** every sensor in three groups (critical battery & motor, driving, tyres), with its range, value, status tag and alarm badge. This is the full reference.

- **Centre:** the four critical sensors as large arc gauges, then four driving cards.

- **Right:** a tyre card and a Needs attention panel with a status key.

The README asks to make it clear which sensors are most important, so I used size. Battery temperature, motor temperature, pack voltage and state of charge are the four where a bad value means stop the car, so they get the biggest gauges. Driving sensors are medium, and the list is the reference.

- **Tyres are drawn as a car from above.**

- **Driving cards use a visual that fits the sensor:** an arc for speed, a steering wheel rotated by the angle, a vertical bar for brake pressure, and a bar growing left or right from zero for pack current (negative = charging).

- **Needs attention** lists the most serious first: live alarms, then out of range, then no data. If every sensor goes stale at once, it shows one "All 12 sensors" item with the likely cause instead of 12 identical items.

- **Everything is on one screen, with no tabs.** An engineer should recognise a problem, not have to remember which tab to check.


### 3. API consumption

- **`/sensors` first,** retried every 2 seconds until it returns the list. Names, units and ranges are fetched once per page load.

- **Then `/telemetry/latest` every second,** matched by `sensorId`.
- `fetchSensors()` returns `null` on a 503 but throws if the API can't be reached, so the page can tell "up but not ready" (Starting up card) from "down" (Can't reach the API card).

- **Each sensor's state is worked out once per second** in `page.tsx` and shared by every component, so the list, gauges, tyre card, chips and attention panel can't disagree about a sensor.

- If a request fails, the last readings stay on screen (greyed) and their ages keep growing. If the ages froze, old data would look fresh.

The code is split like the API: `api-client.ts` makes requests, `sensor-display.ts` holds the display logic, `components/` only handles appearance, and every panel uses the template's shadcn `Card`.


### 4. Visual design and usability

**"Dark cockpit" colours.** Normal stays neutral and only problems light up, so when one thing goes wrong it's obvious.

- One meaning per colour, in order of seriousness: **red = alarm**, **amber = out of range**, **grey = no data**. They're never used for decoration.
- **Colour always comes with text** (⚠ ALARM, ABOVE MAX, BELOW MIN, NO DATA), for colour-blind users.
- List rows get a thin left bar in the colour of their most serious signal. I considered a green bar for OK rows, but 9-10 green bars would make the red and amber ones stand out less.

**Stale data.** I think the worst failure isn't a blank screen, it's frozen numbers that look live: an engineer sees "battery 45 °C, fine" when it's 30 seconds old.

- Each sensor goes stale on its own. After 3 seconds with no new reading, it fades to 50%, gets a dashed outline and a **NO DATA Xs** tag.
- A stale out-of-range value turns grey, not amber, so an old value can never look live. Alarms on stale sensors stay visible but faded, marked "(last known)".
- One grey row means that sensor has a problem. Everything grey means the link.

**The connection pill says where the problem is:** Live (green), No new data (amber: API answering but every sensor stale, so the car or emulator stopped), API unreachable (red header: "Every value below is at least Xs old"), Starting up (amber: 503) and Connecting (grey). The Connecting state came from a bug: refreshing with the API off briefly flashed "Starting up" before the real answer came back, because the page claimed a state it hadn't checked. That's the same principle as `"unknown"` in the API.

**Gauges.** Every gauge and bar uses `fraction = (value - min) / (max - min)`, kept between 0 and 1. The arc gauges fill `fraction × 240°` (battery at 35.5 °C in 20-80 is about a quarter), and the steering wheel rotates by the actual angle. They're plain SVG: a gauge package would bring styling to fight, and Recharts is a big library for four arcs.

**Formatting and layout:** 1 decimal place, and units. It's designed for a 1440-wide screen.


### 5. Trade-offs and limitations

I had an exam on Saturday that took a big part of the week, so I prioritised a tested backend and a complete main dashboard. These are designed but not built:

- **Storing every reading:** one SQL table, `readings(sensorId, value, timestamp)`, plus a route like `/telemetry/history?sensorId=...&from=...&to=...`. This was cut for time, not skill, I know SQL. 

- **The sensor history screen,** streamed over SSE. Without the database, history would have to be collected in the browser.

- **Smoothing** I planned to smooth the displayed values with an exponential moving average, because raw readings jitter but this was cut because, for example, a jump from 100 to 150 shows as 115, then 125.5. This could hide a real temperature spike, and a smoothed number next to a raw value colour would sometimes disagree. If built, range checks would stay on the raw value.

- **`/telemetry/stats`** for the accepted/recovered/dropped counts, which already exist.

- **An `alarmSince` field,** so Needs attention could say how long an alarm has been on instead of how old the reading is.

- **Swagger UI served at `/docs`**

**Known limitations:**

- Out-of-range values are clamped to the end of the gauge, so 549 V and 900 V both show a full arc. The number shows by how much, and the color demonstrates that it is out of range.

- I assumed a positive steering angle means right and negative is left, since the emulator doesn't say.
