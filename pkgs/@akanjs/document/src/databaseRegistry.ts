import type { Cls } from "@akanjs/base";
import type { Cnst } from "@akanjs/constant";
import type { HydratedDocument } from "mongoose";

import type { BaseMiddleware } from "./dbDecorators";
import type { FilterCls, FilterInstance } from ".";
import type { ModelCls } from "./loaderInfo";

export interface DatabaseDocumentModelInfo {
  input: Cls;
  doc: Cls;
  model: Cls;
  filter: FilterCls;
  middleware: Cls;
}
export class DatabaseRegistry {
  static #database = new Map<string, DatabaseDocumentModelInfo>();
  static #scalar = new Map<string, Cls>();
  static #modelSets = {
    input: new Set<Cls>(),
    doc: new Set<Cls>(),
    model: new Set<Cls>(),
    filter: new Set<Cls>(),
    middleware: new Set<Cls>(),
    scalar: new Set<Cls>(),
  };
  static #modelRefNameMap = new Map<Cls, string>();
  static getRefName<AllowEmpty extends boolean = false>(
    modelRef: Cls,
    { allowEmpty }: { allowEmpty?: AllowEmpty } = {},
  ): AllowEmpty extends true ? string | undefined : string {
    const refName = this.#modelRefNameMap.get(modelRef);
    if (!refName && !allowEmpty)
      throw new Error(`No ref name for modelRef: ${modelRef}`);
    return refName as AllowEmpty extends true ? string | undefined : string;
  }
  static isInput(modelRef: Cls) {
    return this.#modelSets.input.has(modelRef);
  }
  static isDoc(modelRef: Cls) {
    return this.#modelSets.doc.has(modelRef);
  }
  static isModel(modelRef: Cls) {
    return this.#modelSets.model.has(modelRef);
  }
  static isMiddleware(modelRef: Cls) {
    return this.#modelSets.middleware.has(modelRef);
  }
  static isScalar(modelRef: Cls) {
    return this.#modelSets.scalar.has(modelRef);
  }
  static setDatabase(
    refName: string,
    {
      Input,
      Doc,
      Model,
      Middleware,
      Filter,
    }: Database<any, any, any, any, any, any, any, any>,
  ) {
    if (!this.#database.has(refName))
      this.#database.set(refName, {
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
    { allowEmpty }: { allowEmpty?: AllowEmpty } = {},
  ): AllowEmpty extends true
    ? DatabaseDocumentModelInfo | undefined
    : DatabaseDocumentModelInfo {
    const info = this.#database.get(refName);
    if (!info && !allowEmpty)
      throw new Error(`No database document model info for ${refName}`);
    return info as AllowEmpty extends true
      ? DatabaseDocumentModelInfo | undefined
      : DatabaseDocumentModelInfo;
  }
  static setScalar(refName: string, Model: Cls) {
    if (this.#scalar.has(refName)) return;
    this.#scalar.set(refName, Model);
    this.#modelRefNameMap.set(Model, refName);
  }
  static getScalar<AllowEmpty extends boolean = false>(
    refName: string,
    { allowEmpty }: { allowEmpty?: AllowEmpty } = {},
  ): AllowEmpty extends true ? Cls | undefined : Cls {
    const model = this.#scalar.get(refName);
    if (!model && !allowEmpty)
      throw new Error(`No scalar model for ${refName}`);
    return model as AllowEmpty extends true ? Cls | undefined : Cls;
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
    Doc extends HydratedDocument<any>,
    Model,
    Middleware extends BaseMiddleware,
    Obj,
    Insight,
    Filter extends FilterInstance,
  >(
    refName: T,
    Input: Cls<Input>,
    Doc: Cls<Doc>,
    Model: ModelCls<Model>,
    Middleware: Cls<Middleware>,
    Obj: Cnst<Obj>,
    Insight: Cnst<Insight>,
    Filter: FilterCls<Filter>,
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
    Model: Cls<Model>,
  ): { refName: T; Model: Cls<Model> } {
    const scalarInfo = { refName, Model };
    this.setScalar(refName, Model);
    return scalarInfo;
  }
}

export interface Database<
  T extends string,
  Input,
  Doc extends HydratedDocument<any>,
  Model,
  Middleware extends BaseMiddleware,
  Obj,
  Insight,
  Filter extends FilterInstance,
> {
  refName: T;
  Input: Cls<Input>;
  Doc: Cls<Doc>;
  Model: ModelCls<Model>;
  Middleware: Cls<Middleware>;
  Obj: Cnst<Obj>;
  Insight: Cnst<Insight>;
  Filter: FilterCls<Filter>;
}
