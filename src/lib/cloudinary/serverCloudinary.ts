import { v2 as cloudinary } from "cloudinary";

interface ParsedCloudinaryUrl {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface ServerCloudinaryDiagnostics {
  cloudName: string;
  apiKeyLast4: string;
  hasApiSecret: boolean;
  apiSecretLength: number;
  hasCloudinaryUrl: boolean;
  cloudinaryUrlMatchesExplicit: boolean | null;
}

interface ServerCloudinaryContext {
  cloudinary: typeof cloudinary;
  diagnostics: ServerCloudinaryDiagnostics;
}

let configuredFingerprint: string | null = null;
let cachedContext: ServerCloudinaryContext | null = null;

function readTrimmedEnvValue(key: string) {
  const rawValue = process.env[key];

  if (typeof rawValue !== "string") {
    return undefined;
  }

  const normalized = rawValue.trim();
  return normalized || undefined;
}

function parseCloudinaryUrl(value?: string): ParsedCloudinaryUrl | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "cloudinary:") {
      return null;
    }

    return {
      cloudName: parsed.hostname.trim(),
      apiKey: decodeURIComponent(parsed.username).trim(),
      apiSecret: decodeURIComponent(parsed.password).trim(),
    };
  } catch {
    return null;
  }
}

function buildDiagnostics(input: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  cloudinaryUrl?: string;
}): ServerCloudinaryDiagnostics {
  const parsedUrl = parseCloudinaryUrl(input.cloudinaryUrl);

  return {
    cloudName: input.cloudName,
    apiKeyLast4: input.apiKey.slice(-4),
    hasApiSecret: input.apiSecret.length > 0,
    apiSecretLength: input.apiSecret.length,
    hasCloudinaryUrl: Boolean(input.cloudinaryUrl),
    cloudinaryUrlMatchesExplicit: parsedUrl
      ? parsedUrl.cloudName === input.cloudName &&
        parsedUrl.apiKey === input.apiKey &&
        parsedUrl.apiSecret === input.apiSecret
      : null,
  };
}

export function getServerCloudinary(): ServerCloudinaryContext {
  const cloudName = readTrimmedEnvValue("CLOUDINARY_CLOUD_NAME");
  const apiKey = readTrimmedEnvValue("CLOUDINARY_API_KEY");
  const apiSecret = readTrimmedEnvValue("CLOUDINARY_API_SECRET");
  const cloudinaryUrl = readTrimmedEnvValue("CLOUDINARY_URL");

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary server configuration.");
  }

  const fingerprint = `${cloudName}:${apiKey}:${apiSecret}`;
  const diagnostics = buildDiagnostics({
    cloudName,
    apiKey,
    apiSecret,
    cloudinaryUrl,
  });

  if (configuredFingerprint !== fingerprint || !cachedContext) {
    const previousCloudinaryUrl = process.env.CLOUDINARY_URL;
    const previousCloudinaryAccountUrl = process.env.CLOUDINARY_ACCOUNT_URL;

    try {
      // Reset the SDK without env URL side effects so explicit server credentials win.
      delete process.env.CLOUDINARY_URL;
      delete process.env.CLOUDINARY_ACCOUNT_URL;
      cloudinary.config(true);
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    } finally {
      if (typeof previousCloudinaryUrl === "string") {
        process.env.CLOUDINARY_URL = previousCloudinaryUrl;
      } else {
        delete process.env.CLOUDINARY_URL;
      }

      if (typeof previousCloudinaryAccountUrl === "string") {
        process.env.CLOUDINARY_ACCOUNT_URL = previousCloudinaryAccountUrl;
      } else {
        delete process.env.CLOUDINARY_ACCOUNT_URL;
      }
    }

    configuredFingerprint = fingerprint;
    cachedContext = {
      cloudinary,
      diagnostics,
    };
  }

  return cachedContext;
}