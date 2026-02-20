import {
  BaseEndpoint,
  BaseInternal,
  type EndpointCls,
  type InternalCls,
  type ServerSignal,
  type ServerSignalCls,
  type SliceCls,
} from "@akanjs/signal";
import {
  BaseService,
  type AdaptorCls,
  type ServiceCls,
  type Adaptor,
  INJECT_META_KEY,
  InjectInfo,
  type Service,
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
  BlobStorage,
  BunResolver,
  BullQueue,
  Scheduler,
  ConsoleLogger,
  MeiliDatabase,
} from "./predefinedAdaptor";
import { baseEnv, type BaseEnv, type Cls } from "@akanjs/base";
import { collectAdaptors, resolveAdaptorHierarchy } from "./resolveAdaptorHierarchy";
import { resolveServiceHierarchy } from "./resolveServiceHierarchy";
import { Logger } from "@akanjs/common";
import { DatabaseResolver, ServiceResolver } from "./resolver";

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
    search: MeiliDatabase,
    storage: BlobStorage,
    signal: BunResolver,
    queue: BullQueue,
    schedule: Scheduler,
    logging: ConsoleLogger,
  };
  readonly #registry = {
    uses: new Map<string, any>(),
    adaptorCls: new Map<string, AdaptorCls>(),
    adaptor: new Map<AdaptorCls, Adaptor>(),
    databaseAdaptorCls: new Map<string, AdaptorCls>(),
    databaseAdapor: new Map<AdaptorCls, DatabaseModel>(),
    signalAdaptorCls: new Map<string, AdaptorCls>(),
    signalAdapor: new Map<AdaptorCls, ServerSignal>(),
    service: new Map<ServiceCls, Service>(),
  };
  readonly #live = {
    adaptor: new Map<string, Adaptor>(),
    service: new Map<string, Service>(),
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
    this.props.databases
      ?.filter((mod) => mod.service.enabled)
      .forEach((mod) => {
        this.#database.set(mod.constant.refName, mod);
        const databaseAdaptor = DatabaseResolver.resolveDatabase(mod.constant, mod.database);
        this.#adaptor.set(databaseAdaptor.refName, databaseAdaptor);
      });
    this.props.services
      ?.filter((mod) => mod.service.enabled)
      .forEach((mod) => this.#service.set(mod.service.refName, mod));
    this.props.scalars?.forEach((mod) => this.#scalar.set(mod.constant.refName, mod));

    const services = [
      ...[...this.#service.values()].map((mod) => mod.service),
      ...[...this.#database.values()].map((mod) => mod.service),
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
    await this.#initializeService();
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
      ...Object.entries(this.#predefinedAdaptor).map(([key, adaptorCls]) => [adaptorCls.refName, adaptorCls] as const),
      ...this.#adaptor.entries(),
    ]);
    const { stages: adaptorStages, classToKey } = resolveAdaptorHierarchy(adaptorMap);
    for (const stage of adaptorStages) {
      await Promise.all(
        stage.map(async (key) => {
          const adaptorCls = adaptorMap.get(key);
          if (!adaptorCls) throw new Error(`Adaptor "${key}" is not registered`);
          const adaptor = new adaptorCls();
          await InjectInfo.resolveInjection(adaptor, adaptorCls, this.#registry, this.props.env ?? baseEnv);
          const start = Date.now();
          adaptor.logger.verbose(`${key} adaptor initializing...`);
          await adaptor.onInit();
          this.#live.adaptor.set(key, adaptor);
          this.#registry.adaptorCls.set(key, adaptorCls);
          this.#registry.adaptor.set(adaptorCls, adaptor);
          adaptor.logger.verbose(`${key} adaptor initialized in ${Date.now() - start}ms`);
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
  async #initializeService() {
    const serviceMap = new Map<string, ServiceCls>([
      ...[...this.#service.values()].map((mod) => [mod.service.refName, mod.service] as const),
      ...[...this.#database.values()].map((mod) => [mod.service.refName, mod.service] as const),
    ]);
    const { stages: serviceStages, classToKey } = resolveServiceHierarchy(serviceMap);
    for (const stage of serviceStages) {
      await Promise.all(
        stage.map(async (key) => {
          const serviceCls = serviceMap.get(key);
          if (!serviceCls) throw new Error(`Service "${key}" is not registered`);
          if (serviceCls.type === "database") {
            const databaseModule = this.#database.get(serviceCls.refName);
            if (!databaseModule) throw new Error(`Database "${serviceCls.refName}" is not registered`);
            ServiceResolver.resolveDatabaseService(databaseModule.constant, databaseModule.database, serviceCls);
          }
          const service = new serviceCls();
          await InjectInfo.resolveInjection(service, serviceCls, this.#registry, this.props.env ?? baseEnv);
          await service.onInit();
          this.#live.service.set(key, service);
          this.#registry.service.set(serviceCls, service);
          service.logger.verbose(`${key} service initialized`);
        })
      );
    }
  }
}
