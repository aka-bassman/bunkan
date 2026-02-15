import type { Dayjs, Any, PromiseOrObject, UnCls, Cls } from "@akanjs/base";
import type {
  ConstantFieldTypeInput,
  DocumentModel,
  FieldToValue,
  ParamFieldType,
  PlainTypeToFieldType,
  PurifiedModel,
} from "@akanjs/constant";
import type { InternalArgCls } from "@akanjs/adaptor";

import type { ArgType, SignalOption } from "./types";
import type { ServiceModule } from "@akanjs/service";

export type EndpointType = "query" | "mutation" | "pubsub" | "message";

export interface EndpointArgProps<Optional extends boolean = false> {
  nullable?: Optional;
  example?: string | number | boolean | Dayjs;
}
export class EndpointInfo<
  ReqType extends EndpointType = EndpointType,
  Srvs extends { [key: string]: any } = { [key: string]: any },
  ArgNames extends string[] = any,
  Args extends any[] = any,
  InternalArgs extends any[] = any,
  ServerArgs extends any[] = any,
  Returns extends ConstantFieldTypeInput = ConstantFieldTypeInput,
  ServerReturns = never,
  Nullable extends boolean = boolean,
> {
  readonly type: ReqType;
  readonly argNames: ArgNames = [] as unknown as ArgNames;
  readonly args: {
    type: ArgType;
    name: string;
    argRef: any;
    option?: EndpointArgProps<boolean>;
  }[] = [];
  readonly internalArgs: {
    type: InternalArgCls;
    option?: EndpointArgProps<boolean>;
  }[] = [];
  readonly returnRef: Returns;
  readonly signalOption: SignalOption<Returns, Nullable, any>;
  execFn: ((...args: [...ServerArgs, ...InternalArgs]) => any) | null = null;

  constructor(type: ReqType, returnRef: Returns, signalOption: SignalOption<Returns, Nullable> = {}) {
    this.type = type;
    this.returnRef = returnRef;
    this.signalOption = signalOption;
  }
  param<
    ArgName extends string,
    Arg extends ParamFieldType,
    _ClientArg = FieldToValue<Arg>,
    _ServerArg = DocumentModel<_ClientArg>,
  >(name: string, argRef: Arg, option?: Omit<EndpointArgProps, "nullable">) {
    if (this.execFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable) throw new Error("Last argument is nullable");
    this.argNames.push(name);
    this.args.push({ type: "param", name, argRef, option });
    return this as unknown as EndpointInfo<
      ReqType,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg: _ClientArg],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg],
      Returns,
      ServerReturns,
      Nullable
    >;
  }
  body<
    ArgName extends string,
    ExplicitType = unknown,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    Optional extends boolean = false,
    _ArgType = unknown extends ExplicitType ? FieldToValue<Arg> : ExplicitType,
    _ClientArg = PurifiedModel<_ArgType>,
    _ServerArg = DocumentModel<_ArgType>,
  >(name: ArgName, argRef: Arg, option?: EndpointArgProps<Optional>) {
    if (this.execFn) throw new Error("Query function is already set");
    this.argNames.push(name);
    this.args.push({ type: "body", name, argRef, option });
    return this as unknown as EndpointInfo<
      ReqType,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg: _ClientArg | (Optional extends true ? null : never)],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg | (Optional extends true ? undefined : never)],
      Returns,
      ServerReturns,
      Nullable
    >;
  }
  room<
    ArgName extends string,
    ExplicitType = unknown,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    _ArgType = unknown extends ExplicitType ? FieldToValue<Arg> : ExplicitType,
    _ClientArg = PurifiedModel<_ArgType>,
    _ServerArg = DocumentModel<_ArgType>,
  >(name: string, argRef: Arg, option?: Omit<EndpointArgProps, "nullable">) {
    if (this.execFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable) throw new Error("Last argument is nullable");
    this.argNames.push(name);
    this.args.push({ type: "room", name, argRef, option });
    return this as unknown as EndpointInfo<
      ReqType,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg: _ClientArg],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg],
      Returns,
      ServerReturns,
      Nullable
    >;
  }
  msg<
    ArgName extends string,
    ExplicitType = unknown,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    Optional extends boolean = false,
    _ArgType = unknown extends ExplicitType ? FieldToValue<Arg> : ExplicitType,
    _ClientArg = PurifiedModel<_ArgType>,
    _ServerArg = DocumentModel<_ArgType>,
  >(name: string, argRef: Arg, option?: EndpointArgProps<Optional>) {
    if (this.execFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable) throw new Error("Last argument is nullable");
    this.argNames.push(name);
    this.args.push({ type: "msg", name, argRef, option });
    return this as unknown as EndpointInfo<
      ReqType,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg: _ClientArg | (Optional extends true ? null : never)],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg | (Optional extends true ? undefined : never)],
      Returns,
      ServerReturns,
      Nullable
    >;
  }
  search<
    ArgName extends string,
    ExplicitType = unknown,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    _ArgType = unknown extends ExplicitType ? FieldToValue<Arg> : ExplicitType,
    _ClientArg = PurifiedModel<_ArgType>,
    _ServerArg = DocumentModel<_ArgType>,
  >(name: string, argRef: Arg, option?: Omit<EndpointArgProps, "nullable">) {
    if (this.execFn) throw new Error("Query function is already set");
    this.argNames.push(name);
    this.args.push({
      type: "query",
      name,
      argRef,
      option: { ...option, nullable: true },
    });
    return this as unknown as EndpointInfo<
      ReqType,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg: _ClientArg | null],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg | undefined],
      Returns,
      ServerReturns,
      Nullable
    >;
  }
  with<ArgType, Optional extends boolean = false>(
    argType: InternalArgCls<ArgType>,
    option?: EndpointArgProps<Optional>
  ) {
    if (this.execFn) throw new Error("Query function is already set");
    this.internalArgs.push({ type: argType, option });
    return this as unknown as EndpointInfo<
      ReqType,
      Srvs,
      ArgNames,
      Args,
      [...InternalArgs, arg: ArgType | (Optional extends true ? null : never)],
      ServerArgs,
      Returns,
      ServerReturns,
      Nullable
    >;
  }
  exec<
    ExecFn extends (
      this: Srvs,
      ...args: [...ServerArgs, ...InternalArgs]
    ) => ReqType extends "pubsub"
      ? Promise<void> | void
      : PromiseOrObject<DocumentModel<FieldToValue<Returns>> | (Nullable extends true ? null | undefined : never)>,
  >(
    execFn: ExecFn
  ): EndpointInfo<ReqType, Srvs, ArgNames, Args, InternalArgs, ServerArgs, Returns, ReturnType<ExecFn>, Nullable> {
    if (this.execFn) throw new Error("Query function is already set");
    this.execFn = execFn;
    return this as unknown as EndpointInfo<
      ReqType,
      Srvs,
      ArgNames,
      Args,
      InternalArgs,
      ServerArgs,
      Returns,
      ReturnType<ExecFn>,
      Nullable
    >;
  }
}

type ApiInfoReturn<
  ReqType extends EndpointType,
  Returns extends ConstantFieldTypeInput,
  ServerReturns,
  Nullable extends boolean,
  _ReturnValue = ReqType extends "pubsub" | "message"
    ? FieldToValue<Returns>
    : Returns extends typeof Any
      ? Awaited<ServerReturns>
      : FieldToValue<Returns>,
> = ReqType extends "query"
  ? Promise<_ReturnValue | (Nullable extends true ? null : never)>
  : ReqType extends "mutation"
    ? Promise<_ReturnValue | (Nullable extends true ? null : never)>
    : ReqType extends "pubsub"
      ? _ReturnValue | (Nullable extends true ? null : never)
      : ReqType extends "message"
        ? _ReturnValue | (Nullable extends true ? null : never)
        : never;
export type BuildApiSignal<ApiInfoMap> = {
  [K in keyof ApiInfoMap]: ApiInfoMap[K] extends EndpointInfo<
    infer ReqType,
    any,
    any,
    infer Args,
    any,
    any,
    infer Returns,
    infer ServerReturns,
    infer Nullable
  >
    ? (...args: Args) => ApiInfoReturn<ReqType, Returns, ServerReturns, Nullable>
    : never;
};

// TODO: signal type 에 따라 기본 internal arg들 배정해주기
// TODO: pubsub은 exec 없어도 되게하기
// TODO: exec 없으면 타입에러 뜨게하기
export type BuildEndpoint<SrvModule extends ServiceModule = ServiceModule> = {
  query: <Returns extends ConstantFieldTypeInput = ConstantFieldTypeInput, Nullable extends boolean = false>(
    returnRef: Returns,
    signalOption?: SignalOption<Returns, Nullable>
  ) => EndpointInfo<"query", SrvModule["srvMap"], [], [], [], [], Returns, never, Nullable>;
  mutation: <Returns extends ConstantFieldTypeInput = ConstantFieldTypeInput, Nullable extends boolean = false>(
    returnRef: Returns,
    signalOption?: SignalOption<Returns, Nullable>
  ) => EndpointInfo<"mutation", SrvModule["srvMap"], [], [], [], [], Returns, never, Nullable>;
  pubsub: <Returns extends ConstantFieldTypeInput = ConstantFieldTypeInput, Nullable extends boolean = false>(
    returnRef: Returns,
    signalOption?: SignalOption<Returns, Nullable>
  ) => EndpointInfo<"pubsub", SrvModule["srvMap"], [], [], [], [], Returns, never, Nullable>;
  message: <Returns extends ConstantFieldTypeInput = ConstantFieldTypeInput, Nullable extends boolean = false>(
    returnRef: Returns,
    signalOption?: SignalOption<Returns, Nullable>
  ) => EndpointInfo<"message", SrvModule["srvMap"], [], [], [], [], Returns, never, Nullable>;
};

export const buildEndpoint = {
  query: (returnRef: Cls, signalOption?: SignalOption<Cls>) => new EndpointInfo("query", returnRef, signalOption),
  mutation: (returnRef: Cls, signalOption?: SignalOption<Cls>) => new EndpointInfo("mutation", returnRef, signalOption),
  pubsub: (returnRef: Cls, signalOption?: SignalOption<Cls>) => new EndpointInfo("pubsub", returnRef, signalOption),
  message: (returnRef: Cls, signalOption?: SignalOption<Cls>) => new EndpointInfo("message", returnRef, signalOption),
} as unknown as BuildEndpoint<any>;

export type EndpointBuilder<SrvModule extends ServiceModule = ServiceModule> = (builder: BuildEndpoint<SrvModule>) => {
  [key: string]: EndpointInfo;
};
