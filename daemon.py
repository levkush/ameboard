#!/usr/bin/env python

import pygame._sdl2.audio as sdl2_audio
import pygame
import time
import os
import threading
import sys
import tempfile
import re
import multiprocessing

exit_code = multiprocessing.Event()
temp = tempfile.gettempdir()

playing = {}
playing_client = {}

def get_devices(capture_devices: bool = False) -> tuple[str, ...]:
    init_by_me = not pygame.mixer.get_init()
    if init_by_me:
        pygame.mixer.init()
    devices = tuple(sdl2_audio.get_audio_device_names(capture_devices))
    if init_by_me:
        pygame.mixer.quit()
    return devices

def play_sound(file_path: str, start_time: float, end_time: float, device = None, default: bool = False):
    global playing, playing_client

    try:
        if device is None:
            devices = get_devices()
            if not devices:
                raise RuntimeError("No device!")
            device = devices[0]

        print(f"Play: {file_path}\r\nDevice: {device}")

        sound = pygame.mixer.Sound(file_path)

        raw_array = sound.get_raw()

        # Number of samples per second
        samples_per_second = len(raw_array) / sound.get_length()

        # Convert start and end times to samples
        start_sample = round(int(start_time * samples_per_second), -2)
        end_sample = round(int(end_time * samples_per_second), -2)

        print(f"Start sample: {start_sample}")
        print(f"End sample: {end_sample}")

        # Extract the relevant part of the raw array
        cut_raw_array = raw_array[start_sample:end_sample]

        # Create a new Sound object from the cut raw array
        cut_sound = pygame.mixer.Sound(buffer=cut_raw_array)

        # Play the cut sound
        cut_sound.play()

        print(default)

        if default:
            playing_client[file_path] = cut_sound
            print(playing_client)
            print(playing)
        else:
            playing[file_path] = cut_sound

    except Exception as e:
        print(e)
        exit_code.set()

def extract_times_from_filename(filename: str) -> tuple[float, float]:
    pattern = r"_(\d+(\.\d+)?)_(\d+(\.\d+)?)\."
    match = re.search(pattern, filename)
    if match:
        start_time = float(match.group(1))
        end_time = float(match.group(3))
        return start_time, end_time
    else:
        os.remove(filename)

def monitor_directory(directory: str, device: str, default: bool):
    global playing, playing_client

    pygame.mixer.pre_init(44100, -16, 2, 2048)
    pygame.mixer.init(devicename=device)

    while not exit_code.is_set():
        if os.path.isdir(os.path.join(directory, "EXIT_PROGRAM")):
            os.rmdir(os.path.join(directory, "EXIT_PROGRAM"))
            exit_code.set()
            sys.exit()

        try:
            if default:
                for file_path in playing_client:
                    if os.path.isdir(file_path + "CANCEL"):
                        print("MIC: " + str(playing))
                        print("CLIENT: " + str(playing_client))

                        playing_client.get(file_path).stop()
                        playing_client.pop(file_path)

                        os.rmdir(file_path + "CANCEL")

                        print(playing)
                        print(playing_client)
            else:
                for file_path in playing:
                    if os.path.isdir(file_path + "CANCEL"):
                        print("MIC: " + str(playing))
                        print("CLIENT: " + str(playing_client))

                        playing.get(file_path).stop()
                        playing.pop(file_path)

                        print(playing)
                        print(playing_client)
        except RuntimeError:
            pass

        files = [f for f in os.listdir(directory) if f.endswith(('.mp3', '.wav'))]

        for file in files:
            try:
                file_path = os.path.join(directory, file)

                if os.path.exists(file_path):
                    # Extract start and end times from filename
                    start_time, end_time = extract_times_from_filename(file)
                    print(f"Start time: {start_time}, End time: {end_time}")

                    print("Started")

                    # Play sound on chosen device
                    if default:
                        play_sound(file_path, start_time, end_time, device, default=True)
                    else:
                        play_sound(file_path, start_time, end_time, device)

                    print("Finished")
                    
                    if default:
                        while os.path.exists(file_path):
                            try:
                                os.remove(file_path)
                            except Exception:
                                pass
            except Exception as e:
                print(e)

        time.sleep(0.1)  # Check the directory every 0.1 seconds

def main():
    devices = get_devices(capture_devices=False)
    default_device = devices[0]

    os.makedirs(f"{temp}/ameboard/playing/queued", exist_ok=True)

    with open(f"{temp}/ameboard/devices", "w") as f:
        for device in devices:
            f.write(device + "\n")

    chosen_device = None

    while chosen_device is None:
        if not os.path.exists(f"{temp}/ameboard/device"):
            time.sleep(1)
            continue

        with open(f"{temp}/ameboard/device", "r") as f:
            chosen_device = f.readline().strip()

    # Start monitoring the directory in a separate process
    mic_output = multiprocessing.Process(target=monitor_directory, args=(f"{temp}/ameboard/playing", chosen_device, False))
    default_output = multiprocessing.Process(target=monitor_directory, args=(f"{temp}/ameboard/playing", default_device, True))

    mic_output.start()
    default_output.start()

    # Keep the program running
    try:
        while not exit_code.is_set():
            time.sleep(0.1)
    except KeyboardInterrupt:
        pass
    finally:
        exit_code.set()

    pygame.mixer.quit()

if __name__ == "__main__":
    main()
