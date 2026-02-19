import { adapt } from "@akanjs/service";
import { RedisCache } from "./cache.adaptor";

export interface SearchAdaptor {
  //
}

export class MeiliSearch
  extends adapt("meiliSearch", ({ plug }) => ({
    cache: plug(RedisCache),
  }))
  implements SearchAdaptor {
  //
}
