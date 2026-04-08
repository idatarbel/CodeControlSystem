# AddCodeComments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static file-header-tool with an AI-powered commenting CLI that uses Ollama locally to add intelligent, language-specific comments to code files.

**Architecture:** Single Node.js CLI (`index.js`) split into focused modules: `src/languages.js` (language registry), `src/ollama.js` (AI client), `src/files.js` (file discovery/filtering), `src/prompts.js` (prompt builder), and the main `index.js` entry point. Uses Ollama's HTTP API to send file contents and receive commented versions.

**Tech Stack:** Node.js (no external npm dependencies — uses built-in `fs`, `path`, `child_process`, `http`, `os`), Ollama local API, VS Code tasks/keybindings.

---

## File Structure

```
addcodecomments/
├── index.js              # CLI entry point, arg parsing, orchestration
├── src/
│   ├── languages.js      # Language registry: extensions → comment styles + prompts
│   ├── ollama.js         # Ollama HTTP client (generate endpoint)
│   ├── files.js          # File discovery, filtering, git diff, directory walking
│   └── prompts.js        # Prompt builder for each comment type
├── install.bat           # Windows installer
├── install.sh            # macOS/Linux installer
├── package.json          # npm config with bin entry
├── README.md             # Usage docs
├── LICENSE               # Existing license
└── docs/                 # Specs and plans
```

---

### Task 1: Create Language Registry (`src/languages.js`)

**Files:**
- Create: `src/languages.js`

This module maps file extensions to language metadata: name, comment style, and doc convention name.

- [ ] **Step 1: Create `src/languages.js`**

```javascript
#!/usr/bin/env node

/**
 * Language registry — maps file extensions to language metadata.
 */

const LANGUAGES = {
  // JavaScript family
  ".js":   { name: "JavaScript",  style: "jsdoc" },
  ".jsx":  { name: "JSX",         style: "jsdoc" },
  ".ts":   { name: "TypeScript",  style: "tsdoc" },
  ".tsx":  { name: "TSX",         style: "tsdoc" },

  // Python
  ".py":   { name: "Python",      style: "pep257" },

  // JVM
  ".java": { name: "Java",        style: "javadoc" },

  // .NET
  ".cs":   { name: "C#",          style: "xmldoc" },

  // C/C++
  ".c":    { name: "C",           style: "doxygen" },
  ".h":    { name: "C/C++ Header", style: "doxygen" },
  ".cpp":  { name: "C++",         style: "doxygen" },
  ".hpp":  { name: "C++",         style: "doxygen" },
  ".cc":   { name: "C++",         style: "doxygen" },
  ".hh":   { name: "C++",         style: "doxygen" },
  ".cxx":  { name: "C++",         style: "doxygen" },

  // Go
  ".go":   { name: "Go",          style: "godoc" },

  // Rust
  ".rs":   { name: "Rust",        style: "rustdoc" },

  // Swift
  ".swift": { name: "Swift",      style: "swiftdoc" },

  // PHP
  ".php":  { name: "PHP",         style: "phpdoc" },

  // Ruby
  ".rb":   { name: "Ruby",        style: "yard" },

  // Shell
  ".sh":   { name: "Bash",        style: "shell" },
  ".bash": { name: "Bash",        style: "shell" },

  // Web
  ".html": { name: "HTML",        style: "html" },
  ".htm":  { name: "HTML",        style: "html" },
  ".css":  { name: "CSS",         style: "css" },
  ".scss": { name: "SCSS",        style: "css" },
  ".less": { name: "LESS",        style: "css" },
  ".xml":  { name: "XML",         style: "html" },

  // Data/Config
  ".sql":  { name: "SQL",         style: "sql" },
  ".tf":   { name: "Terraform",   style: "hash" },
  ".yml":  { name: "YAML",        style: "hash" },
  ".yaml": { name: "YAML",        style: "hash" },
  ".ini":  { name: "INI",         style: "semicolon" },
  ".toml": { name: "TOML",        style: "hash" },

  // PowerShell
  ".ps1":  { name: "PowerShell",  style: "powershell" },

  // Markdown
  ".md":   { name: "Markdown",    style: "html" },

  // Dockerfile (handled by filename, not extension)
};

// Files matched by name rather than extension
const FILENAME_LANGUAGES = {
  "Dockerfile": { name: "Dockerfile", style: "hash" },
};

// Extensions to always skip (no comment syntax or binary)
const SKIP_EXTENSIONS = new Set([
  ".json", ".lock",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".bmp", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".min.js", ".map",
  ".d.ts",
]);

// Directories to always skip
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "__pycache__",
  ".next", ".nuxt", "vendor", "target", ".cargo",
  "bin", "obj", "coverage", ".tox", ".venv", "venv", "env",
  ".build", ".turbo", ".cache",
]);

// Lock files to skip
const LOCK_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "Gemfile.lock", "Cargo.lock", "go.sum", "composer.lock",
  "Pipfile.lock", "poetry.lock",
]);

function getLanguage(filePath) {
  const path = require("path");
  const basename = path.basename(filePath);
  const ext = path.extname(filePath);

  // Check filename match first (Dockerfile)
  if (FILENAME_LANGUAGES[basename]) {
    return FILENAME_LANGUAGES[basename];
  }

  // Check for generated files
  if (basename.endsWith(".min.js") || basename.endsWith(".min.css")) {
    return null;
  }
  if (basename.endsWith(".d.ts")) {
    return null;
  }

  // Check lock files
  if (LOCK_FILES.has(basename)) {
    return null;
  }

  // Check skip extensions
  if (SKIP_EXTENSIONS.has(ext)) {
    return null;
  }

  return LANGUAGES[ext] || null;
}

function isSkippedDir(dirName) {
  return SKIP_DIRS.has(dirName);
}

module.exports = { LANGUAGES, FILENAME_LANGUAGES, SKIP_EXTENSIONS, SKIP_DIRS, getLanguage, isSkippedDir };
```

- [ ] **Step 2: Verify the module loads without errors**

Run: `node -e "const l = require('./src/languages.js'); console.log(Object.keys(l.LANGUAGES).length, 'languages registered'); console.log(l.getLanguage('test.py')); console.log(l.getLanguage('test.json'));"`

Expected output:
```
34 languages registered
{ name: 'Python', style: 'pep257' }
null
```

- [ ] **Step 3: Commit**

```bash
git add src/languages.js
git commit -m "feat: add language registry with 34 language support"
```

---

### Task 2: Create Prompt Builder (`src/prompts.js`)

**Files:**
- Create: `src/prompts.js`

Builds language-specific system prompts that instruct the AI on what comment conventions to follow.

- [ ] **Step 1: Create `src/prompts.js`**

```javascript
/**
 * Prompt builder — generates language-specific system and user prompts
 * for the Ollama API to produce well-commented code.
 */

const STYLE_INSTRUCTIONS = {
  jsdoc: `Use JSDoc conventions:
- File header: /** @file description */
- Functions: /** @param {type} name - desc */ /** @returns {type} desc */
- Classes: /** @class description */
- Complex logic: // inline comments`,

  tsdoc: `Use TSDoc conventions:
- File header: /** @file description */
- Functions: /** @param name - desc */ /** @returns desc */
- Classes: /** @class description */
- Interfaces: /** description of shape and usage */
- Complex logic: // inline comments`,

  pep257: `Use PEP 257 docstring conventions:
- Module docstring: """Module description.""" at top of file
- Classes: """Class description.""" immediately after class line
- Functions: """Function description.\\n\\nArgs:\\n    param: desc\\n\\nReturns:\\n    desc\\n\\nRaises:\\n    ExceptionType: desc"""
- Complex logic: # inline comments`,

  javadoc: `Use Javadoc conventions:
- File header: /** package/file description */
- Classes: /** class description */ with @author
- Methods: /** @param name desc */ /** @return desc */ /** @throws ExceptionType desc */
- Complex logic: // inline comments`,

  xmldoc: `Use C# XML documentation conventions:
- File header: /// <summary>description</summary>
- Classes: /// <summary>description</summary>
- Methods: /// <summary>desc</summary> /// <param name="x">desc</param> /// <returns>desc</returns>
- Complex logic: // inline comments`,

  doxygen: `Use Doxygen conventions:
- File header: /** @file filename \\n @brief description */
- Functions: /** @brief desc \\n @param name desc \\n @return desc */
- Structs/Classes: /** @brief description */
- Complex logic: /* inline comments */ or // inline comments`,

  godoc: `Use Go documentation conventions:
- Package comment: // Package name provides description (before package declaration)
- Functions: // FunctionName does X. (comment starts with function name)
- Types: // TypeName represents X.
- Complex logic: // inline comments
- Do NOT use @param or @return tags — Go convention is prose descriptions`,

  rustdoc: `Use Rust documentation conventions:
- Module header: //! Module description (inner doc comment)
- Functions: /// Description\\n/// \\n/// # Arguments\\n/// * \`param\` - desc\\n/// \\n/// # Returns\\n/// desc
- Structs: /// Description with # Examples section
- Complex logic: // inline comments`,

  swiftdoc: `Use Swift documentation markup:
- File header: /// File description
- Functions: /// Description\\n/// - Parameter name: desc\\n/// - Returns: desc\\n/// - Throws: desc
- Classes/Structs: /// Description
- Complex logic: // inline comments`,

  phpdoc: `Use PHPDoc conventions:
- File header: /** @file description */
- Classes: /** description */ with @package
- Functions: /** @param type $name desc */ /** @return type desc */ /** @throws ExceptionType desc */
- Complex logic: // inline comments`,

  yard: `Use YARD documentation conventions:
- File header: # frozen_string_literal: true then # description
- Classes: # Description
- Methods: # Description\\n# @param name [Type] desc\\n# @return [Type] desc
- Complex logic: # inline comments`,

  shell: `Use shell script documentation conventions:
- File header: #!/bin/bash then # block with description, usage, arguments
- Functions: # Description\\n# Arguments:\\n#   $1 - desc\\n# Returns:\\n#   desc
- Complex logic: # inline comments`,

  html: `Use HTML comment conventions:
- File header: <!-- File description, purpose, dependencies -->
- Section comments: <!-- Section: name -->
- Complex markup: <!-- explanation of structure -->`,

  css: `Use CSS comment conventions:
- File header: /* File description, purpose */
- Section headers: /* ===== Section Name ===== */
- Complex selectors: /* explanation */`,

  sql: `Use SQL comment conventions:
- File header: -- File description, purpose
- Table/View definitions: -- Description
- Complex queries: -- explanation of logic`,

  hash: `Use hash-comment conventions:
- File header: # File description, purpose
- Section headers: # --- Section ---
- Complex logic: # inline explanation`,

  semicolon: `Use semicolon-comment conventions:
- File header: ; File description
- Section headers: ; [SectionName]
- Values: ; explanation of setting`,

  powershell: `Use PowerShell comment-based help:
- File header: <# .SYNOPSIS desc .DESCRIPTION detailed desc #>
- Functions: <# .SYNOPSIS desc .PARAMETER name desc .OUTPUTS type .EXAMPLE usage #>
- Complex logic: # inline comments`,
};

function buildPrompt(fileContent, language, filePath) {
  const styleGuide = STYLE_INSTRUCTIONS[language.style] || STYLE_INSTRUCTIONS.hash;

  const systemPrompt = `You are a senior software engineer adding documentation comments to a ${language.name} source file.

RULES:
1. Add comments where none exist: file headers, class/struct headers, function/method headers, and inline comments for complex logic.
2. Update existing comments that are stale or inaccurate relative to the current code.
3. Preserve existing comments that are still accurate, especially TODOs, FIXMEs, HACKs, and developer notes.
4. Follow the language's standard documentation conventions exactly.
5. Return ONLY the complete file content with comments added. No markdown fences, no explanations, no preamble.
6. Do NOT modify any code — only add or update comments.
7. Do NOT add trivial comments that restate the obvious (e.g., "// increment i" for i++).
8. Keep comments concise and informative.

${styleGuide}`;

  const userPrompt = `Add documentation comments to this ${language.name} file (${filePath}):

${fileContent}`;

  return { systemPrompt, userPrompt };
}

module.exports = { buildPrompt, STYLE_INSTRUCTIONS };
```

- [ ] **Step 2: Verify the module loads and builds a prompt**

Run: `node -e "const p = require('./src/prompts.js'); const r = p.buildPrompt('def hello():\\n  pass', {name:'Python',style:'pep257'}, 'test.py'); console.log(r.systemPrompt.substring(0, 80)); console.log('---'); console.log(r.userPrompt.substring(0, 80));"`

Expected: Both prompts print without error, system prompt starts with "You are a senior software engineer", user prompt contains the code.

- [ ] **Step 3: Commit**

```bash
git add src/prompts.js
git commit -m "feat: add prompt builder with 17 language-specific styles"
```

---

### Task 3: Create Ollama Client (`src/ollama.js`)

**Files:**
- Create: `src/ollama.js`

HTTP client that sends prompts to Ollama's local API and collects the streamed response.

- [ ] **Step 1: Create `src/ollama.js`**

```javascript
/**
 * Ollama HTTP client — sends prompts to the local Ollama API
 * and collects streamed responses.
 */

const http = require("http");

const DEFAULT_HOST = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:14b";

function generate(systemPrompt, userPrompt, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const host = options.host || DEFAULT_HOST;

  const url = new URL("/api/generate", host);

  const payload = JSON.stringify({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    stream: true,
    options: {
      num_ctx: 32768,
      temperature: 0.1,
    },
  });

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 300000, // 5 minutes per file
      },
      (res) => {
        let fullResponse = "";
        let buffer = "";

        res.on("data", (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop(); // keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                fullResponse += parsed.response;
              }
              if (parsed.error) {
                reject(new Error(`Ollama error: ${parsed.error}`));
                return;
              }
            } catch (e) {
              // skip malformed lines
            }
          }
        });

        res.on("end", () => {
          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.response) {
                fullResponse += parsed.response;
              }
            } catch (e) {
              // ignore
            }
          }
          resolve(fullResponse);
        });

        res.on("error", reject);
      }
    );

    req.on("error", (err) => {
      if (err.code === "ECONNREFUSED") {
        reject(new Error("Cannot connect to Ollama. Is it running? Start it with: ollama serve"));
      } else {
        reject(err);
      }
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Ollama request timed out after 5 minutes"));
    });

    req.write(payload);
    req.end();
  });
}

async function checkConnection(host) {
  const url = new URL("/api/tags", host || DEFAULT_HOST);
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: url.hostname, port: url.port, path: url.pathname, timeout: 5000 },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(true));
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

module.exports = { generate, checkConnection, DEFAULT_MODEL };
```

- [ ] **Step 2: Verify the module loads**

Run: `node -e "const o = require('./src/ollama.js'); console.log(typeof o.generate, typeof o.checkConnection); console.log('Default model:', o.DEFAULT_MODEL);"`

Expected:
```
function function
Default model: qwen2.5:14b
```

- [ ] **Step 3: Commit**

```bash
git add src/ollama.js
git commit -m "feat: add Ollama HTTP client with streaming support"
```

---

### Task 4: Create File Discovery Module (`src/files.js`)

**Files:**
- Create: `src/files.js`

Handles directory walking, git diff detection, and file filtering.

- [ ] **Step 1: Create `src/files.js`**

```javascript
/**
 * File discovery — walks directories, queries git for changed files,
 * and filters based on size/extension/exclusion rules.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { getLanguage, isSkippedDir } = require("./languages");

function walkDirectory(dir) {
  const results = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir);
    } catch (err) {
      return; // skip unreadable directories
    }

    for (const entry of entries) {
      if (entry.startsWith(".") || isSkippedDir(entry)) continue;

      const fullPath = path.join(currentDir, entry);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (err) {
        continue; // skip unreadable files
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile()) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function getChangedFiles(rootDir) {
  try {
    // Get modified tracked files (staged + unstaged)
    const modified = execSync("git diff --name-only HEAD 2>/dev/null", {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();

    // Get untracked files
    const untracked = execSync("git ls-files --others --exclude-standard 2>/dev/null", {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();

    const files = [];
    if (modified) {
      files.push(...modified.split("\n").map((f) => path.join(rootDir, f)));
    }
    if (untracked) {
      files.push(...untracked.split("\n").map((f) => path.join(rootDir, f)));
    }

    return files.filter((f) => {
      try { return fs.statSync(f).isFile(); } catch { return false; }
    });
  } catch (err) {
    return null; // not a git repo or git not available
  }
}

function filterFiles(filePaths, maxSizeKB) {
  const maxBytes = (maxSizeKB || 100) * 1024;

  return filePaths.filter((filePath) => {
    const lang = getLanguage(filePath);
    if (!lang) return false;

    try {
      const stat = fs.statSync(filePath);
      if (stat.size > maxBytes) return false;
      if (stat.size === 0) return false;
    } catch {
      return false;
    }

    return true;
  });
}

function hasMarker(rootDir) {
  return fs.existsSync(path.join(rootDir, ".codecomments"));
}

function writeMarker(rootDir) {
  const markerPath = path.join(rootDir, ".codecomments");
  const content = JSON.stringify({
    lastRun: new Date().toISOString(),
    tool: "AddCodeComments",
    model: "qwen2.5:14b",
  }, null, 2);
  fs.writeFileSync(markerPath, content, "utf8");
}

function discoverFiles(rootDir, options = {}) {
  const forceFull = options.full || false;
  const maxSizeKB = options.maxSize || 100;

  let mode;
  let rawFiles;

  if (!forceFull && hasMarker(rootDir)) {
    // Changed files mode
    const changed = getChangedFiles(rootDir);
    if (changed !== null && changed.length > 0) {
      mode = "changed";
      rawFiles = changed;
    } else if (changed !== null && changed.length === 0) {
      mode = "none";
      rawFiles = [];
    } else {
      // Not a git repo, fall back to full
      mode = "full";
      rawFiles = walkDirectory(rootDir);
    }
  } else {
    mode = "full";
    rawFiles = walkDirectory(rootDir);
  }

  const files = filterFiles(rawFiles, maxSizeKB);
  return { mode, files };
}

module.exports = { discoverFiles, walkDirectory, getChangedFiles, filterFiles, hasMarker, writeMarker };
```

- [ ] **Step 2: Verify the module loads and can walk a directory**

Run: `node -e "const f = require('./src/files.js'); const r = f.discoverFiles('.', { full: true }); console.log('Mode:', r.mode, '| Files found:', r.files.length); r.files.forEach(f => console.log(' ', f));"`

Expected: Mode is "full", and it lists the `.js` files in the tool directory.

- [ ] **Step 3: Commit**

```bash
git add src/files.js
git commit -m "feat: add file discovery with git-diff and full-walk modes"
```

---

### Task 5: Rewrite Main Entry Point (`index.js`)

**Files:**
- Modify: `index.js`

Complete rewrite — replaces the old static header generator with the AI-powered orchestrator.

- [ ] **Step 1: Rewrite `index.js`**

```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const { discoverFiles, writeMarker, hasMarker } = require("./src/files");
const { getLanguage } = require("./src/languages");
const { buildPrompt } = require("./src/prompts");
const { generate, checkConnection, DEFAULT_MODEL } = require("./src/ollama");

const ROOT_DIR = process.cwd();

// --- Argument parsing ---
function parseArgs(argv) {
  const args = {
    full: false,
    dryRun: false,
    maxSize: 100,
    model: DEFAULT_MODEL,
    verbose: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--full":
        args.full = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--max-size":
        args.maxSize = parseInt(argv[++i], 10) || 100;
        break;
      case "--model":
        args.model = argv[++i] || DEFAULT_MODEL;
        break;
      case "--verbose":
        args.verbose = true;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
AddCodeComments — AI-powered code documentation tool

Usage: add-comments [options]

Options:
  --full          Force full project scan (ignore .codecomments marker)
  --dry-run       Show which files would be processed without modifying them
  --max-size N    Max file size in KB (default: 100)
  --model NAME    Ollama model to use (default: ${DEFAULT_MODEL})
  --verbose       Show detailed progress
  --help, -h      Show this help message

First run in a project scans all files. Subsequent runs only process
files that have changed (via git diff). Use --full to force a full rescan.
`);
}

// --- Response validation ---
function validateResponse(original, commented) {
  if (!commented || commented.trim().length === 0) {
    return false;
  }

  // Strip comments from both and compare code structure
  // Simple heuristic: commented version should be at least as long as original
  if (commented.trim().length < original.trim().length * 0.5) {
    return false;
  }

  // Check that the response doesn't start with markdown fences
  const trimmed = commented.trim();
  if (trimmed.startsWith("```")) {
    return false;
  }

  return true;
}

// --- Strip markdown fences if present ---
function cleanResponse(response) {
  let cleaned = response;

  // Remove leading/trailing markdown fences
  cleaned = cleaned.replace(/^```[\w]*\n/, "");
  cleaned = cleaned.replace(/\n```\s*$/, "");

  return cleaned;
}

// --- Backup ---
function createBackup(filePath) {
  const backupDir = path.join(os.tmpdir(), "addcodecomments-backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const relativePath = path.relative(ROOT_DIR, filePath).replace(/[/\\]/g, "_");
  const backupPath = path.join(backupDir, `${relativePath}.bak`);
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function removeBackup(backupPath) {
  try {
    fs.unlinkSync(backupPath);
  } catch {
    // ignore
  }
}

// --- Main ---
async function processFile(filePath, args) {
  const language = getLanguage(filePath);
  if (!language) return { status: "skipped", reason: "unsupported" };

  const content = fs.readFileSync(filePath, "utf8");
  if (!content.trim()) return { status: "skipped", reason: "empty" };

  const relPath = path.relative(ROOT_DIR, filePath);

  if (args.dryRun) {
    console.log(`  [dry-run] Would process: ${relPath} (${language.name})`);
    return { status: "dry-run" };
  }

  const backupPath = createBackup(filePath);

  try {
    const { systemPrompt, userPrompt } = buildPrompt(content, language, relPath);

    if (args.verbose) {
      console.log(`  Sending to ${args.model}...`);
    }

    const response = await generate(systemPrompt, userPrompt, { model: args.model });
    const cleaned = cleanResponse(response);

    if (!validateResponse(content, cleaned)) {
      console.log(`  [warning] Invalid response for ${relPath}, skipping`);
      return { status: "skipped", reason: "invalid-response" };
    }

    fs.writeFileSync(filePath, cleaned, "utf8");
    removeBackup(backupPath);

    return { status: "updated" };
  } catch (err) {
    // Restore from backup on error
    try {
      fs.copyFileSync(backupPath, filePath);
    } catch {
      // backup restore failed
    }
    removeBackup(backupPath);
    return { status: "error", reason: err.message };
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log("\n=== AddCodeComments ===\n");

  // Check Ollama connection
  if (!args.dryRun) {
    const connected = await checkConnection();
    if (!connected) {
      console.error("Error: Cannot connect to Ollama at localhost:11434");
      console.error("Start Ollama with: ollama serve");
      process.exit(1);
    }
    console.log(`Connected to Ollama (model: ${args.model})`);
  }

  // Discover files
  const isFirstRun = !hasMarker(ROOT_DIR);
  const { mode, files } = discoverFiles(ROOT_DIR, {
    full: args.full || isFirstRun,
    maxSize: args.maxSize,
  });

  if (mode === "none" || files.length === 0) {
    console.log("No files to process.");
    if (mode === "none") {
      console.log("(No files have changed since last run. Use --full to force a full scan.)");
    }
    process.exit(0);
  }

  console.log(`Mode: ${mode === "full" ? "Full project scan" : "Changed files only"}`);
  console.log(`Files to process: ${files.length}\n`);

  // Process files
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relPath = path.relative(ROOT_DIR, filePath);
    const language = getLanguage(filePath);
    const langName = language ? language.name : "unknown";

    process.stdout.write(`[${i + 1}/${files.length}] ${relPath} (${langName})... `);

    const result = await processFile(filePath, args);

    switch (result.status) {
      case "updated":
        console.log("done");
        updated++;
        break;
      case "skipped":
        console.log(`skipped (${result.reason})`);
        skipped++;
        break;
      case "error":
        console.log(`ERROR: ${result.reason}`);
        errors++;
        break;
      case "dry-run":
        skipped++;
        break;
    }
  }

  // Write marker on successful full run
  if (mode === "full" && !args.dryRun && errors === 0) {
    writeMarker(ROOT_DIR);
  }

  console.log(`\n=== Complete ===`);
  console.log(`Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Test the help output**

Run: `node index.js --help`

Expected: Prints usage info with all options listed.

- [ ] **Step 3: Test dry-run mode in the tool directory itself**

Run: `node index.js --dry-run --full`

Expected: Lists the `.js` files it would process without modifying anything.

- [ ] **Step 4: Commit**

```bash
git add index.js
git commit -m "feat: rewrite CLI with AI-powered commenting via Ollama"
```

---

### Task 6: Update `package.json`

**Files:**
- Modify: `package.json`

Update package name, version, description, and bin entry.

- [ ] **Step 1: Replace `package.json` contents**

```json
{
  "name": "addcodecomments",
  "version": "2.0.0",
  "description": "AI-powered code commenting tool using local LLMs via Ollama",
  "bin": {
    "add-comments": "index.js"
  },
  "keywords": ["code", "comments", "documentation", "ai", "ollama", "cli"],
  "author": "Dan Spiegel",
  "license": "MIT"
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: rename package to addcodecomments, update metadata"
```

---

### Task 7: Create Windows Installer (`install.bat`)

**Files:**
- Create: `install.bat`

- [ ] **Step 1: Create `install.bat`**

```batch
@echo off
setlocal enabledelayedexpansion

echo.
echo === AddCodeComments Installer (Windows) ===
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

:: Check Ollama
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Ollama is not installed.
    echo Download it from https://ollama.com/download
    exit /b 1
)
echo [OK] Ollama found

:: Check for qwen2.5:14b model
ollama list 2>nul | findstr /i "qwen2.5:14b" >nul
if %errorlevel% neq 0 (
    echo [INFO] Downloading qwen2.5:14b model (this may take a while)...
    ollama pull qwen2.5:14b
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download model.
        exit /b 1
    )
)
echo [OK] Model qwen2.5:14b available

:: npm link
echo [INFO] Installing CLI globally...
cd /d "%~dp0"
call npm link
if %errorlevel% neq 0 (
    echo [ERROR] npm link failed. Try running as Administrator.
    exit /b 1
)
echo [OK] CLI installed (command: add-comments)

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
    echo {"version":"2.0.0","tasks":[{"label":"Add Code Comments","type":"shell","command":"add-comments","problemMatcher":[],"presentation":{"reveal":"always","panel":"new"}}]} > "%TASKS_FILE%"
    echo [OK] Created VS Code global task
) else (
    findstr /c:"Add Code Comments" "%TASKS_FILE%" >nul 2>nul
    if !errorlevel! neq 0 (
        echo [WARN] tasks.json exists but doesn't contain our task.
        echo        Please add this task manually:
        echo        {"label":"Add Code Comments","type":"shell","command":"add-comments","problemMatcher":[],"presentation":{"reveal":"always","panel":"new"}}
    ) else (
        echo [OK] VS Code task already configured
    )
)

:: Create/update keybindings.json
set "KEYS_FILE=%VSCODE_USER%\keybindings.json"
if not exist "%KEYS_FILE%" (
    echo [{"key":"ctrl+alt+h","command":"workbench.action.tasks.runTask","args":"Add Code Comments"}] > "%KEYS_FILE%"
    echo [OK] Created VS Code keybinding (Ctrl+Alt+H)
) else (
    findstr /c:"ctrl+alt+h" "%KEYS_FILE%" >nul 2>nul
    if !errorlevel! neq 0 (
        echo [WARN] keybindings.json exists but doesn't contain our binding.
        echo        Please add this keybinding manually:
        echo        {"key":"ctrl+alt+h","command":"workbench.action.tasks.runTask","args":"Add Code Comments"}
    ) else (
        echo [OK] VS Code keybinding already configured
    )
)

:skip_vscode

:: Verify
echo.
echo === Verification ===
where add-comments >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] add-comments command is available globally
) else (
    echo [WARN] add-comments not found in PATH. You may need to restart your terminal.
)

echo.
echo === Installation Complete ===
echo.
echo Usage:
echo   1. Open any project in VS Code
echo   2. Press Ctrl+Alt+H to add comments
echo   3. Or run: add-comments
echo.
echo Options:
echo   add-comments --help       Show all options
echo   add-comments --dry-run    Preview without changes
echo   add-comments --full       Force full project scan
echo.

endlocal
```

- [ ] **Step 2: Commit**

```bash
git add install.bat
git commit -m "feat: add Windows installer script"
```

---

### Task 8: Create macOS/Linux Installer (`install.sh`)

**Files:**
- Create: `install.sh`

- [ ] **Step 1: Create `install.sh`**

```bash
#!/bin/bash
set -e

echo ""
echo "=== AddCodeComments Installer (macOS/Linux) ==="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Install it from https://nodejs.org/ or via your package manager."
    exit 1
fi
echo "[OK] Node.js found: $(node --version)"

# Check Ollama
if ! command -v ollama &>/dev/null; then
    echo "[ERROR] Ollama is not installed."
    echo "Install it from https://ollama.com/download"
    exit 1
fi
echo "[OK] Ollama found"

# Check for qwen2.5:14b model
if ! ollama list 2>/dev/null | grep -qi "qwen2.5:14b"; then
    echo "[INFO] Downloading qwen2.5:14b model (this may take a while)..."
    ollama pull qwen2.5:14b
fi
echo "[OK] Model qwen2.5:14b available"

# npm link
echo "[INFO] Installing CLI globally..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
npm link
echo "[OK] CLI installed (command: add-comments)"

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
      "label": "Add Code Comments",
      "type": "shell",
      "command": "add-comments",
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
    elif grep -q "Add Code Comments" "$TASKS_FILE"; then
        echo "[OK] VS Code task already configured"
    else
        echo "[WARN] tasks.json exists but doesn't contain our task."
        echo '       Add: {"label":"Add Code Comments","type":"shell","command":"add-comments","problemMatcher":[]}'
    fi

    # keybindings.json
    KEYS_FILE="$VSCODE_USER/keybindings.json"
    if [ ! -f "$KEYS_FILE" ]; then
        cat > "$KEYS_FILE" << 'KEYEOF'
[
  {
    "key": "ctrl+alt+h",
    "command": "workbench.action.tasks.runTask",
    "args": "Add Code Comments"
  }
]
KEYEOF
        echo "[OK] Created VS Code keybinding (Ctrl+Alt+H)"
    elif grep -q "ctrl+alt+h" "$KEYS_FILE"; then
        echo "[OK] VS Code keybinding already configured"
    else
        echo "[WARN] keybindings.json exists but doesn't contain our binding."
        echo '       Add: {"key":"ctrl+alt+h","command":"workbench.action.tasks.runTask","args":"Add Code Comments"}'
    fi
fi

# Verify
echo ""
echo "=== Verification ==="
if command -v add-comments &>/dev/null; then
    echo "[OK] add-comments command is available globally"
else
    echo "[WARN] add-comments not found in PATH. You may need to restart your terminal."
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Usage:"
echo "  1. Open any project in VS Code"
echo "  2. Press Ctrl+Alt+H to add comments"
echo "  3. Or run: add-comments"
echo ""
echo "Options:"
echo "  add-comments --help       Show all options"
echo "  add-comments --dry-run    Preview without changes"
echo "  add-comments --full       Force full project scan"
echo ""
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x install.sh`

- [ ] **Step 3: Commit**

```bash
git add install.sh
git commit -m "feat: add macOS/Linux installer script"
```

---

### Task 9: Rewrite README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` with comprehensive documentation**

```markdown
# AddCodeComments

AI-powered code commenting tool that uses local LLMs (via Ollama) to intelligently add file headers, class documentation, function signatures, and inline comments — all following language-specific best practices.

## How It Works

1. Scans your project for source files
2. Sends each file to a locally-running AI model (Ollama)
3. The AI analyzes the code and adds appropriate documentation comments
4. Returns the file with comments integrated — your code is never modified

**First run:** Processes the entire project.
**Subsequent runs:** Only processes files that have changed (via `git diff`).

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
| Dockerfile | `#` stage docs | Markdown | `<!-- -->` |
| INI/TOML | `#`/`;` | | |

## Prerequisites

- **Node.js** (v16+): [https://nodejs.org/](https://nodejs.org/)
- **Ollama**: [https://ollama.com/download](https://ollama.com/download)

## Installation

### Windows

```cmd
cd path\to\AddCodeComments
install.bat
```

### macOS / Linux

```bash
cd path/to/AddCodeComments
chmod +x install.sh
./install.sh
```

### Manual Installation

```bash
cd path/to/AddCodeComments
npm link
ollama pull qwen2.5:14b
```

Then configure VS Code (see [VS Code Setup](#vs-code-setup) below).

## Usage

### Keyboard Shortcut (VS Code)

Press **Ctrl+Alt+H** in any project to run AddCodeComments.

### Command Line

```bash
# Navigate to any project
cd path/to/your/project

# First run — full project scan
add-comments

# Subsequent runs — only changed files
add-comments

# Force full rescan
add-comments --full

# Preview without modifying files
add-comments --dry-run

# Use a different model
add-comments --model llama3.2

# Verbose output
add-comments --verbose
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--full` | Force full project scan | Off (uses git diff) |
| `--dry-run` | Preview files without modifying | Off |
| `--max-size N` | Max file size in KB | 100 |
| `--model NAME` | Ollama model to use | qwen2.5:14b |
| `--verbose` | Detailed progress output | Off |
| `--help` | Show help message | |

## VS Code Setup

The installer configures this automatically. For manual setup:

### 1. Global Task

Open Command Palette → `Tasks: Open User Tasks` → add:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Add Code Comments",
      "type": "shell",
      "command": "add-comments",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

### 2. Keybinding

Open Command Palette → `Preferences: Open Keyboard Shortcuts (JSON)` → add:

```json
{
  "key": "ctrl+alt+h",
  "command": "workbench.action.tasks.runTask",
  "args": "Add Code Comments"
}
```

## Smart Merge Strategy

AddCodeComments uses a smart merge approach for existing comments:

- **Adds** comments where none exist
- **Updates** comments that are stale or inaccurate
- **Preserves** TODOs, FIXMEs, HACKs, and developer notes
- **Never modifies** your actual code — only comments

## File Filtering

Automatically skips:

- Binary files (images, fonts, archives, executables)
- Lock files (package-lock.json, yarn.lock, etc.)
- Generated files (.min.js, .map, .d.ts)
- JSON files (no comment syntax)
- Files over 100KB (configurable)
- Common build directories (node_modules, dist, build, __pycache__, etc.)

## Troubleshooting

### "Cannot connect to Ollama"

Start the Ollama service:

```bash
ollama serve
```

### "Model not found"

Download the model:

```bash
ollama pull qwen2.5:14b
```

### Files not being processed

- Check the file extension is supported (see language table)
- Check the file is under the size limit (default 100KB)
- Check the file is not in an excluded directory
- Run with `--verbose` for detailed output

### Comments look wrong

Try a different model:

```bash
add-comments --model qwen2.5:14b --full
```

## How It Decides What to Comment

The AI is instructed to:

1. Add **file headers** describing the file's purpose and key exports
2. Add **class/struct headers** describing responsibility and design patterns
3. Add **function headers** with parameters, return values, and side effects
4. Add **inline comments** for complex logic, algorithms, and magic numbers
5. Skip trivial comments (e.g., `// increment i` for `i++`)

## License

MIT

## Author

Dan Spiegel
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: comprehensive README for AddCodeComments"
```

---

### Task 10: Rename GitHub Repository

**Files:** None (GitHub API operation)

- [ ] **Step 1: Rename the repository using GitHub CLI**

```bash
gh repo rename AddCodeComments --repo idatarbel/file-header-tool --yes
```

- [ ] **Step 2: Update local git remote**

```bash
git remote set-url origin https://github.com/idatarbel/AddCodeComments.git
```

- [ ] **Step 3: Push all changes**

```bash
git push origin main
```

- [ ] **Step 4: Commit**

No commit needed — this is a remote operation.

---

### Task 11: Run Against GroundTruthCentral

**Files:** None (execution task)

- [ ] **Step 1: Ensure Ollama is running**

Run: `ollama serve` (if not already running)

- [ ] **Step 2: Install the tool globally**

```bash
cd /c/Users/dansp/Dropbox/Templates/global_cli_tools/file-header-tool
npm link
```

- [ ] **Step 3: Run AddCodeComments against GroundTruthCentral**

```bash
cd "/c/Users/dansp/Dropbox/Working Files/GitHub/groundtruthcentral"
add-comments --verbose
```

This will be a full project scan (first run, no `.codecomments` marker).

- [ ] **Step 4: Review the changes**

```bash
git diff --stat
```

Verify comments were added appropriately, no code was modified, and no files were corrupted.
