import { Any, type PromiseOrObject, type Cls, type UnCls } from "@akanjs/base";
import type {
  ConstantFieldTypeInput,
  DocumentModel,
  FieldToValue,
  PlainTypeToFieldType,
} from "@akanjs/constant";
import type { InternalArgCls } from "@akanjs/adaptor";
import type { Job } from "bull";

import type { ArgType, EndpointType, SignalOption } from "./signalDecorators";

type InternalApiType =
  | "resolveField"
  | "interval"
  | "cron"
  | "timeout"
  | "init"
  | "destroy"
  | "process";

interface InternalApiArgProps<Nullable extends boolean = false> {
  nullable?: Nullable;
}

export class InternalApiInfo<
  ReqType extends InternalApiType,
  Srvs extends { [key: string]: any } = { [key: string]: any },
  Args extends any[] = [],
  InternalArgs extends any[] = [],
  DefaultArgs extends any[] = [],
  Returns extends ConstantFieldTypeInput = ConstantFieldTypeInput,
  Nullable extends boolean = false,
> {
  readonly type: ReqType;
  readonly args: {
    type: Extract<ArgType, "Msg">;
    name: string;
    argRef: any;
    option?: InternalApiArgProps<boolean>;
  }[] = [];
  readonly internalArgs: {
    type: InternalArgCls;
    option?: InternalApiArgProps<boolean>;
  }[] = [];
  readonly defaultArgs: string[] = [];
  readonly returnRef: Returns;
  readonly signalOption: SignalOption<Returns, Nullable>;

  execFn:
    | ((...args: [...Args, ...DefaultArgs, ...InternalArgs]) => any)
    | null = null;

  constructor(
    type: ReqType,
    returnRef: Returns,
    signalOption: SignalOption<Returns, Nullable> = {},
  ) {
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
  >(name: string, argRef: Arg, option?: InternalApiArgProps<Nullable>) {
    if (this.execFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable)
      throw new Error("Last argument is nullable");
    this.args.push({ type: "Msg", name, argRef, option });
    return this as unknown as InternalApiInfo<
      ReqType,
      Srvs,
      [
        ...Args,
        arg: _FieldToValue | (Nullable extends true ? undefined : never),
      ],
      InternalArgs,
      DefaultArgs,
      Returns,
      Nullable
    >;
  }
  with<ArgType, Optional extends boolean = false>(
    argType: InternalArgCls<ArgType>,
    option?: InternalApiArgProps<Optional>,
  ) {
    if (this.execFn) throw new Error("Query function is already set");
    this.internalArgs.push({ type: argType, option });
    return this as unknown as InternalApiInfo<
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
      this: {
        [K in keyof Srvs as K extends string
          ? Uncapitalize<K>
          : never]: Srvs[K];
      },
      ...args: [...Args, ...DefaultArgs, ...InternalArgs]
    ) => ReqType extends "process" | "resolveField"
      ? PromiseOrObject<
          | DocumentModel<FieldToValue<Returns>>
          | (Nullable extends true ? null : never)
        >
      : PromiseOrObject<void>,
  ) {
    if (this.execFn) throw new Error("Query function is already set");
    this.execFn = query;
    return this;
  }
  static #typeTempMap: Record<InternalApiType, EndpointType> = {
    resolveField: "ResolveField",
    interval: "Schedule",
    cron: "Schedule",
    timeout: "Schedule",
    init: "Schedule",
    destroy: "Schedule",
    process: "Process",
  };
  // applyApiMeta(sigRef: Cls, key: string) {
  //   if (this.type === "resolveField") {
  //     const metadataMap = getResolveFieldMetaMapOnPrototype(
  //       sigRef.prototype as object,
  //     );
  //     metadataMap.set(key, {
  //       returns: () => this.returnRef as Cls,
  //       argsOption: this.signalOption,
  //       key,
  //       descriptor: {
  //         value: this.execFn,
  //         writable: true,
  //         enumerable: false,
  //         configurable: true,
  //       },
  //     });
  //     (sigRef.prototype as object)[key] = this.execFn;
  //     Reflect.defineMetadata(
  //       "resolveField",
  //       metadataMap,
  //       sigRef.prototype as object,
  //     );
  //   } else {
  //     const metadataMap = getGqlMetaMapOnPrototype(sigRef.prototype as object);
  //     const isEnumValue = isEnum(this.returnRef as Cls);
  //     const internalApiMeta: GqlMeta = {
  //       returns: () =>
  //         isEnumValue
  //           ? ((this.returnRef as EnumInstance).type as Cls)
  //           : (this.returnRef as Cls),
  //       signalOption: this.signalOption,
  //       key,
  //       descriptor: {
  //         value: this.execFn,
  //         writable: true,
  //         enumerable: false,
  //         configurable: true,
  //       },
  //       type: InternalApiInfo.#typeTempMap[this.type],
  //     };
  //     (sigRef.prototype as object)[key] = this.execFn;
  //     metadataMap.set(key, internalApiMeta);
  //     setGqlMetaMapOnPrototype(sigRef.prototype as object, metadataMap);
  //   }
  //   const argMetas: ArgMeta[] = this.args.map((arg, idx) => ({
  //     name: arg.name,
  //     returns: () => arg.argRef as Cls,
  //     argsOption: {
  //       ...arg.option,
  //       enum: isEnum(arg.argRef as Cls)
  //         ? (arg.argRef as EnumInstance)
  //         : undefined,
  //     },
  //     key,
  //     idx,
  //     type: arg.type,
  //   }));
  //   const internalArgMetas: InternalArgMeta[] = this.internalArgs.map(
  //     (arg, idx) => ({
  //       type: arg.type,
  //       key,
  //       idx: this.defaultArgs.length + this.args.length + idx,
  //       option: arg.option,
  //     }),
  //   );
  //   setArgMetas(sigRef, key, argMetas, internalArgMetas);
  // }
}

export const makeInternalApiBuilder = <
  Srvs extends { [key: string]: any } = { [key: string]: any },
  Parent extends DocumentModel<any> = DocumentModel<any>,
>() => ({
  resolveField: <
    Returns extends ConstantFieldTypeInput,
    Nullable extends boolean = false,
  >(
    returnRef: Returns,
    signalOption?: Pick<SignalOption<Returns, Nullable>, "nullable">,
  ) =>
    new InternalApiInfo<
      "resolveField",
      Srvs,
      [],
      [],
      [Parent],
      Returns,
      Nullable
    >("resolveField", returnRef, signalOption),
  interval: <Nullable extends boolean = false>(
    scheduleTime: number,
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) =>
    new InternalApiInfo<"interval", Srvs, [], [], [], typeof Any, Nullable>(
      "interval",
      Any,
      {
        enabled: true,
        lock: true,
        scheduleType: "interval",
        scheduleTime,
        ...signalOption,
      },
    ),
  cron: <Nullable extends boolean = false>(
    scheduleCron: string,
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) =>
    new InternalApiInfo<"cron", Srvs, [], [], [], typeof Any, Nullable>(
      "cron",
      Any,
      {
        enabled: true,
        lock: true,
        scheduleType: "cron",
        scheduleCron,
        ...signalOption,
      },
    ),
  timeout: <Nullable extends boolean = false>(
    timeout: number,
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) =>
    new InternalApiInfo<"timeout", Srvs, [], [], [], typeof Any, Nullable>(
      "timeout",
      Any,
      {
        enabled: true,
        lock: true,
        scheduleType: "timeout",
        scheduleTime: timeout,
        ...signalOption,
      },
    ),
  initialize: <Nullable extends boolean = false>(
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) =>
    new InternalApiInfo<"init", Srvs, [], [], [], typeof Any, Nullable>(
      "init",
      Any,
      {
        enabled: true,
        scheduleType: "init",
        ...signalOption,
      },
    ),
  destroy: <Nullable extends boolean = false>(
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) =>
    new InternalApiInfo<"destroy", Srvs, [], [], [], typeof Any, Nullable>(
      "destroy",
      Any,
      {
        enabled: true,
        lock: true,
        scheduleType: "destroy",
        ...signalOption,
      },
    ),
  process: <
    Returns extends ConstantFieldTypeInput,
    Nullable extends boolean = false,
  >(
    returnRef: Returns,
    signalOption?: SignalOption<Returns, Nullable>,
  ) =>
    new InternalApiInfo<"process", Srvs, [], [], [Job], Returns, Nullable>(
      "process",
      returnRef,
      {
        serverMode: "all",
        ...signalOption,
      },
    ),
});

export type BuildInternalApiSignal<InternalApiInfoMap> = {
  [K in keyof InternalApiInfoMap as InternalApiInfoMap[K] extends InternalApiInfo<
    "process",
    any,
    any,
    any,
    any,
    any,
    any
  >
    ? K
    : never]: InternalApiInfoMap[K] extends InternalApiInfo<
    infer ReqType,
    any,
    infer Args,
    any,
    any,
    infer Returns,
    infer Nullable
  >
    ? (...args: Args) => ReqType extends "process"
        ? Promise<
            (FieldToValue<Returns> | (Nullable extends true ? null : never)) & {
              __Returns__: "Done";
            }
          >
        : never
    : never;
};

export type InternalApiBuilder<
  Srvs extends { [key: string]: Cls } = { [key: string]: Cls },
  Parent extends DocumentModel<any> = DocumentModel<any>,
  _ThisSrvs extends { [key: string]: any } = {
    [K in keyof Srvs as K extends string ? Uncapitalize<K> : never]: UnCls<
      Srvs[K]
    >;
  },
> = (builder: {
  resolveField: <
    Returns extends ConstantFieldTypeInput,
    Nullable extends boolean = false,
  >(
    returnRef: Returns,
    signalOption?: Pick<SignalOption<Returns, Nullable>, "nullable">,
  ) => InternalApiInfo<
    "resolveField",
    _ThisSrvs,
    [],
    [],
    [Parent],
    Returns,
    Nullable
  >;
  interval: <Nullable extends boolean = false>(
    scheduleTime: number,
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) => InternalApiInfo<"interval", _ThisSrvs, [], [], [], typeof Any, Nullable>;
  cron: <Nullable extends boolean = false>(
    scheduleCron: string,
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) => InternalApiInfo<"cron", _ThisSrvs, [], [], [], typeof Any, Nullable>;
  timeout: <Nullable extends boolean = false>(
    timeout: number,
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) => InternalApiInfo<"timeout", _ThisSrvs, [], [], [], typeof Any, Nullable>;
  initialize: <Nullable extends boolean = false>(
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) => InternalApiInfo<"init", _ThisSrvs, [], [], [], typeof Any, Nullable>;
  destroy: <Nullable extends boolean = false>(
    signalOption?: SignalOption<typeof Any, Nullable>,
  ) => InternalApiInfo<"destroy", _ThisSrvs, [], [], [], typeof Any, Nullable>;
  process: <
    Returns extends ConstantFieldTypeInput,
    Nullable extends boolean = false,
  >(
    returnRef: Returns,
    signalOption?: SignalOption<Returns, Nullable>,
  ) => InternalApiInfo<"process", _ThisSrvs, [], [], [Job], Returns, Nullable>;
}) => { [key: string]: InternalApiInfo<any, any, any, any, any, any, any> };
