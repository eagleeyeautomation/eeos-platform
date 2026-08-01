export function readSessionCsrfToken() {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent("eeos_csrf") }=`;
  const entry = document.cookie.split("; ").find(value => value.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

export function sessionCsrfHeaders(): Record<string, string> {
  const csrfToken = readSessionCsrfToken();
  return csrfToken ? { "x-eeos-csrf-token": csrfToken } : {};
}
