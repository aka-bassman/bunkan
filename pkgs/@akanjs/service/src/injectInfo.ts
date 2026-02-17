import type { AdaptorCls, DefaultServiceMethods } from ".";
import type { DefaultServerSignalMethods } from "@akanjs/signal";

interface InjectBuilderOptions<ReturnType> {
  injectionRefName?: string;
  generateFactory?: (options: any) => ReturnType;
  adaptor?: AdaptorCls;
  additionalPropKeys?: string[];
  local?: boolean;
}
export type InjectType = keyof typeof injectionBuilder;

export const INJECT_META_KEY = Symbol("inject");

export class InjectInfo<ReturnType = any, Env extends { [key: string]: any } = never> {
  readonly type: InjectType;
  readonly injectionRefName?: string;
  readonly generateFactory: (options: any) => ReturnType;
  readonly additionalPropKeys: string[];
  readonly local: boolean;
  readonly adaptor?: AdaptorCls;
  constructor(type: InjectType, options: InjectBuilderOptions<ReturnType> = {}) {
    this.type = type;
    this.injectionRefName = options.injectionRefName;
    this.generateFactory = options.generateFactory ?? (() => undefined as ReturnType);
    this.additionalPropKeys = options.additionalPropKeys ?? [];
    this.local = options.local ?? false;
    this.adaptor = options.adaptor;
  }
}

export const injectionBuilder = {
  database: <ReturnType>(additionalPropKeys: string[] = []) =>
    new InjectInfo<ReturnType>("database", { additionalPropKeys }),
  service: <ReturnType extends DefaultServiceMethods>() => new InjectInfo<ReturnType>("service"),
  use: <ReturnType>() => new InjectInfo<ReturnType>("use"),
  signal: <Signal>() => new InjectInfo<Signal>("signal"),
  plug: <Adaptor, GenFactory extends (adaptor: Adaptor) => any = (adaptor: Adaptor) => Adaptor>(
    adaptor: AdaptorCls<Adaptor>,
    generateFactory?: GenFactory
  ) => new InjectInfo<ReturnType<GenFactory>>("plug", { adaptor, generateFactory }),
  env: <GenFactory extends (arg: any) => any>(generateFactory: GenFactory) =>
    new InjectInfo<Awaited<ReturnType<GenFactory>>, GenFactory extends (arg: infer Env) => any ? Env : never>("env", {
      generateFactory,
    }),
  // TODO: Implement memory injection
  memory: <ReturnType, DefaultValue = undefined>(defaultValue?: DefaultValue, { local }: { local?: boolean } = {}) =>
    new InjectInfo<ReturnType | DefaultValue>("memory", {
      generateFactory: () => defaultValue as ReturnType | DefaultValue,
      local,
    }),
};

export type InjectBuilder<BuildType extends InjectType = InjectType> = (
  builder: Pick<typeof injectionBuilder, BuildType>
) => { [key: string]: InjectInfo };

export type ExtractInjectInfoObject<InjectInfoMap extends { [key: string]: InjectInfo }> = {
  [K in keyof InjectInfoMap]: ReturnType<InjectInfoMap[K]["generateFactory"]>;
};
