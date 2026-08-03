let inMemorySessionCsrfToken: string | null = null;

export function setSessionCsrfToken(token: string | null | undefined) {
  inMemorySessionCsrfToken = typeof token === "string" && token.length > 0 ? token : null;
}

export function readSessionCsrfToken() {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent("eeos_csrf") }=`;
  const entry = document.cookie.split("; ").find(value => value.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

export function sessionCsrfHeaders(): Record<string, string> {
  const csrfToken = inMemorySessionCsrfToken ?? readSessionCsrfToken();
  return csrfToken ? { "x-eeos-csrf-token": csrfToken } : {};
}
