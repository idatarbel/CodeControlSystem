/**
 * Reporter — writes findings to code_review/code_review_findings_<timestamp>.md
 */

const fs = require("fs");
const path = require("path");

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function createReporter(rootDir, reviewType) {
  const reviewDir = path.join(rootDir, "code_review");
  if (!fs.existsSync(reviewDir)) {
    fs.mkdirSync(reviewDir, { recursive: true });
  }

  const timestamp = getTimestamp();
  const filename = `code_review_findings_${timestamp}.md`;
  const filePath = path.join(reviewDir, filename);
  const projectName = path.basename(rootDir);

  // Write header
  const header = `# Code Review Findings

**Project:** ${projectName}
**Date:** ${timestamp.replace("_", " ").replace(/-/g, (m, i) => i < 10 ? "-" : ":")}
**Review Type:** ${reviewType}

---

`;
  fs.writeFileSync(filePath, header, "utf8");

  return {
    filePath,
    filename,

    appendSection(sectionTitle, content) {
      const section = `\n## ${sectionTitle}\n\n${content}\n`;
      fs.appendFileSync(filePath, section, "utf8");
    },

    appendFinding(file, findings) {
      const entry = `### ${file}\n\n${findings}\n\n---\n`;
      fs.appendFileSync(filePath, entry, "utf8");
    },

    appendRaw(text) {
      fs.appendFileSync(filePath, text, "utf8");
    },
  };
}

module.exports = { createReporter, getTimestamp };
