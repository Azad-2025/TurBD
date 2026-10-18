/**
 * TurfBD Desktop Application - Electron Main Process
 * 
 * Architecture:
 * - Connects to the central TurfBD Cloud API & PostgreSQL database.
 * - Single source of truth: All Customer, Owner, and Admin desktop clients
 *   share live booking and slot data in real-time.
 * - Windows native frame with custom menu and auto-reconnect.
 */

const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');

// Central production server URL (default to live cloud app or local development)
const DEFAULT_CENTRAL_SERVER_URL = process.env.TURFBD_SERVER_URL || 'https://ais-dev-gda2ineaurcm7ph24rdq2u-892795556144.asia-southeast1.run.app';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'TurfBD - Sports Arena & Slot Booking Platform',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
    autoHideMenuBar: false,
    backgroundColor: '#0F172A',
    show: false,
  });

  // Determine URL to load:
  // In development: local dev server or central cloud server
  // In production installer: packaged frontend with central API backend
  const startUrl = process.env.ELECTRON_START_URL || DEFAULT_CENTRAL_SERVER_URL;

  console.log(`[TurfBD Desktop] Connecting to central TurfBD platform: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle external links securely in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle network failure or disconnection
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[TurfBD Desktop] Failed to load ${startUrl}: ${errorDescription} (${errorCode})`);
    
    // If connection dropped, show friendly offline retry screen
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TurfBD - Connection Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0F172A;
              color: #F8FAFC;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
              padding: 20px;
            }
            .card {
              background: #1E293B;
              padding: 40px;
              border-radius: 16px;
              border: 1px solid #334155;
              max-width: 480px;
            }
            h1 { color: #0FA958; font-size: 24px; margin-bottom: 12px; }
            p { color: #94A3B8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
            button {
              background-color: #0FA958;
              color: white;
              border: none;
              padding: 12px 24px;
              font-weight: 600;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              transition: background-color 0.2s;
            }
            button:hover { background-color: #0b8a46; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>TurfBD Desktop</h1>
            <p>Could not reach the central TurfBD booking servers. Please check your internet connection and try again.</p>
            <button onclick="window.location.href='${startUrl}'">Retry Connection</button>
          </div>
        </body>
      </html>
    `)}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock so multiple copies of TurfBD aren't running simultaneously
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
