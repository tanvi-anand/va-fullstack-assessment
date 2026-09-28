# Vehicle Analytics Fullstack Assessment – Justification

## API

Use this file to briefly explain your design decisions. Bullet points are fine.

### 1. Overall API design

- Summary of your API structure and main routes (paths, methods, and what they return):

### 2. Data vs metadata separation

- How clients should use your metadata route(s) vs your data route(s) (and streaming, if implemented):

### 3. Emulator (read-only)

- Confirm you did not modify the emulator service (`emulator/`) or its `sensor-config.json`. If you needed to work around anything, note it here: N

### 4. OpenAPI / Swagger

- Where your final OpenAPI spec lives and how to view or use it (e.g. Swagger UI):

### 5. Testing and error handling

- What you chose to test and any notable error-handling decisions:

### 6. Invalid data from the emulator (Task 2)

- How you detect invalid readings from the emulator stream:
- What you do with invalid data (drop, log, count, etc.) and why:

### 7. Out-of-range values per sensor (Task 3)

- How you use the valid-range table (sensor name or sensorId → min/max) and count out-of-range readings per sensor in a 5-second window:
- How you log the timestamp and error message (including sensor) when a sensor exceeds the threshold (&gt;3 out-of-range in 5 s):


## Frontend

Use this section to briefly explain your frontend design decisions. Bullet points are fine.

### 1. Figma mockup

- Link to your low-fidelity Figma mockup and what it shows:

### 2. Layout and information hierarchy

- Why you structured the dashboard the way you did:

### 3. API consumption

- How you use `/sensors` and `/telemetry` (and WebSocket, if used):

### 4. Visual design and usability

- Choices around colours, typography, states, and responsiveness:

### 5. Trade-offs and limitations

- Anything you would do with more time or a different stack:
