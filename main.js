const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Prevent Chromium from throttling/suspending timers and renderers when the
// windows are backgrounded or fully occluded (e.g. behind EasyWorship).
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

let controlWin = null;
let outputWin = null;

function pickOutputDisplay() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find((d) => d.id !== primary.id);
  return external || primary;
}

function createControlWindow() {
  controlWin = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 800,
    minHeight: 560,
    title: 'Countdown Control',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-control.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Timer engine lives here; keep it ticking when minimized/occluded.
      backgroundThrottling: false,
    },
  });
  controlWin.removeMenu();
  controlWin.loadFile('control.html');
  controlWin.on('closed', () => {
    controlWin = null;
    if (outputWin && !outputWin.isDestroyed()) outputWin.close();
  });
}

function createOutputWindow() {
  const display = pickOutputDisplay();
  const { x, y, width, height } = display.bounds;

  outputWin = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    fullscreen: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-output.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep rendering when the presentation app covers this overlay.
      backgroundThrottling: false,
    },
  });

  outputWin.setIgnoreMouseEvents(true);
  outputWin.setAlwaysOnTop(true, 'screen-saver');
  outputWin.setVisibleOnAllWorkspaces(true);
  outputWin.loadFile('output.html');
  // Use setBounds to cover the full display, then fullscreen.
  outputWin.setBounds(display.bounds);
  // Restore the last known state after a (re)load so a recreated overlay
  // picks up where the dead one left off.
  outputWin.webContents.on('did-finish-load', () => {
    if (lastFrame) outputWin.webContents.send('overlay:update', lastFrame);
    outputWin.webContents.send('overlay:visible', lastVisible);
  });
  // Renderer crash doesn't fire 'closed'; drop the window so the next
  // relay recreates it.
  outputWin.webContents.on('render-process-gone', () => {
    if (outputWin && !outputWin.isDestroyed()) outputWin.destroy();
    outputWin = null;
  });
  outputWin.on('closed', () => {
    outputWin = null;
  });
}

app.whenReady().then(() => {
  createControlWindow();
  createOutputWindow();

  // Displays can come and go mid-show; move the overlay to the best one.
  const repositionOutput = () => {
    if (!outputWin || outputWin.isDestroyed()) return;
    outputWin.setBounds(pickOutputDisplay().bounds);
  };
  screen.on('display-added', repositionOutput);
  screen.on('display-removed', repositionOutput);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
      createOutputWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

// Relay control -> output. Last state is cached so a lost overlay window
// (crash, unexpected close) is recreated and repopulated on the next relay.
let lastFrame = null;
let lastVisible = false;

function ensureOutputWindow() {
  if (!outputWin || outputWin.isDestroyed()) createOutputWindow();
}

ipcMain.on('overlay:update', (_evt, payload) => {
  lastFrame = payload;
  ensureOutputWindow();
  outputWin.webContents.send('overlay:update', payload);
});

ipcMain.on('overlay:visible', (_evt, visible) => {
  lastVisible = visible;
  ensureOutputWindow();
  outputWin.webContents.send('overlay:visible', visible);
});

// --- Settings persistence ---
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let saveTimer = null;

ipcMain.handle('settings:load', () => {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return null; // missing or corrupt -> use control defaults
  }
});

ipcMain.on('settings:save', (_evt, data) => {
  // Debounce: slider drags fire rapidly.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(settingsFile(), JSON.stringify(data, null, 2));
    } catch {
      /* ignore write errors (e.g. disk full); settings are non-critical */
    }
  }, 300);
});
