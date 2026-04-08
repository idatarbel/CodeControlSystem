/**
 * AI client — sends prompts to the Anthropic Messages API.
 * Falls back to Ollama local API if no Anthropic API key is configured.
 */

const https = require("https");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");

const ANTHROPIC_API_URL = "api.anthropic.com";
const ANTHROPIC_API_PATH = "/v1/messages";
const OLLAMA_HOST = "http://localhost:11434";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:7b";

function loadConfig() {
  const configPath = path.join(os.homedir(), ".codecontrolsystem", "config.json");
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function generateAnthropic(systemPrompt, userPrompt, options = {}) {
  const config = loadConfig();
  const apiKey = options.apiKey || config.apiKey || process.env.ANTHROPIC_API_KEY;
  const model = options.model || config.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || config.maxTokens || 8192;

  if (!apiKey) {
    return Promise.reject(new Error("No Anthropic API key found. Set it in ~/.codecontrolsystem/config.json or ANTHROPIC_API_KEY env var."));
  }

  const payload = JSON.stringify({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    temperature: 0.1,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: ANTHROPIC_API_URL,
        path: ANTHROPIC_API_PATH,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 120000, // 2 minutes is plenty for cloud API
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(`Anthropic API error: ${parsed.error.message}`));
              return;
            }
            if (parsed.content && parsed.content.length > 0) {
              resolve(parsed.content[0].text);
            } else {
              reject(new Error("Empty response from Anthropic API"));
            }
          } catch (e) {
            reject(new Error(`Failed to parse Anthropic response: ${e.message}`));
          }
        });
        res.on("error", reject);
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Anthropic API request timed out after 2 minutes"));
    });

    req.write(payload);
    req.end();
  });
}

function generateOllama(systemPrompt, userPrompt, options = {}) {
  const model = options.model || DEFAULT_OLLAMA_MODEL;
  const host = options.host || OLLAMA_HOST;
  const url = new URL("/api/generate", host);

  const payload = JSON.stringify({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    stream: true,
    options: { num_ctx: 32768, temperature: 0.1 },
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
        timeout: 900000,
      },
      (res) => {
        let fullResponse = "";
        let buffer = "";

        res.on("data", (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) fullResponse += parsed.response;
              if (parsed.error) { reject(new Error(`Ollama error: ${parsed.error}`)); return; }
            } catch (e) { /* skip */ }
          }
        });

        res.on("end", () => {
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.response) fullResponse += parsed.response;
            } catch (e) { /* ignore */ }
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
      reject(new Error("Ollama request timed out after 15 minutes"));
    });

    req.write(payload);
    req.end();
  });
}

// Auto-detect: use Anthropic if API key exists, otherwise Ollama
async function generate(systemPrompt, userPrompt, options = {}) {
  const config = loadConfig();
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
  const useLocal = options.useLocal || false;

  if (apiKey && !useLocal) {
    return generateAnthropic(systemPrompt, userPrompt, options);
  } else {
    return generateOllama(systemPrompt, userPrompt, options);
  }
}

async function checkConnection() {
  const config = loadConfig();
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    // For Anthropic, just verify the key format
    return apiKey.startsWith("sk-ant-");
  }

  // Check Ollama
  const url = new URL("/api/tags", OLLAMA_HOST);
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

function getBackendName() {
  const config = loadConfig();
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    return `Anthropic (${config.model || DEFAULT_MODEL})`;
  }
  return `Ollama local (${DEFAULT_OLLAMA_MODEL})`;
}

module.exports = { generate, checkConnection, getBackendName, DEFAULT_MODEL, DEFAULT_OLLAMA_MODEL, loadConfig };
