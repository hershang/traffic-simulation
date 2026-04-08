/**
 * Intelligent Traffic Control Dashboard — Timer Branch Logic
 * Focus: automatic light cycling with selectable timer duration.
 */

/* ========== STATE OBJECT ==========
 * Single source of truth for the current visible light states.
 */
const trafficSystem = {
  northSouth: 'green',
  eastWest: 'red',
  pedestrian: 'red',
  transitionInProgress: false
};

/* ========== TIMER CONFIG ==========
 * mainGreenMs: selected duration for each green phase.
 * vehicleYellowMs/allRedBufferMs scale from mainGreenMs.
 */
const TIMER_DELAYS = {
  mainGreenMs: 15000,
  vehicleYellowMs: 3000,
  allRedBufferMs: 1500,
  pedestrianPrepMs: 3000,
  pedestrianYellowMs: 4000
};

/* Track active timer IDs so we can cleanly stop/restart. */
const timerState = {
  pendingTimeouts: new Set(),
  autoCycleTimeout: null
};

/* Timer settings shown in the UI. */
const timerSettings = {
  mode: 'automatic',
  customSeconds: 15,
  activeSeconds: 15,
  autoDefaultSeconds: 15
};

/** DOM element references */
let pedestrianBtn = null;
let logList = null;
let timerModeSelect = null;
let timerSecondsInput = null;
let timerHelpText = null;

const lightElements = {
  ns: { red: null, yellow: null, green: null },
  ew: { red: null, yellow: null, green: null },
  ped: { red: null, yellow: null, green: null }
};

function wait(ms) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      timerState.pendingTimeouts.delete(timeoutId);
      resolve();
    }, ms);
    timerState.pendingTimeouts.add(timeoutId);
  });
}

function clearAllPendingTimers() {
  timerState.pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  timerState.pendingTimeouts.clear();

  if (timerState.autoCycleTimeout) {
    clearTimeout(timerState.autoCycleTimeout);
    timerState.autoCycleTimeout = null;
  }
}

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

function logEvent(message) {
  if (!logList) return;
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  li.innerHTML = `<span class="log-time">[${time}]</span>${message}`;
  logList.appendChild(li);
  logList.scrollTop = logList.scrollHeight;
}

/* ========== TIMER CONTROL HELPERS ========== */
function sanitizeSeconds(value, fallbackSeconds) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackSeconds;
  return Math.max(1, Math.round(parsed));
}

function applyCycleTimingFromSeconds(seconds) {
  const safeSeconds = sanitizeSeconds(seconds, timerSettings.autoDefaultSeconds);
  const mainGreenMs = safeSeconds * 1000;

  timerSettings.activeSeconds = safeSeconds;
  TIMER_DELAYS.mainGreenMs = mainGreenMs;

  // Keep yellow and all-red simple, scaled from selected green time.
  TIMER_DELAYS.vehicleYellowMs = Math.max(2000, Math.round(mainGreenMs * 0.2));
  TIMER_DELAYS.allRedBufferMs = Math.max(1000, Math.round(mainGreenMs * 0.1));
}

function refreshTimerControlUI() {
  if (!timerModeSelect || !timerSecondsInput || !timerHelpText) return;

  const isAutomatic = timerSettings.mode === 'automatic';
  timerSecondsInput.disabled = isAutomatic;

  if (isAutomatic) {
    timerSecondsInput.value = String(timerSettings.autoDefaultSeconds);
    timerHelpText.textContent = 'Automatic mode uses 15 seconds per green phase.';
  } else {
    timerHelpText.textContent = `Custom mode uses ${timerSettings.activeSeconds} seconds per green phase.`;
  }
}

function applyTimerSettingsFromControls() {
  if (!timerModeSelect || !timerSecondsInput) return;

  timerSettings.mode = timerModeSelect.value === 'custom' ? 'custom' : 'automatic';

  if (timerSettings.mode === 'automatic') {
    applyCycleTimingFromSeconds(timerSettings.autoDefaultSeconds);
  } else {
    const validSeconds = sanitizeSeconds(timerSecondsInput.value, timerSettings.customSeconds);
    timerSettings.customSeconds = validSeconds;
    timerSecondsInput.value = String(validSeconds);
    applyCycleTimingFromSeconds(validSeconds);
  }

  refreshTimerControlUI();
  restartAutomaticTrafficCycle();
  logEvent(`Timer updated: ${timerSettings.activeSeconds}s green phase.`);
}

/* ========== TRAFFIC TRANSITION LOGIC ==========
 * One complete switch from the current green lane to the opposite lane.
 */
async function transitionLights() {
  if (trafficSystem.transitionInProgress) {
    return;
  }

  trafficSystem.transitionInProgress = true;
  if (pedestrianBtn) pedestrianBtn.disabled = true;

  try {
    if (trafficSystem.northSouth === 'green') {
      trafficSystem.northSouth = 'yellow';
      trafficSystem.eastWest = 'red';
      updateUI();
      await wait(TIMER_DELAYS.vehicleYellowMs);

      trafficSystem.northSouth = 'red';
      updateUI();
      await wait(TIMER_DELAYS.allRedBufferMs);

      trafficSystem.eastWest = 'green';
      updateUI();
      logEvent('Cycle: E-W is now GREEN.');
    } else {
      trafficSystem.eastWest = 'yellow';
      trafficSystem.northSouth = 'red';
      updateUI();
      await wait(TIMER_DELAYS.vehicleYellowMs);

      trafficSystem.eastWest = 'red';
      updateUI();
      await wait(TIMER_DELAYS.allRedBufferMs);

      trafficSystem.northSouth = 'green';
      updateUI();
      logEvent('Cycle: N-S is now GREEN.');
    }
  } finally {
    trafficSystem.transitionInProgress = false;
    if (pedestrianBtn) pedestrianBtn.disabled = false;
  }
}

/* Automatic cycle: wait selected green time, then trigger next transition. */
function scheduleNextAutomaticCycle() {
  if (timerState.autoCycleTimeout) {
    clearTimeout(timerState.autoCycleTimeout);
    timerState.autoCycleTimeout = null;
  }

  timerState.autoCycleTimeout = setTimeout(async function () {
    timerState.autoCycleTimeout = null;

    if (trafficSystem.transitionInProgress) {
      scheduleNextAutomaticCycle();
      return;
    }

    await transitionLights();
    scheduleNextAutomaticCycle();
  }, TIMER_DELAYS.mainGreenMs);
}

function restartAutomaticTrafficCycle() {
  scheduleNextAutomaticCycle();
}

/* Keep pedestrian behavior available, but unchanged for timer branch scope. */
async function runPedestrianSequence() {
  if (trafficSystem.transitionInProgress) {
    logEvent('Ignored pedestrian request: transition already in progress.');
    return;
  }

  trafficSystem.transitionInProgress = true;
  if (pedestrianBtn) pedestrianBtn.disabled = true;
  logEvent('Pedestrian request received.');

  try {
    if (trafficSystem.eastWest === 'green') {
      trafficSystem.eastWest = 'yellow';
      trafficSystem.pedestrian = 'red';
      updateUI();
      await wait(TIMER_DELAYS.pedestrianPrepMs);
      trafficSystem.eastWest = 'red';
    } else if (trafficSystem.northSouth === 'green') {
      trafficSystem.northSouth = 'yellow';
      trafficSystem.pedestrian = 'red';
      updateUI();
      await wait(TIMER_DELAYS.pedestrianPrepMs);
      trafficSystem.northSouth = 'red';
    }

    trafficSystem.northSouth = 'red';
    trafficSystem.eastWest = 'red';
    trafficSystem.pedestrian = 'yellow';
    updateUI();
    await wait(TIMER_DELAYS.pedestrianYellowMs);

    trafficSystem.pedestrian = 'green';
    updateUI();
    logEvent('Pedestrian walk signal is GREEN.');
  } finally {
    trafficSystem.transitionInProgress = false;
    if (pedestrianBtn) pedestrianBtn.disabled = false;
  }
}

function handlePedestrianRequest() {
  runPedestrianSequence();
}

function init() {
  pedestrianBtn = document.querySelector('#pedestrian-btn');
  logList = document.querySelector('#log-list');
  timerModeSelect = document.querySelector('#timer-mode');
  timerSecondsInput = document.querySelector('#timer-seconds');
  timerHelpText = document.querySelector('#timer-help-text');

  lightElements.ns.red = document.querySelector('#ns-red');
  lightElements.ns.yellow = document.querySelector('#ns-yellow');
  lightElements.ns.green = document.querySelector('#ns-green');
  lightElements.ew.red = document.querySelector('#ew-red');
  lightElements.ew.yellow = document.querySelector('#ew-yellow');
  lightElements.ew.green = document.querySelector('#ew-green');
  lightElements.ped.red = document.querySelector('#ped-red');
  lightElements.ped.yellow = document.querySelector('#ped-yellow');
  lightElements.ped.green = document.querySelector('#ped-green');

  updateUI();
  logEvent('System ready. N-S Green, E-W Red.');

  if (pedestrianBtn) {
    pedestrianBtn.addEventListener('click', handlePedestrianRequest);
  }
  if (timerModeSelect) {
    timerModeSelect.addEventListener('change', applyTimerSettingsFromControls);
  }
  if (timerSecondsInput) {
    timerSecondsInput.addEventListener('change', applyTimerSettingsFromControls);
    timerSecondsInput.addEventListener('blur', applyTimerSettingsFromControls);
  }

  // Start automatic mode (15 seconds) on load.
  applyTimerSettingsFromControls();
  logEvent('Automatic timer cycle started.');
}

window.addEventListener('beforeunload', clearAllPendingTimers);
init();
