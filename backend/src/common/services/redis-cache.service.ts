import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisClientType, createClient } from "redis";

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: RedisClientType | null;
  private readonly readyPromise: Promise<void> | null;
  private isReady = false;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>("REDIS_URL")?.trim();
    if (!redisUrl) {
      this.client = null;
      this.readyPromise = null;
      this.logger.log("Redis cache disabled: REDIS_URL is not configured");
      return;
    }

    const client = createClient({ url: redisUrl });
    client.on("error", (error) => {
      this.isReady = false;
      this.logger.warn(`Redis cache error: ${error.message}`);
    });
    client.on("ready", () => {
      this.isReady = true;
      this.logger.log("Redis cache connected");
    });
    client.on("end", () => {
      this.isReady = false;
      this.logger.warn("Redis cache connection closed");
    });

    this.client = client;
    this.readyPromise = client.connect().catch((error) => {
      this.isReady = false;
      this.logger.warn(`Redis cache unavailable: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      await this.client.disconnect();
    }
  }

  isEnabled() {
    return Boolean(this.client);
  }

  private async ensureReady() {
    if (!this.client || !this.readyPromise) return false;
    if (!this.isReady) {
      await this.readyPromise;
    }
    return this.isReady;
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!(await this.ensureReady()) || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(`Redis get failed for ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    if (!(await this.ensureReady()) || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (error) {
      this.logger.warn(`Redis set failed for ${key}: ${(error as Error).message}`);
    }
  }

  async delete(key: string) {
    if (!(await this.ensureReady()) || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Redis delete failed for ${key}: ${(error as Error).message}`);
    }
  }

  async deleteByPrefix(prefix: string) {
    if (!(await this.ensureReady()) || !this.client) return;
    try {
      const keys: string[] = [];
      for await (const key of this.client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
        keys.push(key);
      }
      if (keys.length) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.warn(
        `Redis prefix delete failed for ${prefix}: ${(error as Error).message}`
      );
    }
  }
}
