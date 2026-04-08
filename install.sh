#!/bin/bash
set -e

echo ""
echo "=== CodeControlSystem Installer (macOS/Linux) ==="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Install it from https://nodejs.org/ or via your package manager."
    exit 1
fi
echo "[OK] Node.js found: $(node --version)"

# Check for API key config
CONFIG_DIR="$HOME/.codecontrolsystem"
CONFIG_FILE="$CONFIG_DIR/config.json"
mkdir -p "$CONFIG_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
    echo ""
    echo "[SETUP] No API key found. CodeControlSystem supports two backends:"
    echo "  1. Anthropic API (recommended) — fast, high quality"
    echo "  2. Ollama (local) — free, slower, requires local GPU"
    echo ""
    read -p "Enter your Anthropic API key (or press Enter to use Ollama): " API_KEY
    if [ -n "$API_KEY" ]; then
        cat > "$CONFIG_FILE" << CONFEOF
{
  "apiKey": "$API_KEY",
  "model": "claude-haiku-4-5-20251001",
  "maxTokens": 8192
}
CONFEOF
        echo "[OK] Anthropic API key saved"
    else
        echo "[INFO] No API key provided. Will use Ollama (local)."
        echo "       Make sure Ollama is installed: https://ollama.com/download"
    fi
else
    echo "[OK] Config found at $CONFIG_FILE"
fi

# npm link
echo "[INFO] Installing CLI globally..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
npm link
echo "[OK] CLI installed (command: code-control)"

# VS Code global config
if [[ "$OSTYPE" == "darwin"* ]]; then
    VSCODE_USER="$HOME/Library/Application Support/Code/User"
elif [[ "$OSTYPE" == "linux"* ]]; then
    VSCODE_USER="$HOME/.config/Code/User"
else
    VSCODE_USER=""
fi

if [ -z "$VSCODE_USER" ] || [ ! -d "$VSCODE_USER" ]; then
    echo "[WARN] VS Code user directory not found."
    echo "       Skipping VS Code integration."
else
    # tasks.json
    TASKS_FILE="$VSCODE_USER/tasks.json"
    if [ ! -f "$TASKS_FILE" ]; then
        cat > "$TASKS_FILE" << 'TASKEOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Code Control System",
      "type": "shell",
      "command": "code-control",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
TASKEOF
        echo "[OK] Created VS Code global task"
    elif grep -q "Code Control System" "$TASKS_FILE"; then
        echo "[OK] VS Code task already configured"
    else
        echo "[WARN] tasks.json exists but doesn't contain our task."
        echo '       Add: {"label":"Code Control System","type":"shell","command":"code-control","problemMatcher":[]}'
    fi

    # keybindings.json
    KEYS_FILE="$VSCODE_USER/keybindings.json"
    if [ ! -f "$KEYS_FILE" ]; then
        cat > "$KEYS_FILE" << 'KEYEOF'
[
  {
    "key": "ctrl+alt+h",
    "command": "workbench.action.tasks.runTask",
    "args": "Code Control System"
  }
]
KEYEOF
        echo "[OK] Created VS Code keybinding (Ctrl+Alt+H)"
    elif grep -q "ctrl+alt+h" "$KEYS_FILE"; then
        echo "[OK] VS Code keybinding already configured"
    else
        echo "[WARN] keybindings.json exists but doesn't contain our binding."
        echo '       Add: {"key":"ctrl+alt+h","command":"workbench.action.tasks.runTask","args":"Code Control System"}'
    fi
fi

# Verify
echo ""
echo "=== Verification ==="
if command -v code-control &>/dev/null; then
    echo "[OK] code-control command is available globally"
else
    echo "[WARN] code-control not found in PATH. You may need to restart your terminal."
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Usage:"
echo "  1. Open any project in VS Code"
echo "  2. Press Ctrl+Alt+H to open the menu"
echo "  3. Or run: code-control"
echo ""
echo "Options:"
echo "  code-control --help       Show all options"
echo "  code-control --dry-run    Preview without changes"
echo "  code-control --task all   Run all tasks without menu"
echo ""
