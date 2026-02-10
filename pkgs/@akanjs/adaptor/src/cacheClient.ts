import { adapt } from "@akanjs/service";
import type { RedisClientType } from "redis";

// TODO: 나중엔 Cache Adaptor로 redis, memcached, memory 등 다양한 캐시를 지원할 수 있도록 할 것임.
export class CacheClient extends adapt("cacheClient", ({ use }) => ({
  redis: use<RedisClientType>(),
})) {
  //
}
