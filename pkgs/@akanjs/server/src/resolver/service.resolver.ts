import type { DatabaseService, ServiceCls } from "@akanjs/service";
import type { ConstantModel, QueryOf } from "@akanjs/constant";
import {
  getFilterInfoByKey,
  type CRUDEventType,
  type DataInputOf,
  type DatabaseInstance,
  type DatabaseModel,
  type Doc,
  type FindQueryOption,
  type ListQueryOption,
  type SaveEventType,
  getFilterMeta,
} from "@akanjs/document";
import { Logger, capitalize } from "@akanjs/common";
import type { PromiseOrObject } from "@akanjs/base";

export class ServiceResolver {
  static #getDefaultDbServiceMethods(className: string) {
    const dbServiceMethods = {
      async __get(this: DatabaseService, id: string) {
        return await this.__databaseModel.__get(id);
      },
      async [`get${className}`](this: DatabaseService, id: string) {
        return this.__get(id);
      },
      async __load(this: DatabaseService, id?: string) {
        return await this.__databaseModel.__load(id);
      },
      async [`load${className}`](this: DatabaseService, id?: string) {
        return this.__load(id);
      },
      async __loadMany(this: DatabaseService, ids: string[]) {
        return await this.__databaseModel.__loadMany(ids);
      },
      async [`load${className}Many`](this: DatabaseService, ids: string[]) {
        return this.__loadMany(ids);
      },
      async __list(this: DatabaseService, query: QueryOf<any>, queryOption?: ListQueryOption) {
        return await this.__databaseModel.__list(query, queryOption);
      },
      async __listIds(this: DatabaseService, query: QueryOf<any>, queryOption?: ListQueryOption) {
        return await this.__databaseModel.__listIds(query, queryOption);
      },
      async __find(this: DatabaseService, query: QueryOf<any>, queryOption?: FindQueryOption) {
        return await this.__databaseModel.__find(query, queryOption);
      },
      async __findId(this: DatabaseService, query: QueryOf<any>, queryOption?: FindQueryOption) {
        return await this.__databaseModel.__findId(query, queryOption);
      },
      async __pick(this: DatabaseService, query: QueryOf<any>, queryOption?: FindQueryOption) {
        return await this.__databaseModel.__pick(query, queryOption);
      },
      async __pickId(this: DatabaseService, query: QueryOf<any>, queryOption?: FindQueryOption) {
        return await this.__databaseModel.__pickId(query, queryOption);
      },
      async __exists(this: DatabaseService, query: QueryOf<any>) {
        return await this.__databaseModel.__exists(query);
      },
      async __count(this: DatabaseService, query: QueryOf<any>) {
        return await this.__databaseModel.__count(query);
      },
      async __insight(this: DatabaseService, query: QueryOf<any>) {
        return await this.__databaseModel.__insight(query);
      },
      async __search(this: DatabaseService, searchText: string, queryOption?: ListQueryOption) {
        // TODO: make query to searchText
        return await this.__databaseModel.__search(searchText, queryOption);
      },
      async [`search${className}`](this: DatabaseService, searchText: string, queryOption?: ListQueryOption) {
        return this.__search(searchText as any, queryOption);
      },
      async __searchDocs(this: DatabaseService, searchText: string, queryOption?: ListQueryOption) {
        return await this.__databaseModel.__searchDocs(searchText, queryOption);
      },
      async [`searchDocs${className}`](this: DatabaseService, searchText: string, queryOption?: ListQueryOption) {
        return this.__searchDocs(searchText as any, queryOption);
      },
      async __searchCount(this: DatabaseService, searchText: string) {
        return await this.__databaseModel.__searchCount(searchText);
      },
      async [`searchCount${className}`](this: DatabaseService, searchText: string) {
        return this.__searchCount(searchText as any);
      },
      async _preCreate(this: DatabaseService, data: DataInputOf) {
        return data;
      },
      async _postCreate(this: DatabaseService, doc: Doc) {
        return doc;
      },
      async _preUpdate(this: DatabaseService, id: string, data: Partial<Doc>) {
        return data;
      },
      async _postUpdate(this: DatabaseService, doc: Doc) {
        return doc;
      },
      async _preRemove(this: DatabaseService, id: string) {
        return;
      },
      async _postRemove(this: DatabaseService, doc: Doc) {
        return doc;
      },
      listenPre(
        this: DatabaseService,
        type: SaveEventType,
        listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>
      ) {
        return this.__databaseModel.listenPre(type, listener);
      },
      listenPost(
        this: DatabaseService,
        type: SaveEventType,
        listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>
      ) {
        return this.__databaseModel.listenPost(type, listener);
      },
      async __create(this: DatabaseService, data: DataInputOf) {
        const input = await this._preCreate(data);
        const doc = await this.__databaseModel.__create(input);
        return await this._postCreate(doc);
      },
      async [`create${className}`](this: DatabaseService, data: DataInputOf) {
        return this.__create(data);
      },
      async __update(this: DatabaseService, id: string, data: DataInputOf) {
        const input = await this._preUpdate(id, data);
        const doc = await this.__databaseModel.__update(id, input);
        return await this._postUpdate(doc);
      },
      async [`update${className}`](this: DatabaseService, id: string, data: DataInputOf) {
        return this.__update(id, data);
      },
      async __remove(this: DatabaseService, id: string): Promise<Doc> {
        await this._preRemove(id);
        const doc = await this.__databaseModel.__remove(id);
        return await this._postRemove(doc);
      },
      async [`remove${className}`](this: DatabaseService, id: string): Promise<Doc> {
        return this.__remove(id);
      },
    };
    return dbServiceMethods;
  }
  static resolveDatabaseService(constant: ConstantModel, database: DatabaseModel, srvRef: ServiceCls): ServiceCls {
    const [modelName, className]: [string, string] = [database.refName, capitalize(database.refName)];
    Object.assign(srvRef.prototype, this.#getDefaultDbServiceMethods(className));
    const getQueryDataFromKey = (queryKey: string, args: any): { query: any; queryOption: any } => {
      const lastArg = args.at(-1);
      const hasQueryOption =
        lastArg &&
        typeof lastArg === "object" &&
        (typeof lastArg.select === "object" ||
          typeof lastArg.skip === "number" ||
          typeof lastArg.limit === "number" ||
          typeof lastArg.sort === "string");
      const queryFn = getFilterInfoByKey(database.filter, queryKey).queryFn;
      if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
      const query = queryFn(...(hasQueryOption ? args.slice(0, -1) : args));
      const queryOption = hasQueryOption ? lastArg : {};
      return { query, queryOption };
    };
    const filterMeta = getFilterMeta(database.filter);
    const queryKeys = Object.keys(filterMeta.query);
    queryKeys.forEach((queryKey) => {
      const filterInfo = getFilterInfoByKey(database.filter, queryKey);
      const queryFn = filterInfo.queryFn;
      if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
      Object.assign(srvRef.prototype, {
        [`list${capitalize(queryKey)}`]: async function (this: DatabaseService, ...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__list(query, queryOption);
        },
        [`listIds${capitalize(queryKey)}`]: async function (this: DatabaseService, ...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__listIds(query, queryOption);
        },
        [`find${capitalize(queryKey)}`]: async function (this: DatabaseService, ...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__find(query, queryOption);
        },
        [`findId${capitalize(queryKey)}`]: async function (this: DatabaseService, ...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__findId(query, queryOption);
        },
        [`pick${capitalize(queryKey)}`]: async function (this: DatabaseService, ...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__pick(query, queryOption);
        },
        [`pickId${capitalize(queryKey)}`]: async function (this: DatabaseService, ...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__pickId(query, queryOption);
        },
        [`exists${capitalize(queryKey)}`]: async function (this: DatabaseService, ...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__exists(query);
        },
        [`count${capitalize(queryKey)}`]: async function (this: DatabaseService, ...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__count(query);
        },
        [`insight${capitalize(queryKey)}`]: async function (this: DatabaseService, ...args: any) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__insight(query);
        },
        [`query${capitalize(queryKey)}`]: function (this: DatabaseService, ...args: any) {
          return queryFn(...args);
        },
      });
    });
    return srvRef;
  }
}
