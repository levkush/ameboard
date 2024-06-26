const { app, BrowserWindow } = require('electron')
const fs = require('node:fs');
const readline = require('readline');
const path = require("path")
const { spawn } = require('child_process');

require('electron-reload')(__dirname);

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1275,
        height: 827,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js'),
            nodeIntegration: true
        }
    })

    win.loadFile('src/index.html')
}

async function startDaemon() {
    const daemon = spawn('.venv/bin/python3', ["./daemon.py"])
    
    return daemon
}



app.whenReady().then(() => {
    createWindow()
    startDaemon()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
