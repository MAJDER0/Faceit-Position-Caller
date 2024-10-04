#!/bin/bash

# Define the source directory for the Chromium files
chromium_folder="./chromium"

# Check if the chromium folder exists
if [ ! -d "$chromium_folder" ]; then
    echo "Error: Chromium folder not found!"
    exit 1
fi

# Define the paths to the destination files
manifest_dest="./manifest.json"
background_dest="./background.js"
appsettings_dest="./appsettings.json"

# Check if the destination files exist and delete them if they do
if [ -f "$manifest_dest" ]; then
    echo "Deleting existing manifest.json"
    rm "$manifest_dest"
fi

if [ -f "$background_dest" ]; then
    echo "Deleting existing background.js"
    rm "$background_dest"
fi

if [ -f "$appsettings_dest" ]; then
    echo "Deleting existing appsettings.json"
    rm "$appsettings_dest"
fi

# Copy the files from the chromium folder to the main directory
cp "$chromium_folder/manifest.json" "$manifest_dest"
cp "$chromium_folder/background.js" "$background_dest"
cp "$chromium_folder/appsettings.json" "$appsettings_dest"

# Output success message
echo "Chromium files have been successfully unpacked and copied to the project root."
