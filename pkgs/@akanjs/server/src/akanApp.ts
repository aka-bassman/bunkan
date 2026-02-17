import type { EndpointCls, InternalCls, SliceCls } from "@akanjs/signal";
import type { AdaptorCls, ServiceCls } from "@akanjs/service";
import type { DatabaseCls, DatabaseModel } from "@akanjs/document";
import type { ConstantModel, ScalarConstantModel } from "@akanjs/constant";
import {
  type DatabaseAdaptor,
  type CacheAdaptor,
  type SearchAdaptor,
  type StorageAdaptor,
  type SignalAdaptor,
  type QueueAdaptor,
  type ScheduleAdaptor,
  type LoggingAdaptor,
  MongoDatabase,
  RedisCache,
  MeiliSearch,
  BlobStorage,
  BunResolver,
  BullQueue,
  Scheduler,
  ConsoleLogger,
} from "./predefinedAdaptor";
import type { Cls } from "@akanjs/base";

interface DatabaseModule {
  constant: ConstantModel;
  database: DatabaseModel;
  service: ServiceCls;
  endpoint: EndpointCls;
  internal: InternalCls;
  slice: SliceCls;
}

interface ServiceModule {
  endpoint: EndpointCls;
  internal: InternalCls;
  service: ServiceCls;
}

interface ScalarModule {
  constant: ScalarConstantModel;
  database: DatabaseCls;
  internal?: InternalCls;
}

export class AkanApp {
  #database = new Map<string, DatabaseModule>();
  #service = new Map<string, ServiceModule>();
  #scalar = new Map<string, ScalarModule>();
  #adaptor = new Map<string, AdaptorCls>();
  #predefinedAdaptor: {
    database: Cls<DatabaseAdaptor>;
    cache: Cls<CacheAdaptor>;
    search: Cls<SearchAdaptor>;
    storage: Cls<StorageAdaptor>;
    signal: Cls<SignalAdaptor>;
    queue: Cls<QueueAdaptor>;
    schedule: Cls<ScheduleAdaptor>;
    logging: Cls<LoggingAdaptor>;
  } = {
    database: MongoDatabase,
    cache: RedisCache,
    search: MeiliSearch,
    storage: BlobStorage,
    signal: BunResolver,
    queue: BullQueue,
    schedule: Scheduler,
    logging: ConsoleLogger,
  };
  constructor(
    modules: {
      databases?: DatabaseModule[];
      services?: ServiceModule[];
      scalars?: ScalarModule[];
      adaptors?: AdaptorCls[];
    } = {}
  ) {
    modules.databases?.forEach((mod) => this.#database.set(mod.constant.refName, mod));
    modules.services?.forEach((mod) => this.#service.set(mod.service.refName, mod));
    modules.scalars?.forEach((mod) => this.#scalar.set(mod.constant.refName, mod));
    modules.adaptors?.forEach((mod) => this.#adaptor.set(mod.refName, mod));
  }
  start() {
    Bun.serve({
      port: 8080, // defaults to $BUN_PORT, $PORT, $NODE_PORT otherwise 3000
      fetch(req) {
        return new Response("404!");
      },
    });
    return this;
  }
}
