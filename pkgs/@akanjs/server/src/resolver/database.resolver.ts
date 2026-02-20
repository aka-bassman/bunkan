// TODO: 여기 너무 고치기 힘듦, 나중에..
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Cls, Dayjs, PromiseOrObject } from "@akanjs/base";
import { dayjs } from "@akanjs/base";
import { capitalize, Logger } from "@akanjs/common";
import { DEFAULT_PAGE_SIZE, FIELD_META, type ConstantModel, type QueryOf } from "@akanjs/constant";
// import { Transaction } from "@akanjs/nest";
import type DataLoader from "dataloader";
import type { HydratedDocument, Model as MongooseModel } from "mongoose";
import {
  type DatabaseInstance,
  type FindQueryOption,
  type Mdl,
  convertAggregateMatch,
  type ListQueryOption,
  getFilterSortByKey,
  createLoader,
  type SaveEventType,
  type CRUDEventType,
  type DataInputOf,
  getFilterInfoByKey,
  getFilterMeta,
  getLoaderInfos,
  createArrayLoader,
  createQueryLoader,
  CacheDatabase,
  SearchDatabase,
  type DatabaseModel,
} from "@akanjs/document";
import { adapt, type AdaptorCls } from "@akanjs/service";
import { MeiliDatabase, RedisCache } from "..";
import { MongoResolver } from "./mongo.resolver";

export class DatabaseResolver {
  static resolveDatabase(constant: ConstantModel, database: DatabaseModel): AdaptorCls<DatabaseInstance> {
    const model = MongoResolver.resolveDatabase(database);
    const [modelName, className]: [string, string] = [database.refName, capitalize(database.refName)];
    const accumulator = Object.fromEntries(
      Object.entries(constant.insight[FIELD_META]).map(([key, field]) => [key, field.accumulate])
    );
    const defaultInsight = Object.fromEntries(
      Object.entries(constant.insight[FIELD_META]).map(([key, field]) => [key, field.default])
    );

    const makeSafeQuery = (query?: QueryOf<any>) =>
      ({
        removedAt: { $exists: false },
        ...(query ?? {}),
      }) as { [key: string]: any };
    const makeSafeMatchStage = (query?: QueryOf<any>) => ({
      $match: {
        removedAt: { $exists: false },
        ...convertAggregateMatch(query),
      },
    });
    const getListQuery = (query?: QueryOf<any>, queryOption?: ListQueryOption) => {
      const find = makeSafeQuery(query) as { [key: string]: any };
      const sort = getFilterSortByKey(database.filter, queryOption?.sort ?? "latest") as {
        [key: string]: 1 | -1;
      };
      const skip = queryOption?.skip ?? 0;
      const limit = queryOption?.limit === null ? DEFAULT_PAGE_SIZE : (queryOption?.limit ?? 0);
      const select = queryOption?.select;
      const sample = queryOption?.sample;
      return { find, sort, skip, limit, select, sample };
    };
    const getFindQuery = (query?: QueryOf<any>, queryOption?: FindQueryOption) => {
      const find = makeSafeQuery(query) as { [key: string]: any };
      const sort = getFilterSortByKey(database.filter, queryOption?.sort ?? "latest") as {
        [key: string]: 1 | -1;
      };
      const skip = queryOption?.skip ?? 0;
      const select = queryOption?.select;
      const sample = queryOption?.sample ?? false;
      return { find, sort, skip, select, sample };
    };
    const getSearchSort = (sortKey?: any | null) => {
      const sort = getFilterSortByKey(database.filter, (sortKey as string) ?? "latest");
      return Object.entries(sort).map(([key, value]) => `${key}:${value === 1 ? "asc" : "desc"}`);
    };
    const loader = createLoader(model as unknown as MongooseModel<any>);

    class DatabaseModelInstance extends adapt(`${modelName}Model`, ({ plug }) => ({
      __cache: plug(RedisCache, (redisCache) => new CacheDatabase(modelName, redisCache.getClient())),
      __searcher: plug(MeiliDatabase, (meili) => new SearchDatabase(modelName, meili.getClient())),
      [`${modelName}Cache` as never]: plug(
        RedisCache,
        (redisCache) => new CacheDatabase(modelName, redisCache.getClient())
      ),
      [`${modelName}Search` as never]: plug(MeiliDatabase, (meili) => new SearchDatabase(modelName, meili.getClient())),
    })) {
      readonly __model: Mdl<any, any> = model;
      readonly __loader: DataLoader<string, HydratedDocument, string> = loader;
      async __list(query?: QueryOf<any>, queryOption?: ListQueryOption): Promise<any[]> {
        const { find, sort, skip, limit, select, sample } = getListQuery(query, queryOption);
        return sample
          ? await this.__model.sample(find, limit) // TODO: select 추가 필요
          : ((await this.__model.find(find, select).sort(sort).skip(skip).limit(limit)) as any[]);
      }
      async __listIds(query?: QueryOf<any>, queryOption?: ListQueryOption): Promise<string[]> {
        const { find, sort, skip, limit, sample } = getListQuery(query, queryOption);
        return (
          sample
            ? await this.__model.sample(find, limit, [{ $project: { _id: 1 } }])
            : await this.__model.find(find).sort(sort).skip(skip).limit(limit).select("_id")
        ).map(({ _id }) => _id.toString());
      }
      async __find(query?: QueryOf<any>, queryOption?: FindQueryOption): Promise<any | null> {
        const { find, sort, skip, select, sample } = getFindQuery(query, queryOption);
        const doc = sample
          ? await this.__model.sampleOne(find) // TODO: select 추가 필요
          : await this.__model.findOne(find, select).sort(sort).skip(skip);
        if (!doc) return null;
        return doc;
      }
      async __findId(query?: QueryOf<any>, queryOption?: FindQueryOption): Promise<string | null> {
        const { find, sort, skip, sample } = getFindQuery(query, queryOption);
        const doc = sample
          ? await this.__model.sampleOne(find, [{ $project: { _id: 1 } }])
          : await this.__model.findOne(find).sort(sort).skip(skip).select("_id");
        if (!doc) return null;
        return doc._id.toString();
      }
      async __pick(query?: QueryOf<any>, queryOption?: FindQueryOption): Promise<any> {
        const { find, sort, skip, select, sample } = getFindQuery(query, queryOption);
        const doc = sample
          ? await this.__model.sampleOne(find) // TODO: select 추가 필요
          : await this.__model.findOne(find, select).sort(sort).skip(skip);
        if (!doc) throw new Error(`No Document (${database.refName}): ${JSON.stringify(query)}`);
        return doc;
      }
      async __pickId(query?: QueryOf<any>, queryOption?: FindQueryOption): Promise<string> {
        const { find, sort, skip, sample } = getFindQuery(query, queryOption);
        const doc = sample
          ? await this.__model.sampleOne(find, [{ $project: { _id: 1 } }])
          : await this.__model.findOne(find).sort(sort).skip(skip).select("_id");
        if (!doc) throw new Error(`No Document (${database.refName}): ${JSON.stringify(query)}`);
        return doc._id.toString();
      }
      async __exists(query?: QueryOf<any>): Promise<string | null> {
        const find = makeSafeQuery(query);
        const existingId = await (this.__model as any).exists(find);
        return existingId?.toString() ?? null;
      }
      async __count(query?: QueryOf<any>): Promise<number> {
        const find = makeSafeQuery(query);
        return await this.__model.countDocuments(find);
      }
      async __insight(query?: QueryOf<any>): Promise<any> {
        if (!accumulator) throw new Error(`No Insight (${database.refName})`);
        const res = await this.__model.aggregate([
          makeSafeMatchStage(query),
          { $group: { _id: null, ...accumulator } },
        ]);
        const data = res[0];
        return data ?? defaultInsight;
      }
      listenPre(type: SaveEventType, listener: (doc: any, type: CRUDEventType) => PromiseOrObject<void>) {
        return this.__model.listenPre(type, listener);
      }
      listenPost(type: SaveEventType, listener: (doc: any, type: CRUDEventType) => PromiseOrObject<void>) {
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
        return (id ? await this.__loader.load(id) : null) as any | null;
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
      async clone(data: DataInputOf<any, any> & { id: string }) {
        return await new this.__model({ ...data, _id: data.id }).save();
      }
      async __create(data: DataInputOf<any, any>) {
        return await new this.__model(data).save();
      }
      async [`create${className}`](data: DataInputOf<any, any>) {
        return this.__create(data);
      }
      async __update(id: string, data: DataInputOf<any, any>) {
        const doc = await this.__model.pickById(id);
        return await doc.set(data).save();
      }
      async [`update${className}`](id: string, data: DataInputOf<any, any>) {
        return this.__update(id, data);
      }
      async __remove(id: string) {
        const doc = await this.__model.pickById(id);
        return await doc.set({ removedAt: dayjs() }).save();
      }
      async [`remove${className}`](id: string) {
        return this.__remove(id);
      }
      async __search(searchText: string, queryOption: ListQueryOption = {}) {
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
      async [`search${className}`](searchText: string, queryOption: ListQueryOption = {}) {
        return this.__search(searchText, queryOption);
      }
      async __searchDocs(searchText: string, queryOption: ListQueryOption = {}) {
        // TODO: select 추가 필요
        const { skip, limit, sort } = queryOption;
        const { ids } = await this.__searcher.searchIds(searchText, {
          skip,
          limit,
          sort: getSearchSort(sort),
        });
        return await this.__loader.loadMany(ids);
      }
      async [`searchDocs${className}`](searchText: string, queryOption: ListQueryOption = {}) {
        return this.__searchDocs(searchText, queryOption);
      }
      async __searchCount(searchText: string) {
        return await this.__searcher.count(searchText);
      }
      async [`searchCount${className}`](searchText: string) {
        return this.__searchCount(searchText);
      }
    }

    Object.assign(DatabaseModelInstance.prototype, {
      [className]: model,
      [`${modelName}Loader`]: loader,
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
      const filterInfo = getFilterInfoByKey(database.filter, queryKey);
      const queryFn = filterInfo.queryFn;
      if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
      const query = queryFn(...(hasQueryOption ? args.slice(0, -1) : args));
      const queryOption = hasQueryOption ? lastArg : {};
      return { query, queryOption };
    };
    const filterMeta = getFilterMeta(database.filter);

    Object.entries(filterMeta.query).forEach(([queryKey, filterInfo]) => {
      const queryFn = filterInfo.queryFn;
      if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
      Object.assign(DatabaseModelInstance.prototype, {
        [`list${capitalize(queryKey)}`]: async function (...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return (this as unknown as DatabaseInstance).__list(query, queryOption);
        },
        [`listIds${capitalize(queryKey)}`]: async function (...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return (this as unknown as DatabaseInstance).__listIds(query, queryOption);
        },
        [`find${capitalize(queryKey)}`]: async function (...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return (this as unknown as DatabaseInstance).__find(query, queryOption);
        },
        [`findId${capitalize(queryKey)}`]: async function (...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return (this as unknown as DatabaseInstance).__findId(query, queryOption);
        },
        [`pick${capitalize(queryKey)}`]: async function (...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return (this as unknown as DatabaseInstance).__pick(query, queryOption);
        },
        [`pickId${capitalize(queryKey)}`]: async function (...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return (this as unknown as DatabaseInstance).__pickId(query, queryOption);
        },
        [`exists${capitalize(queryKey)}`]: async function (...args: any) {
          const query = queryFn(...args);
          return (this as unknown as DatabaseInstance).__exists(query);
        },
        [`count${capitalize(queryKey)}`]: async function (...args: any) {
          const query = queryFn(...args);
          return (this as unknown as DatabaseInstance).__count(query);
        },
        [`insight${capitalize(queryKey)}`]: async function (...args: any) {
          const query = queryFn(...args);
          return (this as unknown as DatabaseInstance).__insight(query);
        },
        [`query${capitalize(queryKey)}`]: function (...args: any) {
          return queryFn(...args);
        },
      });
    });
    const loaderInfos = getLoaderInfos(database.model);
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
      Object.assign(DatabaseModelInstance.prototype, { [key]: loader });
    });
    Object.getOwnPropertyNames(database.model.prototype).forEach((key) => {
      Object.assign(DatabaseModelInstance.prototype, { [key]: database.model.prototype[key] });
    });
    return DatabaseModelInstance as unknown as AdaptorCls<DatabaseInstance<any, any, any, any, any, any>>;
  }
}
