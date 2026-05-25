#!/bin/sh
set -e

npm install
npx expo prebuild --platform ios --non-interactive
cd ios
pod install --repo-update
