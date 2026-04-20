import fs from "node:fs";
import path from "node:path";

function stripInlineComment(value) {
  let result = "";
  let quote = null;

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];

    if ((current === '"' || current === "'") && value[index - 1] !== "\\") {
      quote = quote === current ? null : quote ?? current;
    }

    if (current === "#" && !quote) {
      break;
    }

    result += current;
  }

  return result.trim();
}

function normalizeValue(rawValue) {
  const trimmed = stripInlineComment(rawValue);

  if (!trimmed) {
    return "";
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unquoted = trimmed.slice(1, -1);
    return unquoted.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }

  return trimmed;
}

function parseEnvFile(content) {
  const parsed = new Map();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    parsed.set(key, normalizeValue(rawValue));
  }

  return parsed;
}

export function loadLocalEnv(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const originalKeys = new Set(Object.keys(process.env));
  const envFiles = [
    ".env",
    `.env.${nodeEnv}`,
    ".env.local",
    `.env.${nodeEnv}.local`,
  ];

  for (const envFile of envFiles) {
    const filePath = path.join(cwd, envFile);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));

    for (const [key, value] of parsed.entries()) {
      if (!originalKeys.has(key) || process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}