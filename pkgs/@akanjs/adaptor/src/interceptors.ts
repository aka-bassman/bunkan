import { Logger } from "@akanjs/common";
import { getGqlMeta, signalInfo } from "@akanjs/signal";
import type { RedisClientType } from "redis";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError, map, tap, timeout } from "rxjs/operators";
import { intercept } from "./__intercept";
import type { SignalContext } from ".";

interface CacheResult<T> {
  data: T;
  timestamp: number;
}

export class SignalCache extends intercept("signalCache", ({ use }) => ({
  redis: use<RedisClientType>(),
})) {
  #CACHE_PREFIX = "signal:";

  override async intercept(context: SignalContext) {
    // TODO: Implement cache interceptor
    return (res: Response) => {
      return res;
    };
    // const key = signalInfo.getHandlerKey(
    //   context.getHandler() as (...args: any) => any,
    // );
    // const gqlMeta = getGqlMeta(context.getClass(), key);

    // // Early return if not a Query or no cache configured
    // if (gqlMeta.type !== "Query" || !gqlMeta.signalOption.cache) {
    //   if (gqlMeta.signalOption.cache)
    //     this.logger.warn(
    //       `CacheInterceptor: ${key} is not Query endpoint or cache is not set`,
    //     );
    //   return next.handle();
    // }

    // const args = getArgs(context);
    // const cacheKey = this.#generateCacheKey(key, args);

    // const cachedData = await this.#getCache<T>(cacheKey);
    // if (cachedData) {
    //   this.logger.debug(`Cache hit for key: ${cacheKey}`);
    //   return next.handle().pipe(
    //     map(() => cachedData),
    //     catchError((error: Error) => {
    //       const errorMessage =
    //         error instanceof Error ? error.message : "Unknown error";
    //       this.logger.error(
    //         `Error in cache interceptor for ${cacheKey}: ${errorMessage}`,
    //       );
    //       return throwError(() => error);
    //     }),
    //   );
    // }

    // return next.handle().pipe(
    //   map((data: T) => {
    //     const cacheDuration = gqlMeta.signalOption.cache;
    //     if (typeof cacheDuration === "number") {
    //       void this.#setCache(cacheKey, data, cacheDuration);
    //       this.logger.debug(`Cache set for key: ${cacheKey}`);
    //     }
    //     return data;
    //   }),
    //   catchError((error: Error) => {
    //     const errorMessage =
    //       error instanceof Error ? error.message : "Unknown error";
    //     this.logger.error(
    //       `Error in cache interceptor for ${cacheKey}: ${errorMessage}`,
    //     );
    //     return throwError(() => error);
    //   }),
    // );
  }

  #generateCacheKey(signalKey: string, args: Record<string, unknown>): string {
    return `${this.#CACHE_PREFIX}${signalKey}:${JSON.stringify(args)}`;
  }

  async #getCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;
      const { data } = JSON.parse(cached) as CacheResult<T>;
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Error retrieving cache for key ${key}: ${errorMessage}`);
      return null;
    }
  }

  async #setCache(key: string, data: unknown, ttlMs: number): Promise<void> {
    try {
      const cacheData: CacheResult<unknown> = { data, timestamp: Date.now() };
      await this.redis.set(key, JSON.stringify(cacheData), { PX: ttlMs });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Error setting cache for key ${key}: ${errorMessage}`);
    }
  }
}

export class SignalTimeout extends intercept("signalTimeout", ({ use }) => ({
  logger: use<Logger>(),
})) {
  override async intercept(context: SignalContext) {
    // TODO: Implement timeout interceptor
    return (res: Response) => {
      return res;
    };
  }
}

export class SignalLogging extends intercept("signalLogging", ({ use }) => ({
  logger: use<Logger>(),
})) {
  override async intercept(context: SignalContext) {
    const reqType = "TEMP_REQ_TYPE";
    const reqName = "TEMP_REQ_NAME";
    const ip = "TEMP_IP";
    const before = Date.now();
    this.logger.debug(`Before ${reqType}-${reqName} / ${ip} / ${before}`);
    return (res: Response) => {
      const after = Date.now();
      this.logger.debug(`After  ${reqType}-${reqName} / ${ip} / ${after} (${after - before}ms)`);
      return res;
    };
  }
}
