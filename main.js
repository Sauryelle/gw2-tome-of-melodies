const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.setMenu(null);

    // NEW: Listen for 'Always on Top' requests from the UI
    ipcMain.on('toggle-always-on-top', (event, isAlwaysOnTop) => {
        win.setAlwaysOnTop(isAlwaysOnTop);
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    // Silently check for updates in the background
    autoUpdater.checkForUpdatesAndNotify();
});// ... rest of main.js
