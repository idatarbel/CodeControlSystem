@echo off
setlocal enabledelayedexpansion

echo.
echo === CodeControlSystem Installer (Windows) ===
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo Download it from https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js found: %NODE_VER%

:: Check for API key config
set "CONFIG_DIR=%USERPROFILE%\.codecontrolsystem"
set "CONFIG_FILE=%CONFIG_DIR%\config.json"
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

if not exist "%CONFIG_FILE%" (
    echo.
    echo [SETUP] No API key found. CodeControlSystem supports two backends:
    echo   1. Anthropic API (recommended^) — fast, high quality
    echo   2. Ollama (local^) — free, slower, requires local GPU
    echo.
    set /p API_KEY="Enter your Anthropic API key (or press Enter to use Ollama): "
    if defined API_KEY (
        echo {"apiKey":"!API_KEY!","model":"claude-haiku-4-5-20251001","maxTokens":8192} > "%CONFIG_FILE%"
        echo [OK] Anthropic API key saved
    ) else (
        echo [INFO] No API key provided. Will use Ollama (local^).
        echo        Make sure Ollama is installed: https://ollama.com/download
    )
) else (
    echo [OK] Config found at %CONFIG_FILE%
)

:: npm link
echo [INFO] Installing CLI globally...
cd /d "%~dp0"
call npm link
if %errorlevel% neq 0 (
    echo [ERROR] npm link failed. Try running as Administrator.
    exit /b 1
)
echo [OK] CLI installed (command: code-control)

:: VS Code global tasks
set "VSCODE_USER=%APPDATA%\Code\User"
if not exist "%VSCODE_USER%" (
    echo [WARN] VS Code user directory not found at %VSCODE_USER%
    echo        Skipping VS Code integration.
    goto :skip_vscode
)

:: Create/update tasks.json
set "TASKS_FILE=%VSCODE_USER%\tasks.json"
if not exist "%TASKS_FILE%" (
    (
        echo {
        echo   "version": "2.0.0",
        echo   "tasks": [
        echo     {
        echo       "label": "Code Control System",
        echo       "type": "shell",
        echo       "command": "code-control",
        echo       "problemMatcher": [],
        echo       "presentation": {
        echo         "reveal": "always",
        echo         "panel": "new"
        echo       }
        echo     }
        echo   ]
        echo }
    ) > "%TASKS_FILE%"
    echo [OK] Created VS Code global task
) else (
    findstr /c:"Code Control System" "%TASKS_FILE%" >nul 2>nul
    if !errorlevel! neq 0 (
        echo [WARN] tasks.json exists but doesn't contain our task.
        echo        Please add this task manually to %TASKS_FILE%:
        echo        {"label":"Code Control System","type":"shell","command":"code-control","problemMatcher":[]}
    ) else (
        echo [OK] VS Code task already configured
    )
)

:: Create/update keybindings.json
set "KEYS_FILE=%VSCODE_USER%\keybindings.json"
if not exist "%KEYS_FILE%" (
    (
        echo [
        echo   {
        echo     "key": "ctrl+alt+h",
        echo     "command": "workbench.action.tasks.runTask",
        echo     "args": "Code Control System"
        echo   }
        echo ]
    ) > "%KEYS_FILE%"
    echo [OK] Created VS Code keybinding (Ctrl+Alt+H^)
) else (
    findstr /c:"ctrl+alt+h" "%KEYS_FILE%" >nul 2>nul
    if !errorlevel! neq 0 (
        echo [WARN] keybindings.json exists but doesn't contain our binding.
        echo        Please add this keybinding manually to %KEYS_FILE%:
        echo        {"key":"ctrl+alt+h","command":"workbench.action.tasks.runTask","args":"Code Control System"}
    ) else (
        echo [OK] VS Code keybinding already configured
    )
)

:skip_vscode

:: Verify
echo.
echo === Verification ===
where code-control >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] code-control command is available globally
) else (
    echo [WARN] code-control not found in PATH. You may need to restart your terminal.
)

echo.
echo === Installation Complete ===
echo.
echo Usage:
echo   1. Open any project in VS Code
echo   2. Press Ctrl+Alt+H to open the menu
echo   3. Or run: code-control
echo.
echo Options:
echo   code-control --help       Show all options
echo   code-control --dry-run    Preview without changes
echo   code-control --task all   Run all tasks without menu
echo.

endlocal
