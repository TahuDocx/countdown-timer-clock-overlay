const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlay', {
  update: (payload) => ipcRenderer.send('overlay:update', payload),
  setVisible: (visible) => ipcRenderer.send('overlay:visible', visible),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (data) => ipcRenderer.send('settings:save', data),
});
