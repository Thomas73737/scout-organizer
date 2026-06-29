# Local Hosting with Ngrok

This guide shows you how to host your Scout Organizer locally and expose it to the internet using Ngrok.

## Prerequisites

✅ MongoDB is already installed and running on your machine
✅ Ngrok is installed in `~/bin/ngrok`
✅ Your project is built and ready

## Quick Start

Simply run the start script:

```bash
./start-local.sh
```

This will:
1. ✅ Check/start MongoDB
2. 🔨 Build your project
3. 🔧 Start the API server (port 5000)
4. 🎨 Start the frontend (port 3000)
5. 🌐 Expose frontend via Ngrok to the internet

## What You'll Get

- **Local API**: http://localhost:5000
- **Local Frontend**: http://localhost:3000
- **Public URL**: https://xxxx-xx-xx-xx-xx.ngrok-free.app (shown in ngrok output)

## Accessing Your App

### For Local Testing:
- Open http://localhost:3000 in your browser

### For Sharing/Public Access:
- Use the Ngrok URL shown in the terminal (looks like: https://xxxx-xx-xx-xx-xx.ngrok-free.app)
- Share this URL with others to access your app

## Stopping the Services

Press `Ctrl+C` to stop all services (API, frontend, and ngrok).

## Manual Setup (If Script Fails)

If the script doesn't work, you can start services manually:

### 1. Start MongoDB (if not running)
```bash
mkdir -p ~/data/db
mongod --dbpath ~/data/db --fork --logpath ~/mongodb.log
```

### 2. Build the project
```bash
pnpm run build
```

### 3. Start API server
```bash
cd artifacts/api-server
PORT=5000 pnpm run start
```

### 4. Start frontend (in new terminal)
```bash
cd artifacts/scouts-web
VITE_PORT=3000 pnpm run serve
```

### 5. Start Ngrok (in new terminal)
```bash
export PATH="$HOME/bin:$PATH"
ngrok http 3000
```

## Troubleshooting

### MongoDB won't start
```bash
# Check if MongoDB is already running
pgrep -x "mongod"

# If not, start it manually
mongod --dbpath ~/data/db --fork --logpath ~/mongodb.log
```

### Port already in use
```bash
# Check what's using port 3000 or 5000
lsof -i :3000
lsof -i :5000

# Kill the process if needed
kill -9 <PID>
```

### Ngrok not found
```bash
# Make sure ngrok is in your PATH
export PATH="$HOME/bin:$PATH"
ngrok version
```

### Services not starting
Check the log files:
```bash
cat /tmp/api-server.log
cat /tmp/frontend.log
cat ~/mongodb.log
```

## Advantages of Local Hosting

✅ **Free** - No cloud hosting costs
✅ **Full control** - Complete access to your database and logs
✅ **Fast development** - Instant changes without redeploying
✅ **Privacy** - Your data stays on your machine
✅ **Easy setup** - No cloud accounts needed

## Disadvantages

❌ **Requires your computer to be on** - Service stops when you turn off your computer
❌ **Network dependent** - Requires stable internet connection
❌ **Ngrok URL changes** - Free Ngrok URLs change on restart
❌ **Limited bandwidth** - Ngrok free tier has limitations

## Next Steps

For permanent hosting, consider:
- Setting up MongoDB Atlas and deploying to Render (see DEPLOYMENT.md)
- Using a VPS (DigitalOcean, Linode)
- Setting up a home server with domain

## Notes

- Ngrok free tier is suitable for development and testing
- For production use, consider upgrading to Ngrok paid or using a proper hosting solution
- Your local MongoDB database is not backed up automatically