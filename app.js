/**
 * Intelligent Traffic Control Dashboard — Timer-Focused Branch
 * This branch centers on countdown state, timer loop, and control behavior.
 */

const trafficSystem = {
  northSouth: 'green',
  eastWest: 'red',
  pedestrian: 'red',
  transitionInProgress: false
};

/* TIMER STATE */
const timerState = {
  mode: 'automatic',
  autoDefaultSeconds: 15,
  customSeconds: 15,
  activeSeconds: 15,
  greenSeconds: 15,
  yellowSeconds: 3,
  redSeconds: 3,
  pedestrianSeconds: 0,
  pedestrianSafeWaitSeconds: 7,
  pedestrianRequested: false,
  pedestrianActive: false,
  pedestrianWaitLane: null,
  phase: 'ns_green',
  phaseRemaining: 15,
  intervalId: null,
  isRunning: false,
  isPaused: false
};

let pedestrianBtn = null;
let logList = null;
let timerModeSelect = null;
let timerSecondsInput = null;
let timerHelpText = null;
let timerPauseBtn = null;
let timerRestartBtn = null;
let timerResetBtn = null;
let timerStopBtn = null;
let timerPhaseLabel = null;
let countGreen = null;
let countYellow = null;
let countRed = null;
let countPed = null;

const lightElements = {
  ns: { red: null, yellow: null, green: null },
  ew: { red: null, yellow: null, green: null },
  ped: { red: null, yellow: null, green: null }
};

function logEvent(message) {
  if (!logList) return;
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  li.innerHTML = `<span class="log-time">[${time}]</span>${message}`;
  logList.appendChild(li);
  logList.scrollTop = logList.scrollHeight;
}

function sanitizeSeconds(value, fallbackSeconds) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackSeconds;
  return Math.max(1, Math.round(parsed));
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

function getPhaseLabel(phase) {
  switch (phase) {
    case 'ns_green':
      return 'Phase: N-S Green';
    case 'ns_yellow':
      return 'Phase: N-S Yellow';
    case 'ew_green':
      return 'Phase: E-W Green';
    case 'ew_yellow':
      return 'Phase: E-W Yellow';
    case 'ped_walk':
      return 'Phase: Pedestrian Walk';
    case 'ped_wait':
      return 'Phase: Pedestrian Wait (Cars Moving)';
    default:
      return 'Phase: Idle';
  }
}

/* COUNTDOWN DISPLAY */
function updateCountdownDisplay() {
  if (!timerPhaseLabel || !countGreen || !countYellow || !countRed || !countPed) return;

  timerPhaseLabel.textContent = getPhaseLabel(timerState.phase);

  const green = (timerState.phase === 'ns_green' || timerState.phase === 'ew_green')
    ? timerState.phaseRemaining
    : 0;
  const yellow = (timerState.phase === 'ns_yellow' || timerState.phase === 'ew_yellow')
    ? timerState.phaseRemaining
    : 0;
  const pedestrian = (timerState.phase === 'ped_walk' || timerState.phase === 'ped_wait')
    ? timerState.phaseRemaining
    : 0;
  const red = (timerState.phase === 'ns_green' || timerState.phase === 'ns_yellow' || timerState.phase === 'ped_walk')
    ? timerState.redSeconds
    : timerState.phaseRemaining;

  countGreen.textContent = `${green}s`;
  countYellow.textContent = `${yellow}s`;
  countRed.textContent = `${Math.max(0, red)}s`;
  countPed.textContent = `${pedestrian}s`;
}

function applyPhaseState() {
  switch (timerState.phase) {
    case 'ns_green':
      trafficSystem.northSouth = 'green';
      trafficSystem.eastWest = 'red';
      trafficSystem.pedestrian = 'red';
      break;
    case 'ns_yellow':
      trafficSystem.northSouth = 'yellow';
      trafficSystem.eastWest = 'red';
      trafficSystem.pedestrian = 'red';
      break;
    case 'ew_green':
      trafficSystem.northSouth = 'red';
      trafficSystem.eastWest = 'green';
      trafficSystem.pedestrian = 'red';
      break;
    case 'ew_yellow':
      trafficSystem.northSouth = 'red';
      trafficSystem.eastWest = 'yellow';
      trafficSystem.pedestrian = 'red';
      break;
    case 'ped_walk':
      trafficSystem.northSouth = 'red';
      trafficSystem.eastWest = 'red';
      trafficSystem.pedestrian = 'green';
      break;
    case 'ped_wait':
      if (timerState.pedestrianWaitLane === 'ns') {
        trafficSystem.northSouth = 'green';
        trafficSystem.eastWest = 'red';
      } else {
        trafficSystem.northSouth = 'red';
        trafficSystem.eastWest = 'green';
      }
      trafficSystem.pedestrian = 'red';
      break;
    default:
      trafficSystem.northSouth = 'red';
      trafficSystem.eastWest = 'red';
      trafficSystem.pedestrian = 'red';
  }

  updateUI();
  updateCountdownDisplay();
}

function getNextPhase(currentPhase) {
  switch (currentPhase) {
    case 'ns_green':
      return 'ns_yellow';
    case 'ns_yellow':
      return 'ew_green';
    case 'ew_green':
      return 'ew_yellow';
    case 'ew_yellow':
      return 'ns_green';
    case 'ped_wait':
      return 'ped_walk';
    case 'ped_walk':
      return timerState.pedestrianWaitLane === 'ns' ? 'ew_green' : 'ns_green';
    default:
      return 'ns_green';
  }
}

function getSecondsForPhase(phase) {
  if (phase === 'ns_green' || phase === 'ew_green') return timerState.greenSeconds;
  if (phase === 'ns_yellow' || phase === 'ew_yellow') return timerState.yellowSeconds;
  if (phase === 'ped_wait') return timerState.pedestrianSafeWaitSeconds;
  if (phase === 'ped_walk') return timerState.pedestrianSeconds;
  return timerState.greenSeconds;
}

function advanceToNextPhase() {
  const previousPhase = timerState.phase;

  if (
    timerState.pedestrianRequested &&
    !timerState.pedestrianActive &&
    (timerState.phase === 'ns_green' || timerState.phase === 'ew_green')
  ) {
    timerState.pedestrianActive = true;
    timerState.pedestrianWaitLane = timerState.phase === 'ns_green' ? 'ns' : 'ew';
    timerState.phase = 'ped_wait';
    timerState.phaseRemaining = timerState.pedestrianSafeWaitSeconds;
    trafficSystem.transitionInProgress = true;
    applyPhaseState();
    logEvent(`Pedestrian safety countdown started (${timerState.pedestrianSafeWaitSeconds}s).`);
    return;
  }

  timerState.phase = getNextPhase(timerState.phase);
  timerState.phaseRemaining = getSecondsForPhase(timerState.phase);
  if (previousPhase === 'ped_walk') {
    trafficSystem.transitionInProgress = false;
    timerState.pedestrianActive = false;
    timerState.pedestrianRequested = false;
    timerState.pedestrianWaitLane = null;
    logEvent('Pedestrian phase ended. Resuming normal traffic cycle.');
  }
  applyPhaseState();

  if (timerState.phase === 'ns_green') {
    logEvent('Cycle: N-S is now GREEN.');
  } else if (timerState.phase === 'ew_green') {
    logEvent('Cycle: E-W is now GREEN.');
  }
}

/* TIMER LOOP */
function runTimerTick() {
  if (!timerState.isRunning || timerState.isPaused) {
    return;
  }

  timerState.phaseRemaining -= 1;
  if (timerState.phaseRemaining <= 0) {
    advanceToNextPhase();
    return;
  }

  if (timerState.phase === 'ped_wait') {
    logEvent(`Pedestrian safety countdown: ${timerState.phaseRemaining}s remaining.`);
  }

  updateCountdownDisplay();
}

function startTimerLoop() {
  clearInterval(timerState.intervalId);
  timerState.intervalId = setInterval(runTimerTick, 1000);
  timerState.isRunning = true;
  timerState.isPaused = false;
}

function stopTimerLoop() {
  clearInterval(timerState.intervalId);
  timerState.intervalId = null;
  timerState.isRunning = false;
}

function setCycleTimingFromSeconds(seconds) {
  const safeSeconds = sanitizeSeconds(seconds, timerState.autoDefaultSeconds);
  timerState.activeSeconds = safeSeconds;
  timerState.greenSeconds = safeSeconds;
  timerState.yellowSeconds = Math.max(2, Math.round(safeSeconds * 0.2));
  timerState.redSeconds = timerState.greenSeconds + timerState.yellowSeconds;
  timerState.pedestrianSeconds = Math.max(4, Math.round(safeSeconds * 0.3));
}

function refreshTimerControlUI() {
  if (!timerModeSelect || !timerSecondsInput || !timerHelpText || !timerPauseBtn) return;

  const isAutomatic = timerState.mode === 'automatic';
  timerSecondsInput.disabled = isAutomatic;

  if (isAutomatic) {
    timerSecondsInput.value = String(timerState.autoDefaultSeconds);
    timerHelpText.textContent = 'Automatic mode uses 15 seconds per green phase.';
  } else {
    timerHelpText.textContent = `Custom mode uses ${timerState.activeSeconds} seconds per green phase.`;
  }

  timerPauseBtn.textContent = timerState.isPaused ? 'Resume' : 'Pause';
}

function applyTimerSettingsFromControls() {
  if (!timerModeSelect || !timerSecondsInput) return;

  timerState.mode = timerModeSelect.value === 'custom' ? 'custom' : 'automatic';
  if (timerState.mode === 'automatic') {
    setCycleTimingFromSeconds(timerState.autoDefaultSeconds);
  } else {
    const validSeconds = sanitizeSeconds(timerSecondsInput.value, timerState.customSeconds);
    timerState.customSeconds = validSeconds;
    timerSecondsInput.value = String(validSeconds);
    setCycleTimingFromSeconds(validSeconds);
  }

  restartTimerLoop();
  refreshTimerControlUI();
  logEvent(`Timer updated: ${timerState.activeSeconds}s green phase.`);
}

/* TIMER RESET/STOP */
function resetTimerState() {
  stopTimerLoop();
  timerState.pedestrianRequested = false;
  timerState.pedestrianActive = false;
  timerState.pedestrianWaitLane = null;
  timerState.phase = 'ns_green';
  timerState.phaseRemaining = timerState.greenSeconds;
  timerState.isPaused = false;
  trafficSystem.transitionInProgress = false;
  applyPhaseState();
  refreshTimerControlUI();
}

function pauseOrResumeTimerLoop() {
  if (!timerState.isRunning) {
    startTimerLoop();
    logEvent('Timer started from paused/stopped state.');
    refreshTimerControlUI();
    return;
  }

  timerState.isPaused = !timerState.isPaused;
  logEvent(timerState.isPaused ? 'Timer paused.' : 'Timer resumed.');
  refreshTimerControlUI();
}

function stopTimerState() {
  stopTimerLoop();
  timerState.isPaused = false;
  timerState.pedestrianRequested = false;
  timerState.pedestrianActive = false;
  timerState.pedestrianWaitLane = null;
  timerState.phase = 'ns_green';
  timerState.phaseRemaining = timerState.greenSeconds;
  trafficSystem.northSouth = 'red';
  trafficSystem.eastWest = 'red';
  trafficSystem.pedestrian = 'red';
  updateUI();
  updateCountdownDisplay();
  refreshTimerControlUI();
  logEvent('Timer stopped. All signals set to red.');
}

function restartTimerLoop() {
  resetTimerState();
  startTimerLoop();
  refreshTimerControlUI();
  logEvent('Timer restarted.');
}

function runPedestrianSequence() {
  if (timerState.pedestrianRequested || timerState.pedestrianActive || timerState.phase === 'ped_walk' || timerState.phase === 'ped_wait') {
    logEvent('Ignored pedestrian request: request already pending/active.');
    return;
  }
  if (!timerState.isRunning || timerState.isPaused) {
    logEvent('Ignored pedestrian request: timer is not actively running.');
    return;
  }

  timerState.pedestrianRequested = true;
  logEvent('Pedestrian request queued. Waiting for safe traffic phase.');
}

function init() {
  pedestrianBtn = document.querySelector('#pedestrian-btn');
  logList = document.querySelector('#log-list');
  timerModeSelect = document.querySelector('#timer-mode');
  timerSecondsInput = document.querySelector('#timer-seconds');
  timerHelpText = document.querySelector('#timer-help-text');
  timerPauseBtn = document.querySelector('#timer-pause-btn');
  timerRestartBtn = document.querySelector('#timer-restart-btn');
  timerResetBtn = document.querySelector('#timer-reset-btn');
  timerStopBtn = document.querySelector('#timer-stop-btn');
  timerPhaseLabel = document.querySelector('#timer-phase-label');
  countGreen = document.querySelector('#count-green');
  countYellow = document.querySelector('#count-yellow');
  countRed = document.querySelector('#count-red');
  countPed = document.querySelector('#count-ped');

  lightElements.ns.red = document.querySelector('#ns-red');
  lightElements.ns.yellow = document.querySelector('#ns-yellow');
  lightElements.ns.green = document.querySelector('#ns-green');
  lightElements.ew.red = document.querySelector('#ew-red');
  lightElements.ew.yellow = document.querySelector('#ew-yellow');
  lightElements.ew.green = document.querySelector('#ew-green');
  lightElements.ped.red = document.querySelector('#ped-red');
  lightElements.ped.yellow = document.querySelector('#ped-yellow');
  lightElements.ped.green = document.querySelector('#ped-green');

  setCycleTimingFromSeconds(timerState.autoDefaultSeconds);
  resetTimerState();
  logEvent('System ready. N-S Green, E-W Red.');

  if (pedestrianBtn) pedestrianBtn.addEventListener('click', runPedestrianSequence);
  if (timerModeSelect) timerModeSelect.addEventListener('change', applyTimerSettingsFromControls);
  if (timerSecondsInput) {
    timerSecondsInput.addEventListener('change', applyTimerSettingsFromControls);
    timerSecondsInput.addEventListener('blur', applyTimerSettingsFromControls);
  }
  if (timerPauseBtn) timerPauseBtn.addEventListener('click', pauseOrResumeTimerLoop);
  if (timerRestartBtn) timerRestartBtn.addEventListener('click', restartTimerLoop);
  if (timerResetBtn) timerResetBtn.addEventListener('click', resetTimerState);
  if (timerStopBtn) timerStopBtn.addEventListener('click', stopTimerState);

  startTimerLoop();
  refreshTimerControlUI();
  logEvent('Automatic timer cycle started.');
}

window.addEventListener('beforeunload', stopTimerLoop);
init();
