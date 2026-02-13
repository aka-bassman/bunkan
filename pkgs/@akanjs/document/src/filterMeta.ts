import {
  type BaseObject,
  getNonArrayModel,
  type MergeAllKeyOfTypes,
  type Cls,
  type MergeAllDoubleKeyOfObjects,
} from "@akanjs/base";
import { applyMixins } from "@akanjs/common";
import type {
  ConstantFieldTypeInput,
  DocumentModel,
  FieldToValue,
  PlainTypeToFieldType,
  QueryOf,
} from "@akanjs/constant";

import type { ConstantFilterMeta } from "./types";

export const FILTER_META_KEY = Symbol("filter");

export const isFilterModel = (filterRef: Cls<any, { [FILTER_META_KEY]?: ConstantFilterMeta }>): boolean => {
  return filterRef[FILTER_META_KEY] !== undefined;
};
export const getFilterMeta = <AllowEmpty extends boolean = false>(
  filterRef: Cls<any, { [FILTER_META_KEY]?: ConstantFilterMeta }> | FilterCls,
  { allowEmpty = false as AllowEmpty }: { allowEmpty?: AllowEmpty } = {}
): AllowEmpty extends true ? ConstantFilterMeta | undefined : ConstantFilterMeta => {
  const filterMeta = filterRef[FILTER_META_KEY];
  if (!filterMeta && !allowEmpty) throw new Error("filterMeta is not defined");
  return filterMeta as AllowEmpty extends true ? ConstantFilterMeta | undefined : ConstantFilterMeta;
};
export const setFilterMeta = (
  filterRef: Cls<any, { [FILTER_META_KEY]?: ConstantFilterMeta }>,
  filterMeta: ConstantFilterMeta,
  ...libFilterMetas: ConstantFilterMeta[]
) => {
  const existingFilterMeta = getFilterMeta(filterRef, { allowEmpty: true });
  if (existingFilterMeta)
    Object.assign(existingFilterMeta, {
      ...filterMeta,
      query: Object.assign(
        existingFilterMeta.query,
        ...libFilterMetas.map((libFilterMeta) => libFilterMeta.query),
        filterMeta.query
      ),
      sort: Object.assign(
        existingFilterMeta.sort,
        ...libFilterMetas.map((libFilterMeta) => libFilterMeta.sort),
        filterMeta.sort
      ),
    });
  else
    Object.assign(filterRef, {
      [FILTER_META_KEY]: {
        query: Object.assign({}, ...libFilterMetas.map((libFilterMeta) => libFilterMeta.query), filterMeta.query),
        sort: Object.assign({}, ...libFilterMetas.map((libFilterMeta) => libFilterMeta.sort), filterMeta.sort),
      },
    });
};
export const getFilterInfoByKey = <ArgNames extends string[] = [], Args extends any[] = any[], Model = any>(
  modelRef: FilterCls,
  key: string
): FilterInfo<ArgNames, Args, Model> => {
  const filterMeta = getFilterMeta(modelRef as Cls<any, { [FILTER_META_KEY]?: ConstantFilterMeta }>);
  const queryMeta = filterMeta.query[key];
  if (!queryMeta) throw new Error(`queryMeta is not defined for key: ${key}`);
  return queryMeta;
};
export const setFilterInfoByKey = <ArgNames extends string[] = [], Args extends any[] = any[], Model = any>(
  modelRef: Cls<Model>,
  key: string,
  filterInfo: FilterInfo<ArgNames, Args, Model>
) => {
  const filterMeta = getFilterMeta(modelRef);
  Object.assign(filterMeta.query, { [key]: filterInfo });
};
export const getFilterSortByKey = (modelRef: FilterCls, key: string) => {
  const filterMeta = getFilterMeta(modelRef as Cls<any, { [FILTER_META_KEY]?: ConstantFilterMeta }>);
  return filterMeta.sort[key];
};

export type BaseFilterSortKey = "latest" | "oldest";
export type BaseFilterQueryKey = "any";
export type BaseFilterKey = BaseFilterSortKey | BaseFilterQueryKey;

export interface FilterInstance<
  Query extends { [key: string]: FilterInfo<any, any, any> } = {},
  Sort extends { [key: string]: any } = {},
> {
  query: Query;
  sort: Sort;
}
interface BaseQuery<Model> {
  any: FilterInfo<[], [], Model>;
}
interface BaseSort {
  latest: { createdAt: -1 };
  oldest: { createdAt: 1 };
}

export type ExtractQuery<Filter extends FilterInstance> = {
  [K in keyof Filter["query"]]: Filter["query"][K] extends FilterInfo<any, infer Args>
    ? (...args: Args) => QueryOf<any>
    : never;
};
export type ExtractSort<Filter extends FilterInstance> = keyof Filter["sort"];
export interface FilterCls<Filter extends FilterInstance = any> {
  [FILTER_META_KEY]: Filter;
}

export const from = <
  Full extends BaseObject,
  BuildFilter extends (filter: () => FilterInfo<[], [], Full>) => FilterInstance,
  LibFilters extends Cls[],
  _Filter extends ReturnType<BuildFilter>,
>(
  modelRef: Cls<Full>,
  buildFilter: BuildFilter,
  ...libFilterRefs: LibFilters
) => {
  class Base {}
  const querySort = buildFilter(filter);
  setFilterMeta(
    Base,
    {
      query: {
        any: filter().query(() => ({ removedAt: { $exists: false } })),
        ...querySort.query,
      },
      sort: Object.assign({ latest: { createdAt: -1 }, oldest: { createdAt: 1 } }, querySort.sort),
    },
    ...libFilterRefs.map((libFilterRef) => getFilterMeta(libFilterRef))
  );
  return Base as unknown as Cls<
    any,
    {
      [FILTER_META_KEY]: {
        query: BaseQuery<Full> &
          MergeAllDoubleKeyOfObjects<LibFilters, typeof FILTER_META_KEY, "query"> &
          _Filter["query"];
        sort: BaseSort & MergeAllKeyOfTypes<LibFilters, "sort"> & _Filter["sort"];
      };
    }
  >;
};

interface ArgProps<Value = any> {
  nullable?: boolean;
  ref?: string;
  default?: Value;
  renderOption?: (arg: any) => string;
}
export class FilterInfo<ArgNames extends string[] = [], Args extends any[] = [], Model = any> {
  readonly argNames: ArgNames = [] as unknown as ArgNames;
  readonly args: { name: string; argRef: any; option?: ArgProps }[];
  queryFn: ((...args: Args) => QueryOf<Model>) | null = null;

  constructor() {
    this.args = [];
  }
  arg<
    ExplicitType,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    ArgName extends string = "unknown",
    _FieldToValue = DocumentModel<FieldToValue<Arg>>,
  >(name: ArgName, argRef: Arg, option?: Omit<ArgProps<_FieldToValue>, "nullable">) {
    if (this.queryFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable) throw new Error("Last argument is nullable");
    this.argNames.push(name);
    this.args.push({ name, argRef, option });
    return this as unknown as FilterInfo<[...ArgNames, ArgName], [...Args, arg: _FieldToValue], Model>;
  }
  opt<
    ExplicitType,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    ArgName extends string = "unknown",
    _FieldToValue = DocumentModel<FieldToValue<Arg>>,
  >(name: ArgName, argRef: Arg, option?: Omit<ArgProps<_FieldToValue>, "nullable">) {
    if (this.queryFn) throw new Error("Query function is already set");
    this.argNames.push(name);
    this.args.push({ name, argRef, option: { ...option, nullable: true } });
    return this as unknown as FilterInfo<[...ArgNames, ArgName], [...Args, opt?: _FieldToValue | null], Model>;
  }
  query(query: (...args: Args) => QueryOf<Model>) {
    if (this.queryFn) throw new Error("Query function is already set");
    this.queryFn = query;
    return this;
  }
}

export const filter = () => new FilterInfo();
