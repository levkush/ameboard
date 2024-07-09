const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require("path");
const { spawn } = require('child_process');
const autoUpdater = require("electron-updater");

require('electron-reload')(__dirname);

let daemon; // Declare daemon variable in the global scope
let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1275,
        height: 827,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js'),
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('src/index.html');
}

async function startDaemon() {
    const daemonPath = path.join(process.resourcesPath, 'daemon.exe');
    daemon = spawn(daemonPath);

    daemon.on('error', (err) => {
        console.error('Failed to start daemon:', err);
    });

    daemon.stdout.on('data', (data) => {
        console.log(`Daemon output: ${data}`);
    });

    daemon.stderr.on('data', (data) => {
        console.error(`Daemon error: ${data}`);
    });

    daemon.on('close', (code) => {
        console.log(`Daemon exited with code ${code}`);
    });

    return daemon;
}

app.whenReady().then(() => {
    createWindow();

    mainWindow.removeMenu()

    ipcMain.on('register-keybind', (event, keybind) => {
        if (keybind == "null" || keybind == null) return;

        globalShortcut.register(keybind, () => {
            console.log(`${keybind} pressed`);
            mainWindow.webContents.send('global-shortcut-pressed', keybind);
        });
    });
    
    ipcMain.on('unregister-keybind', (event, keybind) => {
        globalShortcut.unregister(keybind)
    });

    startDaemon();

    autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        const tempdir = os.tmpdir();

        if (!fs.existsSync(`${tempdir}/ameboard/playing/EXIT_PROGRAM`)) {
            fs.mkdirSync(`${tempdir}/ameboard/playing/EXIT_PROGRAM`);
        }
        
        app.quit();
    }
});