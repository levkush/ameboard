const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const url = require('url');
const path = require("path");
const { spawn, exec } = require('child_process');
const { autoUpdater } = require("electron-updater")

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

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'src/index.html'),
        protocol: 'file:',
        slashes: true
    }));
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

    mainWindow.webContents.on('before-input-event', (_, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
            mainWindow.webContents.isDevToolsOpened()
            ? mainWindow.webContents.closeDevTools()
            : mainWindow.webContents.openDevTools({ mode: 'right' });
        }
    });

    ipcMain.on('register-keybind', (event, keybind) => {
        try {
            globalShortcut.register(keybind, () => {
                console.log(`${keybind} pressed`);
                mainWindow.webContents.send('global-shortcut-pressed', keybind);
            });
        } catch {}
    });
    
    ipcMain.on('unregister-keybind', (event, keybind) => {
        try {
            globalShortcut.unregister(keybind)
        } catch {}
    });

    daemon = startDaemon();

    autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        const tempdir = os.tmpdir();

        // if (!fs.existsSync(`${tempdir}/ameboard/playing/EXIT_PROGRAM`)) {
        //     fs.mkdirSync(`${tempdir}/ameboard/playing/EXIT_PROGRAM`);
        // }

        exec("taskkill /f /im daemon.exe", (error, stdout, stderr) => {});
        app.quit();
    }
});