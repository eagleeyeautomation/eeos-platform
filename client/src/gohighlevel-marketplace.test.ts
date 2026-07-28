import { describe, expect, it } from "vitest";
import {
  buildGhlMarketplaceInstallUrl,
  confirmInstallation,
  hasInstallationConfirmation,
  installationConfirmationKey,
} from "./lib/gohighlevel-marketplace";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("GoHighLevel two-stage Marketplace installation", () => {
  it("builds the authoritative versioned installation URL without OAuth state", () => {
    const url = new URL(buildGhlMarketplaceInstallUrl());
    expect(url.origin + url.pathname).toBe("https://marketplace.gohighlevel.com/v2/oauth/chooselocation");
    expect(url.searchParams.get("client_id")).toBe("6a542d0afcf7b17bbf42e6cd-ms52xshp");
    expect(url.searchParams.get("version_id")).toBe("6a690853b4e9a0fc9254cdca");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.geteeos.com/api/integrations/eea/oauth/callback");
    expect(url.searchParams.has("state")).toBe(false);
    expect(url.toString()).not.toMatch(/prn.staffers/i);
  });

  it("scopes owner confirmation to one organization and location without recording credentials", () => {
    const store = memoryStore();
    expect(hasInstallationConfirmation(store, "org-prn", "loc-sc")).toBe(false);

    confirmInstallation(store, "org-prn", "loc-sc");

    expect(hasInstallationConfirmation(store, "org-prn", "loc-sc")).toBe(true);
    expect(hasInstallationConfirmation(store, "org-prn", "loc-al")).toBe(false);
    expect(hasInstallationConfirmation(store, "org-other", "loc-sc")).toBe(false);
    expect(installationConfirmationKey("org-prn", "loc-sc")).not.toMatch(/token|secret|code|state/i);
  });
});
