// TODO: 여기 너무 고치기 힘듦, 나중에..
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Cls, Dayjs, MergedValues, PromiseOrObject } from "@akanjs/base";
import { dayjs } from "@akanjs/base";
import { capitalize, Logger, lowerlize } from "@akanjs/common";
import { DEFAULT_PAGE_SIZE, FIELD_META, type DocumentModel, type QueryOf } from "@akanjs/constant";
// import { Transaction } from "@akanjs/nest";
import type DataLoader from "dataloader";
import type { Filter, Index, MeiliSearch } from "meilisearch";
import type { HydratedDocument, Model as MongooseModel } from "mongoose";
import type { RedisClientType, SetOptions } from "redis";

import { createArrayLoader, createLoader, createQueryLoader } from "./dataLoader";
import type { BaseMiddleware } from "./beyond";
import type { CRUDEventType, Mdl, SaveEventType } from "./into";
import type { Database } from "./databaseRegistry";
import {
  getFilterSortByKey,
  type ExtractQuery,
  type ExtractSort,
  type FilterInstance,
  getFilterInfoByKey,
  getFilterMeta,
  FILTER_META_KEY,
} from "./filterMeta";
import { convertAggregateMatch } from "./schema";
import type { ConstantFilterMeta, DataInputOf, FindQueryOption, ListQueryOption } from "./types";
import { getLoaderInfos } from "./loaderInfo";

export interface RedisSetOptions {
  expireAt?: Dayjs;
}

class CacheDatabase<T = any> {
  private logger: Logger;
  constructor(
    private readonly refName: string,
    private readonly redis: RedisClientType
  ) {
    this.logger = new Logger(`${refName}Cache`);
  }
  async set(topic: string, key: string, value: string | number | Buffer, option: RedisSetOptions = {}) {
    const setOption: SetOptions = { PXAT: option.expireAt?.toDate().getTime() };
    await this.redis.set(`${this.refName}:${topic}:${key}`, value, setOption);
  }
  async get<T extends string | number | Buffer>(topic: string, key: string): Promise<T | undefined> {
    const value = await this.redis.get(`${this.refName}:${topic}:${key}`);
    return value as T | undefined;
  }
  async delete(topic: string, key: string) {
    await this.redis.del(`${this.refName}:${topic}:${key}`);
  }
}
class SearchDatabase<T = any> {
  private logger: Logger;
  private index: Index;
  constructor(
    readonly refName: string,
    readonly meili: MeiliSearch
  ) {
    this.logger = new Logger(`${refName}Search`);
    this.index = meili.index(lowerlize(refName));
  }
  async searchIds(
    searchText: string | undefined | null,
    option: {
      filter?: Filter;
      skip?: number | null;
      limit?: number | null;
      sort?: string[] | null;
    } = {}
  ): Promise<{ ids: string[]; total: number }> {
    const { skip = 0, limit = DEFAULT_PAGE_SIZE, sort } = option;
    if (!searchText) {
      const { results, total } = await this.index.getDocuments({
        offset: skip ?? 0,
        limit: limit ?? 0,
      });
      return { ids: results.map((result) => result.id), total };
    }
    const { hits, estimatedTotalHits } = await this.index.search(searchText, {
      offset: skip ?? 0,
      limit: limit ?? 0,
      sort: sort ?? [],
      filter: option.filter,
      attributesToRetrieve: ["id"],
    });
    return { ids: hits.map((hit) => hit.id), total: estimatedTotalHits };
  }
  async count(
    searchText: string | undefined | null,
    option: {
      filter?: Filter;
      skip?: number | null;
      limit?: number | null;
      sort?: string | null;
    } = {}
  ): Promise<number> {
    const { skip = 0, limit = DEFAULT_PAGE_SIZE, sort = "" } = option;
    if (!searchText) {
      const { results, total } = await this.index.getDocuments({
        offset: skip ?? 0,
        limit: limit ?? 0,
      });
      return total;
    }
    const { hits, estimatedTotalHits } = await this.index.search(searchText, {
      offset: skip ?? 0,
      limit: limit ?? 0,
      filter: option.filter,
      attributesToRetrieve: ["id"],
    });
    return estimatedTotalHits;
  }
}

type QueryMethodOfKey<
  CapitalizedK extends string,
  Doc,
  Insight,
  _Args extends any[],
  _ListArgs extends any[],
  _FindArgs extends any[],
  _QueryOfDoc = QueryOf<Doc>,
> = {
  [K in `list${CapitalizedK}`]: (...args: _ListArgs) => Promise<Doc[]>;
} & {
  [K in `listIds${CapitalizedK}`]: (...args: _ListArgs) => Promise<string[]>;
} & {
  [K in `find${CapitalizedK}`]: (...args: _FindArgs) => Promise<Doc | null>;
} & {
  [K in `findId${CapitalizedK}`]: (...args: _FindArgs) => Promise<string | null>;
} & {
  [K in `pick${CapitalizedK}`]: (...args: _FindArgs) => Promise<Doc>;
} & {
  [K in `pickId${CapitalizedK}`]: (...args: _FindArgs) => Promise<string>;
} & {
  [K in `exists${CapitalizedK}`]: (...args: _Args) => Promise<string | null>;
} & {
  [K in `count${CapitalizedK}`]: (...args: _Args) => Promise<number>;
} & {
  [K in `insight${CapitalizedK}`]: (...args: _Args) => Promise<Insight>;
} & {
  [K in `query${CapitalizedK}`]: (...args: _Args) => _QueryOfDoc;
};

export type QueryMethodPart<
  Query,
  Sort,
  Obj,
  Doc,
  Insight,
  _FindQueryOption = FindQueryOption<Sort, Obj>,
  _ListQueryOption = ListQueryOption<Sort, Obj>,
  _QueryOfDoc = QueryOf<Doc>,
> = MergedValues<{
  [K in keyof Query]: K extends string
    ? Query[K] extends (...args: infer Args) => any
      ? QueryMethodOfKey<
          Capitalize<K>,
          Doc,
          Insight,
          Args,
          [...Args, queryOption?: _ListQueryOption],
          [...Args, queryOption?: _FindQueryOption]
        >
      : never
    : never;
}>;
type DatabaseModelWithQuerySort<
  T extends string,
  Input,
  Doc,
  Obj,
  Insight,
  Query,
  Sort,
  _CapitalizedT extends string = Capitalize<T>,
  _QueryOfDoc = QueryOf<Doc>,
  _DataInput = DataInputOf<Input, DocumentModel<Obj>>,
  _FindQueryOption = FindQueryOption<Sort, Obj>,
  _ListQueryOption = ListQueryOption<Sort, Obj>,
> = {
  logger: Logger;
  __model: Mdl<Doc, Obj>;
  __cache: CacheDatabase<T>;
  __searcher: SearchDatabase<T>;
  __loader: DataLoader<string, Doc, string>;
  __get: (id: string) => Promise<Doc>;
  __load: (id?: string) => Promise<Doc | null>;
  __loadMany: (ids: string[]) => Promise<Doc[]>;
  __create: (data: _DataInput) => Promise<Doc>;
  __update: (id: string, data: Partial<Doc>) => Promise<Doc>;
  __remove: (id: string) => Promise<Doc>;
  __list(query: _QueryOfDoc, queryOption?: _ListQueryOption): Promise<Doc[]>;
  __listIds(query: _QueryOfDoc, queryOption?: _ListQueryOption): Promise<string[]>;
  __find(query: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<Doc | null>;
  __findId(query: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<string | null>;
  __pick(query: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<Doc>;
  __pickId(query: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<string>;
  __exists(query: _QueryOfDoc): Promise<string | null>;
  __count(query: _QueryOfDoc): Promise<number>;
  __insight(query: _QueryOfDoc): Promise<Insight>;
  __search(searchText: string, queryOption?: _ListQueryOption): Promise<{ docs: Doc[]; count: number }>;
  __searchDocs(searchText: string, queryOption?: _ListQueryOption): Promise<Doc[]>;
  __searchCount(searchText: string): Promise<number>;
  clone(data: _DataInput & { id: string }): Promise<Doc>;
  listenPre: (type: SaveEventType, listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>) => () => void;
  listenPost: (type: SaveEventType, listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>) => () => void;
} & {
  [key in _CapitalizedT]: Mdl<Doc, Obj>;
} & {
  [key in `${T}Loader`]: DataLoader<string, Doc, string>;
} & {
  [key in `${T}Cache`]: CacheDatabase<T>;
} & {
  [key in `${T}Search`]: SearchDatabase<T>;
} & {
  [K in `get${_CapitalizedT}`]: (id: string) => Promise<Doc>;
} & {
  [K in `load${_CapitalizedT}`]: (id?: string) => Promise<Doc | null>;
} & {
  [K in `load${_CapitalizedT}Many`]: (ids: string[]) => Promise<Doc[]>;
} & {
  [K in `create${_CapitalizedT}`]: (data: _DataInput) => Promise<Doc>;
} & {
  [K in `update${_CapitalizedT}`]: (id: string, data: _DataInput) => Promise<Doc>;
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
} & QueryMethodPart<Query, Sort, Obj, Doc, Insight, _FindQueryOption, _ListQueryOption, _QueryOfDoc>;

export type DatabaseModel<
  T extends string = string,
  Input = any,
  Doc = any,
  Obj = any,
  Insight = any,
  Filter extends FilterInstance = FilterInstance,
  _CapitalizedT extends string = Capitalize<T>,
  _QueryOfDoc = QueryOf<Doc>,
  _Query = ExtractQuery<Filter>,
  _Sort = ExtractSort<Filter>,
  _DataInput = DataInputOf<Input, DocumentModel<Obj>>,
  _FindQueryOption = FindQueryOption<_Sort, Obj>,
  _ListQueryOption = ListQueryOption<_Sort, Obj>,
> = DatabaseModelWithQuerySort<
  T,
  Input,
  Doc,
  Obj,
  Insight,
  _Query,
  _Sort,
  _CapitalizedT,
  _QueryOfDoc,
  _DataInput,
  _FindQueryOption,
  _ListQueryOption
>;

export class DatabaseModelRegistry {
  static #modelMap = new Map<string, Cls<DatabaseModel>>();
  static build<
    T extends string,
    Input,
    Doc extends HydratedDocument,
    Model extends Mdl<any, any>,
    Middleware extends BaseMiddleware,
    Insight,
    Obj,
    Filter extends FilterInstance,
  >(
    database: Database<T, Input, Doc, Model, Middleware, Insight, Obj, Filter>,
    model: Mdl<any, any>,
    redis: RedisClientType,
    meili: MeiliSearch
  ): DatabaseModel<T, Input, Doc, Model, Insight, Filter> {
    type Sort = ExtractSort<Filter>;
    const [modelName, className]: [string, string] = [database.refName, capitalize(database.refName)];

    const accumulator = Object.fromEntries(
      Object.entries(database.Insight[FIELD_META]).map(([key, field]) => [key, field.accumulate])
    );
    const defaultInsight = Object.fromEntries(
      Object.entries(database.Insight[FIELD_META]).map(([key, field]) => [key, field.default])
    );

    const makeSafeQuery = (query?: QueryOf<Doc>) =>
      ({
        removedAt: { $exists: false },
        ...(query ?? {}),
      }) as { [key: string]: any };
    const makeSafeMatchStage = (query?: QueryOf<Doc>) => ({
      $match: {
        removedAt: { $exists: false },
        ...convertAggregateMatch(query),
      },
    });
    const getListQuery = (query?: QueryOf<Doc>, queryOption?: ListQueryOption<Sort, Obj>) => {
      const find = makeSafeQuery(query) as { [key: string]: any };
      const sort = getFilterSortByKey(database.Filter, (queryOption?.sort as string) ?? "latest") as {
        [key: string]: 1 | -1;
      };
      const skip = queryOption?.skip ?? 0;
      const limit = queryOption?.limit === null ? DEFAULT_PAGE_SIZE : (queryOption?.limit ?? 0);
      const select = queryOption?.select;
      const sample = queryOption?.sample;
      return { find, sort, skip, limit, select, sample };
    };
    const getFindQuery = (query?: QueryOf<Doc>, queryOption?: FindQueryOption<Sort, Obj>) => {
      const find = makeSafeQuery(query) as { [key: string]: any };
      const sort = getFilterSortByKey(database.Filter, (queryOption?.sort as string) ?? "latest") as {
        [key: string]: 1 | -1;
      };
      const skip = queryOption?.skip ?? 0;
      const select = queryOption?.select;
      const sample = queryOption?.sample ?? false;
      return { find, sort, skip, select, sample };
    };
    const getSearchSort = (sortKey?: Sort | null) => {
      const sort = getFilterSortByKey(database.Filter, (sortKey as string) ?? "latest");
      return Object.entries(sort).map(([key, value]) => `${key}:${value === 1 ? "asc" : "desc"}`);
    };
    const loader = createLoader(model as unknown as MongooseModel<any>);
    const cacheDatabase = new CacheDatabase(database.refName, redis);
    const searchDatabase = new SearchDatabase(database.refName, meili);

    const DatabaseModel =
      this.#modelMap.get(database.refName) ??
      class DatabaseModel {
        logger: Logger = new Logger(`${modelName}Model`);
        readonly __model: Mdl<any, any> = model;
        readonly __cache: CacheDatabase = cacheDatabase;
        readonly __searcher: SearchDatabase = searchDatabase;
        readonly __loader: DataLoader<string, HydratedDocument, string> = loader;
        async __list(query?: QueryOf<Doc>, queryOption?: ListQueryOption<Sort, Obj>): Promise<Doc[]> {
          const { find, sort, skip, limit, select, sample } = getListQuery(query, queryOption);
          return sample
            ? await this.__model.sample(find, limit) // TODO: select 추가 필요
            : ((await this.__model.find(find, select).sort(sort).skip(skip).limit(limit)) as Doc[]);
        }
        async __listIds(query?: QueryOf<Doc>, queryOption?: ListQueryOption<Sort, Obj>): Promise<string[]> {
          const { find, sort, skip, limit, sample } = getListQuery(query, queryOption);
          return (
            sample
              ? await this.__model.sample(find, limit, [{ $project: { _id: 1 } }])
              : await this.__model.find(find).sort(sort).skip(skip).limit(limit).select("_id")
          ).map(({ _id }) => _id.toString());
        }
        async __find(query?: QueryOf<Doc>, queryOption?: FindQueryOption<Sort, Obj>): Promise<Doc | null> {
          const { find, sort, skip, select, sample } = getFindQuery(query, queryOption);
          const doc = sample
            ? await this.__model.sampleOne(find) // TODO: select 추가 필요
            : await this.__model.findOne(find, select).sort(sort).skip(skip);
          if (!doc) return null;
          return doc as Doc;
        }
        async __findId(query?: QueryOf<Doc>, queryOption?: FindQueryOption<Sort, Obj>): Promise<string | null> {
          const { find, sort, skip, sample } = getFindQuery(query, queryOption);
          const doc = sample
            ? await this.__model.sampleOne(find, [{ $project: { _id: 1 } }])
            : await this.__model.findOne(find).sort(sort).skip(skip).select("_id");
          if (!doc) return null;
          return doc._id.toString();
        }
        async __pick(query?: QueryOf<Doc>, queryOption?: FindQueryOption<Sort, Obj>): Promise<Doc> {
          const { find, sort, skip, select, sample } = getFindQuery(query, queryOption);
          const doc = sample
            ? await this.__model.sampleOne(find) // TODO: select 추가 필요
            : await this.__model.findOne(find, select).sort(sort).skip(skip);
          if (!doc) throw new Error(`No Document (${database.refName}): ${JSON.stringify(query)}`);
          return doc as Doc;
        }
        async __pickId(query?: QueryOf<Doc>, queryOption?: FindQueryOption<Sort, Obj>): Promise<string> {
          const { find, sort, skip, sample } = getFindQuery(query, queryOption);
          const doc = sample
            ? await this.__model.sampleOne(find, [{ $project: { _id: 1 } }])
            : await this.__model.findOne(find).sort(sort).skip(skip).select("_id");
          if (!doc) throw new Error(`No Document (${database.refName}): ${JSON.stringify(query)}`);
          return doc._id.toString();
        }
        async __exists(query?: QueryOf<Doc>): Promise<string | null> {
          const find = makeSafeQuery(query);
          const existingId = await (this.__model as any).exists(find);
          return existingId?.toString() ?? null;
        }
        async __count(query?: QueryOf<Doc>): Promise<number> {
          const find = makeSafeQuery(query);
          return await this.__model.countDocuments(find);
        }
        async __insight(query?: QueryOf<Doc>): Promise<Insight> {
          if (!accumulator) throw new Error(`No Insight (${database.refName})`);
          const res = await this.__model.aggregate([
            makeSafeMatchStage(query),
            { $group: { _id: null, ...accumulator } },
          ]);
          const data = res[0];
          return data ?? defaultInsight;
        }
        listenPre(type: SaveEventType, listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>) {
          return this.__model.listenPre(type, listener);
        }
        listenPost(type: SaveEventType, listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>) {
          return this.__model.listenPost(type, listener);
        }
        async __get(id: string) {
          const doc = await this.__loader.load(id);
          if (!doc) throw new Error(`No Document (${database.refName}): ${id}`);
          return doc;
        }
        async [`get${className}`](id: string) {
          return this.__get(id);
        }
        async __load(id?: string) {
          return (id ? await this.__loader.load(id) : null) as Doc | null;
        }
        async [`load${className}`](id?: string) {
          return this.__load(id);
        }
        async __loadMany(ids: string[]) {
          return await this.__loader.loadMany(ids);
        }
        async [`load${className}Many`](ids: string[]) {
          return this.__loadMany(ids);
        }
        async clone(data: DataInputOf<Input, Obj> & { id: string }) {
          return await new this.__model({ ...data, _id: data.id }).save();
        }
        async __create(data: DataInputOf<Input, Obj>) {
          return await new this.__model(data).save();
        }
        async [`create${className}`](data: DataInputOf<Input, Obj>) {
          return this.__create(data);
        }
        async __update(id: string, data: DataInputOf<Input, Obj>) {
          const doc = await this.__model.pickById(id);
          return await doc.set(data).save();
        }
        async [`update${className}`](id: string, data: DataInputOf<Input, Obj>) {
          return this.__update(id, data);
        }
        async __remove(id: string) {
          const doc = await this.__model.pickById(id);
          return await doc.set({ removedAt: dayjs() }).save();
        }
        async [`remove${className}`](id: string) {
          return this.__remove(id);
        }
        async __search(searchText: string, queryOption: ListQueryOption<Sort, Obj> = {}) {
          // TODO: select 추가 필요
          const { skip, limit, sort } = queryOption;
          const { ids, total } = await this.__searcher.searchIds(searchText, {
            skip,
            limit,
            sort: getSearchSort(sort),
          });
          const docs = await this.__loader.loadMany(ids);
          return { docs, count: total };
        }
        async [`search${className}`](searchText: string, queryOption: ListQueryOption<Sort, Obj> = {}) {
          return this.__search(searchText, queryOption);
        }
        async __searchDocs(searchText: string, queryOption: ListQueryOption<Sort, Obj> = {}) {
          // TODO: select 추가 필요
          const { skip, limit, sort } = queryOption;
          const { ids } = await this.__searcher.searchIds(searchText, {
            skip,
            limit,
            sort: getSearchSort(sort),
          });
          return await this.__loader.loadMany(ids);
        }
        async [`searchDocs${className}`](searchText: string, queryOption: ListQueryOption<Sort, Obj> = {}) {
          return this.__searchDocs(searchText, queryOption);
        }
        async __searchCount(searchText: string) {
          return await this.__searcher.count(searchText);
        }
        async [`searchCount${className}`](searchText: string) {
          return this.__searchCount(searchText);
        }
      };

    Object.assign(DatabaseModel.prototype, {
      [className]: model,
      [`${modelName}Loader`]: loader,
      [`${modelName}Cache`]: cacheDatabase,
      [`${modelName}Search`]: searchDatabase,
    });

    const getQueryDataFromKey = (queryKey: string, args: any): { query: any; queryOption: any } => {
      const lastArg = args.at(-1);
      const hasQueryOption =
        lastArg &&
        typeof lastArg === "object" &&
        (typeof lastArg.select === "object" ||
          typeof lastArg.skip === "number" ||
          typeof lastArg.limit === "number" ||
          typeof lastArg.sort === "string");
      const filterInfo = getFilterInfoByKey(database.Filter, queryKey);
      const queryFn = filterInfo.queryFn;
      if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
      const query = queryFn(...(hasQueryOption ? args.slice(0, -1) : args));
      const queryOption = hasQueryOption ? lastArg : {};
      return { query, queryOption };
    };
    const filterMeta = getFilterMeta(database.Filter);

    Object.entries(filterMeta.query).forEach(([queryKey, filterInfo]) => {
      const queryFn = filterInfo.queryFn;
      if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
      DatabaseModel.prototype[`list${capitalize(queryKey)}`] = async function (...args: any) {
        const { query, queryOption } = getQueryDataFromKey(queryKey, args);
        return this.__list(query, queryOption);
      };
      DatabaseModel.prototype[`listIds${capitalize(queryKey)}`] = async function (...args: any) {
        const { query, queryOption } = getQueryDataFromKey(queryKey, args);
        return this.__listIds(query, queryOption);
      };
      DatabaseModel.prototype[`find${capitalize(queryKey)}`] = async function (...args: any) {
        const { query, queryOption } = getQueryDataFromKey(queryKey, args);
        return this.__find(query, queryOption);
      };
      DatabaseModel.prototype[`findId${capitalize(queryKey)}`] = async function (...args: any) {
        const { query, queryOption } = getQueryDataFromKey(queryKey, args);
        return this.__findId(query, queryOption);
      };
      DatabaseModel.prototype[`pick${capitalize(queryKey)}`] = async function (...args: any) {
        const { query, queryOption } = getQueryDataFromKey(queryKey, args);
        return this.__pick(query, queryOption);
      };
      DatabaseModel.prototype[`pickId${capitalize(queryKey)}`] = async function (...args: any) {
        const { query, queryOption } = getQueryDataFromKey(queryKey, args);
        return this.__pickId(query, queryOption);
      };
      DatabaseModel.prototype[`exists${capitalize(queryKey)}`] = async function (...args: any) {
        const query = queryFn(...args);
        return this.__exists(query);
      };
      DatabaseModel.prototype[`count${capitalize(queryKey)}`] = async function (...args: any) {
        const query = queryFn(...args);
        return this.__count(query);
      };
      DatabaseModel.prototype[`insight${capitalize(queryKey)}`] = async function (...args: any) {
        const query = queryFn(...args);
        return this.__insight(query);
      };
      DatabaseModel.prototype[`query${capitalize(queryKey)}`] = function (...args: any) {
        return queryFn(...args);
      };
    });
    const loaderInfos = getLoaderInfos(database.Model);
    Object.entries(loaderInfos).forEach(([key, loaderInfo]) => {
      const loader =
        loaderInfo.type === "field"
          ? createLoader(model as unknown as MongooseModel<any>, loaderInfo.field as string, loaderInfo.defaultQuery)
          : loaderInfo.type === "arrayField"
            ? createArrayLoader(
                model as unknown as MongooseModel<any>,
                loaderInfo.field as string,
                loaderInfo.defaultQuery
              )
            : loaderInfo.type === "query"
              ? createQueryLoader(
                  model as unknown as MongooseModel<any>,
                  (loaderInfo.field ?? []) as string[],
                  loaderInfo.defaultQuery
                )
              : null;
      DatabaseModel.prototype[key] = loader;
    });
    Object.getOwnPropertyNames(database.Model.prototype).forEach((key) => {
      DatabaseModel.prototype[key] = database.Model.prototype[key];
    });
    this.#modelMap.set(database.refName, DatabaseModel as Cls<DatabaseModel>);
    return new DatabaseModel() as DatabaseModel<T, Input, Doc, Model, Insight, Filter>;
  }
}
