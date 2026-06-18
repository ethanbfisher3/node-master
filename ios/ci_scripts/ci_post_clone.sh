#!/bin/sh
set -e

cd ../..
npm install
cd ios
pod install
