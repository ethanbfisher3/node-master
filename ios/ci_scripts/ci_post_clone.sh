#!/bin/sh
set -e

echo "Setting up Node"

export HOMEBREW_NO_AUTO_UPDATE=1
brew install node@20

node -v
npm -v

echo "Installing node modules..."
npm install

echo "Installing CocoaPods..."
cd ios
pod install --repo-update
