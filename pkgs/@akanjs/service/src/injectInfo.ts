import type { BackendEnv, Cls } from "@akanjs/base";

interface InjectBuilderOptions<ReturnType> {
  generateFactory?: (options: any) => ReturnType;
  additionalPropKeys?: string[];
}
export type InjectType = "database" | "service" | "use" | "env" | "generate" | "member" | "memory" | "signal";

export const INJECT_META_KEY = Symbol("inject");

export class InjectInfo<ReturnType> {
  type: InjectType;
  generateFactory: (options: any) => ReturnType;
  additionalPropKeys: string[];
  constructor(type: InjectType, options: InjectBuilderOptions<ReturnType> = {}) {
    this.type = type;
    this.generateFactory = options.generateFactory ?? (() => undefined as ReturnType);
    this.additionalPropKeys = options.additionalPropKeys ?? [];
  }
}

export const injectionBuilder = {
  database: <ReturnType>(additionalPropKeys: string[] = []) =>
    new InjectInfo<ReturnType>("database", { additionalPropKeys }),
  service: <ReturnType>() => new InjectInfo<ReturnType>("service"),
  use: <ReturnType>() => new InjectInfo<ReturnType>("use"),
  env: <ReturnType>(
    key: string,
    generateFactory: (envValue: string, options: BackendEnv) => ReturnType = (envValue: string) =>
      envValue as ReturnType
  ) =>
    new InjectInfo<ReturnType>("env", {
      generateFactory: (options: BackendEnv) => {
        const envValue = process.env[key];
        if (!envValue) throw new Error(`Environment variable ${key} not found`);
        return generateFactory(envValue, options);
      },
    }),
  envOptional: <ReturnType>(
    key: string,
    generateFactory: (envValue: string | undefined, options: BackendEnv) => ReturnType = (
      envValue: string | undefined
    ) => envValue as ReturnType
  ) =>
    new InjectInfo<ReturnType | undefined>("env", {
      generateFactory: (options: BackendEnv) => {
        const envValue = process.env[key];
        return generateFactory(envValue, options);
      },
    }),
  generate: <ReturnType>(generateFactory: (options: BackendEnv) => ReturnType) =>
    new InjectInfo<ReturnType>("generate", { generateFactory }),
  member: <ReturnType>(initialValue: ReturnType = undefined as ReturnType) =>
    new InjectInfo<ReturnType>("member", {
      generateFactory: () => initialValue,
    }),
  memory: <ReturnType, DefaultValue = undefined>(defaultValue?: DefaultValue) =>
    new InjectInfo<ReturnType | DefaultValue>("memory", {
      generateFactory: () => defaultValue as ReturnType | DefaultValue,
    }),
  signal: <Signal>() => new InjectInfo<Signal>("signal"),
};

export type InjectBuilder<BuildType extends InjectType = InjectType> = (
  builder: Pick<typeof injectionBuilder, BuildType>
) => { [key: string]: InjectInfo<any> };

export type ExtractInjectInfoObject<InjectInfoMap extends { [key: string]: InjectInfo<any> }> = {
  [K in keyof InjectInfoMap]: InjectInfoMap[K] extends InjectInfo<infer ReturnType> ? ReturnType : never;
};
