/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { type MergeAllTypes, type Cls } from "@akanjs/base";
import { applyMixins } from "@akanjs/common";
import { immerable } from "immer";

import { crystalize, getDefault } from ".";
import { ConstantRegistry, type ModelType } from "./constantRegistry";
import {
  ConstantField,
  type ExtractFieldInfoObject,
  field,
  type FieldBuilder,
  type FieldInfoObject,
  type FieldObject,
  type FieldResolver,
  resolve,
} from "./fieldInfo";
import { makePurify, type PurifyFunc } from "./purify";
import type { BaseInsight, BaseObject, DefaultOf, NonFunctionalKeys } from "./types";

type BaseFields = "id" | "createdAt" | "updatedAt" | "removedAt";
type WithBase<T> = T & BaseObject;
type OmitBase<T> = Omit<T, BaseFields>;
type Merge<A, B> = B & Omit<A, keyof B>;

const objectModelOf = <T>(inputRef: ConstantCls<T>, fieldMap: FieldInfoObject): Cls<WithBase<T>> => {
  const field = Object.assign(
    ConstantField.getBaseModelField(),
    inputRef[FIELD_META],
    Object.fromEntries(Object.entries(fieldMap).map(([key, fieldInfo]) => [key, fieldInfo.toField()]))
  );
  const baseObjectModelRef = getBaseConstantClass(field);
  applyConstantStatics(baseObjectModelRef);
  baseObjectModelRef.modelType = "object";
  return baseObjectModelRef as unknown as Cls<WithBase<T>>;
};

const lightModelOf = <T, F extends keyof OmitBase<T>>(
  objectRef: ConstantCls<T>,
  fields: readonly F[],
  fieldMap: FieldInfoObject,
  ...libLightModelRefs: ConstantCls[]
): Cls<Pick<OmitBase<T>, F> & BaseObject> => {
  const libLightModelRef = libLightModelRefs.at(0);
  const field = Object.assign(
    libLightModelRef?.[FIELD_META] ?? ConstantField.getBaseModelField(),
    Object.fromEntries(Object.entries(fieldMap).map(([key, field]) => [key, field.toField()])),
    Object.fromEntries(fields.map((field) => [field, objectRef[FIELD_META][field as string]]))
  );
  const baseLightModelRef = getBaseConstantClass(field);
  applyConstantStatics(baseLightModelRef);
  applyMixins(baseLightModelRef, libLightModelRefs);
  baseLightModelRef.modelType = "light";
  return baseLightModelRef as unknown as Cls<Pick<OmitBase<T>, F> & BaseObject>;
};

const fullModelOf = <A, B = undefined>(
  objectRef: ConstantCls<A>,
  lightRef: ConstantCls<B>,
  fieldMap: FieldInfoObject,
  ...libFullModelRefs: ConstantCls[]
): Cls<Merge<A, B>> => {
  const fullRef = libFullModelRefs.at(0) ?? getBaseConstantClass(ConstantField.getBaseModelField());
  Object.assign(
    fullRef[FIELD_META],
    objectRef[FIELD_META],
    lightRef[FIELD_META],
    Object.fromEntries(Object.entries(fieldMap).map(([key, field]) => [key, field.toField()]))
  );
  applyMixins(fullRef, [objectRef, lightRef, ...libFullModelRefs]);
  libFullModelRefs.forEach((libFullModelRef) => {
    applyMixins(libFullModelRef, [objectRef, lightRef]);
  });

  applyConstantStatics(fullRef);
  fullRef.modelType = "full";
  return fullRef as unknown as Cls<Omit<A, keyof B> & B>;
};

const extendModelInputs = <T extends ConstantCls[]>(
  fieldMap: FieldInfoObject,
  ...libInputModelRefs: T
): Cls<MergeAllTypes<T>> => {
  const baseInputModelRef = libInputModelRefs.at(0);
  const fieldObject = Object.assign(
    baseInputModelRef?.[FIELD_META] ?? {},
    Object.fromEntries(Object.entries(fieldMap).map(([key, field]) => [key, field.toField()]))
  );
  const baseInputRef = getBaseConstantClass(fieldObject);
  applyConstantStatics(baseInputRef);
  return baseInputRef as any;
};

const extendModelObjects = <Input, ObjectModels extends ConstantCls[]>(
  inputRef: ConstantCls<Input>,
  fieldMap: FieldInfoObject,
  ...libObjectModelRefs: ObjectModels
): Cls<MergeAllTypes<ObjectModels> & Input> => {
  const baseObjectModelRef = libObjectModelRefs.at(0);
  const field = Object.assign(
    baseObjectModelRef?.[FIELD_META] ?? {},
    inputRef[FIELD_META],
    Object.fromEntries(Object.entries(fieldMap).map(([key, fieldInfo]) => [key, fieldInfo.toField()]))
  );
  const baseInputRef = getBaseConstantClass(field, "object");
  applyConstantStatics(baseInputRef);
  return baseInputRef as any;
};

const extendModelInsights = <InsightModels extends ConstantCls[]>(
  fieldMap: FieldInfoObject,
  ...insightModelRefs: InsightModels
): Cls<MergeAllTypes<InsightModels>> => {
  const baseInsightModelRef = insightModelRefs.at(0);
  const field = Object.assign(
    baseInsightModelRef?.[FIELD_META] ?? ConstantField.getBaseInsightField(),
    Object.fromEntries(Object.entries(fieldMap).map(([key, fieldInfo]) => [key, fieldInfo.toField()]))
  );
  const baseInsightRef = getBaseConstantClass(field, "insight");

  applyConstantStatics(baseInsightRef);
  return baseInsightRef as any;
};

const getBaseConstantClass = (field: FieldObject, modelType: ModelType = "scalar") => {
  class BaseConstant {
    static readonly [FIELD_META]: FieldObject = field;
    static modelType: ModelType = modelType;
    [immerable] = true;
    constructor(obj?: any) {
      this.set({
        ...(this.constructor as ConstantCls).getDefault(),
        ...((obj ?? {}) as Partial<typeof this>),
      });
    }
    set(obj: Partial<typeof this>) {
      Object.entries(obj).forEach(([key, value]) => {
        //check field has key
        if (!(this.constructor as ConstantCls)[FIELD_META][key] as unknown as object | undefined) return;
        const field = (this.constructor as ConstantCls)[FIELD_META][key];
        if (!field) throw new Error(`Field ${key} not found`);
        const fieldProp = field.getProps();
        (this as { [key: string]: any })[key] = crystalize(fieldProp, value) as object;
      });
      return this;
    }
  }
  return BaseConstant as unknown as ConstantCls;
};

const makeBaseScalar = <FieldMap extends FieldInfoObject>(
  fieldMap: FieldMap
): Cls<ExtractFieldInfoObject<FieldMap>> => {
  const fieldObject = Object.fromEntries(Object.entries(fieldMap).map(([key, field]) => [key, field.toField()]));
  const baseScalarRef = getBaseConstantClass(fieldObject, "scalar");
  applyConstantStatics(baseScalarRef);
  return baseScalarRef as unknown as Cls<ExtractFieldInfoObject<FieldMap>>;
};

export interface ConstantMethods<Schema = any> {
  set: (obj: Partial<Schema>) => this;
}

export const FIELD_META = Symbol("FIELD_META");
export interface ConstantStatics<Schema = any> {
  [FIELD_META]: FieldObject;
  getDefault: () => DefaultOf<Schema>;
  purify: PurifyFunc<Schema>;
  modelType: ModelType;
}
export type ConstantCls<Schema = any> = (new (obj?: Partial<Schema>) => Schema & ConstantMethods<Schema>) &
  ConstantStatics<Schema>;

declare global {
  // dummy type matching for Date, String, Boolean, Map constructors
  interface DateConstructor extends ConstantStatics<unknown> {}
  interface StringConstructor extends ConstantStatics<unknown> {}
  interface BooleanConstructor extends ConstantStatics<unknown> {}
  interface MapConstructor extends ConstantStatics<unknown> {}
}

const applyConstantStatics = <Model>(model: ConstantCls<Model>): ConstantCls<Model> => {
  const defaultValue = getDefault(model[FIELD_META]);
  Object.assign(model, {
    purify: makePurify(model),
    getDefault: function () {
      return { ...defaultValue };
    },
  });
  return model as unknown as ConstantCls<Model>;
};

// light via
export function via<
  T extends BaseObject,
  K extends NonFunctionalKeys<OmitBase<T>>,
  ResolveField extends (resolve: FieldResolver) => FieldInfoObject,
  LightModels extends Cls[],
  _Schema = MergeAllTypes<LightModels> & Pick<T, K> & BaseObject & ExtractFieldInfoObject<ReturnType<ResolveField>>,
>(
  modelRef: Cls<T>,
  fields: readonly K[],
  resolveField: ResolveField,
  ...lightModelRefs: LightModels
): ConstantCls<_Schema>;

// input or scalar via
export function via<
  BuildField extends (builder: FieldBuilder) => FieldInfoObject,
  Inputs extends Cls[],
  _Schema = MergeAllTypes<Inputs> & ExtractFieldInfoObject<ReturnType<BuildField>>,
>(buildField: BuildField, ...extendInputRefs: Inputs): ConstantCls<_Schema>;

// insight via
export function via<
  T extends BaseObject,
  BuildField extends (builder: FieldBuilder) => FieldInfoObject,
  Insights extends Cls[],
  _Schema = MergeAllTypes<Insights> & BaseInsight & ExtractFieldInfoObject<ReturnType<BuildField>>,
>(modelRef: Cls<T>, buildField: BuildField, ...extendInsightRefs: Insights): ConstantCls<_Schema>;

// object via
export function via<
  T,
  BuildField extends (builder: FieldBuilder) => FieldInfoObject,
  ObjectModels extends Cls[],
  _Schema = MergeAllTypes<ObjectModels> & T & BaseObject & ExtractFieldInfoObject<ReturnType<BuildField>>,
>(inputRef: Cls<T>, buildField: BuildField, ...extendObjectRefs: ObjectModels): ConstantCls<_Schema>;

// full via
export function via<
  T,
  Light,
  ResolveField extends (resolve: FieldResolver) => FieldInfoObject,
  FullModels extends Cls[],
  _Schema = MergeAllTypes<FullModels> & T & Light & ExtractFieldInfoObject<ReturnType<ResolveField>>,
>(
  objectRef: Cls<T>,
  lightModelRef: Cls<Light>,
  resolveField: ResolveField,
  ...fullModelRefs: FullModels
): ConstantCls<_Schema>;

export function via(
  firstRefOrBuildField: Cls | ((builder: FieldBuilder) => FieldInfoObject),
  secondRefOrFieldsOrBuildField?: Cls | readonly any[] | ((builder: FieldBuilder) => FieldInfoObject),
  thirdRefOrResolveField?: Cls | ((resolve: FieldResolver) => FieldInfoObject),
  ...extendRefs: Cls[]
): any {
  // input via
  if (!firstRefOrBuildField.prototype || !(firstRefOrBuildField as Cls<any, { modelType?: ModelType }>).modelType) {
    const buildField = firstRefOrBuildField as (builder: FieldBuilder) => FieldInfoObject;
    const fieldMap = buildField(field);
    const extendInputRefs = [
      ...(secondRefOrFieldsOrBuildField ? [secondRefOrFieldsOrBuildField as Cls] : []),
      ...(thirdRefOrResolveField ? [thirdRefOrResolveField as Cls] : []),
      ...extendRefs,
    ] as ConstantCls[];
    if (!secondRefOrFieldsOrBuildField) return makeBaseScalar(fieldMap);
    else return extendModelInputs(fieldMap, ...extendInputRefs);
  }
  // light via
  if (Array.isArray(secondRefOrFieldsOrBuildField)) {
    const resolveField = thirdRefOrResolveField as (resolve: FieldResolver) => FieldInfoObject;
    const fieldMap = resolveField(resolve);
    return lightModelOf(
      firstRefOrBuildField as ConstantCls,
      secondRefOrFieldsOrBuildField as readonly any[],
      fieldMap,
      ...(extendRefs as ConstantCls[])
    );
  }

  // insight or object via
  if (
    !(secondRefOrFieldsOrBuildField as Cls).prototype ||
    !(secondRefOrFieldsOrBuildField as Cls<any, { modelType?: ModelType }>).modelType
  ) {
    const buildField = secondRefOrFieldsOrBuildField as (builder: FieldBuilder) => FieldInfoObject;
    const fieldMap = buildField(field);
    // object via
    if (ConstantRegistry.isScalar(firstRefOrBuildField as Cls<any, { modelType: ModelType }>)) {
      if (!thirdRefOrResolveField) return objectModelOf(firstRefOrBuildField as ConstantCls, fieldMap);
      else
        return extendModelObjects(
          firstRefOrBuildField as ConstantCls,
          fieldMap,
          thirdRefOrResolveField as ConstantCls,
          ...(extendRefs as ConstantCls[])
        );
    }
    // insight via
    if (ConstantRegistry.isFull(firstRefOrBuildField as Cls<any, { modelType: ModelType }>)) {
      const extendInsightRefs = [
        ...(thirdRefOrResolveField ? [thirdRefOrResolveField as Cls] : []),
        ...extendRefs,
      ] as ConstantCls[];
      return extendModelInsights(fieldMap, ...extendInsightRefs);
    }
  } else {
    const objectRef = firstRefOrBuildField as ConstantCls;
    const lightRef = secondRefOrFieldsOrBuildField as ConstantCls;
    const resolveField = thirdRefOrResolveField as (resolve: FieldResolver) => FieldInfoObject;
    const fieldMap = resolveField(resolve);
    return fullModelOf(objectRef, lightRef, fieldMap, ...(extendRefs as ConstantCls[]));
  }
  throw new Error(
    `Invalid modelRef args ${firstRefOrBuildField as Cls} ${secondRefOrFieldsOrBuildField as Cls} ${extendRefs.join(", ")}`
  );
}
