/**
 * Intelligent Traffic Control Dashboard — Pedestrian-Focused Branch
 */

const trafficSystem = {
  northSouth: 'green',
  eastWest: 'red',
  pedestrian: 'red',
  transitionInProgress: false
};

/* PEDESTRIAN STATE */
const pedestrianState = {
  requestQueued: false,
  crossingActive: false,
  clearanceActive: false,
  countdownSeconds: 0,
  walkSeconds: 6,
  clearanceSeconds: 3,
  queuedAt: null,
  resumeDirection: 'ns'
};

const timing = {
  vehicleYellowMs: 3000,
  allRedBufferMs: 1000
};

let transitionBtn = null;
let pedestrianBtn = null;
let logList = null;
let colorButtons = [];

const lightElements = {
  ns: { red: null, yellow: null, green: null },
  ew: { red: null, yellow: null, green: null },
  ped: { red: null, yellow: null, green: null }
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function getActiveVehicleDirection() {
  if (trafficSystem.northSouth === 'green' || trafficSystem.northSouth === 'yellow') return 'ns';
  if (trafficSystem.eastWest === 'green' || trafficSystem.eastWest === 'yellow') return 'ew';
  return null;
}

function setVehicleDirectionGreen(direction) {
  if (direction === 'ew') {
    trafficSystem.northSouth = 'red';
    trafficSystem.eastWest = 'green';
  } else {
    trafficSystem.northSouth = 'green';
    trafficSystem.eastWest = 'red';
  }
  trafficSystem.pedestrian = 'red';
}

/* PEDESTRIAN REQUEST LOGIC */
function refreshPedestrianButtonUI() {
  if (!pedestrianBtn) return;

  if (pedestrianState.crossingActive) {
    pedestrianBtn.textContent = `Walk: ${pedestrianState.countdownSeconds}s`;
    pedestrianBtn.disabled = true;
    return;
  }
  if (pedestrianState.clearanceActive) {
    pedestrianBtn.textContent = `Clearance: ${pedestrianState.countdownSeconds}s`;
    pedestrianBtn.disabled = true;
    return;
  }
  if (pedestrianState.requestQueued) {
    pedestrianBtn.textContent = 'Pedestrian Queued';
    pedestrianBtn.disabled = false;
    return;
  }

  pedestrianBtn.textContent = 'Pedestrian Request';
  pedestrianBtn.disabled = false;
}

function handlePedestrianRequest() {
  if (pedestrianState.requestQueued || pedestrianState.crossingActive || pedestrianState.clearanceActive) {
    logEvent('Ignored pedestrian request: request already queued/active.');
    return;
  }

  pedestrianState.requestQueued = true;
  pedestrianState.queuedAt = Date.now();
  pedestrianState.resumeDirection = getActiveVehicleDirection() || pedestrianState.resumeDirection;
  logEvent('Pedestrian request queued.');
  refreshPedestrianButtonUI();
  processPedestrianRequestQueue();
}

async function runVehicleToAllRedForPedestrian() {
  const activeDirection = getActiveVehicleDirection();
  if (!activeDirection) {
    trafficSystem.northSouth = 'red';
    trafficSystem.eastWest = 'red';
    updateUI();
    return;
  }

  pedestrianState.resumeDirection = activeDirection;
  logEvent(`Pedestrian flow: ${activeDirection.toUpperCase()} vehicles preparing to stop.`);

  if (activeDirection === 'ns') {
    trafficSystem.northSouth = 'yellow';
    trafficSystem.eastWest = 'red';
  } else {
    trafficSystem.eastWest = 'yellow';
    trafficSystem.northSouth = 'red';
  }
  trafficSystem.pedestrian = 'red';
  updateUI();
  await wait(timing.vehicleYellowMs);

  trafficSystem.northSouth = 'red';
  trafficSystem.eastWest = 'red';
  trafficSystem.pedestrian = 'red';
  updateUI();
  await wait(timing.allRedBufferMs);
}

/* PEDESTRIAN COUNTDOWN */
async function runSecondBySecondCountdown(seconds, onTick) {
  pedestrianState.countdownSeconds = seconds;
  onTick(seconds);
  refreshPedestrianButtonUI();

  while (pedestrianState.countdownSeconds > 0) {
    await wait(1000);
    pedestrianState.countdownSeconds -= 1;
    onTick(pedestrianState.countdownSeconds);
    refreshPedestrianButtonUI();
  }
}

/* WALK/DON'T WALK LOGIC */
async function runPedestrianWalkAndDontWalk() {
  pedestrianState.crossingActive = true;
  pedestrianState.clearanceActive = false;

  trafficSystem.pedestrian = 'green';
  updateUI();
  logEvent('Pedestrian signal: WALK (green).');

  await runSecondBySecondCountdown(pedestrianState.walkSeconds, (remaining) => {
    logEvent(`WALK countdown: ${remaining}s`);
  });

  pedestrianState.crossingActive = false;
  pedestrianState.clearanceActive = true;

  trafficSystem.pedestrian = 'yellow';
  updateUI();
  logEvent('Pedestrian signal: DONT WALK (clearance).');

  await runSecondBySecondCountdown(pedestrianState.clearanceSeconds, (remaining) => {
    logEvent(`Clearance countdown: ${remaining}s`);
  });

  trafficSystem.pedestrian = 'red';
  pedestrianState.clearanceActive = false;
  updateUI();
}

/* PEDESTRIAN CLEARANCE FLOW */
async function executePedestrianCrossingFlow() {
  if (!pedestrianState.requestQueued || trafficSystem.transitionInProgress) {
    return;
  }

  trafficSystem.transitionInProgress = true;
  if (transitionBtn) transitionBtn.disabled = true;
  refreshPedestrianButtonUI();

  try {
    logEvent('Pedestrian flow started.');
    await runVehicleToAllRedForPedestrian();
    await runPedestrianWalkAndDontWalk();

    const resumeTo = pedestrianState.resumeDirection === 'ew' ? 'ew' : 'ns';
    setVehicleDirectionGreen(resumeTo);
    updateUI();
    logEvent(`Pedestrian flow complete. Vehicle traffic resumed on ${resumeTo.toUpperCase()}.`);
  } finally {
    pedestrianState.requestQueued = false;
    pedestrianState.countdownSeconds = 0;
    pedestrianState.queuedAt = null;
    trafficSystem.transitionInProgress = false;
    if (transitionBtn) transitionBtn.disabled = false;
    refreshPedestrianButtonUI();
  }
}

function processPedestrianRequestQueue() {
  if (!pedestrianState.requestQueued) return;
  if (pedestrianState.crossingActive || pedestrianState.clearanceActive || trafficSystem.transitionInProgress) return;
  executePedestrianCrossingFlow();
}

async function transitionLights() {
  if (trafficSystem.transitionInProgress) {
    logEvent('Ignored: transition already in progress.');
    return;
  }
  if (pedestrianState.crossingActive || pedestrianState.clearanceActive) {
    logEvent('Ignored: pedestrian phase active.');
    return;
  }

  trafficSystem.transitionInProgress = true;
  if (transitionBtn) transitionBtn.disabled = true;
  logEvent('Manual vehicle transition started.');

  try {
    if (trafficSystem.northSouth === 'green') {
      trafficSystem.northSouth = 'yellow';
      trafficSystem.eastWest = 'red';
      trafficSystem.pedestrian = 'red';
      updateUI();
      await wait(timing.vehicleYellowMs);
      trafficSystem.northSouth = 'red';
      updateUI();
      await wait(timing.allRedBufferMs);
      trafficSystem.eastWest = 'green';
      updateUI();
      pedestrianState.resumeDirection = 'ew';
      logEvent('Vehicle direction switched to E-W green.');
    } else if (trafficSystem.eastWest === 'green') {
      trafficSystem.eastWest = 'yellow';
      trafficSystem.northSouth = 'red';
      trafficSystem.pedestrian = 'red';
      updateUI();
      await wait(timing.vehicleYellowMs);
      trafficSystem.eastWest = 'red';
      updateUI();
      await wait(timing.allRedBufferMs);
      trafficSystem.northSouth = 'green';
      updateUI();
      pedestrianState.resumeDirection = 'ns';
      logEvent('Vehicle direction switched to N-S green.');
    }
  } finally {
    trafficSystem.transitionInProgress = false;
    if (transitionBtn) transitionBtn.disabled = false;
    processPedestrianRequestQueue();
  }
}

function handleLogic() {
  transitionLights();
}

function handleManualColor(direction, color) {
  if (trafficSystem.transitionInProgress || pedestrianState.crossingActive || pedestrianState.clearanceActive) {
    logEvent('Ignored manual change: transition/pedestrian flow in progress.');
    return;
  }

  const isNorthSouth = direction === 'ns';
  const thisKey = isNorthSouth ? 'northSouth' : 'eastWest';
  const otherKey = isNorthSouth ? 'eastWest' : 'northSouth';

  if (
    (color === 'green' || color === 'yellow') &&
    (trafficSystem[otherKey] === 'green' || trafficSystem[otherKey] === 'yellow')
  ) {
    logEvent(`Ignored manual ${direction.toUpperCase()} ${color}: other direction not red.`);
    return;
  }

  trafficSystem[thisKey] = color;
  if (color === 'green' || color === 'yellow') {
    trafficSystem.pedestrian = 'red';
    pedestrianState.resumeDirection = isNorthSouth ? 'ns' : 'ew';
  }
  updateUI();
  logEvent(`Manual override: ${direction.toUpperCase()} → ${color.toUpperCase()}.`);
}

function init() {
  transitionBtn = document.querySelector('#transition-btn');
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

  updateUI();
  refreshPedestrianButtonUI();
  logEvent('System ready. Pedestrian flow manager active.');

  if (transitionBtn) {
    transitionBtn.addEventListener('click', handleLogic);
  }
  if (pedestrianBtn) {
    pedestrianBtn.addEventListener('click', handlePedestrianRequest);
  }

  colorButtons.forEach((btn) => {
    const dir = btn.getAttribute('data-dir');
    const color = btn.getAttribute('data-color');
    btn.addEventListener('click', () => handleManualColor(dir, color));
  });
}

init();
