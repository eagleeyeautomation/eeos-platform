import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "./passwordResetEmail";

const resendMocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  send: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendMocks.send };

    constructor(apiKey: string) {
      resendMocks.constructor(apiKey);
    }
  },
}));

const originalEnvironment = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EEOS_PASSWORD_RESET_FROM: process.env.EEOS_PASSWORD_RESET_FROM,
  EEOS_APP_BASE_URL: process.env.EEOS_APP_BASE_URL,
};

describe("EEOS password-reset email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.EEOS_PASSWORD_RESET_FROM = "EEOS Security <security@example.com>";
    process.env.EEOS_APP_BASE_URL = "https://app.geteeos.com/";
    resendMocks.send.mockResolvedValue({ data: { id: "message-1" }, error: null });
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("builds the production reset URL from the normalized HTTPS application origin", () => {
    expect(buildPasswordResetUrl("opaque-token")).toBe(
      "https://app.geteeos.com/reset-password?token=opaque-token",
    );
  });

  it.each([
    "http://app.geteeos.com",
    "https://user:password@app.geteeos.com",
    "https://app.geteeos.com/untrusted-path",
    "https://app.geteeos.com/?origin=other",
    "not-a-url",
  ])("rejects an unsafe application base URL: %s", (configuredUrl) => {
    process.env.EEOS_APP_BASE_URL = configuredUrl;
    expect(buildPasswordResetUrl("opaque-token")).toBeNull();
  });

  it("sends EEOS-branded HTML and plain text with the token only inside the reset URL", async () => {
    const rawToken = "raw-reset-token";
    const resetUrl = buildPasswordResetUrl(rawToken);
    expect(resetUrl).not.toBeNull();

    await expect(sendPasswordResetEmail({
      recipientEmail: "owner@example.com",
      resetUrl: resetUrl!,
    })).resolves.toEqual({ delivered: true, providerMessageId: "message-1" });

    expect(resendMocks.constructor).toHaveBeenCalledWith("test-api-key");
    expect(resendMocks.send).toHaveBeenCalledOnce();
    const delivery = resendMocks.send.mock.calls[0][0];
    expect(delivery).toMatchObject({
      from: "EEOS Security <security@example.com>",
      to: "owner@example.com",
      subject: "Reset your EEOS password",
    });
    expect(delivery.html).toContain(`href="${resetUrl}"`);
    expect(delivery.text).toContain(`Secure reset link: ${resetUrl}`);
    expect(delivery.html.replaceAll(resetUrl!, "")).not.toContain(rawToken);
    expect(delivery.text.replaceAll(resetUrl!, "")).not.toContain(rawToken);
    expect(delivery.html).toContain("expires in one hour");
    expect(delivery.text).toContain("used only once");
  });

  it("returns a sanitized configuration failure without calling the provider", async () => {
    delete process.env.RESEND_API_KEY;

    await expect(sendPasswordResetEmail({
      recipientEmail: "owner@example.com",
      resetUrl: "https://app.geteeos.com/reset-password?token=opaque-token",
    })).resolves.toEqual({ delivered: false, reason: "configuration" });
    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("rejects delivery URLs outside the configured EEOS reset origin and path", async () => {
    await expect(sendPasswordResetEmail({
      recipientEmail: "owner@example.com",
      resetUrl: "https://example.com/reset-password?token=opaque-token",
    })).resolves.toEqual({ delivered: false, reason: "configuration" });
    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("returns a sanitized provider failure for provider errors and exceptions", async () => {
    resendMocks.send.mockResolvedValueOnce({ data: null, error: { message: "sensitive provider detail" } });
    await expect(sendPasswordResetEmail({
      recipientEmail: "owner@example.com",
      resetUrl: "https://app.geteeos.com/reset-password?token=opaque-token",
    })).resolves.toEqual({ delivered: false, reason: "provider" });

    resendMocks.send.mockRejectedValueOnce(new Error("sensitive provider exception"));
    await expect(sendPasswordResetEmail({
      recipientEmail: "owner@example.com",
      resetUrl: "https://app.geteeos.com/reset-password?token=opaque-token",
    })).resolves.toEqual({ delivered: false, reason: "provider" });
  });
});
