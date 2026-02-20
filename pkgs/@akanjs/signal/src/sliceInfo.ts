import { type MergedValues, type PromiseOrObject, type Cls, type UnCls } from "@akanjs/base";
import type {
  BaseInsight,
  BaseObject,
  ConstantFieldTypeInput,
  DocumentModel,
  FieldToValue,
  ParamFieldType,
  PlainTypeToFieldType,
  PurifiedModel,
  QueryOf,
} from "@akanjs/constant";
import type { InternalArgCls } from "./internalArg";

import type { EndpointArgProps } from "./endpointInfo";
import type { ArgType, SignalOption } from "./types";
import type { ServiceModule } from "@akanjs/service";

export class SliceInfo<
  T extends string = string,
  Full = any,
  Light = any,
  Insight = any,
  Srvs extends { [key: string]: any } = { [key: string]: any },
  ArgNames extends string[] = any,
  Args extends any[] = any,
  InternalArgs extends any[] = any,
  ServerArgs extends any[] = any,
> {
  readonly refName: T;
  readonly full: Cls<Full>;
  readonly light: Cls<Light>;
  readonly insight: Cls<Insight>;
  readonly argNames: ArgNames = [] as unknown as ArgNames;
  readonly args: {
    type: ArgType;
    name: string;
    argRef: ConstantFieldTypeInput;
    option?: EndpointArgProps<boolean>;
  }[] = [];
  readonly internalArgs: {
    type: InternalArgCls;
    option?: EndpointArgProps<boolean>;
  }[] = [];
  readonly signalOption: SignalOption;
  execFn: ((...args: [...ServerArgs, ...InternalArgs]) => QueryOf<DocumentModel<Full>>) | null = null;

  constructor(refName: T, full: Cls<Full>, light: Cls<Light>, insight: Cls<Insight>, signalOption: SignalOption = {}) {
    this.refName = refName;
    this.full = full;
    this.light = light;
    this.insight = insight;
    this.signalOption = signalOption;
  }
  param<
    ArgName extends string,
    Arg extends ParamFieldType,
    _ClientArg = FieldToValue<Arg>,
    _ServerArg = DocumentModel<_ClientArg>,
  >(name: ArgName, argRef: Arg, option?: Omit<EndpointArgProps, "nullable">) {
    if (this.execFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable) throw new Error("Last argument is nullable");
    this.argNames.push(name);
    this.args.push({ type: "param", name, argRef, option });
    return this as unknown as SliceInfo<
      T,
      Full,
      Light,
      Insight,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg: _ClientArg],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg]
    >;
  }
  body<
    ArgName extends string,
    ExplicitType = unknown,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    _ArgType = unknown extends ExplicitType ? FieldToValue<Arg> : ExplicitType,
    _ClientArg = PurifiedModel<_ArgType>,
    _ServerArg = DocumentModel<_ArgType>,
  >(name: ArgName, argRef: Arg, option?: EndpointArgProps) {
    if (this.execFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable) throw new Error("Last argument is nullable");
    this.argNames.push(name);
    this.args.push({ type: "body", name, argRef, option });
    return this as unknown as SliceInfo<
      T,
      Full,
      Light,
      Insight,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg: _ClientArg],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg]
    >;
  }
  search<
    ArgName extends string,
    ExplicitType = unknown,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    _ArgType = unknown extends ExplicitType ? FieldToValue<Arg> : ExplicitType,
    _ClientArg = PurifiedModel<_ArgType>,
    _ServerArg = DocumentModel<_ArgType>,
  >(name: ArgName, argRef: Arg, option?: Omit<EndpointArgProps, "nullable">) {
    if (this.execFn) throw new Error("Query function is already set");
    this.argNames.push(name);
    this.args.push({
      type: "query",
      name,
      argRef,
      option: { ...option, nullable: true },
    });
    return this as unknown as SliceInfo<
      T,
      Full,
      Light,
      Insight,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg: _ClientArg | null],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg | undefined]
    >;
  }
  with<ArgType, Optional extends boolean = false>(
    argType: InternalArgCls<ArgType>,
    option?: EndpointArgProps<Optional>
  ) {
    if (this.execFn) throw new Error("Query function is already set");
    this.internalArgs.push({ type: argType, option });
    return this as unknown as SliceInfo<
      T,
      Full,
      Light,
      Insight,
      Srvs,
      ArgNames,
      Args,
      [...InternalArgs, arg: ArgType | (Optional extends true ? null : never)],
      ServerArgs
    >;
  }
  exec(
    query: (
      this: {
        [K in keyof Srvs as K extends string ? Uncapitalize<K> : never]: Srvs[K];
      },
      ...args: [...ServerArgs, ...InternalArgs]
    ) => PromiseOrObject<QueryOf<DocumentModel<Full>>>
  ) {
    if (this.execFn) throw new Error("Query function is already set");
    this.execFn = query;
    return this;
  }
  // applySliceMeta(refName: string, sigRef: Cls, key: string) {
  //   if (!this.execFn) throw new Error("Query function is not set");
  //   const execFn = this.execFn;
  //   const serviceName = `${refName}Service`;
  //   const argLength = this.args.length;
  //   const gqlMetaMap = getGqlMetaMapOnPrototype(sigRef.prototype as object);
  //   const argMetas: ArgMeta[] = this.args.map((arg, idx) => {
  //     const [singleArgRef, argArrDepth] = getNonArrayModel(arg.argRef as Cls);
  //     const isEnumValue = isEnum(singleArgRef);
  //     const returnRef = arraiedModel(
  //       isEnumValue
  //         ? ((singleArgRef as EnumInstance).type as Cls)
  //         : singleArgRef,
  //       argArrDepth,
  //     );
  //     return {
  //       name: arg.name,
  //       returns: () => returnRef as Cls,
  //       argsOption: {
  //         ...arg.option,
  //         enum: isEnumValue ? (arg.argRef as EnumInstance) : undefined,
  //       },
  //       key,
  //       idx,
  //       type: arg.type,
  //     };
  //   });
  //   const skipLimitSortArgMetas: ArgMeta[] = [
  //     {
  //       name: "skip",
  //       returns: () => Int,
  //       argsOption: { nullable: true, example: 0 },
  //       key,
  //       idx: argLength,
  //       type: "Query",
  //     },
  //     {
  //       name: "limit",
  //       returns: () => Int,
  //       argsOption: { nullable: true, example: 20 },
  //       key,
  //       idx: argLength + 1,
  //       type: "Query",
  //     },
  //     {
  //       name: "sort",
  //       returns: () => String,
  //       argsOption: { nullable: true, example: "latest" },
  //       key,
  //       idx: argLength + 2,
  //       type: "Query",
  //     },
  //   ];
  //   const internalArgMetas: InternalArgMeta[] = this.internalArgs.map(
  //     (arg, idx) => ({
  //       type: arg.type,
  //       key,
  //       idx,
  //       option: arg.option,
  //     }),
  //   );

  //   // list
  //   const listKey = `${refName}List${capitalize(key)}`;
  //   const listFn = async function (
  //     this: Srvs & {
  //       __model: DatabaseModel<any, any, DocumentModel<Full>, any, any, any>;
  //     },
  //     ...requestArgs: [
  //       ...ServerArgs,
  //       skip: number,
  //       limit: number,
  //       sort: string,
  //       ...InternalArgs,
  //     ]
  //   ) {
  //     const args = requestArgs.slice(0, argLength);
  //     const skipLimitSort = requestArgs.slice(argLength, argLength + 3);
  //     const [skip = 0, limit = 20, sort = "latest"] = skipLimitSort as [
  //       number,
  //       number,
  //       string,
  //     ];
  //     const internalArgs = requestArgs.slice(argLength + 3);
  //     const query = (await execFn.apply(this, [
  //       ...args,
  //       ...internalArgs,
  //     ])) as QueryOf<DocumentModel<Full>>;
  //     return (await (
  //       this[serviceName] as DatabaseService<any, any, any, any, any, any, any>
  //     ).__list(query, {
  //       skip,
  //       limit,
  //       sort,
  //     })) as unknown as DocumentModel<Full>[];
  //   };
  //   signalInfo.setHandlerKey(listFn, listKey);
  //   (sigRef.prototype as object)[listKey] = listFn;
  //   const listApiMeta: GqlMeta = {
  //     returns: () => [this.full] as unknown as Cls,
  //     signalOption: this.signalOption,
  //     key: listKey,
  //     descriptor: {
  //       value: listFn,
  //       writable: true,
  //       enumerable: false,
  //       configurable: true,
  //     },
  //     type: "Query",
  //   };
  //   gqlMetaMap.set(listKey, listApiMeta);
  //   setArgMetas(
  //     sigRef,
  //     listKey,
  //     [...argMetas, ...skipLimitSortArgMetas],
  //     internalArgMetas.map((argMeta, idx) => ({
  //       ...argMeta,
  //       idx: argLength + 3 + idx,
  //     })),
  //   );

  //   // insight
  //   const insightKey = `${refName}Insight${capitalize(key)}`;
  //   const insightFn = async function (
  //     this: Srvs & {
  //       __model: DatabaseModel<
  //         any,
  //         any,
  //         DocumentModel<Full>,
  //         any,
  //         DocumentModel<Insight>,
  //         any
  //       >;
  //     },
  //     ...requestArgs: [...ServerArgs, ...InternalArgs]
  //   ) {
  //     const args = requestArgs.slice(0, argLength);
  //     const internalArgs = requestArgs.slice(argLength);
  //     const query = (await execFn.apply(this, [
  //       ...args,
  //       ...internalArgs,
  //     ])) as QueryOf<DocumentModel<Full>>;
  //     return (await (
  //       this[serviceName] as DatabaseService<any, any, any, any, any, any, any>
  //     ).__insight(query)) as unknown as DocumentModel<Insight>;
  //   };
  //   signalInfo.setHandlerKey(insightFn, insightKey);
  //   (sigRef.prototype as object)[insightKey] = insightFn;
  //   const insightApiMeta: GqlMeta = {
  //     returns: () => this.insight,
  //     signalOption: this.signalOption,
  //     key: insightKey,
  //     descriptor: {
  //       value: insightFn,
  //       writable: true,
  //       enumerable: false,
  //       configurable: true,
  //     },
  //     type: "Query",
  //   };
  //   gqlMetaMap.set(insightKey, insightApiMeta);
  //   setArgMetas(
  //     sigRef,
  //     insightKey,
  //     argMetas,
  //     internalArgMetas.map((argMeta, idx) => ({
  //       ...argMeta,
  //       idx: argLength + idx,
  //     })),
  //   );
  //   setGqlMetaMapOnPrototype(sigRef.prototype as object, gqlMetaMap);
  // }
}

export const buildSlice =
  <
    T extends string,
    Full extends BaseObject,
    Light extends BaseObject,
    Insight extends BaseInsight,
    SrvModule extends ServiceModule,
  >(
    refName: T,
    full: Cls<Full>,
    light: Cls<Light>,
    insight: Cls<Insight>
  ) =>
  (signalOption?: SignalOption) =>
    new SliceInfo<T, Full, Light, Insight, SrvModule["srvMap"], [], [], [], []>(
      refName,
      full,
      light,
      insight,
      signalOption
    );

export type SliceBuilder<
  SrvModule extends ServiceModule,
  _Full = NonNullable<SrvModule["cnst"]>["full"],
  _Light = NonNullable<SrvModule["cnst"]>["light"],
  _Insight = NonNullable<SrvModule["cnst"]>["insight"],
> = (
  init: (
    signalOption?: SignalOption
  ) => SliceInfo<SrvModule["srv"]["refName"], _Full, _Light, _Insight, SrvModule["srvMap"]>
) => {
  [key: string]: SliceInfo<SrvModule["srv"]["refName"], _Full, _Light, _Insight, SrvModule["srvMap"]>;
};
