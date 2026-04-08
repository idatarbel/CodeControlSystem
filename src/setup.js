/**
 * Setup — prompts for author/company on every run with defaults.
 * Reads git credentials for initial defaults. Stores in config.
 */

const readline = require("readline");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CONFIG_DIR = path.join(os.homedir(), ".codecontrolsystem");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULT_COMPANY = "Dan Spiegel LLC";

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

function getGitUser() {
  try {
    const name = execSync("git config --global user.name", { encoding: "utf8" }).trim();
    const email = execSync("git config --global user.email", { encoding: "utf8" }).trim();
    return { name, email };
  } catch {
    return { name: "", email: "" };
  }
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function runSetup() {
  const config = loadConfig();
  const git = getGitUser();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n--- Author & Copyright ---");

  // Author name — default from config, then git, then empty
  const defaultName = config.author || git.name || "";
  const nameInput = await ask(rl, `Author name [${defaultName}]: `);
  config.author = nameInput || defaultName;

  // Company name — default from config, then hardcoded default
  const defaultCompany = config.company || DEFAULT_COMPANY;
  const companyInput = await ask(rl, `Company name [${defaultCompany}]: `);
  config.company = companyInput || defaultCompany;

  rl.close();

  // Store email from git silently (no need to ask every time)
  if (!config.authorEmail) {
    config.authorEmail = git.email || "";
  }

  saveConfig(config);

  console.log(`  → ${config.author}, ${config.company}\n`);

  return config;
}

function getAuthorInfo() {
  const config = loadConfig();
  return {
    author: config.author || "",
    authorEmail: config.authorEmail || "",
    company: config.company || DEFAULT_COMPANY,
    year: new Date().getFullYear(),
    date: new Date().toISOString().split("T")[0],
  };
}

module.exports = { runSetup, getAuthorInfo, loadConfig, saveConfig };
