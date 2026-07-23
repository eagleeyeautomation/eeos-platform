import "dotenv/config";
import { randomUUID } from "crypto";
import {
  countPlatformAdmins,
  getUserByEmail,
  insertAuthAuditEvent,
  upsertUser,
} from "../db";
import { hashPassword, validatePasswordPolicy } from "./passwordAuth";

export type BootstrapPlatformAdminEnv = {
  INITIAL_PLATFORM_ADMIN_EMAIL?: string;
  INITIAL_PLATFORM_ADMIN_PASSWORD?: string;
  INITIAL_PLATFORM_ADMIN_NAME?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function bootstrapPlatformAdmin(env: BootstrapPlatformAdminEnv = process.env as BootstrapPlatformAdminEnv) {
  const email = normalizeEmail(env.INITIAL_PLATFORM_ADMIN_EMAIL ?? "");
  const password = env.INITIAL_PLATFORM_ADMIN_PASSWORD ?? "";
  const name = env.INITIAL_PLATFORM_ADMIN_NAME?.trim() || "EEOS Platform Admin";

  if (!email) throw new Error("INITIAL_PLATFORM_ADMIN_EMAIL is required.");
  if (!password) throw new Error("INITIAL_PLATFORM_ADMIN_PASSWORD is required.");
  const passwordError = validatePasswordPolicy(password);
  if (passwordError) throw new Error(passwordError);

  const existingAdminCount = await countPlatformAdmins();
  if (existingAdminCount > 0) {
    throw new Error("A platform admin already exists. Bootstrap refused.");
  }

  const existingUser = await getUserByEmail(email);
  const openId = existingUser?.openId ?? `eeos_admin_${randomUUID()}`;
  const passwordHash = await hashPassword(password);

  await upsertUser({
    openId,
    name,
    email,
    passwordHash,
    loginMethod: "eeos",
    role: "admin",
    isActive: true,
    lastSignedIn: new Date(),
  });

  const user = await getUserByEmail(email);
  await insertAuthAuditEvent({
    actorUserId: user?.id ?? null,
    organizationId: null,
    action: "auth.platform_admin.bootstrap",
    targetType: "user",
    targetId: user ? String(user.id) : email,
    metadata: { method: "cli" },
  });

  return { email, userId: user?.id ?? null };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrapPlatformAdmin()
    .then((result) => {
      console.log(`Platform admin bootstrap complete for ${result.email}.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Platform admin bootstrap failed.");
      process.exit(1);
    });
}
