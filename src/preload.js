const { spawn } = require('child_process');
const fs = require('node:fs');
const fs_promise = require('node:fs').promises;
const readline = require('readline');
const path = require("path");

let virtual_mic = null;


async function load() {
    try {
        const data = await fs_promise.readFile('test.json'); // Await the promise
        let config = JSON.parse(data);
        let sounds = config["sounds"];
        console.log("JSON: ", config);
        return config;
    } catch (err) {
        console.error(err);
        throw err; // Rethrow error if reading the file fails
    }
}
async function listOutputDevices() {
    console.log("Running")

    // if (devices != null) {
    //     return devices
    // }

    let devices = [];

    const fileStream = fs.createReadStream("/tmp/ameboard/devices");

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    
    for await (const line of rl) {
        console.log(devices)
        devices.push(line);
    }

    console.log(devices)

    return devices
}

async function addSounds(sounds) {
    soundsDiv = document.getElementById('sounds')
    sounds.forEach((sound, index) => {
        soundsDiv.innerHTML +=
        `<div class="flex p-[1.2vw] text-white text-xl sound w-[22vw] h-[8vw] rounded-[3vw] backdrop-blur-xl" id="sound">
              <img src="${sound["icon"]}" class="rounded-[2vw]">
              <h1 class="self-center pl-[1.5vw] text-[2.5vw]">${sound["name"]}</h1>
              <img src = "icons/settings.svg" alt="My Happy SVG" class="w-[2vw] h-[2vw] absolute ml-[17.5vw] mt-[3.7vw] sound_settings", id='${index}'>
        </div>`; 
    });
}

function passMic(virtual_mic) {
    let devices = listOutputDevices()

    devices.then(function(result) {
        if (virtual_mic == null) {
            virtual_mic = result[1]
        }
    
        fs.writeFile("/tmp/ameboard/device", virtual_mic, function(err) {
            if(err) {
                return console.log(err);
            }
        }); 
    
        console.log("Virtual Mic: " + virtual_mic)
        
    })
}

function playSound(file) {
    fs.copyFile(file, `/tmp/ameboard/playing/${file.replace(/^.*[\\/]/, '')}`, (err) => {
        if (err) throw err;
        console.log('source.txt was copied to destination.txt');
    });      
}

function openSoundSettings(element, event, sounds) {
    event.stopPropagation()

    console.log(sounds[element.id])
}



document.addEventListener('DOMContentLoaded', function() {
    load().then(function(config) {
        console.log(config)
        sounds = config["sounds"]

        addSounds(sounds)

        virtual_mic = config["virtual_mic"];

        passMic(virtual_mic)

        sound_divs = document.getElementsByClassName('sound')

        Array.prototype.forEach.call(sound_divs, (element, index) => {
            // Use the createCounter function to get a unique counter for each sound element
            element.addEventListener('click', function() {playSound(sounds[index]["file"]);}, false);
        });

        sound_settings_buttons = document.getElementsByClassName("sound_settings")

        Array.prototype.forEach.call(sound_settings_buttons, (element, index) => {
            // Use the createCounter function to get a unique counter for each sound element
            element.addEventListener('click', function(event) {openSoundSettings(element, event, sounds)}, false);
        });
        console.log("Registered Events")
    })

});