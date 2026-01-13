#!/bin/sh
set -e

# Start the backend server in the background
node dist/backend/server.js &

# Start a simple server for the frontend
npx serve -s dist/frontend -l 3000

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
