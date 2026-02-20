import { adapt } from "@akanjs/service";
import { RedisCache } from "./cache.adaptor";

export interface ScheduleAdaptor {
  //
}

export class Scheduler
  extends adapt("scheduler", ({ plug }) => ({
    cache: plug(RedisCache),
  }))
  implements ScheduleAdaptor {
  //
}
