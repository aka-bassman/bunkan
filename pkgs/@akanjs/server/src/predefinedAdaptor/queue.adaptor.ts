import { adapt } from "@akanjs/service";
import type { Queue } from "bullmq";
import { RedisCache } from "./cache.adaptor";
import type { InternalInfo } from "@akanjs/signal";
import { Int } from "@akanjs/base";

export interface QueueAdaptor {
  resolveInternal(internal: { [key: string]: InternalInfo<"process"> }): {
    [key: string]: (...args: any[]) => Promise<void>;
  };
}

export class BullQueue
  extends adapt("bullQueue", ({ plug, memory }) => ({
    redis: plug(RedisCache, (redisCache) => redisCache.getClient()),
    memoryValue: memory(Int, {
      local: false,
      // get: (value) => value > 0,
      // set: (value: boolean) => (value ? 123 : -123) as number,
    }),
    mapMemoryValue: memory(Map, {
      // local: true,
      of: Int,
    }),
  }))
  implements QueueAdaptor
{
  override async onInit(): Promise<void> {
    //
  }
  resolveInternal(internal: { [key: string]: InternalInfo<"process"> }): {
    [key: string]: (...args: any[]) => Promise<void>;
  } {
    return {};
  }
}
