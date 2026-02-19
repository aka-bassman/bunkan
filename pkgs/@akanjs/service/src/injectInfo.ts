import type { Adaptor, AdaptorCls, DefaultServiceMethods } from ".";
import type { DefaultServerSignalMethods } from "@akanjs/signal";
import {
  ConstantRegistry,
  type ConstantFieldTypeInput,
  type FieldToValue,
  type PlainTypeToFieldType,
} from "@akanjs/constant";
import type { Cls, PrimitiveScalar } from "@akanjs/base";
import type { CacheAdaptor } from "@akanjs/server";

export type InjectType = keyof ReturnType<typeof injectionBuilder>;

interface InjectBuilderOptions<ReturnType> {
  injectionRefName?: string;
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

export class InjectInfo<
  Type extends InjectType = any,
  ReturnType = any,
  Env extends { [key: string]: any } = never,
  FieldValue = never,
> {
  readonly type: Type;
  readonly injectionRefName?: string;
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
    this.injectionRefName = options.injectionRefName;
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
    instance: Adaptor,
    adaptorCls: AdaptorCls,
    {
      databaseRegistry,
      serviceRegistry,
      useRegistry,
      signalRegistry,
      adaptorRegistry,
      env,
      getCacheAdaptor,
    }: {
      databaseRegistry: Map<string, any>;
      serviceRegistry: Map<string, any>;
      useRegistry: Map<string, any>;
      signalRegistry: Map<string, any>;
      adaptorRegistry: Map<AdaptorCls, Adaptor>;
      env: any;
      getCacheAdaptor: () => CacheAdaptor;
    }
  ) {
    const injectMap = adaptorCls[INJECT_META_KEY];
    await Promise.all(
      Object.entries(injectMap).map(async ([propKey, injectInfo]) => {
        switch (injectInfo.type) {
          case "database":
            await this.#injectDatabase(instance, propKey, injectInfo, databaseRegistry);
            break;
          case "service":
            await this.#injectService(instance, propKey, injectInfo, serviceRegistry);
            break;
          case "use":
            await this.#injectUse(instance, propKey, injectInfo, useRegistry);
            break;
          case "signal":
            await this.#injectSignal(instance, propKey, injectInfo, signalRegistry);
            break;
          case "plug":
            await this.#injectPlug(instance, propKey, injectInfo, adaptorRegistry);
            break;
          case "env":
            await this.#injectEnv(instance, propKey, injectInfo, env);
            break;
          case "memory": {
            const cacheAdaptor = getCacheAdaptor();
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
    instance: Adaptor,
    propKey: string,
    injectInfo: InjectInfo<"database">,
    databaseRegistry: Map<string, any>
  ) {
    // Object.defineProperty(instance, propKey, { value, writable: false, enumerable: true });
  }
  static async #injectService(
    instance: Adaptor,
    propKey: string,
    injectInfo: InjectInfo<"service">,
    serviceRegistry: Map<string, any>
  ) {
    //
    // Object.defineProperty(instance, propKey, { value, writable: false, enumerable: true });
  }
  static async #injectUse(
    instance: Adaptor,
    propKey: string,
    injectInfo: InjectInfo<"use">,
    useRegistry: Map<string, any>
  ) {
    const useValue = useRegistry.get(propKey);
    if (!useValue)
      throw new Error(
        `Cannot inject "${propKey}" into adaptor "${(instance.constructor as AdaptorCls).refName}": ` +
          `use "${propKey}" has not been initialized yet.`
      );
    Object.defineProperty(instance, propKey, { value: useValue, writable: false, enumerable: true });
  }
  static async #injectSignal(
    instance: Adaptor,
    propKey: string,
    injectInfo: InjectInfo<"signal">,
    signalRegistry: Map<string, any>
  ) {
    //
    // Object.defineProperty(instance, propKey, { value, writable: false, enumerable: true });
  }
  static async #injectPlug(
    instance: Adaptor,
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
  static async #injectEnv(instance: Adaptor, propKey: string, injectInfo: InjectInfo<"env">, env: any) {
    const value = await injectInfo.generateFactory(env);
    Object.defineProperty(instance, propKey, { value, writable: false, enumerable: true });
  }
  static async #injectMemory(
    instance: Adaptor,
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
  service: <ReturnType extends DefaultServiceMethods>() =>
    new InjectInfo<"service", ReturnType>("service", { parentRefName }),
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
