const { spawn } = require('child_process');
const fs = require('node:fs');
const fs_promise = require('node:fs').promises;
const readline = require('readline');
const path = require("path");
const { parseFile } = require('music-metadata');
const keyboardJS = require('keyboardjs');
const { ipcRenderer } = require('electron');

const os = require("os");

const homedir = os.homedir();
const tempdir = os.tmpdir();

let virtual_mic = null;
let playing = []

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
        ipcRenderer.send('register-keybind', sounds[index]["keybind"]);

        ipcRenderer.on('global-shortcut-pressed', (event, keybind) => {
            if (keybind == sounds[index]["keybind"]) {
                console.log("Pressed")

                let isPlaying = false;
                let button = document.getElementById(`play-stop-${index}`)
    
                if (isPlaying) {
                    const filePath = `${tempdir}/ameboard/playing/${sounds[index]["file"].replace(/^.*[\\/]/, '')}`;
                    stopSound(filePath, sounds[index]["start_time"], sounds[index]["end_time"]);
                    button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                } else {
                    playSound(sounds[index]["file"], sounds[index]["start_time"], sounds[index]["end_time"]);
                    button.innerHTML = `<img src = "icons/stop.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                }
                isPlaying = !isPlaying;

                let counter = 0
        
                setInterval(() => {
                    if (isPlaying) {
                        const end_time = sounds[index]["end_time"]
            
                        if (counter >= end_time) {
                            button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                            isPlaying = false;
                            playing.splice(playing.indexOf(sounds[index]["file"]), 1);
                            counter = 0
                            return
                        }
            
                        counter += 0.1
                    } else {
                        if (counter != 0) {
                            button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                            counter = 0
                        }
                    }
        
                }, 100);
            }
        });
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
    if (playing.includes(file)) return;

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

    playing.push(file)
}

function openglobalSettings(element, event, config) {
    sounds = config["sounds"]

    event.stopPropagation()

    index = element.id

    let mic_options = ""
    let theme_options = ""

    let devices = listOutputDevices()

    devices.then(function(result) {
        themes = [
            "Amethyst",
            "Emerald",
            "Ruby",
            "Sapphire",
            "Topaz",
            "Onyx"
        ]
        result.forEach(mic => {
            if (mic == null) return;

            if (mic == config["virtual_mic"]) {
                mic_options += `<option value="${mic}" selected>${mic}</option>`
            } else {
                mic_options += `<option value="${mic}">${mic}</option>`
            }

            console.log(virtual_mic)
        });

        themes.forEach(theme => {
            if (theme == config["theme"]) {
                theme_options += `<option value="${theme}" selected>${theme}</option>`
            } else {
                theme_options += `<option value="${theme}">${theme}</option>`
            }
        });

        console.log("Mic options:" + mic_options)

        var globalSettingsModal = document.createElement('div');

        globalSettingsModal.className = 'globalSettings-modal';
        globalSettingsModal.innerHTML = `
        <form id="globalSettingsForm">
            <div class="fixed inset-0 px-2 z-10 backdrop-blur-sm overflow-hidden flex items-center justify-center">
                <div class="fixed inset-0 backdrop-blur-[500px] modal bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                
                <!-- Modal Content -->
                <div class="backdrop-blur-lg rounded-[1.5vw] bg-opacity-100 modal rounded-md shadow-xl overflow-hidden max-w-md w-full sm:w-96 md:w-1/2 lg:w-2/3 xl:w-1/3 z-50 border-2 ${config["theme"].toLowerCase()}-border">
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
                            <select name="mic" id="globalSettingsMic" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] ${config["theme"].toLowerCase()}-border-hover duration-300 py-1.5 pl-2 pr-20 text-neutral-500 bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" id="mic_selector">
                                ${mic_options}
                            </select>
                        </div>
                    </div>   
                    <div class="pb-4">
                        <label for="globalSettingsTheme" class="block text-sm font-medium leading-6 text-white">Theme</label>
                        <div class="relative mt-2 rounded-md shadow-sm">
                            <!-- Replace input with select -->
                            <select name="theme" id="globalSettingsTheme" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] ${config["theme"].toLowerCase()}-border-hover duration-300 py-1.5 pl-2 pr-20 text-neutral-500 bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" id="theme_selector">
                                ${theme_options}
                            </select>
                        </div>
                    </div>   
                    <!-- Modal Footer -->
                    <div class="flex">
                        <div class="w-1/3">
                            <button class="px-3 py-1 border-2 border-[#6d6d6d] text-white transition duration-300 ease-in-out rounded-md w-full" id="close">Cancel</button>
                        </div>
                        <div class="pl-[1vw] w-2/3">
                            <button class="px-3 py-1 border-2 ${config["theme"].toLowerCase()}-border text-white transition duration-300 ease-in-out rounded-md w-full" type="submit">Save</button>
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

            if (newMic != sounds["theme"]) {
                config["theme"] = document.getElementById(`globalSettingsTheme`).value;
            }
            save(config)

            window.location.reload();
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
    playing.splice(playing.indexOf(file), 1);
}

function openSoundSettings(element, event, config) {
    sounds = config["sounds"]


    event.stopPropagation()

    let index = element.id

    var settingsModal = document.createElement('div');

    settingsModal.className = 'settings-modal';
    settingsModal.innerHTML = `
    <form id="settingsForm">
        <div class="fixed inset-0 px-2 z-10 backdrop-blur-sm overflow-hidden flex items-center justify-center">
            <div class="fixed inset-0 backdrop-blur-[500px] modal bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <!-- Modal Content -->
            <div class="backdrop-blur-lg bg-opacity-100 modal rounded-md shadow-xl overflow-hidden max-w-md w-full sm:w-96 md:w-1/2 lg:w-2/3 xl:w-1/3 z-50 border-2 ${config["theme"].toLowerCase()}-border">
                <!-- Modal Header -->
                <div class=" text-white px-4 pt-4 flex justify-between">
                    <h2 class="text-xl font-semibold">Sound Settings</h2>
                    <div class="flex">
                        <div id="settingsPreview">
                            <img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>
                        </div>
                        <img src = "icons/delete.svg" class="w-[2vw] h-[2vw] z-99", id='settingsDelete'>
                    </div>
                </div>
                <!-- Modal Body -->
                <div class="p-4">
                <div class="pb-4">
                    <label for="settingsName" class="block text-sm font-medium leading-6 text-white">Name</label>
                    <div class="relative mt-2 rounded-md shadow-sm">
                    <input type="text" name="name" id="settingsName" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] ${config["theme"].toLowerCase()}-border-hover duration-300 py-1.5 pl-2 pr-20 text-white bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" value="${sounds[index]["name"]}">
                    </div>
                </div>  
                <div class="pb-4">
                    <label for="settingsStartTime" class="block text-sm font-medium leading-6 text-white">Start time</label>
                    <div class="relative mt-2 rounded-md shadow-sm">
                        <input type="text" name="settingsStartTime" id="settingsStartTime" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] ${config["theme"].toLowerCase()}-border-hover duration-300 py-1.5 pl-2 pr-20 text-white bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" value="${sounds[index]["start_time"]}">
                    </div>
                </div>
                <div class="pb-4">
                    <label for="settingsEndTime" class="block text-sm font-medium leading-6 text-white">End time</label>
                    <div class="relative mt-2 rounded-md shadow-sm">
                        <input type="text" name="settingsEndTime" id="settingsEndTime" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] ${config["theme"].toLowerCase()}-border-hover duration-300 py-1.5 pl-2 pr-20 text-white bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" value="${sounds[index]["end_time"]}">
                    </div>
                </div>
                <div class="pb-4">
                    <label for="settingsKeybind" class="block text-sm font-medium leading-6 text-white">Keybind</label>
                    <div class="relative mt-2 rounded-md shadow-sm">
                        <input type="text" name="settingsKeybind" id="settingsKeybind" class="block w-full rounded-md border-2 transition ease-in-out border-[#6d6d6d] ${config["theme"].toLowerCase()}-border-hover duration-300 py-1.5 pl-2 pr-20 text-white bg-transparent placeholder:text-gray-400 focus:none ring-0 sm:text-sm sm:leading-6" value="${sounds[index]["keybind"]}">
                    </div>
                </div>
                <div class="pb-4">
                    <label class="block text-sm font-medium text-gray-900 text-white" for="default_size">Icon</label>
                    <input id="settingsFile" class="block rounded-md border-2 border-[#6d6d6d] ${config["theme"].toLowerCase()}-border-hover  transition ease-in-out duration-300 w-fulltext-sm text-white py-2 pl-2 w-full" id="default_size" type="file">
                </div> 
                <!-- Modal Footer -->
                <div class="flex">
                    <div class="w-1/3">
                        <button class="px-3 py-1 border-2 border-[#6d6d6d] text-white transition duration-300 ease-in-out rounded-md w-full" id="close">Cancel</button>
                    </div>
                    <div class="pl-[1vw] w-2/3">
                        <button class="px-3 py-1 border-2 ${config["theme"].toLowerCase()}-border text-white transition duration-300 ease-in-out rounded-md w-full" type="submit">Save</button>
                    </div>
                </div>
            </div>
        </div>
    <form>
    `;

    document.body.appendChild(settingsModal);

    let isPlaying = false;
    let button = document.getElementById(`settingsPreview`);
    
    document.getElementById(`settingsPreview`).addEventListener('click', function(e) {
        e.stopImmediatePropagation()
        playSound(sounds[index]["file"], sounds[index]["start_time"], sounds[index]["end_time"]);
        if (isPlaying) {
            const filePath = `${tempdir}/ameboard/playing/${sounds[index]["file"].replace(/^.*[\\/]/, '')}`;
            stopSound(filePath, sounds[index]["start_time"], sounds[index]["end_time"]);
            button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
        } else {
            playSound(sounds[index]["file"], sounds[index]["start_time"], sounds[index]["end_time"]);
            button.innerHTML = `<img src = "icons/stop.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
        }
        isPlaying = !isPlaying;
    }, false);
    
    let counter = 0

    setInterval(() => {
        if (isPlaying) {
            const end_time = sounds[index]["end_time"]

            if (counter >= end_time) {
                button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                isPlaying = false;
                playing.splice(playing.indexOf(sounds[index]["file"]), 1);
                counter = 0
                return
            }

            counter += 0.1
        } else {
            if (counter != 0) {
                button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                counter = 0
            }
        }

    }, 100);

    // Show the modal
    settingsModal.style.display = 'block';

    document.getElementById(`settingsDelete`).addEventListener('click', function(e) {
        settingsModal.remove()
        e.stopPropagation()

        sounds.splice(index, 1); 

        config["sounds"] = sounds

        save(config)

        window.location.reload();
    })

    document.getElementById(`settingsPreview`).addEventListener('click', function(e) {
        settingsModal.remove()
        e.stopPropagation()

        sounds.splice(index, 1); 

        config["sounds"] = sounds

        save(config)

        window.location.reload();
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

        keyboardJS.unbind(sounds[index]["keybind"])

        sounds[index]["start_time"] = parseFloat(document.getElementById(`settingsStartTime`).value.trim())
        sounds[index]["end_time"] = parseFloat(document.getElementById(`settingsEndTime`).value.trim())

        sounds[index]["keybind"] = document.getElementById(`settingsKeybind`).value.trim().toLowerCase()

        console.log(newName, newFile);
        console.log(sounds)

        config["sounds"] = sounds

        save(config)

        window.location.reload();
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
        let isPlaying = false;
        let button = document.getElementById(`play-stop-${index}`);
        
        element.addEventListener('click', function() {
            playSound(sounds[index]["file"], sounds[index]["start_time"], sounds[index]["end_time"]);
            if (isPlaying) {
                const filePath = `${tempdir}/ameboard/playing/${sounds[index]["file"].replace(/^.*[\\/]/, '')}`;
                stopSound(filePath, sounds[index]["start_time"], sounds[index]["end_time"]);
                button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
            } else {
                playSound(sounds[index]["file"], sounds[index]["start_time"], sounds[index]["end_time"]);
                button.innerHTML = `<img src = "icons/stop.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
            }
            isPlaying = !isPlaying;
        }, false);
        
        let counter = 0

        setInterval(() => {
            if (isPlaying) {
                const end_time = sounds[index]["end_time"]
    
                if (counter >= end_time) {
                    button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                    isPlaying = false;
                    playing.splice(playing.indexOf(sounds[index]["file"]), 1);
                    counter = 0
                    return
                }
    
                counter += 0.1
            } else {
                if (counter != 0) {
                    button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                    counter = 0
                }
            }

        }, 100);
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

        let counter = 0

        setInterval(() => {
            if (isPlaying) {
                const end_time = sounds[index]["end_time"]
    
                if (counter >= end_time) {
                    button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                    isPlaying = false;
                    playing.splice(playing.indexOf(sounds[index]["file"]), 1);
                    counter = 0
                    return
                }
    
                counter += 0.1
            } else {
                if (counter != 0) {
                    button.innerHTML = `<img src = "icons/play.svg" class="w-[2vw] h-[2vw]" id='${index}'>`;
                    counter = 0
                }
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

            await fs.copyFileSync(file.path, end_path)

            const metadata = await parseFile(end_path);
            const duration = metadata.format.duration
            
            // Construct the sound object with the filename as the name
            const sound = {
                name: file.name,
                file: end_path,
                icon: "null.jpg",
                start_time: 0,
                keybind: null,
                end_time: duration
            };

            // Add the sound to the sounds array in the config
            const config = await load();
            config.sounds.push(sound);

            save(config)

            window.location.reload();
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    load().then(function(config) {
        console.log(config)
        sounds = config["sounds"]

        body = document.getElementById("body")

        body.classList.add(`${config["theme"].toLowerCase()}-bg`);

        addSounds(sounds)

        let virtual_mic = config["virtual_mic"];

        passMic(virtual_mic)

        sound_divs = document.getElementsByClassName('sound')

        initializeEvents(config)

        console.log("Registered Events")
    })
});