export type IdentityLogLevel = "debug" | "info" | "warn" | "error";
export type IdentityLogFields = Record<string, unknown>;
export type IdentityLogger = { log(level: IdentityLogLevel, event: string, fields?: IdentityLogFields): void };

const PROHIBITED_KEYS = /authorization|cookie|token|assertion(?!id)|password|secret|privatekey|jwks|openid|email|database|body|locationid/i;

export function createIdentityLogger(minimumLevel: IdentityLogLevel = "info"): IdentityLogger {
  const levels = { debug: 10, info: 20, warn: 30, error: 40 };
  return {
    log(level, event, fields = {}) {
      if (levels[level] < levels[minimumLevel]) return;
      const line = JSON.stringify({
        level,
        service: "eeos-identity-service",
        event,
        timestamp: new Date().toISOString(),
        ...sanitizeIdentityLogFields(fields),
      });
      if (level === "error") console.error(line);
      else console.log(line);
    },
  };
}

export function sanitizeIdentityLogFields(fields: IdentityLogFields): IdentityLogFields {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    key,
    PROHIBITED_KEYS.test(key) ? "[redacted]" : sanitizeValue(value),
  ]));
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") return sanitizeIdentityLogFields(value as IdentityLogFields);
  return value;
}
