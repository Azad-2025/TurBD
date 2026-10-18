/**
 * TurfBD Desktop Preload Script
 * Exposes safe desktop runtime information to the React frontend
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('turfbdDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: '1.2.0',
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
