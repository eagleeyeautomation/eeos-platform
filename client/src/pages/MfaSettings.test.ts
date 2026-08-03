import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MFA authenticator setup", () => {
  const source = readFileSync("client/src/pages/MfaSettings.tsx", "utf8");

  it("renders the provisioning URI as an in-app QR code", () => {
    expect(source).toContain("<QRCodeSVG value={uri}");
    expect(source).not.toContain("api.qrserver.com");
  });

  it("displays only the validated Base32 secret as the manual setup key", () => {
    expect(source).toContain("/^[A-Z2-7]+$/");
    expect(source).toContain("{setupKey}");
    expect(source).not.toContain("> {uri}</p>");
  });
});
