import { type GetStateObject, type Cls, PrimitiveScalar, PrimitiveRegistry } from "@akanjs/base";

import { serialize, type ConstantCls, type PurifiedModel, deserialize } from ".";
import type { DefaultOf, DocumentModel, QueryOf } from "./types";

export type ModelType = "input" | "object" | "full" | "light" | "insight" | "filter" | "scalar";

export class ConstantRegistry {
  static database = new Map<string, ConstantModel>();
  static scalar = new Map<string, ScalarConstantModel>();
  static modelRefNameMap = new Map<Cls, string>();
  static getRefName<AllowEmpty extends boolean = false>(
    modelRef: Cls,
    { allowEmpty }: { allowEmpty?: AllowEmpty } = {}
  ): AllowEmpty extends true ? string | undefined : string {
    const refName = this.modelRefNameMap.get(modelRef);
    if (!refName && !allowEmpty) throw new Error(`No ref name for modelRef: ${modelRef}`);
    return refName as AllowEmpty extends true ? string | undefined : string;
  }
  static isObject(modelRef: Cls<any, { modelType?: ModelType }>) {
    return modelRef.modelType === "object";
  }
  static isFull(modelRef: Cls<any, { modelType?: ModelType }>) {
    return modelRef.modelType === "full";
  }
  static isLight(modelRef: Cls<any, { modelType?: ModelType }>) {
    return modelRef.modelType === "light";
  }
  static isInsight(modelRef: Cls<any, { modelType?: ModelType }>) {
    return modelRef.modelType === "insight";
  }
  static isFilter(modelRef: Cls<any, { modelType?: ModelType }>) {
    return modelRef.modelType === "filter";
  }
  static isScalar(modelRef: Cls<any, { modelType?: ModelType }>) {
    return modelRef.modelType === "scalar";
  }
  static setDatabase(refName: string, cnst: ConstantModel) {
    this.database.set(refName, cnst);
  }
  static getDatabase<AllowEmpty extends boolean = false>(
    refName: string,
    { allowEmpty }: { allowEmpty?: AllowEmpty } = {}
  ): AllowEmpty extends true ? ConstantModel | undefined : ConstantModel {
    const info = this.database.get(refName);
    if (!info && !allowEmpty) throw new Error(`No database constant model info for ${refName}`);
    return info as AllowEmpty extends true ? ConstantModel | undefined : ConstantModel;
  }
  static setScalar(refName: string, cnst: ScalarConstantModel) {
    if (this.scalar.has(refName)) return;
    this.scalar.set(refName, cnst);
  }
  static getScalar<AllowEmpty extends boolean = false>(
    refName: string,
    { allowEmpty }: { allowEmpty?: AllowEmpty } = {}
  ): AllowEmpty extends true ? ScalarConstantModel | undefined : ScalarConstantModel {
    const model = this.scalar.get(refName);
    if (!model && !allowEmpty) throw new Error(`No scalar constant model for ${refName}`);
    return model as AllowEmpty extends true ? ScalarConstantModel | undefined : ScalarConstantModel;
  }
  static getModelRef(
    refName: string,
    modelType: "input" | "object" | "full" | "light" | "insight" | "scalar"
  ): Cls | typeof PrimitiveScalar {
    if (modelType === "scalar") {
      if (PrimitiveRegistry.hasName(refName)) return PrimitiveRegistry.get(refName) as typeof PrimitiveScalar;
      else return this.getScalar(refName).model;
    } else return this.getDatabase(refName)[modelType];
  }
  static buildModel<T extends string, Input, Obj, Full, Light, Insight>(
    refName: T,
    inputRef: Cls<Input, { modelType: ModelType }>,
    objectRef: Cls<Obj, { modelType: ModelType }>,
    fullRef: Cls<Full, { modelType: ModelType }>,
    lightRef: Cls<Light, { modelType: ModelType }>,
    insightRef: Cls<Insight, { modelType: ModelType }>
  ): ConstantModel<
    T,
    Input,
    Obj,
    Full,
    Light,
    Insight,
    Capitalize<T>,
    DefaultOf<Full>,
    DefaultOf<Input>,
    GetStateObject<Full>,
    GetStateObject<Input>,
    DefaultOf<Insight>,
    PurifiedModel<Input>,
    DocumentModel<Full>,
    DocumentModel<Input>,
    QueryOf<DocumentModel<Full>>
  > {
    [inputRef, objectRef, fullRef, lightRef, insightRef].forEach((modelRef) => {
      this.modelRefNameMap.set(modelRef, refName);
    });
    inputRef.modelType = "input";
    objectRef.modelType = "object";
    fullRef.modelType = "full";
    lightRef.modelType = "light";
    insightRef.modelType = "insight";
    type Doc = DocumentModel<Full> & Record<string, any>;
    type DocInput = DocumentModel<Input>;
    const cnst: ConstantModel<
      T,
      Input,
      Obj,
      Full,
      Light,
      Insight,
      Capitalize<T>,
      DefaultOf<Full>,
      DefaultOf<Input>,
      GetStateObject<Full>,
      GetStateObject<Input>,
      DefaultOf<Insight>,
      PurifiedModel<Input>,
      Doc,
      DocInput,
      QueryOf<any>
    > = {
      refName,
      input: inputRef as ConstantCls<Input>,
      object: objectRef as ConstantCls<Obj>,
      full: fullRef as ConstantCls<Full>,
      light: lightRef as ConstantCls<Light>,
      insight: insightRef as ConstantCls<Insight>,
      _CapitalizedT: null as unknown as Capitalize<T>,
      _Default: null as unknown as DefaultOf<Full>,
      _DefaultInput: null as unknown as DefaultOf<Input>,
      _DefaultState: null as unknown as GetStateObject<Full>,
      _DefaultStateInput: null as unknown as GetStateObject<Input>,
      _DefaultInsight: null as unknown as DefaultOf<Insight>,
      _PurifiedInput: null as unknown as PurifiedModel<Input>,
      _Doc: null as unknown as DocumentModel<Full>,
      _DocInput: null as unknown as DocumentModel<Input>,
      _QueryOfDoc: null as unknown as QueryOf<any>,
    };
    this.setDatabase(refName, cnst);
    return cnst;
  }
  static buildScalar<T extends string, Model>(
    refName: T,
    Model: Cls<Model>
  ): ScalarConstantModel<T, Model, DefaultOf<Model>, DocumentModel<Model>, PurifiedModel<Model>> {
    this.modelRefNameMap.set(Model, refName);
    const cnst = {
      refName,
      model: Model as ConstantCls<any>,
      _Default: null as unknown as DefaultOf<Model>,
      _Doc: null as unknown as DocumentModel<Model>,
      _PurifiedInput: null as unknown as PurifiedModel<Model>,
    };
    this.setScalar(refName, cnst);
    return cnst as unknown as ScalarConstantModel<
      T,
      Model,
      DefaultOf<Model>,
      DocumentModel<Model>,
      PurifiedModel<Model>
    >;
  }
  static serialize<Value>(modelRef: Cls | Cls[], value: Value, nullable: boolean = false): Value {
    if (Array.isArray(value) && Array.isArray(modelRef)) {
      const singleModelRef = modelRef.at(0);
      if (!singleModelRef) throw new Error("No model ref found");
      return value.map((v: object) => this.serialize(singleModelRef as Cls, v)) as unknown as Value;
    } else if (modelRef === Map && value instanceof Map) {
      return Object.fromEntries(
        [...value.entries()].map(([key, value]: [string, any]) => {
          return [key, this.serialize(value, value)];
        })
      ) as unknown as Value;
    } else if (PrimitiveRegistry.has(modelRef as Cls)) {
      return (modelRef as typeof PrimitiveScalar)._serialize(value) as unknown as Value;
    } else if (this.modelRefNameMap.has(modelRef as Cls)) {
      return serialize(modelRef as ConstantCls, 0, value, { nullable }) as unknown as Value;
    } else throw new Error(`No serialize function for modelRef: ${modelRef}`);
  }
  static deserialize<Value>(modelRef: Cls | Cls[], value: Value, nullable: boolean = false): Value {
    if (Array.isArray(value) && Array.isArray(modelRef)) {
      const singleModelRef = modelRef.at(0);
      if (!singleModelRef) throw new Error("No model ref found");
      return value.map((v: object) => this.deserialize(singleModelRef as Cls, v)) as unknown as Value;
    } else if (modelRef === Map && value instanceof Map) {
      return new Map(
        Object.entries(value).map(([key, value]: [string, any]) => {
          return [key, this.deserialize(value, value)];
        })
      ) as unknown as Value;
    } else if (PrimitiveRegistry.has(modelRef as Cls)) {
      return (modelRef as typeof PrimitiveScalar)._parse(value) as unknown as Value;
    } else if (this.modelRefNameMap.has(modelRef as Cls)) {
      return deserialize(modelRef as ConstantCls, 0, value, { nullable }) as unknown as Value;
    } else throw new Error(`No deserialize function for modelRef: ${modelRef}`);
  }
}

export interface ConstantModel<
  T extends string = string,
  Input = any,
  Obj = any,
  Full = any,
  Light = any,
  Insight = any,
  _CapitalizedT extends string = Capitalize<T>,
  _Default = DefaultOf<Full>,
  _DefaultInput = DefaultOf<Input>,
  _DefaultState = GetStateObject<Full>,
  _DefaultStateInput = GetStateObject<Input>,
  _DefaultInsight = DefaultOf<Insight>,
  _PurifiedInput = PurifiedModel<Input>,
  _Doc = DocumentModel<Full>,
  _DocInput = DocumentModel<Input>,
  _QueryOfDoc = QueryOf<_Doc>,
> {
  refName: T;
  input: ConstantCls<Input>;
  object: ConstantCls<Obj>;
  full: ConstantCls<Full>;
  light: ConstantCls<Light>;
  insight: ConstantCls<Insight>;
  _CapitalizedT: _CapitalizedT;
  _Default: _Default;
  _DefaultInput: _DefaultInput;
  _DefaultState: _DefaultState;
  _DefaultStateInput: _DefaultStateInput;
  _DefaultInsight: _DefaultInsight;
  _PurifiedInput: _PurifiedInput;
  _Doc: _Doc;
  _DocInput: _DocInput;
  _QueryOfDoc: _QueryOfDoc;
}

export interface ScalarConstantModel<
  T extends string = string,
  Model = any,
  _Default = DefaultOf<Model>,
  _Doc = DocumentModel<Model>,
  _PurifiedInput = PurifiedModel<Model>,
> {
  refName: T;
  model: ConstantCls<Model>;
  _Default: _Default;
  _Doc: _Doc;
  _PurifiedInput: _PurifiedInput;
}
