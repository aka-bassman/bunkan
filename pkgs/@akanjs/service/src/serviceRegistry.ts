import type { Cls, PromiseOrObject } from "@akanjs/base";

import { INJECT_META_KEY } from "./injectInfo";
import { Logger, applyMixins, capitalize } from "@akanjs/common";
import {
  getFilterMeta,
  type BaseMiddleware,
  type CRUDEventType,
  type DataInputOf,
  type Database,
  type DatabaseModel,
  type ExtractQuery,
  type ExtractSort,
  type FilterInstance,
  type FindQueryOption,
  type ListQueryOption,
  type SaveEventType,
  getFilterInfoByKey,
} from "@akanjs/document";
import type { DatabaseService } from "./types";
import type { HydratedDocument } from "mongoose";
import type { QueryOf } from "@akanjs/constant";
import type { ServiceCls } from "./serve";
import type { AdaptorCls } from "./adapt";

export class ServiceRegistry {
  static #database = new Map<string, ServiceCls>();
  static #plain = new Map<string, ServiceCls>();
  static #adaptor = new Map<string, AdaptorCls>();
  static setDatabase(refName: string, service: ServiceCls) {
    const existingSrv = this.#database.get(refName);
    if (existingSrv) {
      applyMixins(existingSrv, [service]);
      Object.assign(existingSrv[INJECT_META_KEY], service[INJECT_META_KEY]);
    } else this.#database.set(refName, service);
  }
  static getDatabase(refName: string) {
    return this.#database.get(refName);
  }
  static setPlain(refName: string, service: ServiceCls) {
    this.#plain.set(refName, service);
  }
  static setAdaptor(refName: string, adaptor: AdaptorCls) {
    this.#adaptor.set(refName, adaptor);
  }
  static register<Srvs extends ServiceCls[]>(
    ...services: Srvs
  ): {
    [K in Srvs[number]["refName"]]: Srvs[number];
  } {
    services.forEach((srvRef) => {
      srvRef.type === "database"
        ? this.setDatabase(srvRef.refName, srvRef)
        : this.setPlain(srvRef.refName, srvRef);
    });
    return Object.fromEntries(
      services.map((srvRef) => [srvRef.refName, srvRef]),
    ) as { [K in Srvs[number]["refName"]]: Srvs[number] };
  }

  static createService<T extends string>(name: T) {
    class LogService {
      logger = new Logger(name);
    }
    return LogService;
  }
  static createModelService<
    T extends string,
    Input,
    Doc extends HydratedDocument<any>,
    Model extends DatabaseModel<
      T,
      Input,
      Doc,
      Obj,
      Insight,
      Filter,
      _CapitalizedT,
      _QueryOfDoc,
      _Query,
      _Sort,
      _DataInputOfDoc,
      _FindQueryOption,
      _ListQueryOption
    >,
    Middleware extends BaseMiddleware,
    Obj,
    Insight,
    Filter extends FilterInstance,
    LibSrvs extends Cls[],
    _CapitalizedT extends string = Capitalize<T>,
    _QueryOfDoc extends QueryOf<Doc> = QueryOf<Doc>,
    _Query extends ExtractQuery<Filter> = ExtractQuery<Filter>,
    _Sort extends ExtractSort<Filter> = ExtractSort<Filter>,
    _DataInputOfDoc extends DataInputOf<Input, Doc> = DataInputOf<Input, Doc>,
    _FindQueryOption extends FindQueryOption<_Sort, Obj> = FindQueryOption<
      _Sort,
      Obj
    >,
    _ListQueryOption extends ListQueryOption<_Sort, Obj> = ListQueryOption<
      _Sort,
      Obj
    >,
  >(
    database: Database<T, Input, Doc, Model, Middleware, Obj, Insight, Filter>,
    ...libSrvRefs: LibSrvs
  ): Cls<DatabaseService<T, Input, Doc, Obj, Model, Insight, Filter, LibSrvs>> {
    const [modelName, className]: [string, string] = [
      database.refName,
      capitalize(database.refName),
    ];
    const getDefaultDbService = () => {
      class DbService {
        logger!: Logger;
        __databaseModel!: Model;

        async __get(id: string) {
          return await this.__databaseModel.__get(id);
        }
        async [`get${className}`](id: string) {
          return this.__get(id);
        }
        async __load(id?: string) {
          return await this.__databaseModel.__load(id);
        }
        async [`load${className}`](id?: string) {
          return this.__load(id);
        }
        async __loadMany(ids: string[]) {
          return await this.__databaseModel.__loadMany(ids);
        }
        async [`load${className}Many`](ids: string[]) {
          return this.__loadMany(ids);
        }
        async __list(
          query: _QueryOfDoc,
          queryOption?: _ListQueryOption,
        ): Promise<Doc[]> {
          return await this.__databaseModel.__list(query, queryOption);
        }
        async __listIds(
          query: _QueryOfDoc,
          queryOption?: _ListQueryOption,
        ): Promise<string[]> {
          return await this.__databaseModel.__listIds(query, queryOption);
        }
        async __find(
          query: _QueryOfDoc,
          queryOption?: _FindQueryOption,
        ): Promise<Doc | null> {
          return await this.__databaseModel.__find(query, queryOption);
        }
        async __findId(
          query: _QueryOfDoc,
          queryOption?: _FindQueryOption,
        ): Promise<string | null> {
          return await this.__databaseModel.__findId(query, queryOption);
        }
        async __pick(
          query: _QueryOfDoc,
          queryOption?: _FindQueryOption,
        ): Promise<Doc> {
          return await this.__databaseModel.__pick(query, queryOption);
        }
        async __pickId(
          query: _QueryOfDoc,
          queryOption?: _FindQueryOption,
        ): Promise<string> {
          return await this.__databaseModel.__pickId(query, queryOption);
        }
        async __exists(query: _QueryOfDoc): Promise<string | null> {
          return await this.__databaseModel.__exists(query);
        }
        async __count(query: _QueryOfDoc): Promise<number> {
          return await this.__databaseModel.__count(query);
        }
        async __insight(query: _QueryOfDoc): Promise<Insight> {
          return await this.__databaseModel.__insight(query);
        }
        async __search(
          searchText: string,
          queryOption?: _ListQueryOption,
        ): Promise<{ docs: Doc[]; count: number }> {
          // TODO: make query to searchText
          return await this.__databaseModel.__search(searchText, queryOption);
        }
        async [`search${className}`](
          searchText: string,
          queryOption?: _ListQueryOption,
        ) {
          return this.__search(searchText, queryOption);
        }
        async __searchDocs(
          searchText: string,
          queryOption?: _ListQueryOption,
        ): Promise<Doc[]> {
          return await this.__databaseModel.__searchDocs(
            searchText,
            queryOption,
          );
        }
        async [`searchDocs${className}`](
          searchText: string,
          queryOption?: _ListQueryOption,
        ) {
          return this.__searchDocs(searchText, queryOption);
        }
        async __searchCount(searchText: string): Promise<number> {
          return await this.__databaseModel.__searchCount(searchText);
        }
        async [`searchCount${className}`](searchText: string) {
          return this.__searchCount(searchText);
        }
        async _preCreate(data: _DataInputOfDoc): Promise<_DataInputOfDoc> {
          return data;
        }
        async _postCreate(doc: Doc): Promise<Doc> {
          return doc;
        }
        async _preUpdate(
          id: string,
          data: Partial<Doc>,
        ): Promise<Partial<Doc>> {
          return data;
        }
        async _postUpdate(doc: Doc): Promise<Doc> {
          return doc;
        }
        async _preRemove(id: string) {
          return;
        }
        async _postRemove(doc: Doc): Promise<Doc> {
          return doc;
        }
        listenPre(
          type: SaveEventType,
          listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>,
        ) {
          return this.__databaseModel.listenPre(type, listener);
        }
        listenPost(
          type: SaveEventType,
          listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>,
        ) {
          return this.__databaseModel.listenPost(type, listener);
        }
        async __create(data: _DataInputOfDoc): Promise<Doc> {
          const input = await this._preCreate(data);
          const doc = await this.__databaseModel.__create(input);
          return await this._postCreate(doc);
        }
        async [`create${className}`](data: _DataInputOfDoc): Promise<Doc> {
          return this.__create(data);
        }
        async __update(id: string, data: _DataInputOfDoc): Promise<Doc> {
          const input = await this._preUpdate(id, data);
          const doc = await this.__databaseModel.__update(id, input);
          return await this._postUpdate(doc);
        }
        async [`update${className}`](
          id: string,
          data: _DataInputOfDoc,
        ): Promise<Doc> {
          return this.__update(id, data);
        }
        async __remove(id: string): Promise<Doc> {
          await this._preRemove(id);
          const doc = await this.__databaseModel.__remove(id);
          return await this._postRemove(doc);
        }
        async [`remove${className}`](id: string): Promise<Doc> {
          return this.__remove(id);
        }
      }
      return DbService;
    };
    const getQueryDataFromKey = (
      queryKey: string,
      args: any,
    ): { query: any; queryOption: any } => {
      const lastArg = args.at(-1);
      const hasQueryOption =
        lastArg &&
        typeof lastArg === "object" &&
        (typeof lastArg.select === "object" ||
          typeof lastArg.skip === "number" ||
          typeof lastArg.limit === "number" ||
          typeof lastArg.sort === "string");
      const queryFn = getFilterInfoByKey(database.Filter, queryKey).queryFn;
      if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
      const query = queryFn(...(hasQueryOption ? args.slice(0, -1) : args));
      const queryOption = hasQueryOption ? lastArg : {};
      return { query, queryOption };
    };
    const filterMeta = getFilterMeta(database.Filter);
    const DbService =
      libSrvRefs.length > 0 ? class ExtendedService {} : getDefaultDbService();
    const queryKeys = Object.keys(filterMeta.query);
    queryKeys.forEach((queryKey) => {
      const filterInfo = getFilterInfoByKey(database.Filter, queryKey);
      const queryFn = filterInfo.queryFn;
      if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
      Object.assign(DbService.prototype, {
        [`list${capitalize(queryKey)}`]: async function (
          this: DatabaseService<T, any, any, any, any, any, any, any>,
          ...args: any
        ) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__list(query, queryOption);
        },
        [`listIds${capitalize(queryKey)}`]: async function (
          this: DatabaseService<any, any, any, any, any, any, any, any>,
          ...args: any
        ) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__listIds(query, queryOption);
        },
        [`find${capitalize(queryKey)}`]: async function (
          this: DatabaseService<any, any, any, any, any, any, any, any>,
          ...args: any
        ) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__find(query, queryOption);
        },
        [`findId${capitalize(queryKey)}`]: async function (
          this: DatabaseService<any, any, any, any, any, any, any, any>,
          ...args: any
        ) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__findId(query, queryOption);
        },
        [`pick${capitalize(queryKey)}`]: async function (
          this: DatabaseService<any, any, any, any, any, any, any, any>,
          ...args: any
        ) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__pick(query, queryOption);
        },
        [`pickId${capitalize(queryKey)}`]: async function (
          this: DatabaseService<any, any, any, any, any, any, any, any>,
          ...args: any
        ) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__pickId(query, queryOption);
        },
        [`exists${capitalize(queryKey)}`]: async function (
          this: DatabaseService<T, any, any, any, any, any, any, any>,
          ...args: any
        ) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__exists(query);
        },
        [`count${capitalize(queryKey)}`]: async function (
          this: DatabaseService<any, any, any, any, any, any, any>,
          ...args: any
        ) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__count(query);
        },
        [`insight${capitalize(queryKey)}`]: async function (
          this: DatabaseService<any, any, any, any, any, any, any>,
          ...args: any
        ) {
          const { query, queryOption } = getQueryDataFromKey(queryKey, args);
          return this.__insight(query);
        },
        [`query${capitalize(queryKey)}`]: function (
          this: DatabaseService<any, any, any, any, any, any, any>,
          ...args: any
        ) {
          return queryFn(...args);
        },
      });
    });

    return DbService as any;
  }
}
