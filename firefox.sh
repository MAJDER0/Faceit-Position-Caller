#!/bin/bash

# Define the source directory for the Firefox files
firefox_folder="./firefox"

# Check if the firefox folder exists
if [ ! -d "$firefox_folder" ]; then
    echo "Error: Firefox folder not found!"
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

# Copy the files from the firefox folder to the main directory
cp "$firefox_folder/manifest.json" "$manifest_dest"
cp "$firefox_folder/background.js" "$background_dest"
cp "$firefox_folder/appsettings.json" "$appsettings_dest"

# Output success message
echo "Firefox files have been successfully unpacked and copied to the project root."
