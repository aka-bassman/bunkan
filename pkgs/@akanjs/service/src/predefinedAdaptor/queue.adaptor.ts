import { adapt } from "@akanjs/service";
import { Queue, Worker, type ConnectionOptions, Job, type JobsOptions } from "bullmq";
import { RedisCache } from "./cache.adaptor";
import { Int, type BaseEnv, baseEnv } from "@akanjs/base";

export interface QueueAdaptor {
  registerProcessWorker(key: string, handler: (job: Job) => Promise<void>): Worker;
  registerProcessQueue(key: string, args: any[], jobOptions?: JobsOptions): Promise<Job>;
}

export class BullQueue
  extends adapt("bullQueue", ({ plug, env }) => ({
    redis: plug(RedisCache, (redisCache) => redisCache.getClient()),
    queue: plug(
      RedisCache,
      (redisCache) =>
        new Queue(`queue-${baseEnv.repoName}-${baseEnv.appName}-${baseEnv.environment}-${baseEnv.operationMode}`, {
          connection: redisCache.getClient() as ConnectionOptions,
          defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
        })
    ),
    prefix: env((env: BaseEnv) => `queue-${env.repoName}-${env.appName}-${env.environment}-${env.operationMode}`),
  }))
  implements QueueAdaptor
{
  override async onInit(): Promise<void> {
    //
  }
  getQueue(): Queue {
    return this.queue;
  }
  registerProcessWorker(key: string, handler: (job: Job) => Promise<void>): Worker {
    const worker = new Worker(`${this.prefix}:${key}`, handler, { connection: this.redis as ConnectionOptions });
    return worker;
  }
  async registerProcessQueue(key: string, args: any[], jobOptions?: JobsOptions): Promise<Job> {
    const job = await this.queue.add(`${this.prefix}:${key}`, args, jobOptions);
    return job;
  }
}
