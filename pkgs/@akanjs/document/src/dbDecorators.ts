/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BaseObject,
  type MergeAllActionTypes,
  type PromiseOrObject,
  type Cls,
} from "@akanjs/base";
import type {
  ConstantModel,
  DocumentModel,
  FieldObject,
  QueryOf,
} from "@akanjs/constant";
import type {
  HydratedDocument,
  Model as MongooseModel,
  PipelineStage,
  ProjectionType,
  Schema,
} from "mongoose";

import type { ExtractQuery, ExtractSort, FilterCls, FilterInstance } from ".";
import type { DatabaseModel } from "./database";
import {
  type ExtractLoaderInfoObject,
  type LoaderBuilder,
  makeLoaderBuilder,
  LOADER_META_KEY,
  type ModelCls,
} from "./loaderInfo";

export interface DefaultDocMtds<TDocument> {
  refresh(): Promise<this>;
  set(data: Partial<TDocument>): this;
  save(): Promise<this>;
}
type HydratedDocumentWithId<TDocument> = Omit<
  HydratedDocument<TDocument, DefaultDocMtds<TDocument>>,
  "id" | "set" | "save"
> & { id: string } & DefaultDocMtds<TDocument>;
export type Doc<M> = HydratedDocumentWithId<DocumentModel<M>>;

export type CRUDEventType = "create" | "update" | "remove";
export type SaveEventType = "save" | CRUDEventType;

interface DefaultMdlStats<
  TDocument,
  TSchema,
  _Partial extends Partial<TSchema> = Partial<TSchema>,
  _FilterQuery extends QueryOf<TSchema> = QueryOf<TSchema>,
  _Projection extends ProjectionType<TSchema> = ProjectionType<TSchema>,
> {
  pickOneAndWrite: (
    query: _FilterQuery,
    rawData: _Partial,
  ) => Promise<TDocument>;
  pickAndWrite: (docId: string, rawData: _Partial) => Promise<TDocument>;
  pickOne: (
    query: _FilterQuery,
    projection?: _Projection,
  ) => Promise<TDocument>;
  pickById: (
    docId: string | undefined,
    projection?: _Projection,
  ) => Promise<TDocument>;
  sample: (
    query: _FilterQuery,
    size?: number,
    aggregations?: PipelineStage[],
  ) => Promise<TDocument[]>;
  sampleOne: (
    query: _FilterQuery,
    aggregations?: PipelineStage[],
  ) => Promise<TDocument | null>;
  preSaveListenerSet: Set<
    (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
  >;
  postSaveListenerSet: Set<
    (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
  >;
  preCreateListenerSet: Set<
    (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
  >;
  postCreateListenerSet: Set<
    (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
  >;
  preUpdateListenerSet: Set<
    (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
  >;
  postUpdateListenerSet: Set<
    (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
  >;
  preRemoveListenerSet: Set<
    (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
  >;
  postRemoveListenerSet: Set<
    (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
  >;
  listenPre: (
    eventType: SaveEventType,
    listener: (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>,
  ) => () => void;
  listenPost: (
    eventType: SaveEventType,
    listener: (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>,
  ) => () => void;
}
export type Mdl<Doc extends HydratedDocument<any>, Raw> = MongooseModel<
  Raw,
  unknown,
  unknown,
  unknown,
  Doc
> &
  DefaultMdlStats<Doc, DocumentModel<Raw>>;
export type SchemaOf<Mdl, Doc> = Schema<null, Mdl, Doc, undefined, null, Mdl>;
export interface BaseMiddleware {
  onSchema: (schema: SchemaOf<any, any>) => void;
}

const Model = <
  Doc,
  Filter extends FilterInstance,
  T extends string,
  Input,
  Obj,
  Full,
  Light,
  Insight,
  AddDbModels extends Cls[],
  _CapitalizedT extends string,
  _Default,
  _DefaultInput,
  _DefaultState,
  _DefaultStateInput,
  _DefaultInsight,
  _PurifiedInput,
  _Doc,
  _DocInput,
  _QueryOfDoc,
  _Query = ExtractQuery<Filter>,
  _Sort = ExtractSort<Filter>,
  _DatabaseModel = DatabaseModel<
    T,
    _DocInput,
    Doc,
    Full,
    Insight,
    Filter,
    _CapitalizedT,
    _QueryOfDoc,
    _Query,
    _Sort
  >,
  _LoaderBuilder extends LoaderBuilder<_Doc> = LoaderBuilder<_Doc>,
>(
  docRef: Cls<Doc>,
  filterRef: FilterCls<Filter>,
  cnst: ConstantModel<
    T,
    Input,
    Obj,
    Full,
    Light,
    Insight,
    _CapitalizedT,
    _Default,
    _DefaultInput,
    _DefaultState,
    _DefaultStateInput,
    _DefaultInsight,
    _PurifiedInput,
    _Doc,
    _DocInput,
    _QueryOfDoc
  >,
  loaderBuilder: _LoaderBuilder,
  ...addMdls: [...AddDbModels]
): ModelCls<
  MergeAllActionTypes<AddDbModels, keyof _DatabaseModel & string> &
    _DatabaseModel,
  ReturnType<_LoaderBuilder>
> => {
  const loaderInfoMap = loaderBuilder(makeLoaderBuilder());
  const DefaultModel = Object.assign(class DefaultModel {}, {
    [LOADER_META_KEY]: loaderInfoMap,
  });
  return DefaultModel as any;
};
export const into = Model;

export const by = <
  Model,
  AddDbModels extends Cls[],
  _DocModel = Model extends BaseObject ? Doc<Model> : DocumentModel<Model>,
>(
  modelRef: Cls<Model, { field: FieldObject }>,
  ...addRefs: AddDbModels
): Cls<
  MergeAllActionTypes<AddDbModels, keyof _DocModel & string> & _DocModel
> => {
  Object.assign(
    modelRef.field,
    ...addRefs.map(
      (addRef) => (addRef as Cls<Model, { field: FieldObject }>).field,
    ),
  );
  return modelRef as any;
};

export const beyond = <DbModel, Doc>(model: Cls<DbModel>, doc: Cls<Doc>) => {
  return class Middleware {
    onSchema(schema: SchemaOf<DbModel, Doc>) {
      //
    }
  };
};
