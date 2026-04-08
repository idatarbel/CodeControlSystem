# CodeControlSystem

AI-powered code review and maintenance tool. Press **Ctrl+Alt+H** in VS Code to get an interactive menu for exception handling, naming conventions, security audits, dead code removal, intelligent commenting, and more.

## Menu Options

| # | Task | What It Does | Output |
|---|------|-------------|--------|
| 1 | Exception Handling | Add try/catch/error handling | Modifies code + findings report |
| 2 | Naming Conventions | Fix names to language standards | Modifies code + findings report |
| 3 | Hard-Coded Data Audit | Document all hard-coded values | Findings report only |
| 4 | Dead Code Removal | Remove unused/dormant code | Modifies code + findings report |
| 5 | Security Review | OWASP, NIST, ISO, GDPR audit | Findings report only |
| 6 | README Validation | Ensure comprehensive README.md | Modifies README + findings report |
| 7 | Sensitive Data Check | Scan for secrets in commits | Findings report only |
| 8 | Add Code Comments | AI-powered documentation comments | Modifies code |
| 9 | All | Run everything above | All of the above |

When "All" is selected:
- **Phase 1:** Report-only tasks (3, 5, 7) run in parallel
- **Phase 2:** Code-modifying tasks (1, 2, 4, 6) run sequentially
- **Phase 3:** Code comments (8) run last on the final code state

## Findings Reports

All findings are written to: `code_review/code_review_findings_<timestamp>.md`

## Supported Languages (25+)

| Language | Comment Style | Language | Comment Style |
|----------|--------------|----------|--------------|
| JavaScript/JSX | JSDoc | Python | PEP 257 docstrings |
| TypeScript/TSX | TSDoc | Java | Javadoc |
| C# | XML doc comments | C/C++ | Doxygen |
| Go | Godoc | Rust | rustdoc (`///`) |
| Swift | Swift markup | PHP | PHPDoc |
| Ruby | YARD | Bash/Shell | `#` blocks |
| HTML/XML | `<!-- -->` | CSS/SCSS/LESS | `/* */` |
| SQL | `--` headers | Terraform | `#` HCL |
| PowerShell | Comment-based help | YAML | `#` inline |
| Dockerfile | `#` stage docs | INI/TOML | `#`/`;` |

## AI Backends

CodeControlSystem supports two backends:

| Backend | Speed | Cost | Quality |
|---------|-------|------|---------|
| **Anthropic API** (default) | ~5 sec/file | ~$0.02/file | Excellent |
| **Ollama** (local fallback) | ~2-5 min/file | Free | Good |

The backend is auto-detected: if an Anthropic API key exists in `~/.codecontrolsystem/config.json`, it uses the API. Otherwise, it falls back to Ollama.

## Prerequisites

- **Node.js** (v16+): [https://nodejs.org/](https://nodejs.org/)
- **Anthropic API key** (recommended) or **Ollama** (free/local)

## Installation

### Windows

```cmd
cd path\to\CodeControlSystem
install.bat
```

### macOS / Linux

```bash
cd path/to/CodeControlSystem
chmod +x install.sh
./install.sh
```

### Manual Installation

```bash
cd path/to/CodeControlSystem
npm link
```

Create `~/.codecontrolsystem/config.json`:
```json
{
  "apiKey": "sk-ant-...",
  "model": "claude-haiku-4-5-20251001",
  "maxTokens": 8192
}
```

## Usage

### Keyboard Shortcut (VS Code)

Press **Ctrl+Alt+H** in any project to open the interactive menu.

### Command Line

```bash
# Interactive menu
code-control

# Run a specific task
code-control --task comments
code-control --task security
code-control --task all

# Force full project scan
code-control --task comments --full

# Preview without modifying files
code-control --dry-run

# Verbose output
code-control --verbose
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--task ID` | Run specific task without menu | Interactive menu |
| `--full` | Force full project scan | Off (uses git diff) |
| `--dry-run` | Preview files without modifying | Off |
| `--max-size N` | Max file size in KB | 100 |
| `--model NAME` | Override AI model | claude-haiku-4-5-20251001 |
| `--verbose` | Detailed progress output | Off |
| `--help` | Show help message | |

## File Behavior

**First run:** Processes the entire project.
**Subsequent runs:** Only processes files that have changed (via `git diff`).
Use `--full` to force a full rescan.

## Automatically Skipped

- Binary files (images, fonts, archives, executables)
- Lock files (package-lock.json, yarn.lock, etc.)
- Generated files (.min.js, .map, .d.ts)
- JSON files (no comment syntax)
- Files over 100KB (configurable)
- Build directories (node_modules, dist, build, __pycache__, .next, etc.)

## Configuration

Config file: `~/.codecontrolsystem/config.json`

```json
{
  "apiKey": "sk-ant-...",
  "model": "claude-haiku-4-5-20251001",
  "maxTokens": 8192
}
```

You can also set the API key via environment variable: `ANTHROPIC_API_KEY`

## License

MIT

## Author

Dan Spiegel
