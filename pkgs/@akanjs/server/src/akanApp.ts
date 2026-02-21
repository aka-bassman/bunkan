import {
  Base,
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
  type InjectRegistry,
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
} from "@akanjs/service";
import { baseEnv, type BaseEnv, type Cls } from "@akanjs/base";
import { collectAdaptors, resolveAdaptorHierarchy } from "./resolveAdaptorHierarchy";
import { resolveServiceHierarchy } from "./resolveServiceHierarchy";
import { Logger } from "@akanjs/common";
import { DatabaseResolver, ServiceResolver, SignalResolver } from "./resolver";

interface DatabaseModule {
  constant: ConstantModel;
  database: DatabaseModel;
  service: ServiceCls;
  endpoint: EndpointCls;
  internal: InternalCls;
  slice: SliceCls;
  serverSignal: ServerSignalCls;
}

interface ServiceModule {
  endpoint: EndpointCls;
  internal: InternalCls;
  service: ServiceCls;
  serverSignal: ServerSignalCls;
}

interface ScalarModule {
  constant: ScalarConstantModel;
  database: DatabaseCls;
  internal?: InternalCls;
}

export class AkanApp {
  status: "stopped" | "starting" | "running" | "stopping" = "stopped";
  #server: Bun.Server<undefined> | null = null;
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
  readonly #registry: InjectRegistry = {
    uses: new Map<string, any>(),
    adaptorCls: new Map<string, AdaptorCls>(),
    adaptor: new Map<AdaptorCls, Adaptor>(),
    databaseAdaptorCls: new Map<string, AdaptorCls>(),
    databaseAdapor: new Map<AdaptorCls, DatabaseModel>(),
    serverSignalCls: new Map<string, ServerSignalCls>(),
    serverSignal: new Map<ServerSignalCls, ServerSignal>(),
    signalAdaptorCls: new Map<string, AdaptorCls>(),
    signalAdapor: new Map<AdaptorCls, ServerSignal>(),
    serviceCls: new Map<string, ServiceCls>(),
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
      prefix?: string;
      websocketPrefix?: string;
    } = {},
    name = "AkanApp"
  ) {
    this.name = name;
    this.logger = new Logger(name);
    this.#service.set("base", {
      endpoint: BaseEndpoint,
      internal: BaseInternal,
      service: BaseService,
      serverSignal: Base,
    });
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
    await this.#initializeServerSignal();
    await this.#initializeService();

    const port = process.env.PORT ?? 8080;
    this.logger.verbose(`${this.name} is serving on port ${port}`);
    this.#server = Bun.serve({
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
        stage.map(async (refName) => {
          const adaptorCls = adaptorMap.get(refName);
          if (!adaptorCls) throw new Error(`Adaptor "${refName}" is not registered`);
          const adaptor = new adaptorCls();
          await InjectInfo.resolveInjection(adaptor, adaptorCls, this.#registry, this.props.env ?? baseEnv);
          const start = Date.now();
          adaptor.logger.verbose(`${refName} adaptor initializing...`);
          await adaptor.onInit();
          this.#live.adaptor.set(refName, adaptor);
          this.#registry.adaptorCls.set(refName, adaptorCls);
          this.#registry.adaptor.set(adaptorCls, adaptor);
          adaptor.logger.verbose(`${refName} adaptor initialized in ${Date.now() - start}ms`);
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
  async #initializeServerSignal() {
    const serverSignalClsEntries = [
      ...[...this.#service.values()].map((mod) => [mod.serverSignal.refName, mod.serverSignal] as const),
      ...[...this.#database.values()].map((mod) => [mod.serverSignal.refName, mod.serverSignal] as const),
    ];
    await Promise.all(
      serverSignalClsEntries.map(async ([refName, serverSignalCls]) => {
        const serverSignal = new serverSignalCls();
        await InjectInfo.resolveInjection(serverSignal, serverSignalCls, this.#registry, this.props.env ?? baseEnv);
        SignalResolver.resolveServerSignal(serverSignalCls, () => this.#server);
        this.#registry.serverSignalCls.set(refName, serverSignalCls);
        this.#registry.serverSignal.set(serverSignalCls, serverSignal);
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
        stage.map(async (refName) => {
          const serviceCls = serviceMap.get(refName);
          if (!serviceCls) throw new Error(`Service "${refName}" is not registered`);
          if (serviceCls.type === "database") {
            const databaseModule = this.#database.get(serviceCls.refName);
            if (!databaseModule) throw new Error(`Database "${serviceCls.refName}" is not registered`);
            ServiceResolver.resolveDatabaseService(databaseModule.constant, databaseModule.database, serviceCls);
          }
          const service = new serviceCls();
          await InjectInfo.resolveInjection(service, serviceCls, this.#registry, this.props.env ?? baseEnv);
          await service.onInit();
          this.#live.service.set(refName, service);
          this.#registry.serviceCls.set(refName, serviceCls);
          this.#registry.service.set(serviceCls, service);
          service.logger.verbose(`${refName} service initialized`);
        })
      );
    }
  }
  #registerServerSignal(): { routes: Record<string, any>; websocket?: any } {
    const routes: Record<string, any> = {};
    const getServer = () => this.#server;

    // TODO: register signal routes from this.#registry.serverSignal
    // getServer()를 런타임에 호출하면 이미 초기화된 this.#server를 반환
    // 예: getServer().publish(topic, data)

    return { routes };
  }
}
