import type { Adaptor, AdaptorCls, Service, ServiceCls } from ".";
import type { ServerSignal } from "@akanjs/signal";
import {
  ConstantRegistry,
  type ConstantFieldTypeInput,
  type FieldToValue,
  type PlainTypeToFieldType,
} from "@akanjs/constant";
import type { BaseEnv, Cls, PrimitiveScalar } from "@akanjs/base";
import type { CacheAdaptor } from "./predefinedAdaptor";
import type { DatabaseModel } from "@akanjs/document";

export type InjectType = keyof ReturnType<typeof injectionBuilder>;

interface InjectBuilderOptions<ReturnType> {
  generateFactory?: (options: any) => ReturnType;
  adaptor?: AdaptorCls;
  additionalPropKeys?: string[];
  get?: (value: any) => any;
  set?: (value: any) => any;
  local?: boolean;
  default?: any;
  isMap?: boolean;
  parentRefName: string;
}

export const INJECT_META_KEY = Symbol("inject");

export interface InjectRegistry {
  uses: Map<string, any>;
  adaptorCls: Map<string, AdaptorCls>;
  adaptor: Map<AdaptorCls, Adaptor>;
  databaseAdaptorCls: Map<string, AdaptorCls>;
  databaseAdapor: Map<AdaptorCls, DatabaseModel>;
  signalAdaptorCls: Map<string, AdaptorCls>;
  signalAdapor: Map<AdaptorCls, ServerSignal>;
  serviceCls: Map<string, ServiceCls>;
  service: Map<ServiceCls, Service>;
}

export class InjectInfo<
  Type extends InjectType = any,
  ReturnType = any,
  Env extends { [key: string]: any } = never,
  FieldValue = never,
> {
  readonly type: Type;
  readonly generateFactory: (options: any) => ReturnType;
  readonly get?: (value: any) => any;
  readonly set?: (value: any) => any;
  readonly additionalPropKeys: string[];
  readonly local: boolean;
  readonly adaptor?: AdaptorCls;
  readonly default?: ReturnType;
  readonly isMap?: boolean;
  readonly parentRefName: string;
  constructor(type: Type, options: InjectBuilderOptions<ReturnType>) {
    this.type = type;
    this.generateFactory = options.generateFactory ?? (() => undefined as ReturnType);
    this.additionalPropKeys = options.additionalPropKeys ?? [];
    this.local = options.local ?? false;
    this.adaptor = options.adaptor;
    this.get = options.get;
    this.set = options.set;
    this.default = options.default;
    this.isMap = options.isMap ?? false;
    this.parentRefName = options.parentRefName;
  }
  static async resolveInjection(
    instance: Adaptor | Service,
    applyCls: AdaptorCls | ServiceCls,
    registry: InjectRegistry,
    env: BaseEnv
  ) {
    const injectMap = applyCls[INJECT_META_KEY];
    await Promise.all(
      Object.entries(injectMap).map(async ([propKey, injectInfo]) => {
        switch (injectInfo.type) {
          case "database":
            await this.#injectDatabase(instance, propKey, injectInfo, registry.adaptorCls, registry.adaptor);
            break;
          case "service":
            await this.#injectService(instance, propKey, injectInfo, registry);
            break;
          case "use":
            await this.#injectUse(instance, propKey, registry.uses);
            break;
          case "signal":
            await this.#injectSignal(instance, propKey, injectInfo, registry);
            break;
          case "plug":
            await this.#injectPlug(instance, propKey, injectInfo, registry.adaptor);
            break;
          case "env":
            await this.#injectEnv(instance, propKey, injectInfo, env);
            break;
          case "memory": {
            const cacheAdaptorCls = registry.adaptorCls.get("redisCache");
            if (!cacheAdaptorCls) throw new Error("RedisCache adaptor is not registered");
            const cacheAdaptor = registry.adaptor.get(cacheAdaptorCls) as unknown as CacheAdaptor;
            if (!cacheAdaptor) throw new Error("RedisCache adaptor is not initialized");
            await this.#injectMemory(instance, propKey, injectInfo, cacheAdaptor);
            break;
          }
          default:
            throw new Error(`Unknown inject type: ${injectInfo.type}`);
        }
      })
    );
  }
  static async #injectDatabase(
    instance: Adaptor | Service,
    propKey: string,
    injectInfo: InjectInfo<"database">,
    adaptorClsRegistry: Map<string, AdaptorCls>,
    adaptorRegistry: Map<AdaptorCls, Adaptor>
  ) {
    const databaseAdaptorRefName = `${injectInfo.parentRefName}Model`;
    const databaseAdaptorCls = adaptorClsRegistry.get(databaseAdaptorRefName);
    if (!databaseAdaptorCls) throw new Error(`Database adaptor "${databaseAdaptorRefName}" is not registered`);
    const databaseAdaptor = adaptorRegistry.get(databaseAdaptorCls);
    if (!databaseAdaptor) throw new Error(`Database adaptor "${databaseAdaptorRefName}" is not initialized`);
    Object.defineProperty(instance, propKey, { value: databaseAdaptor, writable: false, enumerable: true });
  }
  static async #injectService(
    instance: Adaptor | Service,
    propKey: string,
    injectInfo: InjectInfo<"service">,
    registry: InjectRegistry
  ) {
    if (!propKey.endsWith("Service"))
      throw new Error(
        `Service inject key must end with "***Service", current key is "${propKey} on ${injectInfo.parentRefName}"`
      );
    const injectServiceRefName = propKey.slice(0, -7);
    const injectServiceCls = registry.serviceCls.get(injectServiceRefName);
    if (!injectServiceCls) throw new Error(`Service "${injectServiceRefName}" is not registered`);
    const injectService = registry.service.get(injectServiceCls);
    if (!injectService) throw new Error(`Service "${injectServiceRefName}" is not initialized`);
    Object.defineProperty(instance, propKey, { value: injectService, writable: false, enumerable: true });
  }
  static async #injectUse(instance: Adaptor | Service, propKey: string, uses: Map<string, any>) {
    const useValue = uses.get(propKey);
    if (!useValue)
      throw new Error(
        `Cannot inject "${propKey}" into adaptor "${(instance.constructor as AdaptorCls).refName}": ` +
          `use "${propKey}" has not been initialized yet.`
      );
    Object.defineProperty(instance, propKey, { value: useValue, writable: false, enumerable: true });
  }
  static async #injectSignal(
    instance: Adaptor | Service,
    propKey: string,
    injectInfo: InjectInfo<"signal">,
    registry: InjectRegistry
  ) {
    //
    // Object.defineProperty(instance, propKey, { value, writable: false, enumerable: true });
  }
  static async #injectPlug(
    instance: Adaptor | Service,
    propKey: string,
    injectInfo: InjectInfo<"plug">,
    adaptorRegistry: Map<AdaptorCls, Adaptor>
  ) {
    if (!injectInfo.adaptor) throw new Error("InjectInfo is not a plug or adaptor is not provided");
    const adaptorCls = injectInfo.adaptor;
    const depInstance = adaptorRegistry.get(injectInfo.adaptor);
    if (!depInstance)
      throw new Error(
        `Cannot inject "${propKey}" into adaptor "${adaptorCls.refName}": ` +
          `dependency "${injectInfo.adaptor.refName}" has not been initialized yet.`
      );
    const value = await injectInfo.generateFactory(depInstance);
    Object.defineProperty(instance, propKey, { value, writable: false, enumerable: true });
  }
  static async #injectEnv(instance: Adaptor | Service, propKey: string, injectInfo: InjectInfo<"env">, env: any) {
    const value = await injectInfo.generateFactory(env);
    Object.defineProperty(instance, propKey, { value, writable: false, enumerable: true });
  }
  static async #injectMemory(
    instance: Adaptor | Service,
    propKey: string,
    injectInfo: InjectInfo<"memory">,
    cacheAdaptor: CacheAdaptor
  ) {
    if (injectInfo.local) {
      Object.defineProperty(instance, propKey, {
        value: injectInfo.default ?? null,
        writable: true,
        enumerable: true,
      });
    } else if (injectInfo.isMap) {
      Object.defineProperty(instance, propKey, {
        value: {
          get: async (key: string) => {
            const getter = injectInfo.get as (value: any) => any;
            const value = await cacheAdaptor.hget(`akan:memory:${injectInfo.parentRefName}`, propKey, key);
            return value === null ? value : getter(value);
          },
          set: async (key: string, value: any) => {
            const setter = injectInfo.set as (value: any) => any;
            const setValue = setter(value);
            await cacheAdaptor.hset(`akan:memory:${injectInfo.parentRefName}`, propKey, key, setValue);
          },
          delete: async (key: string) => {
            await cacheAdaptor.hdelete(`akan:memory:${injectInfo.parentRefName}`, propKey, key);
          },
        },
      });
    } else {
      Object.defineProperty(instance, propKey, {
        value: {
          get: async () => {
            const getter = injectInfo.get as (value: any) => any;
            const value = await cacheAdaptor.get("akan:memory", propKey);
            return value === null ? value : getter(value);
          },
          set: async (value: any) => {
            const setter = injectInfo.set as (value: any) => any;
            const setValue = setter(value);
            await cacheAdaptor.set("akan:memory", propKey, setValue);
          },
          delete: async () => {
            await cacheAdaptor.delete("akan:memory", propKey);
          },
        },
        writable: false,
        enumerable: true,
      });
    }
  }
}

type GetFieldValue<ValueRef, ExplicitType, MapValue = never> = unknown extends ExplicitType
  ? FieldToValue<ValueRef, MapValue>
  : ExplicitType;
export const injectionBuilder = (parentRefName: string) => ({
  database: <ReturnType>(additionalPropKeys: string[] = []) =>
    new InjectInfo<"database", ReturnType>("database", { additionalPropKeys, parentRefName }),
  service: <ReturnType extends Service>() => new InjectInfo<"service", ReturnType>("service", { parentRefName }),
  use: <ReturnType>() => new InjectInfo<"use", ReturnType>("use", { parentRefName }),
  signal: <Signal>() => new InjectInfo<"signal", Signal>("signal", { parentRefName }),
  plug: <Adaptor, GenFactory extends (adaptor: Adaptor) => any = (adaptor: Adaptor) => Adaptor>(
    adaptor: AdaptorCls<Adaptor>,
    generateFactory?: GenFactory
  ) =>
    new InjectInfo<"plug", ReturnType<GenFactory>>("plug", {
      adaptor,
      generateFactory: generateFactory ?? ((adaptor) => adaptor),
      parentRefName,
    }),
  env: <GenFactory extends (arg: any) => any>(generateFactory: GenFactory) =>
    new InjectInfo<"env", Awaited<ReturnType<GenFactory>>, GenFactory extends (arg: infer Env) => any ? Env : never>(
      "env",
      { generateFactory, parentRefName }
    ),
  memory: <
    ExplicitType = unknown,
    ValueRef extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    MapValue = never,
    DefaultValue extends GetFieldValue<ValueRef, ExplicitType> = never,
    GetFn extends (value: GetFieldValue<ValueRef, ExplicitType>) => any = never,
    Local extends boolean = false,
  >(
    modelRef: ValueRef,
    opts: {
      local?: Local;
      default?: DefaultValue;
      of?: MapValue;
      get?: GetFn;
      set?: (value: ReturnType<GetFn>) => GetFieldValue<ValueRef, ExplicitType>;
    } = {}
  ) => {
    if (opts.local && (!!opts.get || !!opts.set))
      throw new Error("get and set should not be provided when local is true");
    if ((opts.get && !opts.set) || (!opts.get && opts.set))
      throw new Error("get and set should be both provided or not provided");
    const isMap = modelRef === Map;
    if (isMap && !opts.of) throw new Error("of should be provided when modelRef is Map");
    type FieldValue = never extends GetFn ? GetFieldValue<ValueRef, ExplicitType, MapValue> : ReturnType<GetFn>;
    type IsNullable = DefaultValue extends never ? true : false;
    type UseValue = IsNullable extends true ? FieldValue | null : FieldValue;
    return new InjectInfo<
      "memory",
      Local extends true
        ? MapConstructor extends ValueRef
          ? Map<string, FieldToValue<MapValue>>
          : UseValue
        : MapConstructor extends ValueRef
          ? {
              get: (key: string) => Promise<FieldToValue<MapValue>>;
              set: (key: string, value: FieldToValue<MapValue>) => Promise<void>;
              delete: (key: string) => Promise<void>;
            }
          : { get: () => Promise<UseValue>; set: (value: UseValue) => Promise<void>; delete: () => Promise<void> },
      never,
      ValueRef
    >("memory", {
      local: opts.local,
      get: (serializedValue: object | null) => {
        return (
          ConstantRegistry.deserialize(
            isMap ? (opts.of as Cls) : (modelRef as Cls),
            serializedValue ?? opts.default,
            true
          ) ?? null
        );
      },
      set: (value: object | null) => {
        return (
          ConstantRegistry.serialize(isMap ? (opts.of as Cls) : (modelRef as Cls), value, true) ?? opts.default ?? null
        );
      },
      default: opts.default,
      isMap,
      parentRefName,
    });
  },
});

export type InjectBuilder<BuildType extends InjectType = InjectType> = (
  builder: Pick<ReturnType<typeof injectionBuilder>, BuildType>
) => { [key: string]: InjectInfo };

export type ExtractInjectInfoObject<InjectInfoMap extends { [key: string]: InjectInfo }> = {
  [K in keyof InjectInfoMap]: ReturnType<InjectInfoMap[K]["generateFactory"]>;
};
