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
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith(".") || isSkippedDir(entry)) continue;

      const fullPath = path.join(currentDir, entry);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (err) {
        continue;
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
    const modified = execSync("git diff --name-only HEAD 2>/dev/null", {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();

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
    return null;
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
  return fs.existsSync(path.join(rootDir, ".codecontrol"));
}

function writeMarker(rootDir) {
  const markerPath = path.join(rootDir, ".codecontrol");
  const content = JSON.stringify({
    lastRun: new Date().toISOString(),
    tool: "CodeControlSystem",
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
    const changed = getChangedFiles(rootDir);
    if (changed !== null && changed.length > 0) {
      mode = "changed";
      rawFiles = changed;
    } else if (changed !== null && changed.length === 0) {
      mode = "none";
      rawFiles = [];
    } else {
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
