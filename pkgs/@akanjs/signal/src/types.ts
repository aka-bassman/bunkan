import { baseEnv, type Cls, type Environment, type UnCls } from "@akanjs/base";
import type { Guard } from "@akanjs/adaptor";

export const argTypes = ["body", "param", "query", "upload", "msg", "room"] as const;
export type ArgType = (typeof argTypes)[number];

interface InitOption {
  serverMode?: "federation" | "batch" | "all";
  operationMode?: ("cloud" | "edge" | "local" | (string & {}))[];
  enabled?: boolean;
}

interface TimerOption {
  serverMode?: "federation" | "batch" | "all";
  operationMode?: ("cloud" | "edge" | "local" | (string & {}))[];
  lock?: boolean;
  enabled?: boolean;
}

export interface SignalOption<Response = any, Nullable extends boolean = false, _Key = keyof UnCls<Response>>
  extends InitOption, TimerOption {
  nullable?: Nullable;
  name?: string;
  default?: boolean;
  path?: string;
  serverMode?: "federation" | "batch" | "all";
  timeout?: number;
  partial?: _Key[] | readonly _Key[];
  cache?: number;
  guards?: Cls<Guard>[];

  // * ==================== Schedule ==================== * //
  scheduleType?: "init" | "destroy" | "cron" | "interval" | "timeout";
  scheduleCron?: string;
  scheduleTime?: number;
  lock?: boolean;
  enabled?: boolean;
  // * ==================== Schedule ==================== * //
}

export type Account<AddData = unknown> = {
  appName: string;
  environment: Environment;
} & AddData;
export const defaultAccount: Account = {
  appName: baseEnv.appName,
  environment: baseEnv.environment,
};
