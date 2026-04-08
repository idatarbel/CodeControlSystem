/**
 * Language registry — maps file extensions to language metadata.
 */

const path = require("path");

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
};

const FILENAME_LANGUAGES = {
  "Dockerfile": { name: "Dockerfile", style: "hash" },
};

const SKIP_EXTENSIONS = new Set([
  ".json", ".lock",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".bmp", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "__pycache__",
  ".next", ".nuxt", "vendor", "target", ".cargo",
  "bin", "obj", "coverage", ".tox", ".venv", "venv", "env",
  ".build", ".turbo", ".cache",
]);

const LOCK_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "Gemfile.lock", "Cargo.lock", "go.sum", "composer.lock",
  "Pipfile.lock", "poetry.lock",
]);

function getLanguage(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath);

  if (FILENAME_LANGUAGES[basename]) {
    return FILENAME_LANGUAGES[basename];
  }

  if (basename.endsWith(".min.js") || basename.endsWith(".min.css")) {
    return null;
  }
  if (basename.endsWith(".d.ts")) {
    return null;
  }

  if (LOCK_FILES.has(basename)) {
    return null;
  }

  if (SKIP_EXTENSIONS.has(ext)) {
    return null;
  }

  return LANGUAGES[ext] || null;
}

function isSkippedDir(dirName) {
  return SKIP_DIRS.has(dirName);
}

module.exports = { LANGUAGES, FILENAME_LANGUAGES, SKIP_EXTENSIONS, SKIP_DIRS, getLanguage, isSkippedDir };
