import { IDENTITY_CLOCK_SKEW_SECONDS } from "../../shared/identityServiceContract";
import { IdentityServiceError } from "./errors";

export interface ReplayStore {
  consume(jti: string, expiresAt: number): Promise<boolean>;
  ready(): Promise<boolean>;
  productionSafe(): boolean;
}

export class MemoryReplayStore implements ReplayStore {
  private readonly entries = new Map<string, number>();
  constructor(private readonly nowSeconds: () => number = () => Math.floor(Date.now() / 1000)) {}

  async consume(jti: string, expiresAt: number) {
    const now = this.nowSeconds();
    this.entries.forEach((storedExpiry, storedJti) => {
      if (storedExpiry < now) this.entries.delete(storedJti);
    });
    if (this.entries.has(jti)) return false;
    this.entries.set(jti, Math.max(expiresAt, now + IDENTITY_CLOCK_SKEW_SECONDS));
    return true;
  }

  async ready() { return true; }
  productionSafe() { return false; }
}

export type RedisReplayClient = {
  set(key: string, value: string, options: { nx: true; ex: number }): Promise<unknown>;
  ping(): Promise<unknown>;
};

export class RedisReplayStore implements ReplayStore {
  constructor(private readonly client?: RedisReplayClient, private readonly nowSeconds = () => Math.floor(Date.now() / 1000)) {}

  async consume(jti: string, expiresAt: number) {
    if (!this.client) throw new IdentityServiceError(503, "IDENTITY_SERVICE_UNAVAILABLE", "Identity service is not available.", true);
    const ttl = Math.max(1, expiresAt - this.nowSeconds());
    const result = await this.client.set(`eeos:identity:replay:${jti}`, "1", { nx: true, ex: ttl });
    return result === "OK" || result === true;
  }

  async ready() {
    if (!this.client) return false;
    try { return (await this.client.ping()) === "PONG"; } catch { return false; }
  }

  productionSafe() { return Boolean(this.client); }
}

export type ReplayStoreProvider = "memory" | "redis";

export function createReplayStore(provider: ReplayStoreProvider = "memory", redisClient?: RedisReplayClient): ReplayStore {
  return provider === "redis" ? new RedisReplayStore(redisClient) : new MemoryReplayStore();
}
