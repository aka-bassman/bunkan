/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  type Assign,
  baseEnv,
  BaseInsight,
  BaseObject,
  type Dayjs,
  type EnumInstance,
  type Environment,
  getNonArrayModel,
  ID,
  Any,
  type MergeAllTypes,
  type Cls,
  type UnCls,
} from "@akanjs/base";
import { applyMixins, capitalize } from "@akanjs/common";
import { type ConstantCls, type DocumentModel, type PurifiedModel, type QueryOf } from "@akanjs/constant";
import type { Doc, ExtractSort, FilterInstance } from "@akanjs/document";
import { type InternalArgCls } from "@akanjs/adaptor";
import type { EndpointServerSignal, InternalServerSignal, ServiceModule } from "@akanjs/service";

import { BuildSliceSignal, SliceBuilder, SliceInfo, sliceInit } from ".";
import { type EndpointBuilder, EndpointInfo, BuildApiSignal, buildEndpoint } from "./endpointInfo";
import { BuildInternalApiSignal, InternalBuilder, InternalInfo, makeInternalApiBuilder } from "./internalInfo";
import { signalInfo } from "./signalInfo";
import { ENDPOINT_META_KEY, type EndpointCls } from "./endpoint";
import { INTERNAL_META_KEY, type InternalCls } from "./internal";

// export class SignalStorage {}

// export const getAllSignalRefs = () => {
//   const signalNames = Reflect.getOwnMetadataKeys(SignalStorage.prototype) as string[] | undefined;
//   const sigRefs =
//     signalNames?.reduce<Cls[]>((acc, signalName) => [...acc, ...getSignalRefsOnStorage(signalName)], []) ?? [];
//   return sigRefs;
// };
// export const getSignalRefsOnStorage = (refName: string) => {
//   const sigRefs = Reflect.getMetadata(refName, SignalStorage.prototype) as Cls[] | undefined;
//   return sigRefs ?? [];
// };

// export const setSignalRefOnStorage = (refName: string, signalRef: Cls) => {
//   Reflect.defineMetadata(refName, [...getSignalRefsOnStorage(refName), signalRef], SignalStorage.prototype);
// };

// export type Resolve<T> = T;
// export const resolve = <T>(data: any): Resolve<T> => data as Resolve<T>;
// export const emit = <T>(data: any): Resolve<T> & { __Returns__: "Emit" } =>
//   data as Resolve<T> & { __Returns__: "Emit" };
// export const done = <T>(data: any): Resolve<T> & { __Returns__: "Done" } =>
//   data as Resolve<T> & { __Returns__: "Done" };
// export const subscribe = <T>(): Resolve<T> & { __Returns__: "Subscribe" } =>
//   undefined as unknown as Resolve<T> & { __Returns__: "Subscribe" };

// export interface ResolveFieldMeta {
//   returns: GqlReturn;
//   argsOption: ArgsOption;
//   key: string;
//   descriptor: PropertyDescriptor;
// }

// export const signalTypes = ["graphql", "restapi"] as const;
// export type SignalType = (typeof signalTypes)[number];

// export const endpointTypes = ["Query", "Mutation", "Message", "Pubsub", "Process", "Schedule", "ResolveField"] as const;
// export type EndpointType = (typeof endpointTypes)[number];

// export interface GqlMeta {
//   returns: (of?: any) => Cls;
//   signalOption: SignalOption<any, boolean, any>;
//   key: string;
//   descriptor: PropertyDescriptor;
//   type: EndpointType;
// }
// export interface ArgsOption {
//   nullable?: boolean;
//   example?: string | number | boolean | Dayjs;
//   enum?: EnumInstance;
// }
// export interface ArgMeta {
//   name: string;
//   returns: GqlReturn;
//   argsOption: ArgsOption;
//   key: string;
//   idx: number;
//   type: ArgType;
// }
// export interface InternalArgMeta {
//   key: string;
//   idx: number;
//   type: InternalArgCls;
//   option?: { nullable?: boolean };
// }
export interface SliceMeta {
  refName: string;
  sliceName: string;
  argLength: number;
  defaultArgs: any[];
}

export const getDefaultArg = (argRef: Cls | Cls[]) => {
  const [modelRef, arrDepth] = getNonArrayModel(argRef);
  if (arrDepth) return [];
  const scalarArg = scalarArgMap.get(modelRef) as object | undefined;
  if (scalarArg) return scalarArg;
  else return {};
};
// export interface SignalMeta {
//   refName: string;
//   slices: SliceMeta[];
//   returns?: (of?: any) => ConstantCls;
//   prefix?: string;
//   enabled: boolean;
// }

// export const mergeSignals = <Endpoint, Internal, Slice>(
//   endpointRef: Cls<Endpoint>,
//   internalRef: Cls<Internal>,
//   sliceRef?: Cls<Slice>,
// ): Cls<
//   BuildApiSignal<Endpoint> &
//     BuildInternalApiSignal<Internal> &
//     BuildSliceSignal<Slice>
// > => {
//   applyMixins(endpointRef, [internalRef]);
//   const gqlMetaMap = getGqlMetaMapOnPrototype(endpointRef.prototype as object);
//   const resolveFieldMetaMap = getResolveFieldMetaMapOnPrototype(
//     endpointRef.prototype as object,
//   );
//   setResolveFieldMetaMapOnPrototype(
//     endpointRef.prototype as object,
//     resolveFieldMetaMap,
//   );

//   const internalGqlMetaMap = getGqlMetaMapOnPrototype(
//     internalRef.prototype as object,
//   );
//   const internalResolveFieldMetaMap = getResolveFieldMetaMapOnPrototype(
//     internalRef.prototype as object,
//   );
//   internalGqlMetaMap.forEach((value, key) => {
//     gqlMetaMap.set(key, value);
//     const [argMetas, internalArgMetas] = getArgMetas(internalRef, key);
//     setArgMetas(endpointRef, key, argMetas, internalArgMetas);
//   });
//   internalResolveFieldMetaMap.forEach((value, key) => {
//     resolveFieldMetaMap.set(key, value);
//     const [argMetas, internalArgMetas] = getArgMetas(internalRef, key);
//     setArgMetas(endpointRef, key, argMetas, internalArgMetas);
//   });
//   if (sliceRef) {
//     const sliceGqlMetaMap = getGqlMetaMapOnPrototype(
//       sliceRef.prototype as object,
//     );
//     applyMixins(endpointRef, [sliceRef], new Set([...gqlMetaMap.keys()])); // avoid redefined in signal
//     sliceGqlMetaMap.forEach((value, key) => {
//       if (gqlMetaMap.has(key)) return; // redefined in signal
//       gqlMetaMap.set(key, value);
//       const [argMetas, internalArgMetas] = getArgMetas(sliceRef, key);
//       setArgMetas(endpointRef, key, argMetas, internalArgMetas);
//     });
//   }
//   setGqlMetaMapOnPrototype(endpointRef.prototype as object, gqlMetaMap);
//   return endpointRef as any;
// };

// export type DefaultSignal<
//   T extends string,
//   Input,
//   Full,
//   Light,
//   Insight,
//   Filter extends FilterInstance,
//   _CapitalizedT extends string = Capitalize<T>,
//   _PurifiedInput = PurifiedModel<Input>,
//   _QueryOfDoc = QueryOf<DocumentModel<Full>>,
//   _Sort = ExtractSort<Filter>,
// > = {
//   [K in T]: (id: string) => Promise<Full>;
// } & {
//   [K in `light${_CapitalizedT}`]: (id: string) => Promise<Light>;
// } & {
//   [K in `${T}List`]: (
//     ...args: [
//       query: _QueryOfDoc,
//       skip: number | null,
//       limit: number | null,
//       sort: _Sort | null,
//     ]
//   ) => Promise<Full[]>;
// } & {
//   [K in `${T}Insight`]: (query: _QueryOfDoc) => Promise<Insight>;
// } & {
//   [K in `create${_CapitalizedT}`]: (data: _PurifiedInput) => Promise<Full>;
// } & {
//   [K in `update${_CapitalizedT}`]: (
//     id: string,
//     data: _PurifiedInput,
//   ) => Promise<Full>;
// } & {
//   [K in `remove${_CapitalizedT}`]: (id: string) => Promise<Full>;
// };

// export const getSigMeta = (sigRef: Cls): SignalMeta => {
//   const sigMeta = Reflect.getMetadata("signal", sigRef.prototype as object) as
//     | SignalMeta
//     | undefined;
//   if (!sigMeta) throw new Error(`No SignalMeta found for ${sigRef.name}`);
//   return sigMeta;
// };
// export const setSigMeta = (sigRef: Cls, sigMeta: SignalMeta) => {
//   Reflect.defineMetadata("signal", sigMeta, sigRef.prototype as object);
// };

// export const getGqlMeta = (sigRef: Cls, key: string): GqlMeta => {
//   const gqlMetaMap = Reflect.getMetadata("gql", sigRef.prototype as object) as
//     | Map<string, GqlMeta>
//     | undefined;
//   if (!gqlMetaMap) throw new Error(`No GqlMeta found for ${sigRef.name}`);
//   const gqlMeta = gqlMetaMap.get(key);
//   if (!gqlMeta) throw new Error(`No GqlMeta found for ${key}`);
//   return gqlMeta;
// };
// export const getGqlMetaMapOnPrototype = (
//   prototype: object,
// ): Map<string, GqlMeta> => {
//   const gqlMetaMap = Reflect.getMetadata("gql", prototype) as
//     | Map<string, GqlMeta>
//     | undefined;
//   return gqlMetaMap ?? new Map<string, GqlMeta>();
// };
// export const getGqlMetas = (sigRef: Cls): GqlMeta[] => {
//   const gqlMetaMap = Reflect.getMetadata("gql", sigRef.prototype as object) as
//     | Map<string, GqlMeta>
//     | undefined;
//   return gqlMetaMap ? [...gqlMetaMap.values()] : [];
// };
// export const setGqlMetaMapOnPrototype = (
//   prototype: object,
//   gqlMetaMap: Map<string, GqlMeta>,
// ) => {
//   Reflect.defineMetadata("gql", gqlMetaMap, prototype);
// };
// export const getArgMetas = (
//   sigRef: Cls,
//   key: string,
// ): [ArgMeta[], InternalArgMeta[]] => {
//   const metas =
//     (Reflect.getMetadata("args", sigRef.prototype as object, key) as
//       | (ArgMeta | InternalArgMeta)[]
//       | undefined) ?? [];
//   const argMetas = metas.filter(
//     (meta) => !!(meta as unknown as { returns?: any }).returns,
//   ) as ArgMeta[];
//   const internalArgMetas = metas.filter(
//     (meta) => !(meta as unknown as { returns?: any }).returns,
//   ) as InternalArgMeta[];
//   return [argMetas, internalArgMetas];
// };
// const getArgMetasOnPrototype = (
//   prototype: object,
//   key: string,
// ): (ArgMeta | InternalArgMeta)[] => {
//   return (
//     (Reflect.getMetadata("args", prototype, key) as
//       | (ArgMeta | InternalArgMeta)[]
//       | undefined) ?? []
//   );
// };
// export const setArgMetas = (
//   sigRef: Cls,
//   key: string,
//   argMetas: ArgMeta[],
//   internalArgMetas: InternalArgMeta[],
// ) => {
//   Reflect.defineMetadata(
//     "args",
//     [...argMetas, ...internalArgMetas],
//     sigRef.prototype as object,
//     key,
//   );
// };
// const setArgMetasOnPrototype = (
//   prototype: object,
//   key: string,
//   argMetas: (ArgMeta | InternalArgMeta)[],
// ) => {
//   Reflect.defineMetadata("args", argMetas, prototype, key);
// };
// export const getResolveFieldMetaMapOnPrototype = (
//   prototype: object,
// ): Map<string, ResolveFieldMeta> => {
//   const resolveFieldMetaMap = Reflect.getMetadata("resolveField", prototype) as
//     | Map<string, ResolveFieldMeta>
//     | undefined;
//   return resolveFieldMetaMap ?? new Map<string, ResolveFieldMeta>();
// };
// export const getResolveFieldMetas = (sigRef: Cls): ResolveFieldMeta[] => {
//   const resolveFieldMetaMap = Reflect.getMetadata(
//     "resolveField",
//     sigRef.prototype as object,
//   ) as Map<string, ResolveFieldMeta> | undefined;
//   return resolveFieldMetaMap ? [...resolveFieldMetaMap.values()] : [];
// };
// const setResolveFieldMetaMapOnPrototype = (
//   prototype: object,
//   resolveFieldMetaMap: Map<string, ResolveFieldMeta>,
// ) => {
//   Reflect.defineMetadata("resolveField", resolveFieldMetaMap, prototype);
// };

// export const getControllerPrefix = (sigMeta: SignalMeta) => {
//   return sigMeta.returns
//     ? constantInfo.getRefName(sigMeta.returns())
//     : sigMeta.prefix;
// };

export const getControllerPath = (gqlMeta: GqlMeta, paramArgMetas: ArgMeta[]) => {
  return (
    gqlMeta.signalOption.path ??
    [gqlMeta.signalOption.name ?? gqlMeta.key, ...paramArgMetas.map((argMeta) => `:${argMeta.name}`)].join("/")
  );
};

// export const copySignal = (sigRef: Cls) => {
//   class CopiedSignal {}
//   applyMixins(CopiedSignal, [sigRef]);

//   const sigMeta = getSigMeta(sigRef);
//   setSigMeta(CopiedSignal, sigMeta);

//   const gqlMetaMap = getGqlMetaMapOnPrototype(sigRef.prototype as object);
//   setGqlMetaMapOnPrototype(CopiedSignal.prototype, new Map(gqlMetaMap));

//   const resolveFieldMetaMap = getResolveFieldMetaMapOnPrototype(
//     sigRef.prototype as object,
//   );
//   setResolveFieldMetaMapOnPrototype(
//     CopiedSignal.prototype,
//     new Map(resolveFieldMetaMap),
//   );
//   for (const endpointMeta of [
//     ...gqlMetaMap.values(),
//     ...resolveFieldMetaMap.values(),
//   ]) {
//     const argMetas = getArgMetasOnPrototype(
//       sigRef.prototype as object,
//       endpointMeta.key,
//     );
//     setArgMetasOnPrototype(CopiedSignal.prototype, endpointMeta.key, [
//       ...argMetas,
//     ]);

//     const paramtypes = Reflect.getMetadata(
//       "design:paramtypes",
//       sigRef.prototype as object,
//       endpointMeta.key,
//     ) as object[] | undefined;
//     //! 임시 적용 테스트
//     const argParamtypes = argMetas
//       .filter((argMeta) => !!(argMeta as unknown as { returns: any }).returns)
//       .map((argMeta: ArgMeta) => Object);
//     Reflect.defineMetadata(
//       "design:paramtypes",
//       paramtypes ?? argParamtypes,
//       CopiedSignal.prototype,
//       endpointMeta.key,
//     );
//     Reflect.defineMetadata(
//       "design:paramtypes",
//       paramtypes ?? argParamtypes,
//       CopiedSignal.prototype,
//       endpointMeta.key,
//     );
//   }

//   return CopiedSignal;
// };
