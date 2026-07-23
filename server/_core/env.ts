export const ENV = {
  sessionAudience: process.env.EEOS_SESSION_AUDIENCE ?? "eeos-platform",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // GoHighLevel OAuth
  ghlClientId: process.env.GHL_CLIENT_ID ?? "",
  ghlClientSecret: process.env.GHL_CLIENT_SECRET ?? "",
  ghlRedirectUri: process.env.GHL_REDIRECT_URI ?? "",
  ghlWebhookSecret: process.env.GHL_WEBHOOK_SECRET ?? "",
};
