export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function currentReturnTo() {
  if (typeof window === "undefined") return "/executive-home";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export const startLogin = () => {
  if (typeof window === "undefined") return false;
  const url = new URL("/login", window.location.origin);
  url.searchParams.set("returnTo", currentReturnTo());
  window.location.href = url.toString();
  return true;
};
