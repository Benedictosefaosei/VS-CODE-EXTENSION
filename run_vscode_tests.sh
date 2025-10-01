#!/bin/bash
# run_vscode_tests.sh

echo "Starting VS Code Extension UI Tests..."

# Kill any existing VS Code instances
pkill -f "Visual Studio Code" || true
pkill -f "Code\.exe" || true

# Wait for processes to terminate
sleep 2

# Run the tests
python vscode_extension_ui_test.py

echo "Tests completed!"