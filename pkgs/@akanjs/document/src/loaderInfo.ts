import type { Cls } from "@akanjs/base";

import type { Loader } from ".";
import type { QueryOf } from "@akanjs/constant";

type LoaderType = "field" | "arrayField" | "query";

export const LOADER_META_KEY = Symbol("loader");

export type ModelCls<Statics = {}, LoaderMap extends { [key: string]: LoaderInfo } = {}> = Cls<
  Statics & ExtractLoaderInfoObject<LoaderMap>,
  { [LOADER_META_KEY]: LoaderMap }
>;
export class LoaderInfo<Doc = any, Key extends keyof Doc = keyof Doc, QueryArg = Doc[Key]> {
  type: LoaderType;
  field: Key | Key[];
  defaultQuery: QueryOf<unknown>;
  queryArg: QueryArg | undefined;
  constructor(type: LoaderType, field: Key | Key[], defaultQuery: QueryOf<unknown> = {}) {
    this.type = type;
    this.field = field;
    this.defaultQuery = defaultQuery;
  }
}

export const makeLoaderBuilder = <Doc>() => ({
  byField: <Key extends keyof Doc & string>(fieldName: Key, defaultQuery: QueryOf<unknown> = {}) =>
    new LoaderInfo<Doc, Key>("field", fieldName, defaultQuery),
  byArrayField: <Key extends keyof Doc & string>(fieldName: Key, defaultQuery: QueryOf<unknown> = {}) =>
    new LoaderInfo<Doc, Key>("arrayField", fieldName, defaultQuery),
  byQuery: <Key extends keyof Doc & string>(queryKeys: readonly Key[], defaultQuery: QueryOf<unknown> = {}) =>
    new LoaderInfo<Doc, Key, Pick<Doc, Key>>("query", queryKeys as Key[], defaultQuery),
});

export type LoaderBuilder<Doc = any> = (builder: ReturnType<typeof makeLoaderBuilder<Doc>>) => {
  [key: string]: LoaderInfo<Doc, any, any>;
};

export type ExtractLoaderInfoObject<LoaderInfoMap extends { [key: string]: LoaderInfo }> = {
  [K in keyof LoaderInfoMap]: LoaderInfoMap[K] extends LoaderInfo<infer Doc, any, infer QueryArg>
    ? Loader<QueryArg, Doc>
    : never;
};

export const getLoaderInfos = (modelRef: ModelCls): { [key: string]: LoaderInfo } => {
  const loaderInfos = modelRef[LOADER_META_KEY];
  if (!loaderInfos) throw new Error(`No loader infos for modelRef: ${modelRef}`);
  return loaderInfos;
};
