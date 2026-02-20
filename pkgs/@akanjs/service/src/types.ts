import type { Cls, MergeAllTypes, Prettify, PromiseOrObject } from "@akanjs/base";
import type {
  CRUDEventType,
  DataInputOf,
  DatabaseInstance,
  ExtractQuery,
  ExtractSort,
  FilterInstance,
  FindQueryOption,
  GetDocObject,
  ListQueryOption,
  QueryMethodPart,
  SaveEventType,
  Doc as DbDoc,
} from "@akanjs/document";
import type { QueryOf } from "@akanjs/constant";
import type { Logger } from "@akanjs/common";

export type DatabaseService<
  T extends string = string,
  Input = any,
  Doc = any,
  Obj = any,
  Model = any,
  Insight = any,
  Filter extends FilterInstance = FilterInstance,
  LibSrvs extends Cls[] = [],
  _Query extends ExtractQuery<Filter> = ExtractQuery<Filter>,
  _Sort extends ExtractSort<Filter> = ExtractSort<Filter>,
  _CapitalizedT extends Capitalize<T> = Capitalize<T>,
  _DataInputOfDoc extends DataInputOf<Input, Doc> = DataInputOf<Input, Doc>,
  _QueryOfDoc extends QueryOf<Doc> = QueryOf<Doc>,
  _FindQueryOption extends FindQueryOption<_Sort, Obj> = FindQueryOption<_Sort, Obj>,
  _ListQueryOption extends ListQueryOption<_Sort, Obj> = ListQueryOption<_Sort, Obj>,
  _DocObjectOfDoc = GetDocObject<Doc>,
  _MixedLibSrv = MergeAllTypes<LibSrvs>,
> = {
  logger: Logger;
  __databaseModel: Model;
  __get: (id: string) => Promise<Doc>;
  __load: (id?: string) => Promise<Doc | null>;
  __loadMany: (ids: string[]) => Promise<Doc[]>;
  __create: (data: _DataInputOfDoc) => Promise<Doc>;
  __update: (id: string, data: Partial<Doc>) => Promise<Doc>;
  __remove: (id: string) => Promise<Doc>;
  __list(query?: _QueryOfDoc, queryOption?: _ListQueryOption): Promise<Doc[]>;
  __listIds(query?: _QueryOfDoc, queryOption?: _ListQueryOption): Promise<string[]>;
  __find(query?: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<Doc | null>;
  __findId(query?: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<string | null>;
  __pick(query?: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<Doc>;
  __pickId(query?: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<string>;
  __exists(query?: _QueryOfDoc): Promise<string | null>;
  __count(query?: _QueryOfDoc): Promise<number>;
  __insight(query?: _QueryOfDoc): Promise<Insight>;
  __search(query: _QueryOfDoc, queryOption?: _ListQueryOption): Promise<{ docs: Doc[]; count: number }>;
  __searchDocs(query: _QueryOfDoc, queryOption?: _ListQueryOption): Promise<Doc[]>;
  __searchCount(query: _QueryOfDoc): Promise<number>;
  _preCreate(data: _DataInputOfDoc): PromiseOrObject<_DataInputOfDoc>;
  _postCreate(doc: Doc): Promise<Doc> | Doc;
  _preUpdate(id: string, data: Partial<Doc>): PromiseOrObject<Partial<Doc>>;
  _postUpdate(doc: Doc): Promise<Doc> | Doc;
  _preRemove(id: string): Promise<void> | void;
  _postRemove(doc: Doc): Promise<Doc> | Doc;
  listenPre: (type: SaveEventType, listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>) => () => void;
  listenPost: (type: SaveEventType, listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>) => () => void;
} & Prettify<
  { [key in `${T}Model`]: Model } & {
    [K in `get${_CapitalizedT}`]: (id: string) => Promise<Doc>;
  } & {
    [K in `load${_CapitalizedT}`]: (id?: string) => Promise<Doc | null>;
  } & {
    [K in `load${_CapitalizedT}Many`]: (ids: string[]) => Promise<Doc[]>;
  } & {
    [K in `create${_CapitalizedT}`]: (data: _DataInputOfDoc) => Promise<Doc>;
  } & {
    [K in `update${_CapitalizedT}`]: (id: string, data: Partial<Doc>) => Promise<Doc>;
  } & {
    [K in `remove${_CapitalizedT}`]: (id: string) => Promise<Doc>;
  } & {
    [K in `search${_CapitalizedT}`]: (
      searchText: string,
      queryOption?: _ListQueryOption
    ) => Promise<{ docs: Doc[]; count: number }>;
  } & {
    [K in `searchDocs${_CapitalizedT}`]: (searchText: string, queryOption?: _ListQueryOption) => Promise<Doc[]>;
  } & {
    [K in `searchCount${_CapitalizedT}`]: (searchText: string) => Promise<number>;
  } & QueryMethodPart<_Query, _Sort, Obj, Doc, Insight, _FindQueryOption, _ListQueryOption, _QueryOfDoc> & {
      [K in keyof _MixedLibSrv]: _MixedLibSrv[K] extends (...args: infer Args) => Promise<infer Value>
        ? Value extends (infer SingleValue)[]
          ? SingleValue extends DatabaseInstance
            ? _DocObjectOfDoc extends GetDocObject<SingleValue>
              ? (...args: Args) => Promise<Doc[]>
              : _MixedLibSrv[K]
            : _MixedLibSrv[K]
          : Value extends DbDoc<any>
            ? _DocObjectOfDoc extends GetDocObject<Value>
              ? (...args: Args) => Promise<Doc>
              : _MixedLibSrv[K]
            : _MixedLibSrv[K]
        : _MixedLibSrv[K];
    }
>;
