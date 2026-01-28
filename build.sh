#!/bin/bash
set -e

# Build backend
echo "Building backend..."
cd backend
go build -o main .
cd ..

# Build root application
echo "Building application..."
go build -o bin/yugiohdex .
