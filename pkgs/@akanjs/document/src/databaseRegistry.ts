import type { Cls } from "@akanjs/base";
import type { ConstantCls } from "@akanjs/constant";
import type { HydratedDocument } from "mongoose";

import type { BaseMiddleware } from "./beyond";
import type { DatabaseCls, FilterCls, FilterInstance } from ".";
import type { ModelCls } from "./loaderInfo";

export interface DatabaseModel {
  refName: string;
  input: DatabaseCls;
  doc: DatabaseCls;
  model: ModelCls;
  filter: FilterCls;
  middleware: Cls;
}
export class DatabaseRegistry {
  static #database = new Map<string, DatabaseModel>();
  static #scalar = new Map<string, DatabaseCls>();
  static #modelSets = {
    input: new Set<DatabaseCls>(),
    doc: new Set<DatabaseCls>(),
    model: new Set<DatabaseCls>(),
    filter: new Set<DatabaseCls>(),
    middleware: new Set<Cls>(),
    scalar: new Set<DatabaseCls>(),
  };
  static #modelRefNameMap = new Map<Cls, string>();
  static getRefName<AllowEmpty extends boolean = false>(
    modelRef: Cls,
    { allowEmpty }: { allowEmpty?: AllowEmpty } = {}
  ): AllowEmpty extends true ? string | undefined : string {
    const refName = this.#modelRefNameMap.get(modelRef);
    if (!refName && !allowEmpty) throw new Error(`No ref name for modelRef: ${modelRef}`);
    return refName as AllowEmpty extends true ? string | undefined : string;
  }
  static isInput(modelRef: DatabaseCls) {
    return this.#modelSets.input.has(modelRef);
  }
  static isDoc(modelRef: DatabaseCls) {
    return this.#modelSets.doc.has(modelRef);
  }
  static isModel(modelRef: DatabaseCls) {
    return this.#modelSets.model.has(modelRef);
  }
  static isMiddleware(modelRef: DatabaseCls) {
    return this.#modelSets.middleware.has(modelRef);
  }
  static isScalar(modelRef: DatabaseCls) {
    return this.#modelSets.scalar.has(modelRef);
  }
  static setDatabase(refName: string, { Input, Doc, Model, Middleware, Filter }: Database) {
    if (!this.#database.has(refName))
      this.#database.set(refName, {
        refName,
        input: Input,
        doc: Doc,
        model: Model,
        middleware: Middleware,
        filter: Filter,
      });
    [Input, Doc, Model, Middleware].forEach((modelRef) => {
      this.#modelRefNameMap.set(modelRef, refName);
    });
  }
  static getDatabase<AllowEmpty extends boolean = false>(
    refName: string,
    { allowEmpty }: { allowEmpty?: AllowEmpty } = {}
  ): AllowEmpty extends true ? DatabaseModel | undefined : DatabaseModel {
    const info = this.#database.get(refName);
    if (!info && !allowEmpty) throw new Error(`No database document model info for ${refName}`);
    return info as AllowEmpty extends true ? DatabaseModel | undefined : DatabaseModel;
  }
  static setScalar(refName: string, Model: DatabaseCls) {
    if (this.#scalar.has(refName)) return;
    this.#scalar.set(refName, Model);
    this.#modelRefNameMap.set(Model, refName);
  }
  static getScalar<AllowEmpty extends boolean = false>(
    refName: string,
    { allowEmpty }: { allowEmpty?: AllowEmpty } = {}
  ): AllowEmpty extends true ? DatabaseCls | undefined : DatabaseCls {
    const model = this.#scalar.get(refName);
    if (!model && !allowEmpty) throw new Error(`No scalar model for ${refName}`);
    return model as AllowEmpty extends true ? DatabaseCls | undefined : DatabaseCls;
  }
  // TODO: Serialize filter query map to support admin page
  // getSerializedFilter(refName: string) {
  //   const database = this.database.get(refName);
  //   if (!database) return undefined;
  //   const sortKeys = Object.keys(getFilterSortMap(database.filter));
  //   const filterQueryMap = getFilterQueryMap(database.filter);
  //   return { filter: {}, sortKeys };
  // },

  static buildModel<
    T extends string,
    Input,
    Doc extends HydratedDocument,
    Model,
    Middleware extends BaseMiddleware,
    Obj,
    Insight,
    Filter extends FilterInstance,
  >(
    refName: T,
    Input: DatabaseCls<Input>,
    Doc: DatabaseCls<Doc>,
    Model: ModelCls<Model>,
    Middleware: Cls<Middleware>,
    Obj: ConstantCls<Obj>,
    Insight: ConstantCls<Insight>,
    Filter: FilterCls<Filter>
  ): Database<T, Input, Doc, Model, Middleware, Obj, Insight, Filter> {
    const dbInfo = {
      refName,
      Input,
      Doc,
      Model,
      Middleware,
      Obj,
      Insight,
      Filter,
    } as Database<T, Input, Doc, Model, Middleware, Obj, Insight, Filter>;
    this.setDatabase(refName, dbInfo);
    return dbInfo;
  }

  static buildScalar<T extends string, Model>(
    refName: T,
    Model: DatabaseCls<Model>
  ): { refName: T; Model: DatabaseCls<Model> } {
    const scalarInfo = { refName, Model };
    this.setScalar(refName, Model);
    return scalarInfo;
  }
}

export interface Database<
  T extends string = string,
  Input = any,
  Doc extends HydratedDocument = HydratedDocument,
  Model = any,
  Middleware extends BaseMiddleware = BaseMiddleware,
  Obj = any,
  Insight = any,
  Filter extends FilterInstance = FilterInstance,
> {
  refName: T;
  Input: DatabaseCls<Input>;
  Doc: DatabaseCls<Doc>;
  Model: ModelCls<Model>;
  Middleware: Cls<Middleware>;
  Obj: ConstantCls<Obj>;
  Insight: ConstantCls<Insight>;
  Filter: FilterCls<Filter>;
}
