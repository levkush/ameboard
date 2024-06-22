const { app, BrowserWindow } = require('electron')
const fs = require('node:fs');
const readline = require('readline');
const path = require("path")

require('electron-reload')(__dirname);

let virtual_mic = null;

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

app.whenReady().then(() => {
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

async function listOutputDevices() {
    console.log("Running")
    let devices = [];

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    
    for await (const line of rl) {
        devices.push(line);
    }

    return devices
}

function queueSound(filepath, device) {
    fs.copyFile(filepath, `/tmp/ameboard/playing/${filepath}`, (err) => {
        if (err) throw err;
        console.log('source.txt was copied to destination.txt');
    });

}
