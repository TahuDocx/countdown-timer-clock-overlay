const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

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
    width: 420,
    height: 560,
    title: 'Countdown Control',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-control.js'),
      contextIsolation: true,
      nodeIntegration: false,
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
