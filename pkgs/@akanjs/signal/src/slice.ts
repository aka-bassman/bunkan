import type { Guard } from "@akanjs/adaptor";
import { Any, type Assign, type Cls, type MergeAllKeyOfObjects } from "@akanjs/base";
import type { DocumentModel, QueryOf } from "@akanjs/constant";
import { buildSlice, type SliceBuilder, type SliceInfo } from "./sliceInfo";
import type { ServiceModule } from "@akanjs/service";

export const SLICE_META_KEY = Symbol("slice");
export type SliceCls<
  SrvModule extends ServiceModule = ServiceModule,
  SliceInfoObj extends { [key: string]: SliceInfo<any, any, any, any, any, any, any, any, any> } = {
    [key: string]: SliceInfo<any, any, any, any, any, any, any, any, any>;
  },
> = Cls<
  any,
  {
    refName: SrvModule["refName"];
    srv: SrvModule;
    [SLICE_META_KEY]: SliceInfoObj;
    getGuards: Guard[];
    cruGuards: Guard[];
  }
>;

interface RootSliceOption {
  guards?: {
    root?: Cls<Guard> | Cls<Guard>[];
    get?: Cls<Guard> | Cls<Guard>[];
    cru?: Cls<Guard> | Cls<Guard>[];
  };
  prefix?: string;
}

type ExtendSliceInfoObj<
  SrvModule extends ServiceModule,
  LibSlices extends SliceCls[],
  _Full = NonNullable<SrvModule["cnst"]>["full"],
  _Light = NonNullable<SrvModule["cnst"]>["light"],
  _Insight = NonNullable<SrvModule["cnst"]>["insight"],
  _Merged = MergeAllKeyOfObjects<LibSlices, typeof SLICE_META_KEY>,
> = {
  [K in keyof _Merged]: _Merged[K] extends SliceInfo<
    any,
    any,
    any,
    any,
    infer Srvs,
    infer ArgNames,
    infer Args,
    infer InternalArgs,
    infer ServerArgs
  >
    ? SliceInfo<SrvModule["refName"], _Full, _Light, _Insight, Srvs, ArgNames, Args, InternalArgs, ServerArgs>
    : never;
};

export function slice<
  SrvModule extends ServiceModule,
  BuildSlice extends SliceBuilder<SrvModule>,
  LibSlices extends SliceCls[],
  _Full = NonNullable<SrvModule["cnst"]>["full"],
  _Light = NonNullable<SrvModule["cnst"]>["light"],
  _Insight = NonNullable<SrvModule["cnst"]>["insight"],
  _Query = QueryOf<DocumentModel<_Full>>,
>(
  srv: SrvModule,
  option: RootSliceOption,
  sliceBuilder: BuildSlice,
  ...libSlices: LibSlices
): SliceCls<
  SrvModule,
  Assign<
    ReturnType<BuildSlice>,
    LibSlices extends []
      ? {
          [""]: SliceInfo<
            SrvModule["refName"],
            _Full,
            _Light,
            _Insight,
            SrvModule["srvMap"],
            ["query"],
            [_Query],
            [],
            [_Query]
          >;
        }
      : ExtendSliceInfoObj<SrvModule, LibSlices>
  >
> {
  if (!srv.cnst) throw new Error("cnst is required");
  const init = buildSlice(srv.refName, srv.cnst.full, srv.cnst.light, srv.cnst.insight);
  const rootGuards = option.guards?.root
    ? Array.isArray(option.guards.root)
      ? option.guards.root
      : [option.guards.root]
    : [];
  const getGuards = option.guards?.get
    ? Array.isArray(option.guards.get)
      ? option.guards.get
      : [option.guards.get]
    : [];
  const cruGuards = option.guards?.cru
    ? Array.isArray(option.guards.cru)
      ? option.guards.cru
      : [option.guards.cru]
    : [];
  const sigRef =
    libSlices.at(0) ??
    class Slice {
      static refName = srv.refName;
      static srv = srv;
      static [SLICE_META_KEY] = {};
    };

  Object.assign(
    sigRef[SLICE_META_KEY],
    {
      [""]: init({ guards: rootGuards })
        .search<"query", object>("query", Any)
        .exec(function (query) {
          return query ?? {};
        }),
    },
    sliceBuilder(init)
  );
  Object.assign(sigRef.srv.srvMap, srv.srvMap);
  Object.assign(sigRef, { getGuards, cruGuards });

  //   TODO: Implement
  //   signalInfo.setRefNameTemp(sigRef, srv.refName);
  //   const [modelName, className] = [
  //     srv.cnst.refName,
  //     capitalize(srv.cnst.refName),
  //   ];
  //   const names = {
  //     modelId: `${modelName}Id`,
  //     model: modelName,
  //     lightModel: `light${className}`,
  //     modelService: `${modelName}Service`,
  //     getModel: `get${className}`,
  //     createModel: `create${className}`,
  //     updateModel: `update${className}`,
  //     removeModel: `remove${className}`,
  //   };
  //   const rootGuards = option.guards?.root
  //     ? Array.isArray(option.guards.root)
  //       ? option.guards.root
  //       : [option.guards.root]
  //     : [];
  //   const getGuards = option.guards?.get
  //     ? Array.isArray(option.guards.get)
  //       ? option.guards.get
  //       : [option.guards.get]
  //     : [];
  //   const cruGuards = option.guards?.cru
  //     ? Array.isArray(option.guards.cru)
  //       ? option.guards.cru
  //       : [option.guards.cru]
  //     : [];
  //   const init = sliceInit(
  //     modelName as T,
  //     srv.cnst.full,
  //     srv.cnst.light,
  //     srv.cnst.insight,
  //   );
  //   const { query, mutation } = makeApiBuilder();
  //   const buildSlice: {
  //     [key: string]: SliceInfo<any, any, any, any, any, any, any, any>;
  //   } = {
  //     ...(rootGuards.length > 0
  //       ? {
  //           [""]: init({ guards: rootGuards })
  //             .search<"query", object>("query", Any)
  //             .exec(function (query) {
  //               return query ?? {};
  //             }),
  //         }
  //       : {}),
  //     ...sliceBuilder(init),
  //   };
  //   const buildEndpoint = {
  //     ...(getGuards.length > 0
  //       ? {
  //           [names.model]: query(srv.cnst.full, { guards: getGuards })
  //             .param(names.modelId, ID)
  //             .exec(async function (modelId) {
  //               const service = this[names.modelService] as object;
  //               return await (
  //                 service[names.getModel] as (id: string) => Promise<any>
  //               )(modelId);
  //             }),
  //           [names.lightModel]: query(srv.cnst.light, { guards: getGuards })
  //             .param(names.modelId, ID)
  //             .exec(async function (modelId) {
  //               const service = this[names.modelService] as object;
  //               return await (
  //                 service[names.getModel] as (id: string) => Promise<any>
  //               )(modelId);
  //             }),
  //         }
  //       : {}),
  //     ...(cruGuards.length > 0
  //       ? {
  //           [names.createModel]: mutation(srv.cnst.full, { guards: cruGuards })
  //             .body("data", srv.cnst.input)
  //             .exec(async function (data) {
  //               const service = this[names.modelService] as object;
  //               return await (
  //                 service[names.createModel] as (data: any) => Promise<any>
  //               )(data);
  //             }),
  //           [names.updateModel]: mutation(srv.cnst.full, { guards: cruGuards })
  //             .param(names.modelId, ID)
  //             .body("data", srv.cnst.input)
  //             .exec(async function (modelId, data) {
  //               const service = this[names.modelService] as object;
  //               return await (
  //                 service[names.updateModel] as (
  //                   id: string,
  //                   data: any,
  //                 ) => Promise<any>
  //               )(modelId, data);
  //             }),
  //           [names.removeModel]: mutation(srv.cnst.full, {
  //             partial: ["removedAt"],
  //             guards: cruGuards,
  //           })
  //             .param(names.modelId, ID)
  //             .exec(async function (modelId) {
  //               const service = this[names.modelService] as object;
  //               return await (
  //                 service[names.removeModel] as (id: string) => Promise<any>
  //               )(modelId);
  //             }),
  //         }
  //       : {}),
  //   };
  //   Object.entries(buildSlice).forEach(([key, slice]) => {
  //     if (!srv.cnst) return;
  //     slice.applySliceMeta(srv.cnst.refName, sigRef, key);
  //   });
  //   Object.entries(buildEndpoint).forEach(([key, endpoint]) => {
  //     endpoint.applyApiMeta(sigRef, key);
  //   });
  return sigRef as any;
}

// type SliceToEndpoint<
//   T extends string,
//   Full extends BaseObject,
//   Insight extends BaseInsight,
//   Args extends any[],
//   Suffix extends string,
//   _CapitalizedSuffix extends string = Capitalize<Suffix>,
// > = {
//   [K in `${T}List${_CapitalizedSuffix}`]: (
//     ...args: [...Args, skip: number | null, limit: number | null, sort: string | null]
//   ) => Promise<Full[]>;
// } & {
//   [K in `${T}Insight${_CapitalizedSuffix}`]: (...args: Args) => Promise<Insight>;
// };

// export type BuildSliceSignal<SliceInfoMap> = MergedValues<{
//   [K in keyof SliceInfoMap]: SliceInfoMap[K] extends SliceInfo<
//     infer T,
//     infer Full,
//     any,
//     infer Insight,
//     any,
//     any,
//     infer Args,
//     any,
//     any
//   >
//     ? SliceToEndpoint<T, Full, Insight, Args, K & string>
//     : never;
// }>;
