import type { BaseEnv, Dayjs, SshOptions } from "@akanjs/base";
import { adapt } from "@akanjs/service";
import { Redis } from "ioredis";
import { createTunnel, type ForwardOptions, type ServerOptions, type TunnelOptions } from "tunnel-ssh";

export interface CacheAdaptor {
  set(topic: string, key: string, value: string | number | Buffer, option?: { expireAt?: Dayjs }): Promise<void>;
  get<T extends string | number | Buffer>(topic: string, key: string): Promise<T | undefined>;
  delete(topic: string, key: string): Promise<void>;
  getClient(): Redis;
}

interface RedisEnv extends BaseEnv {
  redis?: { username?: string; password?: string; sshOptions?: SshOptions };
}

export class RedisCache
  extends adapt("redisCache", ({ env, use }) => ({
    redis: env(
      async ({
        appName,
        environment,
        serveDomain,
        operationMode,
        repoName,
        redis = {
          // username, // TODO: Implement username and password
          // password, // TODO: Implement username and password
          sshOptions: {
            host: `${appName}-${environment}.${serveDomain}`,
            port: 32767,
            username: process.env.TUNNEL_USERNAME ?? "root",
            password: process.env.TUNNEL_PASSWORD ?? repoName,
            dstPort: 6379,
          },
        },
      }: RedisEnv) => {
        const createRedis = async (url: string) => {
          const redis = new Redis(url, { lazyConnect: true });
          await redis.connect();
          return redis;
        };
        if (process.env.REDIS_URI) return await createRedis(process.env.REDIS_URI);
        else if (environment === "local") return await createRedis("redis://localhost:6379");
        const DEFAULT_CLOUD_PORT = 30000;
        const environmentPort =
          environment === "main" ? 3000 : environment === "develop" ? 2000 : environment === "debug" ? 1000 : 0;
        const SERVICE_PORT = 300;
        const port = operationMode === "local" ? DEFAULT_CLOUD_PORT + environmentPort + SERVICE_PORT : 6379;
        if (operationMode === "cloud")
          return await createRedis(`redis://redis-svc.${appName}-${environment}.svc.cluster.local`);
        else if (operationMode === "local") {
          const tunnelOptions: TunnelOptions = { autoClose: true, reconnectOnError: false };
          const serverOptions: ServerOptions = { port };
          const forwardOptions: ForwardOptions = {
            srcAddr: "0.0.0.0",
            srcPort: port,
            dstAddr: `redis-0.redis-svc.${appName}-${environment}`,
            dstPort: 6379,
          };
          await createTunnel(tunnelOptions, serverOptions, redis.sshOptions, forwardOptions);
          return await createRedis(`redis://localhost:${port}`);
        } else return await createRedis(`redis://localhost:${port}`);
      }
    ),
  }))
  implements CacheAdaptor
{
  async set(
    topic: string,
    key: string,
    value: string | number | Buffer,
    option: { expireAt?: Dayjs } = {}
  ): Promise<void> {
    const expireTime = option.expireAt?.toDate().getTime();
    if (expireTime) await this.redis.set(`${topic}:${key}`, value, "PXAT", expireTime);
    else await this.redis.set(`${topic}:${key}`, value);
  }
  async get<T extends string | number | Buffer>(topic: string, key: string): Promise<T | undefined> {
    const value = await this.redis.get(`${topic}:${key}`);
    return value as T | undefined;
  }
  async delete(topic: string, key: string) {
    await this.redis.del(`${topic}:${key}`);
  }
  getClient(): Redis {
    return this.redis;
  }
}
