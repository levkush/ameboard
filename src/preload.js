const { execFile } = require('child_process');
const fs = require('node:fs');
const readline = require('readline');
const path = require("path")

let virtual_mic = null;

async function listOutputDevices() {
    console.log("Running")
    let devices = [];

    await execFile('.venv/bin/python3', ["./daemon.py"], (error, stdout, stderr) => {
        if (error) {
          console.error(`error: ${error.message}`);
          return;
        }
      
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
      
        console.log(`stdout:\n${stdout}`);
    });

    const fileStream = fs.createReadStream("/tmp/ameboard/devices");

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    
    for await (const line of rl) {
        devices.push(line);
    }

    console.log(devices)

    return devices
}

function addSounds() {
    soundsDiv = document.getElementById('sounds')
    for (let i = 0; i < 10; i++) {
        soundsDiv.innerHTML +=
        `<div class="flex p-3 text-white text-xl sound w-[313px] h-[95px] rounded-[30px] backdrop-blur-xl" id="sound">
              <img src="./example.png" class="rounded-[20px]">
              <h1 class="self-center pl-5">Bruh</h1>
        </div>`;
    }

}

document.addEventListener('DOMContentLoaded', function() {
    addSounds()
    document.getElementById('sound').addEventListener('click', listOutputDevices, false);
}, false)