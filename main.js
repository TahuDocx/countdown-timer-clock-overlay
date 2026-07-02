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
    width: 640,
    height: 660,
    minWidth: 560,
    minHeight: 520,
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
  outputWin.on('closed', () => {
    outputWin = null;
  });
}

app.whenReady().then(() => {
  createControlWindow();
  createOutputWindow();

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

// Relay control -> output.
ipcMain.on('overlay:update', (_evt, payload) => {
  if (outputWin && !outputWin.isDestroyed()) {
    outputWin.webContents.send('overlay:update', payload);
  }
});

ipcMain.on('overlay:visible', (_evt, visible) => {
  if (outputWin && !outputWin.isDestroyed()) {
    outputWin.webContents.send('overlay:visible', visible);
  }
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
