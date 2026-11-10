#!/usr/bin/env bash
# Render build script for native Python runtime
set -o errexit

echo "==> Building SvaraLens Landing Page..."
cd landing
npm install
npm run build
cd ..

echo "==> Building SvaraLens PRO Workbench..."
cd frontend
npm install
npm run build
cd ..

echo "==> Installing Python Backend Dependencies..."
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt

echo "==> Ensuring storage directories exist..."
mkdir -p data storage/audio

echo "==> SvaraLens build completed successfully!"
