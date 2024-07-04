#!/usr/bin/env python

import pygame._sdl2.audio as sdl2_audio
import pygame
import time
import os
import threading
import sys
import tempfile
import re

exit_code = False
temp = tempfile.gettempdir()

def get_devices(capture_devices: bool = False) -> tuple[str, ...]:
    init_by_me = not pygame.mixer.get_init()
    if init_by_me:
        pygame.mixer.init()
    devices = tuple(sdl2_audio.get_audio_device_names(capture_devices))
    if init_by_me:
        pygame.mixer.quit()
    return devices

def play_sound(file_path: str, start_time: float, end_time: float, device=None):
    try:
        if device is None:
            devices = get_devices()
            if not devices:
                raise RuntimeError("No device!")
            device = devices[0]

        print(f"Play: {file_path}\r\nDevice: {device}\r\nStart time: {start_time}\r\nEnd time: {end_time}")

        pygame.mixer.pre_init(44100, -16, 2, 2048)
        pygame.mixer.init(devicename=device)

        pygame.mixer.music.load(file_path)
        pygame.mixer.music.play(start=start_time)

        time_playing = start_time

        while time_playing <= end_time:
            if os.path.isdir(file_path + "CANCEL"):
                os.rmdir(file_path + "CANCEL")
                pygame.mixer.quit()
                return
            
            print(time_playing)
            print(end_time)

            time.sleep(0.1)
            time_playing += 0.1

        pygame.mixer.quit()

    except Exception as e:
        print(e)
        global exit_code
        exit_code = True

def extract_times_from_filename(filename: str) -> tuple[float, float]:
    pattern = r"_(\d+(\.\d+)?)_(\d+(\.\d+)?)\."
    match = re.search(pattern, filename)
    if match:
        start_time = float(match.group(1))
        end_time = float(match.group(3))
        return start_time, end_time
    else:
        os.remove(filename)

def monitor_directory(directory: str, device: str):
    while True:
        if os.path.isdir(os.path.join(directory, "EXIT_PROGRAM")):
            os.rmdir(os.path.join(directory, "EXIT_PROGRAM"))
            global exit_code
            exit_code = True
            sys.exit()

        files = [f for f in os.listdir(directory) if f.endswith(('.mp3', '.wav'))]
        
        for file in files:
            try:
                file_path = os.path.join(directory, file)

                # Extract start and end times from filename
                start_time, end_time = extract_times_from_filename(file)
                print(f"Start time: {start_time}, End time: {end_time}")

                play_sound(file_path, start_time, end_time, device)

                os.remove(file_path)
            except Exception as e:
                print(e)
            
        time.sleep(0.1)  # Check the directory every 0.1 seconds

# Get the list of output devices
devices = get_devices(capture_devices=False)

os.makedirs(f"{temp}/ameboard/playing/queued", exist_ok=True)

with open(f"{temp}/ameboard/devices", "w") as f:
    for device in devices:
        f.write(device + "\n")

device = None

while device == None:
    if not os.path.exists(f"{temp}/ameboard/device"):
        time.sleep(1)
        continue

    with open(f"{temp}/ameboard/device", "r") as f:
        device = f.readline()

# Start monitoring the directory in a separate thread
monitor_thread = threading.Thread(target=monitor_directory, args=(f"{temp}/ameboard/playing", device))
monitor_thread.start()

# Keep the program running
try:
    while True:
        if exit_code:
            break

        time.sleep(0.1)
except KeyboardInterrupt:
    pass

pygame.mixer.quit()
