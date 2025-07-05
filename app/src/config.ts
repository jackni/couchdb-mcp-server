import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

// Configuration schema
const ConfigSchema = z.object({
  // CouchDB database configuration
  couchdb: z.object({
    url: z.string().url(),
    adminUsername: z.string(),
    adminPassword: z.string(),
  }),
  
  // Server configuration
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default("localhost"),
    logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  }),
  
  // Security configuration
  security: z.object({
    credentialPrefix: z.string().default("U-"),
    passwordLength: z.number().default(32),
    rolePrefix: z.string().default("role-"),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Load configuration from config.json
function loadConfigFromFile(): Partial<Config> {
  try {
    // In CommonJS, __dirname is available directly
    const configPath = join(process.cwd(), "config.json");
    const configFile = readFileSync(configPath, "utf-8");
    const jsonConfig = JSON.parse(configFile);
    console.error(`Loaded configuration from: ${configPath}`);
    return jsonConfig;
  } catch (error) {
    console.error("Failed to load config.json, using defaults:", error instanceof Error ? error.message : error);
    return {};
  }
}

// Apply environment variable overrides
function applyEnvironmentOverrides(config: Partial<Config>): Config {
  const envOverrides: Config = {
    couchdb: {
      url: process.env.COUCHDB_URL || config.couchdb?.url || "http://localhost:5984",
      adminUsername: process.env.COUCHDB_ADMIN_USERNAME || config.couchdb?.adminUsername || "admin",
      adminPassword: process.env.COUCHDB_ADMIN_PASSWORD || config.couchdb?.adminPassword || "password",
    },
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT) : config.server?.port || 3008,
      host: process.env.HOST || config.server?.host || "0.0.0.0",
      logLevel: (process.env.LOG_LEVEL as any) || config.server?.logLevel || "info",
    },
    security: {
      credentialPrefix: process.env.CREDENTIAL_PREFIX || config.security?.credentialPrefix || "U-",
      passwordLength: process.env.PASSWORD_LENGTH ? parseInt(process.env.PASSWORD_LENGTH) : config.security?.passwordLength || 32,
      rolePrefix: process.env.ROLE_PREFIX || config.security?.rolePrefix || "role-",
    },
  };

  return envOverrides;
}

// Load configuration: config.json first, then apply environment overrides
const fileConfig = loadConfigFromFile();
const finalConfig = applyEnvironmentOverrides(fileConfig);

// Validate and export configuration
export const config = ConfigSchema.parse(finalConfig);