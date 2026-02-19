import { adapt } from "@akanjs/service";
import { RedisCache } from "./cache.adaptor";
import type { InternalInfo } from "@akanjs/signal";

export interface ScheduleAdaptor {
  resolveInternal(internal: { [key: string]: InternalInfo<"cron" | "interval" | "init" | "timeout" | "destroy"> }): {
    [key: string]: (...args: any[]) => Promise<void>;
  };
}

export class Scheduler
  extends adapt("scheduler", ({ plug }) => ({
    cache: plug(RedisCache),
  }))
  implements ScheduleAdaptor
{
  resolveInternal(internal: { [key: string]: InternalInfo<"cron" | "interval" | "init" | "timeout" | "destroy"> }): {
    [key: string]: (...args: any[]) => Promise<void>;
  } {
    return {};
  }
}
