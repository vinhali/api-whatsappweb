#!/bin/bash

# This script will create a virtual microphone for PulseAudio to use and set it as the default device.

INPUT_FILE=$1
VIRTMIC_PATH=/tmp/virtmic

# Clean
echo "Clean cache"
sudo rm -rf /tmp/virtmic
sudo pactl unload-module module-pipe-source

# Load the "module-pipe-source" module to read audio data from a FIFO special file.
echo "Creating virtual microphone."
sudo pactl load-module module-pipe-source source_name=virtmic file=$VIRTMIC_PATH format=s16le rate=16000 channels=1

# Set the virtmic as the default source device.
echo "Set the virtual microphone as the default device."
sudo pactl set-default-source virtmic

echo "Set Permission"
sudo chown root:root /tmp/virtmic
sudo chmod 777 /tmp/virtmic
sudo chmod 777 /opt/whatsappApi/sinal.mp3

# Write the audio file to the named pipe virtmic. This will block until the named pipe is read.
echo "Writing audio file to virtual microphone."

sudo ffmpeg -re -i "$INPUT_FILE" -f s16le -ar 16000 -ac 1 - > "$VIRTMIC_PATH"
