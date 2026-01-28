#!/bin/bash
set -e

echo "🔨 Building application..."

# Build backend first
echo "  → Compiling backend..."
cd backend
go build -o main .
cd ..

# Build root application
echo "  → Compiling application..."
mkdir -p bin
go build -o bin/yugiohdex .

echo "✅ Build successful!"
