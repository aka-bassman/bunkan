import { adapt } from "@akanjs/service";
import type { Queue } from "bullmq";
import { RedisCache } from "./cache.adaptor";
import type { InternalInfo } from "@akanjs/signal";

export interface QueueAdaptor {
  resolveInternal(internal: { [key: string]: InternalInfo<"process"> }): {
    [key: string]: (...args: any[]) => Promise<void>;
  };
}

export class BullQueue
  extends adapt("bullQueue", ({ plug }) => ({
    redis: plug(RedisCache, (redisCache) => redisCache.getClient()),
  }))
  implements QueueAdaptor
{
  resolveInternal(internal: { [key: string]: InternalInfo<"process"> }): {
    [key: string]: (...args: any[]) => Promise<void>;
  } {
    return {};
  }
}
