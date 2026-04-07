/**
 * Intelligent Traffic Control Dashboard — Application Logic
 * State machine for two intersections (North–South, East–West) with safe
 * transitions and race-condition protection. Uses async/await and the
 * Event Loop for non-blocking timing.
 */

/* ========== STATE OBJECT ==========
 * Single source of truth. Only these values drive the UI and transition logic.
 * Invariant: Never both NS and EW green or yellow at the same time.
 */
const trafficSystem = {
  northSouth: 'green',   // 'green' | 'yellow' | 'red'
  eastWest: 'red',       // 'green' | 'yellow' | 'red'
  pedestrian: 'red',     // 'green' | 'yellow' | 'red'
  transitionInProgress: false  // Guards against overlapping transitions (race condition)
};

/* ========== TRAFFIC LIGHT STATES ==========
 * Beginner-friendly constants for the 3 light colors.
 */
const LIGHT_STATES = {
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green'
};

/* Current state for the main traffic-light logic (N-S direction). */
let currentTrafficState = LIGHT_STATES.GREEN;

/* Simple loop map: RED -> GREEN -> YELLOW -> RED */
const NEXT_LIGHT_STATE = {
  [LIGHT_STATES.RED]: LIGHT_STATES.GREEN,
  [LIGHT_STATES.GREEN]: LIGHT_STATES.YELLOW,
  [LIGHT_STATES.YELLOW]: LIGHT_STATES.RED
};

/** DOM element references — populated in init() after DOM is ready */
let transitionBtn = null;
let pedestrianBtn = null;
let logList = null;
let colorButtons = [];

/** Light element maps: direction -> { red, yellow, green } for classList.toggle */
const lightElements = {
  ns: { red: null, yellow: null, green: null },
  ew: { red: null, yellow: null, green: null },
  ped: { red: null, yellow: null, green: null }
};

/* ========== updateUI() ==========
 * Control Flow: Reads trafficSystem state and syncs the DOM. Uses classList.toggle
 * to add/remove the "on" class so only the active light per pole appears lit.
 * Event Loop: This runs synchronously; it does not schedule any microtasks or
 * macrotasks. Called after every state change so the UI always reflects state.
 */
function updateUI() {
  const ns = trafficSystem.northSouth;
  const ew = trafficSystem.eastWest;
  const ped = trafficSystem.pedestrian;

  if (lightElements.ns.red) {
    lightElements.ns.red.classList.toggle('on', ns === 'red');
    lightElements.ns.yellow.classList.toggle('on', ns === 'yellow');
    lightElements.ns.green.classList.toggle('on', ns === 'green');
  }
  if (lightElements.ew.red) {
    lightElements.ew.red.classList.toggle('on', ew === 'red');
    lightElements.ew.yellow.classList.toggle('on', ew === 'yellow');
    lightElements.ew.green.classList.toggle('on', ew === 'green');
  }
  if (lightElements.ped.red) {
    lightElements.ped.red.classList.toggle('on', ped === 'red');
    lightElements.ped.yellow.classList.toggle('on', ped === 'yellow');
    lightElements.ped.green.classList.toggle('on', ped === 'green');
  }
}

/* ========== logEvent() ==========
 * Control Flow: Appends a timestamped message to the System Logs list. Runs
 * synchronously. Used to record state changes for debugging and education.
 */
function logEvent(message) {
  if (!logList) return;
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  li.innerHTML = `<span class="log-time">[${time}]</span>${message}`;
  logList.appendChild(li);
  logList.scrollTop = logList.scrollHeight;
}

/* ========== applyTrafficState() ==========
 * Converts the single `currentTrafficState` into lane lights:
 * - N-S uses current state directly.
 * - E-W uses opposite behavior:
 *   - If N-S is GREEN or YELLOW, E-W stays RED.
 *   - If N-S is RED, E-W becomes GREEN.
 */
function applyTrafficState() {
  trafficSystem.northSouth = currentTrafficState;

  if (currentTrafficState === LIGHT_STATES.RED) {
    trafficSystem.eastWest = LIGHT_STATES.GREEN;
  } else {
    trafficSystem.eastWest = LIGHT_STATES.RED;
  }

  // Placeholder: pedestrian logic is handled in a separate branch/module.
  trafficSystem.pedestrian = LIGHT_STATES.RED;
}

/* ========== nextLight() ==========
 * Main traffic-light transition function.
 * Sequence: RED -> GREEN -> YELLOW -> RED (loops forever on each click).
 */
function nextLight() {
  currentTrafficState = NEXT_LIGHT_STATE[currentTrafficState];
  applyTrafficState();
  updateUI();
  logEvent(`Traffic state changed: N-S -> ${currentTrafficState.toUpperCase()}.`);
}

/* ========== transitionLights() ==========
 * Alias wrapper so existing button wiring still works.
 * No timer logic here; one click = one state step.
 */
function transitionLights() {
  nextLight();
}

/* ========== handleLogic() ==========
 * Event handler for the "Switch Direction" button. Control Flow: Called by the
 * Event Loop when the user clicks (macrotask). It does not block; it starts
 * transitionLights() which uses async/await and yields during waits. Clicks
 * during transition are ignored because transitionLights() returns early when
 * transitionInProgress is true, and the button is disabled during transition.
 */
function handleLogic() {
  transitionLights();
}

/* ========== runPedestrianSequence() ==========
 * Placeholder only for this branch.
 * Full pedestrian flow should be implemented in the pedestrian branch.
 */
function runPedestrianSequence() {
  logEvent('Pedestrian placeholder: waiting for pedestrian branch implementation.');
}

/* ========== handlePedestrianRequest() ==========
 * Click handler for the pedestrian button. Delegates to the async sequence
 * without blocking the main thread.
 */
function handlePedestrianRequest() {
  runPedestrianSequence();
}

/* ========== handleManualColor() ==========
 * Event handler for manual color buttons. Control Flow: Validates that we are
 * not mid-transition, preserves safety (won't allow two directions to be
 * green/yellow at once), updates state, then calls updateUI().
 * Event Loop: Called in response to a click event (macrotask). Runs
 * synchronously; does not block because it performs no waiting itself.
 */
function handleManualColor(direction, color) {
  if (trafficSystem.transitionInProgress) {
    logEvent('Ignored manual change: transition in progress.');
    return;
  }

  const isNorthSouth = direction === 'ns';
  const thisKey = isNorthSouth ? 'northSouth' : 'eastWest';
  const otherKey = isNorthSouth ? 'eastWest' : 'northSouth';

  // Safety: never allow both directions to be green or yellow at once.
  if ((color === 'green' || color === 'yellow') &&
      (trafficSystem[otherKey] === 'green' || trafficSystem[otherKey] === 'yellow')) {
    logEvent(`Ignored manual ${direction.toUpperCase()} ${color}: other direction not fully red.`);
    return;
  }

  trafficSystem[thisKey] = color;
  // Any vehicle non-red state should force pedestrians back to red for safety.
  if (color === 'green' || color === 'yellow') {
    trafficSystem.pedestrian = 'red';
  }
  updateUI();
  logEvent(`Manual override: ${direction.toUpperCase()} → ${color[0].toUpperCase()}${color.slice(1)}.`);
}

/* ========== init() ==========
 * Control Flow: Runs once when the script loads. DOM must be ready (script at
 * end of body). Binds DOM references, sets initial UI from trafficSystem, and
 * attaches the click listener. Event Loop: addEventListener registers a
 * callback; it does not run until the user clicks, at which point the loop
 * invokes handleLogic.
 */
function init() {
  transitionBtn = document.querySelector('#transition-btn');
  pedestrianBtn = document.querySelector('#pedestrian-btn');
  logList = document.querySelector('#log-list');
  colorButtons = Array.from(document.querySelectorAll('.color-btn'));

  lightElements.ns.red    = document.querySelector('#ns-red');
  lightElements.ns.yellow = document.querySelector('#ns-yellow');
  lightElements.ns.green  = document.querySelector('#ns-green');
  lightElements.ew.red    = document.querySelector('#ew-red');
  lightElements.ew.yellow = document.querySelector('#ew-yellow');
  lightElements.ew.green  = document.querySelector('#ew-green');
   lightElements.ped.red    = document.querySelector('#ped-red');
   lightElements.ped.yellow = document.querySelector('#ped-yellow');
   lightElements.ped.green  = document.querySelector('#ped-green');

  // Sync UI with the traffic-light state machine at startup.
  applyTrafficState();
  updateUI();
  logEvent('System ready. N-S Green, E-W Red.');

  if (transitionBtn) {
    transitionBtn.addEventListener('click', handleLogic);
  }
  if (pedestrianBtn) {
    pedestrianBtn.addEventListener('click', handlePedestrianRequest);
  }

  // Bind manual color buttons for each direction.
  colorButtons.forEach((btn) => {
    const dir = btn.getAttribute('data-dir');
    const color = btn.getAttribute('data-color');
    btn.addEventListener('click', () => handleManualColor(dir, color));
  });
}

/* Start the application when the script executes. */
init();
