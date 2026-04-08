# AddCodeComments — Design Spec

## Summary

Transform the existing `file-header-tool` CLI into `AddCodeComments`, an AI-powered code commenting tool that uses Ollama (local LLM) to intelligently add file headers, class headers, function headers, and inline comments following language-specific best practices. Triggered via Ctrl+Alt+H in VS Code.

## Modes of Operation

### Full Project Mode
- Walks the entire directory tree recursively
- Triggered on first run in a project (no `.codecomments` marker exists) or with `--full` flag
- Creates `.codecomments` marker file on completion

### Changed Files Mode
- Default mode when `.codecomments` marker exists
- Uses `git diff --name-only HEAD` + `git ls-files --others --exclude-standard` to find modified and new untracked files
- Falls back to full project mode if not a git repo

## AI Backend

- **Engine:** Ollama local API at `http://localhost:11434/api/generate`
- **Model:** `qwen2.5:14b` (best code comprehension available locally)
- **Approach:** Send full file content with a language-specific system prompt. The model returns the complete file with comments integrated.

## Comment Types

1. **File headers** — purpose, key exports/dependencies, author/date metadata
2. **Class headers** — responsibility, design patterns, key methods overview
3. **Function/method headers** — purpose, parameters, return values, side effects, exceptions
4. **Inline comments** — complex logic, non-obvious algorithms, magic numbers, important branching

## Smart Merge Strategy

The AI prompt instructs the model to:
- Add comments where none exist
- Update comments that are stale or inaccurate relative to the code
- Preserve manual/intentional comments that are still accurate
- Never remove comments that contain TODOs, FIXMEs, or developer notes
- Return the complete file content (not a diff)

## Supported Languages and Comment Conventions

| Language | Extensions | Comment Style |
|----------|-----------|---------------|
| JavaScript | .js | JSDoc (`/** */`) |
| TypeScript | .ts | JSDoc/TSDoc (`/** */`) |
| JSX/TSX | .jsx, .tsx | JSDoc (`/** */`) |
| Python | .py | Docstrings (`"""`) PEP 257 |
| Java | .java | Javadoc (`/** */`) |
| C# | .cs | XML doc comments (`///`) |
| C | .c, .h | Doxygen (`/** @brief */`) |
| C++ | .cpp, .hpp, .cc, .hh, .cxx | Doxygen (`/** @brief */`) |
| Go | .go | Godoc (comment starts with identifier name) |
| Rust | .rs | Doc comments (`///`, `//!`) with `# Examples` |
| Swift | .swift | Swift markup (`/// - Parameter:`, `/// - Returns:`) |
| PHP | .php | PHPDoc (`/** @param */`) |
| Ruby | .rb | YARD (`# @param`, `# @return`) |
| Bash/Shell | .sh, .bash | `#` block headers with usage/args |
| HTML | .html, .htm | `<!-- -->` |
| CSS/SCSS/LESS | .css, .scss, .less | `/* */` |
| XML | .xml | `<!-- -->` |
| SQL | .sql | `--` block headers |
| Terraform | .tf | `#` with HCL conventions |
| PowerShell | .ps1 | `<# #>` comment-based help |
| YAML | .yml, .yaml | `#` inline |
| Dockerfile | Dockerfile | `#` with stage/instruction explanations |
| Markdown | .md | `<!-- -->` (file header only) |
| INI/TOML | .ini, .toml | `#` or `;` |
| JSON | .json | Skip (no comment syntax) |

## File Processing Pipeline

```
For each file:
  1. Read file content
  2. Determine language from extension
  3. Skip if binary, too large, or in excluded directory
  4. Create backup in temp directory
  5. Build prompt with language-specific instructions
  6. Send to Ollama API (stream response)
  7. Validate response (must contain original code, not just comments)
  8. Write updated content back to file
  9. Clean up backup on success
```

## Exclusions

Directories skipped: `node_modules`, `.git`, `dist`, `build`, `__pycache__`, `.next`, `.nuxt`, `vendor`, `target`, `.cargo`, `bin/Debug`, `bin/Release`, `obj`, `coverage`, `.tox`, `.venv`, `venv`, `env`

Files skipped:
- Binary files (detected by extension: images, fonts, archives, etc.)
- Files > 100KB (configurable via `--max-size`)
- Lock files (`package-lock.json`, `yarn.lock`, `Gemfile.lock`, etc.)
- Generated files (`.min.js`, `.map`, `.d.ts`)
- JSON files (no comment syntax)

## CLI Interface

```
add-comments [options]

Options:
  --full          Force full project scan (ignore .codecomments marker)
  --dry-run       Show which files would be processed without modifying them
  --max-size N    Max file size in KB (default: 100)
  --model NAME    Ollama model to use (default: qwen2.5:14b)
  --verbose       Show detailed progress
  --help          Show help
```

## VS Code Integration

### Global Task (tasks.json in user directory)
```json
{
  "label": "Add Code Comments",
  "type": "shell",
  "command": "add-comments",
  "problemMatcher": []
}
```

### Global Keybinding (keybindings.json)
```json
{
  "key": "ctrl+alt+h",
  "command": "workbench.action.tasks.runTask",
  "args": "Add Code Comments"
}
```

## Installation Scripts

### install.bat (Windows)
1. Check Node.js is installed
2. Check Ollama is installed
3. Run `npm link` in tool directory
4. Add VS Code global task
5. Add VS Code keybinding
6. Verify installation

### install.sh (macOS/Linux)
Same steps, adapted for Unix paths and VS Code config locations.

## Safety Measures

- Back up each file to a temp directory before modification
- Validate AI response contains the original code structure (not truncated/hallucinated)
- Sequential file processing (no parallel Ollama calls)
- `.codecomments` marker prevents accidental full re-runs
- `--dry-run` flag for previewing changes

## Project Rename

- CLI command: `file-header-tool` → `add-comments`
- npm package name: `file-header-tool` → `addcodecomments`
- GitHub repo: `idatarbel/file-header-tool` → `idatarbel/AddCodeComments`
- All internal references updated
