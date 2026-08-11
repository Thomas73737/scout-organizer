#!/bin/bash

# Scout Organizer - Local Development with Ngrok
# This script starts your app locally and exposes it via Ngrok

export PATH="$HOME/.local/bin:$HOME/.local/share/pnpm/bin:$HOME/bin:$PATH"

echo "🚀 Starting Scout Organizer locally with Ngrok..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running. Starting MongoDB..."
    mkdir -p ~/data/db
    mongod --dbpath ~/data/db --fork --logpath ~/mongodb.log
    sleep 3
fi

echo "✅ MongoDB is running"

# Build the project
echo "🔨 Building project..."
cd artifacts/api-server && pnpm run build
cd ../..
cd artifacts/scouts-web && pnpm run build
cd ../..

# Kill any existing processes on ports 5000 and 3000
echo "🧹 Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2

# Start API server in background
echo "🔧 Starting API server on port 5000..."
cd artifacts/api-server
PORT=5000 pnpm run start > /tmp/api-server.log 2>&1 &
API_PID=$!
cd ../..

# Wait for API to start
sleep 5

# Check if API started successfully
if ! kill -0 $API_PID 2>/dev/null; then
    echo "❌ API server failed to start. Check /tmp/api-server.log"
    cat /tmp/api-server.log
    exit 1
fi

echo "✅ API server started (PID: $API_PID)"

# Start frontend in background
echo "🎨 Starting frontend on port 3000..."
cd artifacts/scouts-web
VITE_PORT=3000 pnpm run serve > /tmp/frontend.log 2>&1 &
WEB_PID=$!
cd ../..

# Wait for frontend to start
sleep 5

# Check if frontend started successfully
if ! kill -0 $WEB_PID 2>/dev/null; then
    echo "❌ Frontend failed to start. Check /tmp/frontend.log"
    cat /tmp/frontend.log
    exit 1
fi

echo "✅ Frontend started (PID: $WEB_PID)"

# Start ngrok for frontend
echo "🌐 Starting Ngrok tunnel for frontend..."
export PATH="$HOME/bin:$PATH"
ngrok http 3000 --log=stdout &
NGROK_PID=$!

echo ""
echo "✨ Your app is now running locally!"
echo ""
echo "📱 API Server: http://localhost:5000"
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Public URL (Ngrok): Check the ngrok output above"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $API_PID 2>/dev/null
    kill $WEB_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Keep script running
wait