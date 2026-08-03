import { afterEach,describe,expect,it } from "vitest";
import { sessionCsrfHeaders,setSessionCsrfToken } from "./csrf";

describe("session CSRF request headers",()=>{
  afterEach(()=>setSessionCsrfToken(null));
  it("uses the current session-bound in-memory token for protected mutations",()=>{setSessionCsrfToken("session-bound-test-token");expect(sessionCsrfHeaders()).toEqual({"x-eeos-csrf-token":"session-bound-test-token"})});
  it("does not emit an empty header",()=>expect(sessionCsrfHeaders()).toEqual({}));
});
