#!./.venv/bin/python

import pygame._sdl2.audio as sdl2_audio
import pygame
import time
import os
import threading
import sys

os.environ['SDL_AUDIODRIVER'] = 'pulse'
exit_code = False

def get_devices(capture_devices: bool = False) -> tuple[str, ...]:
    init_by_me = not pygame.mixer.get_init()
    if init_by_me:
        pygame.mixer.init()
    devices = tuple(sdl2_audio.get_audio_device_names(capture_devices))
    if init_by_me:
        pygame.mixer.quit()
    return devices

def play_sound(file_path: str, device=None):
    try:
        if device is None:
            devices = get_devices()
            if not devices:
                raise RuntimeError("No device!")
            device = devices[0]
        print("Play: {}\r\nDevice: {}".format(file_path, device))
        pygame.mixer.init(devicename=device)
        sound = pygame.mixer.Sound(file_path)
        sound.play()
        while pygame.mixer.get_busy():
            time.sleep(0.1)
        pygame.mixer.quit()
    except Exception:
        global exit_code
        exit_code = True

def monitor_directory(directory: str, device: str):
    while True:
        files = [f for f in os.listdir(directory) if f.endswith(('.mp3', '.wav'))]
        for file in files:
            file_path = os.path.join(directory, file)
            play_sound(file_path, device)
            os.remove(file_path)
        time.sleep(0.1)  # Check the directory every second

# Get the list of output devices
devices = get_devices(capture_devices=False)

os.makedirs("/tmp/ameboard/playing", exist_ok=True)

with open("/tmp/ameboard/devices", "w") as f:
	for device in devices:
		f.write(device + "\n")

device = None

while device == None:
    if not os.path.exists("/tmp/ameboard/device"):
        time.sleep(1)
        continue

    with open("/tmp/ameboard/device", "r") as f:
        device = f.readline()

# Start monitoring the directory in a separate thread
monitor_thread = threading.Thread(target=monitor_directory, args=("/tmp/ameboard/playing", device))
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
