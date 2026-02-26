const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
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

    // Just check for updates, do NOT download them automatically
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();
});

// --- NEW: NOTIFY USER OF UPDATE ---
autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
        type: 'info',
        title: 'New Tome Available!',
        message: `Version ${info.version} of Tome of Melodies has been scribed! Would you like to download it now?`,
        buttons: ['Yes, take me to GitHub', 'Maybe Later'],
        defaultId: 0,
            cancelId: 1
    }).then((result) => {
        if (result.response === 0) {
            // Opens the user's web browser to your latest release
            shell.openExternal('https://github.com/Sauryelle/gw2-tome-of-melodies/releases/latest');
        }
    });
});
