import { adapt } from "@akanjs/service";
import type { CacheAdaptor } from "./cache.adaptor";

export interface SearchAdaptor {
  //
}

export class MeiliSearch
  extends adapt("meiliSearch", ({ use }) => ({
    cache: use<CacheAdaptor>(),
  }))
  implements SearchAdaptor {
  //
}
