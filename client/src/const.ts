export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function currentReturnTo() {
  if (typeof window === "undefined") return "/executive-home";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export const startLogin = () => {
  if (typeof window === "undefined") return false;
  const isSecureApp = window.location.hostname === "app.geteeos.com"
    || window.location.hostname === "localhost"
    || window.location.hostname === "127.0.0.1";
  const url = new URL(
    "/login",
    isSecureApp ? window.location.origin : "https://app.geteeos.com",
  );
  if (isSecureApp) {
    url.searchParams.set("returnTo", currentReturnTo());
  }
  window.location.href = url.toString();
  return true;
};
