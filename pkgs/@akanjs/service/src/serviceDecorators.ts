/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */

import type { BackendEnv, MergeAllTypes, Prettify, PromiseOrObject, Cls, UnCls } from "@akanjs/base";
import { applyMixins, capitalize, Logger, lowerlize } from "@akanjs/common";
import type { DocumentModel, FieldToValue, QueryOf } from "@akanjs/constant";
import {
  getFilterInfoByKey,
  type BaseMiddleware,
  type CRUDEventType,
  type Database,
  type DatabaseModel,
  type DataInputOf,
  type Doc as DbDoc,
  type ExtractQuery,
  type ExtractSort,
  type FilterInstance,
  type FindQueryOption,
  type GetDocObject,
  type ListQueryOption,
  type QueryMethodPart,
  type SaveEventType,
  getFilterMeta,
} from "@akanjs/document";
import { EndpointInfo, InternalInfo } from "@akanjs/signal";
import type { Job, Queue as BullQueue } from "bull";
import type { HydratedDocument } from "mongoose";
import type { Server } from "socket.io";

import { type ExtractInjectInfoObject, type InjectBuilder, injectionBuilder } from "./injectInfo";
import type { DatabaseService } from "./types";

export type GetServices<AllSrvs extends { [key: string]: Cls | undefined }> = {
  [K in keyof AllSrvs]: UnCls<NonNullable<AllSrvs[K]>>;
};

export class ServiceStorage {}

interface ServiceMeta {
  refName: string;
  name: string;
  enabled: boolean;
}

// export const getServiceRefs = (refName: string) => {
//   return (Reflect.getMetadata(refName, ServiceStorage.prototype) ??
//     []) as Cls[];
// };
// export const getAllServiceRefs = (): Cls[] => {
//   const keys = Reflect.getMetadataKeys(ServiceStorage.prototype);
//   return keys.map((key) => getServiceRefs(key)[0]);
// };
// export const setServiceRefs = (refName: string, services: Cls[]) => {
//   Reflect.defineMetadata(refName, services, ServiceStorage.prototype);
// };
// const setServiceMeta = (srvRef: Cls, meta: ServiceMeta) => {
//   Reflect.defineMetadata("akan:service", meta, srvRef.prototype as object);
// };
// export const getServiceMeta = (srvRef: Cls) => {
//   return Reflect.getMetadata("akan:service", srvRef.prototype as object) as
//     | ServiceMeta
//     | undefined;
// };
// export const isServiceEnabled = (srvRef: Cls) => {
//   const meta = getServiceMeta(srvRef);
//   return meta?.enabled ?? false;
// };
// export interface ServiceInjectMeta {
//   type: "Db" | "Srv" | "Use" | "Env" | "Gen" | "Sig" | (string & {});
//   name: string;
//   key: string;
//   generateFactory?: (...args: any[]) => any;
// }
// const getServiceInjectMetaMapOnPrototype = (prototype: object) => {
//   return (
//     (Reflect.getMetadata("inject", prototype) as
//       | Map<string, ServiceInjectMeta>
//       | undefined) ?? new Map<string, ServiceInjectMeta>()
//   );
// };
// const setServiceInjectMetaMapOnPrototype = (
//   prototype: object,
//   injectMetaMap: Map<string, ServiceInjectMeta>,
// ) => {
//   Reflect.defineMetadata("inject", injectMetaMap, prototype);
// };

// export function Srv(name?: string): PropertyDecorator {
//   return function (prototype: object, key: string) {
//     const metadataMap = getServiceInjectMetaMapOnPrototype(prototype);
//     metadataMap.set(key, { type: "Srv", key, name: name ?? capitalize(key) });
//     setServiceInjectMetaMapOnPrototype(prototype, metadataMap);
//   };
// }
// export function Use(name?: string): PropertyDecorator {
//   return function (prototype: object, key: string) {
//     const metadataMap = getServiceInjectMetaMapOnPrototype(prototype);
//     metadataMap.set(key, { type: "Use", key, name: name ?? capitalize(key) });
//     setServiceInjectMetaMapOnPrototype(prototype, metadataMap);
//   };
// }
// export function Env(envKey: string, generateFactory?: (envValue: string, options: any) => any): PropertyDecorator {
//   return function (prototype: object, key: string) {
//     const metadataMap = getServiceInjectMetaMapOnPrototype(prototype);
//     metadataMap.set(key, { type: "Env", key, name: envKey, generateFactory });
//     setServiceInjectMetaMapOnPrototype(prototype, metadataMap);
//   };
// }
// export function Gen(generateFactory: (options: any) => any): PropertyDecorator {
//   return function (prototype: object, key: string) {
//     const metadataMap = getServiceInjectMetaMapOnPrototype(prototype);
//     metadataMap.set(key, { type: "Gen", key, name: capitalize(key), generateFactory });
//     setServiceInjectMetaMapOnPrototype(prototype, metadataMap);
//   };
// }
// export function Sig(name?: string): PropertyDecorator {
//   return function (prototype: object, key: string) {
//     const metadataMap = getServiceInjectMetaMapOnPrototype(prototype);
//     metadataMap.set(key, { type: "Sig", key, name: name ?? capitalize(key) });
//     setServiceInjectMetaMapOnPrototype(prototype, metadataMap);
//   };
// }

// export interface InternalSignalReturnType {
//   __Returns__: "Done";
// }
// export interface EndpointSignalReturnType {
//   __Returns__: "Subscribe";
// }

export type InternalServerSignal<Internal> = {
  [K in keyof Internal as Internal[K] extends InternalInfo<"process", any, any, any, any, any, any>
    ? K
    : never]: Internal[K] extends InternalInfo<"process", any, infer Args, any, any, infer Returns, any>
    ? (...args: Args) => Promise<Job<FieldToValue<Returns>>>
    : never;
} & { queue: BullQueue };

export type EndpointServerSignal<Endpoint> = {
  [K in keyof Endpoint as Endpoint[K] extends EndpointInfo<"pubsub", any, any, any, any, any, any>
    ? K
    : never]: Endpoint[K] extends EndpointInfo<"pubsub", any, any, infer Args, any, any, infer Returns, any, any>
    ? (...args: [...Args, data: DocumentModel<FieldToValue<Returns>>]) => void
    : never;
} & { websocket: Server };

// export function Db(name: string): PropertyDecorator {
//   return function (prototype: object, key: string) {
//     const metadataMap = getServiceInjectMetaMapOnPrototype(prototype);
//     metadataMap.set(key, { type: "Db", key, name });
//     setServiceInjectMetaMapOnPrototype(prototype, metadataMap);
//   };
// }
// TODO: Migrate from Nestjs to Raw Bun code. 서비스 클래스를 실제 사용가능하게 변환하는 로직, ServiceRegistry에 통합 필요
// export const serviceOf = (target: Cls) => {
//   const serviceMeta = getServiceMeta(target);
//   if (!serviceMeta) throw new Error(`Service Meta of ${target.name} not found`);
//   const srvRefs = getServiceRefs(serviceMeta.name);
//   const srvRef =
//     srvRefs.length === 1 ? srvRefs[0] : ExtSrvs(srvRefs[0], [target]);
//   const injectMetaMap = getServiceInjectMetaMapOnPrototype(srvRef.prototype);
//   for (const injectMeta of [...injectMetaMap.values()]) {
//     if (injectMeta.type === "Db")
//       InjectModel(injectMeta.name)(srvRef.prototype as object, injectMeta.key);
//     else if (injectMeta.type === "Use")
//       Inject(injectMeta.name)(srvRef.prototype as object, injectMeta.key);
//     else if (injectMeta.type === "Srv") {
//       const services = getServiceRefs(injectMeta.name);
//       if (!services.length)
//         throw new Error(`Service ${injectMeta.name} not found`);
//       Inject(services.at(0))(srvRef.prototype as object, injectMeta.key);
//     } else if (injectMeta.type === "Env")
//       Inject(injectMeta.name)(srvRef.prototype as object, injectMeta.key);
//     else if (injectMeta.type === "Gen")
//       Inject(injectMeta.name)(srvRef.prototype as object, injectMeta.key);
//     else if (injectMeta.type === "Sig")
//       Inject(injectMeta.name)(srvRef.prototype as object, injectMeta.key);
//   }
//   InjectConnection()(srvRef.prototype as object, "connection"); // only for internal use
//   Injectable()(srvRef);
//   return srvRef;
// };

// // TODO: Migrate from Nestjs to Raw Bun code. 서비스 클래스를 실제 사용가능하게 변환하는 로직, ServiceRegistry에 통합 필요
// export function MixSrvs<T extends Cls[]>(
//   ...services: [...T]
// ): Cls<MergeAllTypes<T>> {
//   if (services.length === 0)
//     throw new Error("MixSrvs requires at least one service");

//   const [baseService, ...restServices] = services;
//   class Mix extends (baseService as any) {}

//   const injectMetadataMap = new Map(
//     restServices.reduce((acc, srvRef) => {
//       const injectMetadataMap = getServiceInjectMetaMapOnPrototype(srvRef);
//       applyMixins(Mix, [srvRef]);
//       return [...acc, ...injectMetadataMap];
//     }, []),
//   );

//   setServiceInjectMetaMapOnPrototype(Mix.prototype, injectMetadataMap);
//   return Mix as Cls<MergeAllTypes<T>>;
// }

// // TODO: Migrate from Nestjs to Raw Bun code. 서비스 클래스를 실제 사용가능하게 변환하는 로직, ServiceRegistry에 통합 필요
// function ExtSrvs(baseSrv: Cls, extSrvs: Cls[]): Cls {
//   const injectMetadataMap = new Map(
//     [baseSrv, ...extSrvs].reduce((acc, srvRef: Cls) => {
//       const injectMetadataMap = getServiceInjectMetaMapOnPrototype(
//         srvRef.prototype,
//       );
//       return [...acc, ...injectMetadataMap];
//     }, []),
//   );
//   setServiceInjectMetaMapOnPrototype(baseSrv.prototype, injectMetadataMap);
//   return applyMixins(baseSrv, extSrvs);
// }

// export const LogService = <T extends string>(name: T) => {
//   class LogService {
//     logger = new Logger(name);
//   }
//   return LogService;
// };

// export const DbService = <
//   T extends string,
//   Input,
//   Doc extends HydratedDocument<any>,
//   Model extends DatabaseModel<
//     T,
//     Input,
//     Doc,
//     Obj,
//     Insight,
//     Filter,
//     _CapitalizedT,
//     _QueryOfDoc,
//     _Query,
//     _Sort,
//     _DataInputOfDoc,
//     _FindQueryOption,
//     _ListQueryOption
//   >,
//   Middleware extends BaseMiddleware,
//   Obj,
//   Insight,
//   Filter extends FilterInstance,
//   LibSrvs extends Cls[],
//   _CapitalizedT extends string = Capitalize<T>,
//   _QueryOfDoc extends QueryOf<Doc> = QueryOf<Doc>,
//   _Query extends ExtractQuery<Filter> = ExtractQuery<Filter>,
//   _Sort extends ExtractSort<Filter> = ExtractSort<Filter>,
//   _DataInputOfDoc extends DataInputOf<Input, Doc> = DataInputOf<Input, Doc>,
//   _FindQueryOption extends FindQueryOption<_Sort, Obj> = FindQueryOption<
//     _Sort,
//     Obj
//   >,
//   _ListQueryOption extends ListQueryOption<_Sort, Obj> = ListQueryOption<
//     _Sort,
//     Obj
//   >,
// >(
//   database: Database<T, Input, Doc, Model, Middleware, Obj, Insight, Filter>,
//   ...libSrvRefs: LibSrvs
// ): Cls<
//   DatabaseService<T, Input, Doc, Obj, Model, Insight, Filter, LibSrvs>
// > => {
// const [modelName, className]: [string, string] = [
//   database.refName,
//   capitalize(database.refName),
// ];
// const getDefaultDbService = () => {
//   class DbService {
//     logger!: Logger;
//     __databaseModel!: Model;

//     async __get(id: string) {
//       return await this.__databaseModel.__get(id);
//     }
//     async [`get${className}`](id: string) {
//       return this.__get(id);
//     }
//     async __load(id?: string) {
//       return await this.__databaseModel.__load(id);
//     }
//     async [`load${className}`](id?: string) {
//       return this.__load(id);
//     }
//     async __loadMany(ids: string[]) {
//       return await this.__databaseModel.__loadMany(ids);
//     }
//     async [`load${className}Many`](ids: string[]) {
//       return this.__loadMany(ids);
//     }
//     async __list(
//       query: _QueryOfDoc,
//       queryOption?: _ListQueryOption,
//     ): Promise<Doc[]> {
//       return await this.__databaseModel.__list(query, queryOption);
//     }
//     async __listIds(
//       query: _QueryOfDoc,
//       queryOption?: _ListQueryOption,
//     ): Promise<string[]> {
//       return await this.__databaseModel.__listIds(query, queryOption);
//     }
//     async __find(
//       query: _QueryOfDoc,
//       queryOption?: _FindQueryOption,
//     ): Promise<Doc | null> {
//       return await this.__databaseModel.__find(query, queryOption);
//     }
//     async __findId(
//       query: _QueryOfDoc,
//       queryOption?: _FindQueryOption,
//     ): Promise<string | null> {
//       return await this.__databaseModel.__findId(query, queryOption);
//     }
//     async __pick(
//       query: _QueryOfDoc,
//       queryOption?: _FindQueryOption,
//     ): Promise<Doc> {
//       return await this.__databaseModel.__pick(query, queryOption);
//     }
//     async __pickId(
//       query: _QueryOfDoc,
//       queryOption?: _FindQueryOption,
//     ): Promise<string> {
//       return await this.__databaseModel.__pickId(query, queryOption);
//     }
//     async __exists(query: _QueryOfDoc): Promise<string | null> {
//       return await this.__databaseModel.__exists(query);
//     }
//     async __count(query: _QueryOfDoc): Promise<number> {
//       return await this.__databaseModel.__count(query);
//     }
//     async __insight(query: _QueryOfDoc): Promise<Insight> {
//       return await this.__databaseModel.__insight(query);
//     }
//     async __search(
//       searchText: string,
//       queryOption?: _ListQueryOption,
//     ): Promise<{ docs: Doc[]; count: number }> {
//       // TODO: make query to searchText
//       return await this.__databaseModel.__search(searchText, queryOption);
//     }
//     async [`search${className}`](
//       searchText: string,
//       queryOption?: _ListQueryOption,
//     ) {
//       return this.__search(searchText, queryOption);
//     }

//     async __searchDocs(
//       searchText: string,
//       queryOption?: _ListQueryOption,
//     ): Promise<Doc[]> {
//       return await this.__databaseModel.__searchDocs(searchText, queryOption);
//     }
//     async [`searchDocs${className}`](
//       searchText: string,
//       queryOption?: _ListQueryOption,
//     ) {
//       return this.__searchDocs(searchText, queryOption);
//     }
//     async [`searchCount${className}`](searchText: string) {
//       return this.__searchCount(searchText);
//     }
//     async __searchCount(searchText: string): Promise<number> {
//       return await this.__databaseModel.__searchCount(searchText);
//     }
//     async _preCreate(data: _DataInputOfDoc): Promise<_DataInputOfDoc> {
//       return data;
//     }
//     async _postCreate(doc: Doc): Promise<Doc> {
//       return doc;
//     }
//     async _preUpdate(id: string, data: Partial<Doc>): Promise<Partial<Doc>> {
//       return data;
//     }
//     async _postUpdate(doc: Doc): Promise<Doc> {
//       return doc;
//     }
//     async _preRemove(id: string) {
//       return;
//     }
//     async _postRemove(doc: Doc): Promise<Doc> {
//       return doc;
//     }
//     listenPre(
//       type: SaveEventType,
//       listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>,
//     ) {
//       return this.__databaseModel.listenPre(type, listener);
//     }
//     listenPost(
//       type: SaveEventType,
//       listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>,
//     ) {
//       return this.__databaseModel.listenPost(type, listener);
//     }
//     async __create(data: _DataInputOfDoc): Promise<Doc> {
//       const input = await this._preCreate(data);
//       const doc = await this.__databaseModel.__create(input);
//       return await this._postCreate(doc);
//     }
//     async [`create${className}`](data: _DataInputOfDoc): Promise<Doc> {
//       return this.__create(data);
//     }
//     async __update(id: string, data: _DataInputOfDoc): Promise<Doc> {
//       const input = await this._preUpdate(id, data);
//       const doc = await this.__databaseModel.__update(id, input);
//       return await this._postUpdate(doc);
//     }
//     async [`update${className}`](
//       id: string,
//       data: _DataInputOfDoc,
//     ): Promise<Doc> {
//       return this.__update(id, data);
//     }
//     async __remove(id: string): Promise<Doc> {
//       await this._preRemove(id);
//       const doc = await this.__databaseModel.__remove(id);
//       return await this._postRemove(doc);
//     }
//     async [`remove${className}`](id: string): Promise<Doc> {
//       return this.__remove(id);
//     }
//   }
//   return DbService;
// };
// const getQueryDataFromKey = (
//   queryKey: string,
//   args: any,
// ): { query: any; queryOption: any } => {
//   const lastArg = args.at(-1);
//   const hasQueryOption =
//     lastArg &&
//     typeof lastArg === "object" &&
//     (typeof lastArg.select === "object" ||
//       typeof lastArg.skip === "number" ||
//       typeof lastArg.limit === "number" ||
//       typeof lastArg.sort === "string");
//   const queryFn = getFilterInfoByKey(database.Filter, queryKey).queryFn;
//   if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
//   const query = queryFn(...(hasQueryOption ? args.slice(0, -1) : args));
//   const queryOption = hasQueryOption ? lastArg : {};
//   return { query, queryOption };
// };
// const filterMeta = getFilterMeta(database.Filter);
// const DbService =
//   libSrvRefs.length > 0 ? MixSrvs(...libSrvRefs) : getDefaultDbService();
// const queryKeys = Object.keys(filterMeta.query);
// queryKeys.forEach((queryKey) => {
//   const filterInfo = getFilterInfoByKey(database.Filter, queryKey);
//   const queryFn = filterInfo.queryFn;
//   if (!queryFn) throw new Error(`No query function for key: ${queryKey}`);
//   DbService.prototype[`list${capitalize(queryKey)}`] = async function (
//     ...args: any
//   ) {
//     const { query, queryOption } = getQueryDataFromKey(queryKey, args);
//     return this.__list(query, queryOption);
//   };
//   DbService.prototype[`listIds${capitalize(queryKey)}`] = async function (
//     ...args: any
//   ) {
//     const { query, queryOption } = getQueryDataFromKey(queryKey, args);
//     return this.__listIds(query, queryOption);
//   };
//   DbService.prototype[`find${capitalize(queryKey)}`] = async function (
//     ...args: any
//   ) {
//     const { query, queryOption } = getQueryDataFromKey(queryKey, args);
//     return this.__find(query, queryOption);
//   };
//   DbService.prototype[`findId${capitalize(queryKey)}`] = async function (
//     ...args: any
//   ) {
//     const { query, queryOption } = getQueryDataFromKey(queryKey, args);
//     return this.__findId(query, queryOption);
//   };
//   DbService.prototype[`pick${capitalize(queryKey)}`] = async function (
//     ...args: any
//   ) {
//     const { query, queryOption } = getQueryDataFromKey(queryKey, args);
//     return this.__pick(query, queryOption);
//   };
//   DbService.prototype[`pickId${capitalize(queryKey)}`] = async function (
//     ...args: any
//   ) {
//     const { query, queryOption } = getQueryDataFromKey(queryKey, args);
//     return this.__pickId(query, queryOption);
//   };
//   DbService.prototype[`exists${capitalize(queryKey)}`] = async function (
//     ...args: any
//   ) {
//     const query = queryFn(...args);
//     return this.__exists(query);
//   };
//   DbService.prototype[`count${capitalize(queryKey)}`] = async function (
//     ...args: any
//   ) {
//     const query = queryFn(...args);
//     return this.__count(query);
//   };
//   DbService.prototype[`insight${capitalize(queryKey)}`] = async function (
//     ...args: any
//   ) {
//     const query = queryFn(...args);
//     return this.__insight(query);
//   };
//   DbService.prototype[`query${capitalize(queryKey)}`] = function (
//     ...args: any
//   ) {
//     return queryFn(...args);
//   };
// });

// return DbService as any;
// };

// TODO: Migrate from Nestjs to Raw Bun code. 서비스 클래스를 실제 사용가능하게 변환하는 로직, ServiceRegistry에 통합 필요
// export const makeProvidersForSrv = (srvRef: Cls): Provider[] => {
//   const injectMetaMap = getServiceInjectMetaMapOnPrototype(srvRef.prototype);
//   const providers: Provider[] = [];
//   [...injectMetaMap.values()].forEach((injectMeta) => {
//     if (injectMeta.type === "Env") {
//       const envValue = process.env[injectMeta.name];
//       const generateFactory = injectMeta.generateFactory;
//       if (envValue === undefined)
//         throw new Error(`Environment variable ${injectMeta.name} not found`);
//       providers.push({
//         provide: injectMeta.name,
//         useFactory: (env: BackendEnv) =>
//           generateFactory ? generateFactory(envValue, env) : envValue,
//         inject: ["GLOBAL_ENV"],
//       });
//     } else if (injectMeta.type === "Gen") {
//       const generateFactory = injectMeta.generateFactory;
//       if (!generateFactory)
//         throw new Error(`Generate factory not found for ${injectMeta.key}`);
//       providers.push({
//         provide: injectMeta.name,
//         useFactory: generateFactory,
//         inject: ["GLOBAL_ENV"],
//       });
//     }
//   });
//   return providers;
// };
