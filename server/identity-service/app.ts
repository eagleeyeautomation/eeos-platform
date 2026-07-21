import express, { type Express, type Request } from "express";
import { IDENTITY_MAX_PAYLOAD_BYTES } from "../../shared/identityServiceContract.js";
import type { IdentityServiceConfig } from "./config.js";
import { identityErrorHandler, IdentityServiceError } from "./errors.js";
import { createIdentityLogger, type IdentityLogger } from "./logging.js";
import {
  adoptBodyRequestId,
  correlationMiddleware,
  rateLimitMiddleware,
  requestLoggingMiddleware,
} from "./middleware.js";
import { InMemoryFixedWindowRateLimiter, type IdentityRateLimiter } from "./rateLimit.js";
import { createIdentityInternalRouter } from "./routes.js";
import {
  ContractServiceAssertionVerifier,
  JwksServiceAssertionDecoder,
  UnconfiguredAssertionDecoder,
  type ServiceAssertionVerifier,
} from "./security.js";
import { createRedisReplayClient, createReplayStore, type RedisReplayClient, type ReplayStore } from "./replayStore.js";
import { createMysqlFactory, MysqlSessionIdentityAdapter, type SessionIdentityAdapter } from "./mysqlSessionAdapter.js";
import { Es256IdentityAssertionSigner, Hs256BrowserSessionVerifier, SessionValidationService } from "./sessionValidation.js";

export type IdentityServiceDependencies = {
  logger?: IdentityLogger;
  rateLimiter?: IdentityRateLimiter;
  assertionVerifier?: ServiceAssertionVerifier;
  sessionValidationService?: SessionValidationService;
  identityAdapter?: SessionIdentityAdapter;
  replayProtectionProductionSafe?: boolean;
  replayStore?: ReplayStore;
  redisClient?: RedisReplayClient;
  signerReadiness?: { ready(): Promise<boolean> };
};

export function createIdentityServiceApp(
  config: IdentityServiceConfig,
  dependencies: IdentityServiceDependencies = {},
): Express {
  const logger = dependencies.logger ?? createIdentityLogger(config.logLevel);
  const rateLimiter = dependencies.rateLimiter ?? new InMemoryFixedWindowRateLimiter();
  const configuredRedisClient = config.replayStoreProvider === "redis" && config.redisRestUrl && config.redisRestToken
    ? createRedisReplayClient(config.redisRestUrl, config.redisRestToken)
    : undefined;
  const replayStore = dependencies.replayStore
    ?? createReplayStore(config.replayStoreProvider, dependencies.redisClient ?? configuredRedisClient);
  const assertionVerifier = dependencies.assertionVerifier ?? new ContractServiceAssertionVerifier(
    config.trustedClientJwks
      ? new JwksServiceAssertionDecoder(config.trustedClientJwks, config.expectedIssuer, config.expectedAudience, config.expectedClientId)
      : new UnconfiguredAssertionDecoder(), replayStore,
  );
  const identityAdapter = dependencies.identityAdapter ?? (config.legacyMysqlDatabaseUrl
    ? new MysqlSessionIdentityAdapter(createMysqlFactory(config.legacyMysqlDatabaseUrl, config.mysqlConnectionTimeoutMs), config.mysqlConnectionTimeoutMs)
    : undefined);
  const signer = config.assertionPrivateKey && config.assertionKeyId
    ? new Es256IdentityAssertionSigner(config.assertionPrivateKey, config.assertionKeyId)
    : undefined;
  const sessionValidationService = dependencies.sessionValidationService ?? (
    config.sessionSecret && signer && identityAdapter
      ? new SessionValidationService(new Hs256BrowserSessionVerifier(config.sessionSecret), identityAdapter,
        signer)
      : undefined
  );
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(correlationMiddleware);
  app.use(requestLoggingMiddleware(logger));

  app.get("/health/live", (_req, res) => {
    res.status(200).json({ status: "ok", service: "eeos-identity-service", version: "v1" });
  });
  app.get("/health/ready", async (_req, res) => {
    const productionLike = ["preview", "staging", "production"].includes(config.environment);
    const replayAvailable = await replayStore.ready();
    const replaySafe = dependencies.replayProtectionProductionSafe ?? replayStore.productionSafe();
    const signerAvailable = await (dependencies.signerReadiness ?? signer)?.ready() ?? false;
    const mysqlAvailable = await identityAdapter?.ready() ?? false;
    const ready = Boolean(sessionValidationService && identityAdapter && assertionVerifier.operational?.()
      && replayAvailable && signerAvailable && mysqlAvailable && (!productionLike || replaySafe));
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", service: "eeos-identity-service", version: "v1" });
  });

  app.use("/internal/v1", rateLimitMiddleware(rateLimiter));
  app.use(express.json({
    limit: IDENTITY_MAX_PAYLOAD_BYTES,
    strict: true,
    verify: (req, _res, buffer) => { (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer); },
  }));
  app.use(adoptBodyRequestId);
  app.use("/internal/v1", createIdentityInternalRouter(assertionVerifier, sessionValidationService));

  app.use((_req, _res, next) => next(new IdentityServiceError(404, "IDENTITY_REQUEST_INVALID", "Identity endpoint was not found.")));
  app.use(identityErrorHandler(logger));
  return app;
}
