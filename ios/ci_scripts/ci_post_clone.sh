#!/bin/sh
brew install node
npm install -g yarn
cd ../..
yarn install
cd ios
pod install
