import { adapt } from "@akanjs/service";
import { Queue, Worker, type ConnectionOptions, Job } from "bullmq";
import { RedisCache } from "./cache.adaptor";
import { Int, type BaseEnv } from "@akanjs/base";

export interface QueueAdaptor {
  //
}

export class BullQueue
  extends adapt("bullQueue", ({ plug, env }) => ({
    redis: plug(RedisCache, (redisCache) => redisCache.getClient()),
    prefix: env((env: BaseEnv) => `queue:${env.repoName}:${env.appName}:${env.environment}:${env.operationMode}`),
  }))
  implements QueueAdaptor
{
  override async onInit(): Promise<void> {
    //
  }
  // registerProcessWorker(key: string, internalInfo: InternalInfo<"process">): Worker {
  //   const worker = new Worker(
  //     `${this.prefix}:${key}`,
  //     async (job: Job) => {
  //       console.log(job.data);
  //     },
  //     { connection: this.redis as ConnectionOptions }
  //   );
  //   return worker;
  // }
  // registerProcessQueue(key: string, internalInfo: InternalInfo<"process">): Queue {
  //   const queue = new Queue(`${this.prefix}:${key}`, {
  //     connection: this.redis as ConnectionOptions,
  //     defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
  //   });
  //   return queue;
  // }
}
