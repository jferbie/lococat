/* app.js — DefaultCab v2.6 (dark) BLE code + single-screen layout */

(function DefaultCabV2() {
  'use strict';

  /* BLE UUIDs (original) */
  const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
  const WRITE_UUID   = "19b10002-e8f2-537e-4f6c-d104768a1214";
  const NOTIFY_UUID  = "19b10001-e8f2-537e-4f6c-d104768a1214";

  let device = null;
  let server = null;
  let service = null;
  let writeChar = null;
  let notifyChar = null;
  let isConnected = false;

  let lastWriteTs = 0;
  const WRITE_MIN_INTERVAL_MS = 120;

  const $id = id => document.getElementById(id);

  /* Cached elements */
  const runTab = $id('runTab');
  const runScreen = $id('runScreen');
  const leftCol = $id('leftCol');
  const rightCol = $id('rightCol');

  const throttle = $id('throttle');
  const throttleVal = $id('throttleVal');
  const throttleOutput = $id('throttleOutput');
  const analog = $id('analog');
  const speedEl = $id('speed');

  const forwardBtn = $id('forwardBtn');
  const reverseBtn = $id('reverseBtn');
  const stopBtn = $id('stopBtn');

  const a1Btn = $id('a1Btn');
  const a2Btn = $id('a2Btn');

  const saveSettingsBtn = $id('saveSettings');
  const boostPower = $id('boostPower');
  const boostDuration = $id('boostDuration');
  const dirDelay = $id('dirDelay');
  const locoNameInput = $id('locoNameInput');
  const locoNameEl = $id('locoName');

  /* UI: tabs */
  function useSingleColumnRunLayout() {
    try {
      const narrow = window.matchMedia('(max-width: 900px)').matches;
      const coarsePortrait = window.matchMedia('(pointer: coarse) and (orientation: portrait)').matches;
      return narrow || coarsePortrait;
    } catch (e) {
      return (window.innerWidth || 1200) <= 900;
    }
  }

  function applyRunLayout() {
    if (!runScreen) return;
    const single = useSingleColumnRunLayout();

    if (single) {
      runScreen.style.display = 'flex';
      runScreen.style.flexDirection = 'column';
      runScreen.style.gridTemplateColumns = 'unset';
      runScreen.style.height = 'auto';

      if (leftCol) leftCol.style.order = '1';
      if (rightCol) {
        rightCol.style.order = '2';
        rightCol.style.maxHeight = 'none';
        rightCol.style.overflow = 'visible';
      }
      return;
    }

    runScreen.style.display = 'grid';
    runScreen.style.flexDirection = '';
    runScreen.style.gridTemplateColumns = '70fr 30fr';
    runScreen.style.height = '';

    if (leftCol) leftCol.style.order = '';
    if (rightCol) {
      rightCol.style.order = '';
      rightCol.style.maxHeight = '';
      rightCol.style.overflow = '';
    }
  }

  function showRun() {
    applyRunLayout();
    if (runTab) runTab.classList.add('active');
  }
  if (runTab) runTab.addEventListener('click', showRun);

  window.addEventListener('resize', applyRunLayout);
  window.addEventListener('orientationchange', applyRunLayout);

  /* Connection UI */
  function updateConnectionUI(connected) {
    const status = $id('status');
    const connectBtn = $id('connectBtn');
    const deviceNameEl = $id('deviceName');
    if (!status || !connectBtn) return;
    if (connected) {
      status.textContent = 'Connected';
      connectBtn.textContent = 'Disconnect';
      if (device && deviceNameEl) deviceNameEl.textContent = device.name || 'Device';
      isConnected = true;
    } else {
      status.textContent = 'Disconnected';
      connectBtn.textContent = 'Connect';
      if (deviceNameEl) deviceNameEl.textContent = '—';
      isConnected = false;
    }
  }

  /* BLE functions */
  async function connectBLE() {
    if (!navigator.bluetooth) {
      console.warn('Web Bluetooth not available');
      return;
    }
    try {
      device = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }] });
      if (!device) return;
      device.addEventListener && device.addEventListener('gattserverdisconnected', onDisconnected);
      server = await device.gatt.connect();
      service = await server.getPrimaryService(SERVICE_UUID);
      writeChar = await service.getCharacteristic(WRITE_UUID);
      notifyChar = await service.getCharacteristic(NOTIFY_UUID);
      if (notifyChar && notifyChar.startNotifications) {
        await notifyChar.startNotifications();
        notifyChar.addEventListener('characteristicvaluechanged', handleNotify);
      }
      updateConnectionUI(true);
    } catch (err) {
      console.error('BLE connect error', err);
      onDisconnected();
    }
  }

  function onDisconnected() {
    isConnected = false;
    server = null; service = null; writeChar = null; notifyChar = null;
    updateConnectionUI(false);
  }

  function disconnectBLE() {
    try {
      if (device && device.gatt && device.gatt.connected) device.gatt.disconnect();
    } catch (err) {
      console.error('BLE disconnect error', err);
    } finally {
      onDisconnected();
    }
  }

  function handleNotify(event) {
    try {
      const raw = event.target && event.target.value ? event.target.value : event.target;
      const text = new TextDecoder().decode(raw);
      const parts = String(text).split(',');
      const speed = parts[1] ? (parts[1].split(':')[1] || '') : '';
      if (speedEl) speedEl.textContent = speed;
      console.log('Notify:', text.trim());
    } catch (err) {
      console.error('handleNotify error:', err);
    }
  }

  async function sendCommand(cmd) {
    try {
      if (!writeChar || !isConnected) {
        console.log('[sendCommand - no BLE]', cmd);
        return;
      }
      const now = Date.now();
      if (now - lastWriteTs < WRITE_MIN_INTERVAL_MS) return;
      lastWriteTs = now;
      await writeChar.writeValue(new TextEncoder().encode(String(cmd)));
    } catch (err) {
      console.error('sendCommand error', err);
    }
  }

  /* Wire connect button */
  (function wireConnectBtn() {
    const btn = $id('connectBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!isConnected) connectBLE();
      else disconnectBLE();
    });
  })();

  /* Throttle dial module omitted here for brevity — page includes the throttle slider used by the standalone HTML version */

})();
