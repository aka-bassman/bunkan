import { Any, type PromiseOrObject, type Cls, type UnCls } from "@akanjs/base";
import type { ConstantFieldTypeInput, DocumentModel, FieldToValue, PlainTypeToFieldType } from "@akanjs/constant";
import type { InternalArgCls } from "./internalArg";
import type { Job } from "bullmq";

import type { ArgType, SignalOption } from "./types";
import type { ServiceModule } from "@akanjs/service";
import type { Doc } from "@akanjs/document";
import { EndpointInfo, type ArgInfo } from "./endpointInfo";

type InternalType = "resolveField" | "interval" | "cron" | "timeout" | "init" | "destroy" | "process";

interface InternalArgProps<Nullable extends boolean = false> {
  nullable?: Nullable;
}

export class InternalInfo<
  ReqType extends InternalType = InternalType,
  Srvs extends { [key: string]: any } = { [key: string]: any },
  Args extends any[] = any,
  InternalArgs extends any[] = any,
  DefaultArgs extends any[] = any,
  Returns extends ConstantFieldTypeInput = ConstantFieldTypeInput,
  Nullable extends boolean = boolean,
> {
  readonly type: ReqType;
  readonly args: ArgInfo<InternalArgProps<boolean>>[] = [];
  readonly internalArgs: {
    type: InternalArgCls;
    option?: InternalArgProps<boolean>;
  }[] = [];
  readonly defaultArgs: string[] = [];
  readonly returnRef: Returns;
  readonly signalOption: SignalOption<Returns, Nullable>;

  execFn: ((...args: [...Args, ...DefaultArgs, ...InternalArgs]) => any) | null = null;

  constructor(type: ReqType, returnRef: Returns, signalOption: SignalOption<Returns, Nullable> = {}) {
    this.type = type;
    this.returnRef = returnRef;
    this.signalOption = signalOption;
    if (type === "resolveField") this.defaultArgs.push("Parent");
    else if (type === "process") this.defaultArgs.push("Job");
  }
  msg<
    ExplicitType,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    Nullable extends boolean = false,
    _FieldToValue = FieldToValue<Arg>,
  >(name: string, arg: Arg, option?: InternalArgProps<Nullable>) {
    if (this.execFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable) throw new Error("Last argument is nullable");
    this.args.push(EndpointInfo.getArgInfo("msg", name, arg, option));
    return this as unknown as InternalInfo<
      ReqType,
      Srvs,
      [...Args, arg: _FieldToValue | (Nullable extends true ? undefined : never)],
      InternalArgs,
      DefaultArgs,
      Returns,
      Nullable
    >;
  }
  with<ArgType, Optional extends boolean = false>(
    argType: InternalArgCls<ArgType>,
    option?: InternalArgProps<Optional>
  ) {
    if (this.execFn) throw new Error("Query function is already set");
    this.internalArgs.push({ type: argType, option });
    return this as unknown as InternalInfo<
      ReqType,
      Srvs,
      Args,
      [...InternalArgs, arg: ArgType | (Optional extends true ? null : never)],
      DefaultArgs,
      Returns,
      Nullable
    >;
  }
  exec(
    query: (
      this: Srvs,
      ...args: [...Args, ...DefaultArgs, ...InternalArgs]
    ) => ReqType extends "process" | "resolveField"
      ? PromiseOrObject<DocumentModel<FieldToValue<Returns>> | (Nullable extends true ? null : never)>
      : PromiseOrObject<void>
  ) {
    if (this.execFn) throw new Error("Query function is already set");
    this.execFn = query;
    return this;
  }
}

export type BuildInternal<SrvModule extends ServiceModule, Parent extends DocumentModel<any> = DocumentModel<any>> = {
  resolveField: <Returns extends ConstantFieldTypeInput, Nullable extends boolean = false>(
    returnRef: Returns,
    signalOption?: Pick<SignalOption<Returns, Nullable>, "nullable">
  ) => InternalInfo<"resolveField", SrvModule["srvMap"], [], [], [Parent], Returns, Nullable>;
  interval: <Nullable extends boolean = false>(
    scheduleTime: number,
    signalOption?: SignalOption<typeof Any, Nullable>
  ) => InternalInfo<"interval", SrvModule["srvMap"], [], [], [], typeof Any, Nullable>;
  cron: <Nullable extends boolean = false>(
    scheduleCron: string,
    signalOption?: SignalOption<typeof Any, Nullable>
  ) => InternalInfo<"cron", SrvModule["srvMap"], [], [], [], typeof Any, Nullable>;
  timeout: <Nullable extends boolean = false>(
    timeout: number,
    signalOption?: SignalOption<typeof Any, Nullable>
  ) => InternalInfo<"timeout", SrvModule["srvMap"], [], [], [], typeof Any, Nullable>;
  initialize: <Nullable extends boolean = false>(
    signalOption?: SignalOption<typeof Any, Nullable>
  ) => InternalInfo<"init", SrvModule["srvMap"], [], [], [], typeof Any, Nullable>;
  destroy: <Nullable extends boolean = false>(
    signalOption?: SignalOption<typeof Any, Nullable>
  ) => InternalInfo<"destroy", SrvModule["srvMap"], [], [], [], typeof Any, Nullable>;
  process: <Returns extends ConstantFieldTypeInput, Nullable extends boolean = false>(
    returnRef: Returns,
    signalOption?: SignalOption<Returns, Nullable>
  ) => InternalInfo<"process", SrvModule["srvMap"], [], [], [Job], Returns, Nullable>;
};

export type InternalBuilder<SrvModule extends ServiceModule> = (
  builder: BuildInternal<SrvModule, Doc<NonNullable<SrvModule["cnst"]>["full"]>>
) => { [key: string]: InternalInfo };

export const buildInternal = {
  resolveField: (returnRef: Cls, signalOption?: SignalOption) =>
    new InternalInfo("resolveField", returnRef, signalOption),
  interval: (scheduleTime: number, signalOption?: SignalOption) =>
    new InternalInfo("interval", Any, {
      enabled: true,
      lock: true,
      scheduleType: "interval",
      scheduleTime,
      ...signalOption,
    }),
  cron: (scheduleCron: string, signalOption?: SignalOption) =>
    new InternalInfo("cron", Any, {
      enabled: true,
      lock: true,
      scheduleType: "cron",
      scheduleCron,
      ...signalOption,
    }),
  timeout: (timeout: number, signalOption?: SignalOption) =>
    new InternalInfo("timeout", Any, {
      enabled: true,
      lock: true,
      scheduleType: "timeout",
      scheduleTime: timeout,
      ...signalOption,
    }),
  initialize: (signalOption?: SignalOption) =>
    new InternalInfo("init", Any, {
      enabled: true,
      scheduleType: "init",
      ...signalOption,
    }),
  destroy: (signalOption?: SignalOption) =>
    new InternalInfo("destroy", Any, {
      enabled: true,
      lock: true,
      scheduleType: "destroy",
      ...signalOption,
    }),
  process: (returnRef: Cls, signalOption?: SignalOption) =>
    new InternalInfo("process", returnRef, {
      serverMode: "all",
      ...signalOption,
    }),
} as BuildInternal<any, any>;
