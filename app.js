/**
 * Intelligent Traffic Control Dashboard — Traffic-Light-Focused Branch
 */

/* TRAFFIC LIGHT STATE */
const trafficSystem = {
  northSouth: 'green',
  eastWest: 'red',
  pedestrian: 'red',
  transitionInProgress: false
};

const trafficControl = {
  currentPhase: 'ns_green',
  isRunning: false,
  intervalId: null,
  tickSecondsRemaining: 0,
  greenSeconds: 8,
  yellowSeconds: 3
};

let transitionBtn = null;
let startSimBtn = null;
let stopSimBtn = null;
let pedestrianBtn = null;
let logList = null;
let colorButtons = [];

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

/* NORTH-SOUTH FLOW */
function applyNorthSouthFlow(color) {
  trafficSystem.northSouth = color;
  if (color === 'green' || color === 'yellow') {
    trafficSystem.eastWest = 'red';
  }
  trafficSystem.pedestrian = 'red';
}

/* EAST-WEST FLOW */
function applyEastWestFlow(color) {
  trafficSystem.eastWest = color;
  if (color === 'green' || color === 'yellow') {
    trafficSystem.northSouth = 'red';
  }
  trafficSystem.pedestrian = 'red';
}

function applyCurrentPhaseToLights() {
  switch (trafficControl.currentPhase) {
    case 'ns_green':
      applyNorthSouthFlow('green');
      break;
    case 'ns_yellow':
      applyNorthSouthFlow('yellow');
      break;
    case 'ew_green':
      applyEastWestFlow('green');
      break;
    case 'ew_yellow':
      applyEastWestFlow('yellow');
      break;
    default:
      applyNorthSouthFlow('green');
      trafficControl.currentPhase = 'ns_green';
  }
}

function getNextPhase(phase) {
  if (phase === 'ns_green') return 'ns_yellow';
  if (phase === 'ns_yellow') return 'ew_green';
  if (phase === 'ew_green') return 'ew_yellow';
  return 'ns_green';
}

function getPhaseDurationSeconds(phase) {
  if (phase === 'ns_green' || phase === 'ew_green') return trafficControl.greenSeconds;
  return trafficControl.yellowSeconds;
}

/* SIGNAL TRANSITION LOGIC */
function transitionLights() {
  if (trafficSystem.transitionInProgress) {
    logEvent('Ignored traffic transition: already in progress.');
    return;
  }

  trafficSystem.transitionInProgress = true;
  trafficControl.currentPhase = getNextPhase(trafficControl.currentPhase);
  trafficControl.tickSecondsRemaining = getPhaseDurationSeconds(trafficControl.currentPhase);
  applyCurrentPhaseToLights();
  updateUI();

  logEvent(`Phase switched: ${trafficControl.currentPhase.replace('_', ' ').toUpperCase()}.`);
  trafficSystem.transitionInProgress = false;
}

function runSimulationTick() {
  if (!trafficControl.isRunning) return;

  trafficControl.tickSecondsRemaining -= 1;
  if (trafficControl.tickSecondsRemaining > 0) {
    return;
  }

  transitionLights();
}

/* START/STOP CONTROL */
function startSimulation() {
  if (trafficControl.isRunning) {
    logEvent('Simulation already running.');
    return;
  }

  trafficControl.isRunning = true;
  trafficControl.tickSecondsRemaining = getPhaseDurationSeconds(trafficControl.currentPhase);
  clearInterval(trafficControl.intervalId);
  trafficControl.intervalId = setInterval(runSimulationTick, 1000);
  logEvent('Traffic simulation started.');
}

function stopSimulation() {
  if (!trafficControl.isRunning) {
    logEvent('Simulation already stopped.');
    return;
  }

  trafficControl.isRunning = false;
  clearInterval(trafficControl.intervalId);
  trafficControl.intervalId = null;
  logEvent('Traffic simulation stopped.');
}

function handleLogic() {
  transitionLights();
}

function runPedestrianSequence() {
  logEvent('Pedestrian handling minimized in tLight branch.');
}

function handlePedestrianRequest() {
  runPedestrianSequence();
}

function handleManualColor(direction, color) {
  if (trafficSystem.transitionInProgress) {
    logEvent('Ignored manual change: transition in progress.');
    return;
  }

  const isNorthSouth = direction === 'ns';
  const thisKey = isNorthSouth ? 'northSouth' : 'eastWest';
  const otherKey = isNorthSouth ? 'eastWest' : 'northSouth';

  if ((color === 'green' || color === 'yellow') &&
      (trafficSystem[otherKey] === 'green' || trafficSystem[otherKey] === 'yellow')) {
    logEvent(`Ignored manual ${direction.toUpperCase()} ${color}: other direction not fully red.`);
    return;
  }

  trafficSystem[thisKey] = color;
  if (color === 'green' || color === 'yellow') {
    trafficSystem.pedestrian = 'red';
  }
  updateUI();

  if (direction === 'ns') {
    trafficControl.currentPhase = color === 'green' ? 'ns_green' : color === 'yellow' ? 'ns_yellow' : 'ew_green';
  } else {
    trafficControl.currentPhase = color === 'green' ? 'ew_green' : color === 'yellow' ? 'ew_yellow' : 'ns_green';
  }
  trafficControl.tickSecondsRemaining = getPhaseDurationSeconds(trafficControl.currentPhase);

  logEvent(`Manual override: ${direction.toUpperCase()} → ${color[0].toUpperCase()}${color.slice(1)}.`);
}

function init() {
  transitionBtn = document.querySelector('#transition-btn');
  startSimBtn = document.querySelector('#start-sim-btn');
  stopSimBtn = document.querySelector('#stop-sim-btn');
  pedestrianBtn = document.querySelector('#pedestrian-btn');
  logList = document.querySelector('#log-list');
  colorButtons = Array.from(document.querySelectorAll('.color-btn'));

  lightElements.ns.red = document.querySelector('#ns-red');
  lightElements.ns.yellow = document.querySelector('#ns-yellow');
  lightElements.ns.green = document.querySelector('#ns-green');
  lightElements.ew.red = document.querySelector('#ew-red');
  lightElements.ew.yellow = document.querySelector('#ew-yellow');
  lightElements.ew.green = document.querySelector('#ew-green');
  lightElements.ped.red = document.querySelector('#ped-red');
  lightElements.ped.yellow = document.querySelector('#ped-yellow');
  lightElements.ped.green = document.querySelector('#ped-green');

  applyCurrentPhaseToLights();
  trafficControl.tickSecondsRemaining = getPhaseDurationSeconds(trafficControl.currentPhase);
  updateUI();
  logEvent('System ready. Traffic light branch active (N-S starts green).');

  if (transitionBtn) transitionBtn.addEventListener('click', handleLogic);
  if (startSimBtn) startSimBtn.addEventListener('click', startSimulation);
  if (stopSimBtn) stopSimBtn.addEventListener('click', stopSimulation);
  if (pedestrianBtn) pedestrianBtn.addEventListener('click', handlePedestrianRequest);

  colorButtons.forEach((btn) => {
    const dir = btn.getAttribute('data-dir');
    const color = btn.getAttribute('data-color');
    btn.addEventListener('click', () => handleManualColor(dir, color));
  });
}

window.addEventListener('beforeunload', stopSimulation);
init();
