import { BaseEndpoint, BaseInternal, type EndpointCls, type InternalCls, type SliceCls } from "@akanjs/signal";
import {
  BaseService,
  type AdaptorCls,
  type ServiceCls,
  type Adaptor,
  INJECT_META_KEY,
  InjectInfo,
} from "@akanjs/service";
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
import { baseEnv, type BaseEnv, type Cls } from "@akanjs/base";
import { collectAdaptors, resolveAdaptorHierarchy } from "./resolveAdaptorHierarchy";
import { Logger } from "@akanjs/common";

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
  status: "stopped" | "starting" | "running" | "stopping" = "stopped";
  readonly name: string;
  readonly logger: Logger;
  readonly #database = new Map<string, DatabaseModule>();
  readonly #service = new Map<string, ServiceModule>();
  readonly #scalar = new Map<string, ScalarModule>();
  readonly #adaptor = new Map<string, AdaptorCls>();
  readonly #predefinedAdaptor: {
    database: AdaptorCls<DatabaseAdaptor>;
    cache: AdaptorCls<CacheAdaptor>;
    search: AdaptorCls<SearchAdaptor>;
    storage: AdaptorCls<StorageAdaptor>;
    signal: AdaptorCls<SignalAdaptor>;
    queue: AdaptorCls<QueueAdaptor>;
    schedule: AdaptorCls<ScheduleAdaptor>;
    logging: AdaptorCls<LoggingAdaptor>;
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
  readonly #registry = {
    uses: new Map<string, any>(),
    adaptor: new Map<AdaptorCls, Adaptor>(),
  };
  readonly #live = {
    adaptor: new Map<string, Adaptor>(),
  };
  constructor(
    private readonly props: {
      databases?: DatabaseModule[];
      services?: ServiceModule[];
      scalars?: ScalarModule[];
      uses?: { [key: string]: any };
      env?: BaseEnv;
    } = {},
    name = "AkanApp"
  ) {
    this.name = name;
    this.logger = new Logger(name);
    this.#service.set("base", { endpoint: BaseEndpoint, internal: BaseInternal, service: BaseService });
    this.props.databases?.forEach((mod) => {
      this.#database.set(mod.constant.refName, mod);
    });
    this.props.services?.forEach((mod) => this.#service.set(mod.service.refName, mod));
    this.props.scalars?.forEach((mod) => this.#scalar.set(mod.constant.refName, mod));

    const services = [
      ...(props.services?.map((mod) => mod.service) ?? []),
      ...(props.databases?.map((mod) => mod.service) ?? []),
    ];
    for (const adaptor of collectAdaptors(services)) {
      this.#adaptor.set(adaptor.refName, adaptor);
    }
  }
  async start() {
    if (this.status !== "stopped") throw new Error("AkanApp is not able to start. It is already running.");
    this.status = "starting";
    await this.#initializeUses();
    await this.#initializeAdaptor();
    // const getAdaptor = (refName: string): Adaptor => {
    //   const adaptor = this.#live.adaptor.get(refName);
    //   if (!adaptor) throw new Error(`Adaptor ${refName} is not initialized`);
    //   return adaptor;
    // };
    const port = process.env.PORT ?? 8080;
    this.logger.verbose(`${this.name} is serving on port ${port}`);
    Bun.serve({
      port, // defaults to $BUN_PORT, $PORT, $NODE_PORT otherwise 3000
      fetch(req) {
        return new Response("404!");
      },
    });
    this.status = "running";
    this.logger.info(`🚀 ${this.name} is running on port ${port}`);
    return this;
  }
  async #initializeAdaptor() {
    const adaptorMap = new Map<string, AdaptorCls>([
      ...Object.entries(this.#predefinedAdaptor),
      ...this.#adaptor.entries(),
    ]);
    const { stages: adaptorStages, classToKey } = resolveAdaptorHierarchy(adaptorMap);
    for (const stage of adaptorStages) {
      await Promise.all(
        stage.map(async (key) => {
          const adaptorCls = adaptorMap.get(key)!;
          const adaptor = new adaptorCls();
          await InjectInfo.resolveInjection(adaptor, adaptorCls, {
            databaseRegistry: new Map(), // TODO: implement database registry
            serviceRegistry: this.#service,
            useRegistry: this.#registry.uses, // TODO: implement use registry
            signalRegistry: new Map(), // TODO: implement signal registry
            adaptorRegistry: this.#registry.adaptor,
            env: this.props.env ?? baseEnv,
            getCacheAdaptor: () => {
              const cacheAdaptor = this.#registry.adaptor.get(RedisCache);
              if (!cacheAdaptor) throw new Error("Cache adaptor is not initialized");
              return cacheAdaptor as RedisCache;
            },
          });
          await adaptor.onInit();
          this.#live.adaptor.set(key, adaptor);
          this.#registry.adaptor.set(adaptorCls, adaptor);
          adaptor.logger.verbose(`${key} adaptor initialized`);
        })
      );
    }
  }
  async #initializeUses() {
    await Promise.all(
      Object.entries(this.props.uses ?? {}).map(async ([key, value]) => {
        const useValue = value instanceof Promise ? await value : value;
        this.#registry.uses.set(key, useValue);
      })
    );
  }
}
