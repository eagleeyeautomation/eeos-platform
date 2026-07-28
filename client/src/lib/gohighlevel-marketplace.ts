const GHL_MARKETPLACE_INSTALL_BASE = "https://marketplace.gohighlevel.com/v2/oauth/chooselocation";
const GHL_MARKETPLACE_CLIENT_ID = "6a542d0afcf7b17bbf42e6cd-ms52xshp";
const GHL_MARKETPLACE_VERSION_ID = "6a690853b4e9a0fc9254cdca";
const GHL_REDIRECT_URI = "https://app.geteeos.com/api/integrations/eea/oauth/callback";
const GHL_SCOPES = [
  "calendars.readonly",
  "calendars/events.readonly",
  "locations.readonly",
  "contacts.readonly",
  "contacts.write",
  "opportunities.readonly",
  "opportunities.write",
  "workflows.readonly",
  "forms.readonly",
  "conversations.readonly",
  "conversations/message.readonly",
];

export type InstallationConfirmationStore = Pick<Storage, "getItem" | "setItem">;

export function buildGhlMarketplaceInstallUrl() {
  const url = new URL(GHL_MARKETPLACE_INSTALL_BASE);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", GHL_REDIRECT_URI);
  url.searchParams.set("client_id", GHL_MARKETPLACE_CLIENT_ID);
  url.searchParams.set("scope", GHL_SCOPES.join(" "));
  url.searchParams.set("version_id", GHL_MARKETPLACE_VERSION_ID);
  return url.toString();
}

export function installationConfirmationKey(organizationId: string, locationId: string) {
  return `eeos:v1:ghl-marketplace-installed:${organizationId}:${locationId}`;
}

export function hasInstallationConfirmation(
  store: InstallationConfirmationStore,
  organizationId: string,
  locationId: string,
) {
  return store.getItem(installationConfirmationKey(organizationId, locationId)) === "owner-confirmed";
}

export function confirmInstallation(
  store: InstallationConfirmationStore,
  organizationId: string,
  locationId: string,
) {
  store.setItem(installationConfirmationKey(organizationId, locationId), "owner-confirmed");
}
