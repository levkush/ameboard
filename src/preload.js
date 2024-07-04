const { spawn } = require('child_process');
const fs = require('node:fs');
const fs_promise = require('node:fs').promises;
const readline = require('readline');
const path = require("path");
const { parseFile } = require('music-metadata');

const os = require("os");

const homedir = os.homedir();
const tempdir = os.tmpdir();

let virtual_mic = null;

if (!fs.existsSync(`${homedir}/ameboard/`)){
    fs.mkdirSync(`${homedir}/ameboard/`);
}

if (!fs.existsSync(`${homedir}/ameboard/sounds`)){
    fs.mkdirSync(`${homedir}/ameboard/sounds`);
}

if (!fs.existsSync(`${homedir}/ameboard/images`)){
    fs.mkdirSync(`${homedir}/ameboard/images`);
}

if (!fs.existsSync(`${homedir}/ameboard/config.json`)) {
    config = {
        "virtual_mic": null,
        "theme": "Amethyst",
        "sounds": []
    }
    save(config)
}

async function load() {
    try {
        const data = await fs_promise.readFile(`${homedir}/ameboard/config.json`); // Await the promise
        let config = JSON.parse(data);
        let sounds = config["sounds"];
        console.log("JSON: ", config);
        return config;
    } catch (err) {
    }
}

async function save(config) {
    fs.writeFile(`${homedir}/ameboard/config.json`, JSON.stringify(config, null, 2), (error) => {
        if (error) {
          console.log('An error has occurred ', error);
          return;
        }
        console.log('Data written successfully to disk');
    });
}

async function listOutputDevices() {
    console.log("Running")

    // if (devices != null) {
    //     return devices
    // }

    let devices = [];

    const fileStream = fs.createReadStream(`${tempdir}/ameboard/devices`);

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
        // Add sound
        soundsDiv.innerHTML +=
        `<div class="flex p-[1vw] text-white sound w-[22vw] h-[8vw] rounded-[3vw] backdrop-blur-xl" id="sound-${index}">
              <img src="${sound["icon"]}" class="rounded-[2vw] w-[6vw] object-cover h-[6vw]">
              <h1 class="self-center pl-[1.5vw] text-[1.5vw] break-all pr-[1.5vw]">${sound["name"]}</h1>
              <div class="absolute flex x-5 bottom-0 right-0 p-[1vw]">
                <img src = "icons/settings.svg" class="w-[2vw] h-[2vw] sound_settings", id='${index}'>
                <div id="play-stop-${index}" class="play-stop-btn">
                    <img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>
                </div>
                
              </div>
              
        </div>`; 

    });
}

function passMic(virtual_mic) {
    let devices = listOutputDevices()

    devices.then(function(result) {
        if (virtual_mic == null) {
            virtual_mic = result[1]
        }
    
        fs.writeFile(`${tempdir}/ameboard/device`, virtual_mic, function(err) {
            if(err) {
                return console.log(err);
            }
        }); 
    
        console.log("Virtual Mic: " + virtual_mic)
        
    })
}

function playSound(file, start_time, end_time) {
    // Splitting file into base name and extension
    const fileParts = path.parse(file);
    const { dir, name, ext } = fileParts;

    // Constructing new filename with start_time and end_time
    const filename = `${name.replace(/_/g, '')}_${start_time.toFixed(2)}_${end_time.toFixed(2)}${ext}`;
    const destination = path.join(tempdir, 'ameboard', 'playing', filename);

    fs.copyFile(file, destination, (err) => {
        if (err) throw err;
        console.log(`${file} copied to ${destination}`);
    });
}

function openglobalSettings(element, event, config) {
    sounds = config["sounds"]

    event.stopPropagation()

    index = element.id

    var mic_options = ""

    let devices = listOutputDevices()

    devices.then(function(result) {
        result.forEach(mic => {
            if (mic == null) return;

            if (mic == config["virtual_mic"]) {
                mic_options += `<option value="${mic}" selected>${mic}</option>`
            } else {
                mic_options += `<option value="${mic}">${mic}</option>`
            }

            console.log(virtual_mic)
        });
        console.log("Mic options:" + mic_options)

        var globalSettingsModal = document.createElement('div');

        globalSettingsModal.className = 'globalSettings-modal';
        globalSettingsModal.innerHTML = `
        <form id="globalSettingsForm">
            <div class="fixed inset-0 px-2 z-10 backdrop-blur-sm overflow-hidden flex items-center justify-center">
                <div class="fixed inset-0 backdrop-blur-[500px] modal bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                
                <!-- Modal Content -->
                <div class="backdrop-blur-lg rounded-[1.5vw] bg-opacity-100 modal rounded-md shadow-xl overflow-hidden max-w-md w-full sm:w-96 md:w-1/2 lg:w-2/3 xl:w-1/3 z-50 border-2 border-[#bf8eff]">
                    <!-- Modal Header -->
                    <div class=" text-white px-4 pt-4 flex justify-between">
                        <h2 class="text-xl font-semibold">Settings</h2>
                    </div>
                    <!-- Modal Body -->
                    <div class="p-4">
                    <div class="pb-4">
                        <label for="globalSettingsMic" class="block text-sm font-medium leading-6 text-white">Microphone</label>
                        <div class="relative mt-2 rounded-md shadow-sm">
                            <!-- Replace input with select -->
                            <select name="mic" id="globalSettingsMic" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] hover:border-[#bf8eff] duration-300 py-1.5 pl-2 pr-20 text-black bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" id="mic_selector">
                                ${mic_options}
                            </select>
                        </div>
                    </div>   
                    <!-- Modal Footer -->
                    <div class="flex">
                        <div class="w-1/3">
                            <button class="px-3 py-1 border-2 border-[#6d6d6d] text-white transition duration-300 ease-in-out rounded-md w-full" id="close">Cancel</button>
                        </div>
                        <div class="pl-[1vw] w-2/3">
                            <button class="px-3 py-1 border-2 border-[#bf8eff] text-white transition duration-300 ease-in-out rounded-md w-full" type="submit">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        <form>
        `;
        document.body.appendChild(globalSettingsModal);

        // Show the modal
        globalSettingsModal.style.display = 'block';

        document.getElementById(`close`).addEventListener('click', function(e) {
            globalSettingsModal.remove()
            e.stopPropagation()
        })

        // Handle form submission
        document.getElementById(`globalSettingsForm`).addEventListener('submit', function(e) {
            e.preventDefault();

            var newMic = document.getElementById(`globalSettingsMic`).value;

            if (newMic != sounds["virtual_mic"]) {
                config["virtual_mic"] = newMic
            }

            soundsDiv = document.getElementById('sounds')
            soundsDiv.innerHTML = ""

            addSounds(sounds)

            save(config)

            passMic(newMic)

            initializeEvents(config)

            console.log("NEW MIC:" + config["virtual_mic"])

            globalSettingsModal.remove()
        });
    })
}

function stopSound(file, start_time, end_time) {
    // Splitting file into base name and extension
    const fileParts = path.parse(file);
    const { dir, name, ext } = fileParts;

    // Constructing new filename with start_time and end_time
    const filename = `${name.replace(/_/g, '')}_${start_time.toFixed(2)}_${end_time.toFixed(2)}${ext}`;
    const destination = path.join(tempdir, 'ameboard', 'playing', filename);

    fs.mkdirSync(`${destination}CANCEL`);
}

function openSoundSettings(element, event, config) {
    sounds = config["sounds"]

    event.stopPropagation()

    index = element.id

    var settingsModal = document.createElement('div');

    settingsModal.className = 'settings-modal';
    settingsModal.innerHTML = `
    <form id="settingsForm">
        <div class="fixed inset-0 px-2 z-10 backdrop-blur-sm overflow-hidden flex items-center justify-center">
            <div class="fixed inset-0 backdrop-blur-[500px] modal bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <!-- Modal Content -->
            <div class="backdrop-blur-lg rounded-[1.5vw] bg-opacity-100 modal rounded-md shadow-xl overflow-hidden max-w-md w-full sm:w-96 md:w-1/2 lg:w-2/3 xl:w-1/3 z-50 border-2 border-[#bf8eff]">
                <!-- Modal Header -->
                <div class=" text-white px-4 pt-4 flex justify-between">
                    <h2 class="text-xl font-semibold">Sound Settings</h2>
                    <img src = "icons/delete.svg" class="w-[2vw] h-[2vw] sound_settings", id='settingsDelete'>
                </div>
                <!-- Modal Body -->
                <div class="p-4">
                <div class="pb-4">
                    <label for="settingsName" class="block text-sm font-medium leading-6 text-white">Name</label>
                    <div class="relative mt-2 rounded-md shadow-sm">
                    <input type="text" name="name" id="settingsName" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] hover:border-[#bf8eff] duration-300 py-1.5 pl-2 pr-20 text-white bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" value="${sounds[index]["name"]}">
                    </div>
                </div>  
                <div class="pb-4">
                    <label for="settingsStartTime" class="block text-sm font-medium leading-6 text-white">Start time</label>
                    <div class="relative mt-2 rounded-md shadow-sm">
                        <input type="text" name="name" id="settingsStartTime" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] hover:border-[#bf8eff] duration-300 py-1.5 pl-2 pr-20 text-white bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" value="${sounds[index]["start_time"]}">
                    </div>
                </div>
                <div class="pb-4">
                    <label for="settingsEndTime" class="block text-sm font-medium leading-6 text-white">End time</label>
                    <div class="relative mt-2 rounded-md shadow-sm">
                        <input type="text" name="name" id="settingsEndTime" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] hover:border-[#bf8eff] duration-300 py-1.5 pl-2 pr-20 text-white bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" value="${sounds[index]["end_time"]}">
                    </div>
                </div>
                <div class="pb-4">
                    <label class="block text-sm font-medium text-gray-900 text-white" for="default_size">Icon</label>
                    <input id="settingsFile" class="block rounded-md border-2 border-[#6d6d6d] hover:border-[#bf8eff]  transition ease-in-out duration-300 w-fulltext-sm text-white py-2 pl-2 w-full" id="default_size" type="file">
                </div> 
                <!-- Modal Footer -->
                <div class="flex">
                    <div class="w-1/3">
                        <button class="px-3 py-1 border-2 border-[#6d6d6d] text-white transition duration-300 ease-in-out rounded-md w-full" id="close">Cancel</button>
                    </div>
                    <div class="pl-[1vw] w-2/3">
                        <button class="px-3 py-1 border-2 border-[#bf8eff] text-white transition duration-300 ease-in-out rounded-md w-full" type="submit">Save</button>
                    </div>
                </div>
            </div>
        </div>
    <form>
    `;
    document.body.appendChild(settingsModal);

    // Show the modal
    settingsModal.style.display = 'block';

    document.getElementById(`settingsDelete`).addEventListener('click', function(e) {
        settingsModal.remove()
        e.stopPropagation()

        sounds.splice(index, 1); 

        config["sounds"] = sounds

        soundsDiv = document.getElementById('sounds')
        soundsDiv.innerHTML = ""

        addSounds(sounds)

        save(config)

        initializeEvents(config)
    })

    document.getElementById(`close`).addEventListener('click', function(e) {
        settingsModal.remove()
        e.stopPropagation()
    })

    // Handle form submission
    document.getElementById(`settingsForm`).addEventListener('submit', function(e) {
        e.preventDefault();

        var newName = document.getElementById(`settingsName`).value.trim();
        var newFile = document.getElementById(`settingsFile`).files[0];

        let changed = false

        if (newName != sounds[index]["name"]) {
            sounds[index]["name"] = newName
            changed = true
        }
        if (newFile != undefined) {
            let end_path = `${homedir}/ameboard/images/${newFile.name}`

            fs.copyFile(newFile.path, end_path, (err) => {
                if (err) throw err;
                console.log('Copied file');
            });    
            sounds[index]["icon"] = end_path
            changed = true
        }

        sounds[index]["start_time"] = parseFloat(document.getElementById(`settingsStartTime`).value.trim())
        sounds[index]["end_time"] = parseFloat(document.getElementById(`settingsEndTime`).value.trim())

        console.log(newName, newFile);
        console.log(sounds)

        config["sounds"] = sounds

        soundsDiv = document.getElementById('sounds')
        soundsDiv.innerHTML = ""

        addSounds(sounds)

        save(config)

        initializeEvents(config)

        settingsModal.remove()
    });
}

function initializeEvents(config) {
    // Existing event listeners
    const dropZone = document.getElementById('drop-zone');
    document.getElementById('settingsButton').addEventListener('click', function(event) {
        openglobalSettings(document.getElementById('settingsButton'), event, config)
    }, false);

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    sounds = config["sounds"]

    Array.prototype.forEach.call(sound_divs, (element, index) => {
        element.addEventListener('click', function() {
            playSound(sounds[index]["file"], sounds[index]["start_time"], sounds[index]["end_time"]);
        }, false);
    });

    sound_settings_buttons = document.getElementsByClassName("sound_settings")

    Array.prototype.forEach.call(sound_settings_buttons, (element, index) => {
        element.addEventListener('click', function(event) {
            openSoundSettings(element, event, config)
        }, false);
    });

    // Play/Stop button event listeners
    const playStopButtons = document.getElementsByClassName('play-stop-btn');

    Array.prototype.forEach.call(playStopButtons, (button, index) => {
        let isPlaying = false;

        button.addEventListener('click', function(event) {
            event.stopPropagation()
            if (isPlaying) {
                const filePath = `${tempdir}/ameboard/playing/${sounds[index]["file"].replace(/^.*[\\/]/, '')}`;
                stopSound(filePath, sounds[index]["start_time"], sounds[index]["end_time"]);
                button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
            } else {
                playSound(sounds[index]["file"], sounds[index]["start_time"], sounds[index]["end_time"]);
                button.innerHTML = `<img src = "icons/stop.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
            }
            isPlaying = !isPlaying;
        });

        setInterval(() => {
            const filePath = `${tempdir}/ameboard/playing/${sounds[index]["file"].replace(/^.*[\\/]/, '')}`;
            
            const start_time = sounds[index]["start_time"]
            const end_time = sounds[index]["end_time"]

            // Splitting file into base name and extension
            const fileParts = path.parse(filePath);
            const { dir, name, ext } = fileParts;

            // Constructing new filename with start_time and end_time
            const filename = `${name.replace(/_/g, '')}_${start_time.toFixed(2)}_${end_time.toFixed(2)}${ext}`;
            const destination = path.join(tempdir, 'ameboard', 'playing', filename);

            if (!fs.existsSync(destination) && isPlaying) {
                button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                isPlaying = false;
            }
        }, 100);
    });
}


// Function to handle drag over event
function handleDragOver(event) {
    event.preventDefault(); // Prevent default behavior
    event.stopPropagation(); // Stop propagation
    event.dataTransfer.dropEffect = 'copy'; // Indicate that the drop is allowed
}

// Function to handle drag enter event
function handleDragEnter(event) {
    event.preventDefault(); // Prevent default behavior
    event.stopPropagation(); // Stop propagation
    event.dataTransfer.dropEffect = 'copy'; // Indicate that the drop is allowed
}

// Function to handle drag leave event
function handleDragLeave(event) {
    event.preventDefault(); // Prevent default behavior
    event.stopPropagation(); // Stop propagation
}

// Function to handle drop event
async function handleDrop(event) {
    event.preventDefault(); // Prevent default behavior
    event.stopPropagation(); // Stop propagation
    // Get the dropped files
    const files = event.dataTransfer.files;

    // Process each file
    for (const file of files) {
        if (file.type.startsWith('audio/')) {
            let end_path = `${homedir}/ameboard/sounds/${file.name}`

            fs.copyFile(file.path, end_path, (err) => {
                if (err) throw err;
                console.log('Copied file');
            });    

            const metadata = await parseFile(end_path);
            const duration = metadata.format.duration
            
            // Construct the sound object with the filename as the name
            const sound = {
                name: file.name,
                file: end_path,
                icon: "null.jpg",
                start_time: 0,
                end_time: duration
            };

            // Add the sound to the sounds array in the config
            const config = await load();
            config.sounds.push(sound);

            soundsDiv = document.getElementById('sounds')
            soundsDiv.innerHTML = ""

            addSounds(config.sounds)

            save(config)

            initializeEvents(config)
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    load().then(function(config) {
        console.log(config)
        sounds = config["sounds"]

        addSounds(sounds)

        let virtual_mic = config["virtual_mic"];

        passMic(virtual_mic)

        sound_divs = document.getElementsByClassName('sound')

        initializeEvents(config)

        console.log("Registered Events")
    })
});