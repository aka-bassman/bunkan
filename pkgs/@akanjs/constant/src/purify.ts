import {
  applyFnToArrayObjects,
  type Dayjs,
  dayjs,
  getNonArrayModel,
  type GetStateObject,
  ID,
  type Cls,
  Upload,
  PrimitiveRegistry,
  PrimitiveScalar,
} from "@akanjs/base";
import { Logger } from "@akanjs/common";

import {
  BaseObject,
  ConstantRegistry,
  FIELD_META,
  type DefaultOf,
  type FieldObject,
  type FieldProps,
  type ConstantCls,
} from ".";

type Purified<O> = O extends BaseObject
  ? string
  : O extends BaseObject[]
    ? string[]
    : O extends Dayjs
      ? Dayjs
      : O extends { [key: string]: any }
        ? PurifiedModel<O>
        : O;
type PurifiedWithObjectToId<T, StateKeys extends keyof GetStateObject<T> = keyof GetStateObject<T>> = {
  [K in StateKeys as null extends T[K] ? never : K]: Purified<T[K]>;
} & {
  [K in StateKeys as null extends T[K] ? K : never]?: Purified<T[K]> | undefined;
};
export type PurifiedModel<T> = T extends Upload[]
  ? FileList
  : T extends (infer S)[]
    ? PurifiedModel<S>[]
    : T extends string | number | boolean | Dayjs
      ? T
      : T extends Map<infer K, infer V>
        ? Map<K, PurifiedModel<V>>
        : PurifiedWithObjectToId<T>;

export type PurifyFunc<Input, _DefaultInput = DefaultOf<Input>, _PurifiedInput = PurifiedModel<Input>> = (
  self: _DefaultInput,
  isChild?: boolean
) => _PurifiedInput | null;

const getPurifyFn = (modelRef: Cls): ((value: any) => object) => {
  const [valueRef] = getNonArrayModel(modelRef);
  const purifyFn = PrimitiveRegistry.has(valueRef)
    ? (valueRef as unknown as typeof PrimitiveScalar)._serialize
    : (value: any) => value as object;
  return purifyFn;
};

const purify = (field: FieldProps, key: string, value: any, self: any): any => {
  // 1. Check Data Validity
  if (
    field.nullable &&
    (value === null ||
      value === undefined ||
      (typeof value === "number" && isNaN(value)) ||
      (typeof value === "string" && !value.length))
  )
    return null;
  if (field.isArray) {
    if (!Array.isArray(value)) throw new Error(`Invalid Array Value in ${key} for value ${value}`);
    if (field.minlength && value.length < field.minlength)
      throw new Error(`Invalid Array Length (Min) in ${key} for value ${value}`);
    else if (field.maxlength && value.length > field.maxlength)
      throw new Error(`Invalid Array Length (Max) in ${key} for value ${value}`);
    else if (field.optArrDepth === 0 && field.validate && !field.validate(value, self))
      throw new Error(`Invalid Array Value (Failed to pass validation) in ${key} for value ${value}`);
    return value.map((v) => purify({ ...field, isArray: false }, key, v, v) as object) as object;
  }
  if (field.isMap && field.of) {
    const purifyFn = getPurifyFn(field.of as Cls);
    return Object.fromEntries(
      [...(value as Map<string, any>).entries()].map(([key, val]) => [key, applyFnToArrayObjects(val, purifyFn)])
    );
  }
  if (field.isClass) return makePurify(field.modelRef)(value as object, true) as object;
  if (field.modelRef === Date && dayjs(value as Date).isBefore(dayjs(new Date("0000"))))
    throw new Error(`Invalid Date Value (Default) in ${key} for value ${value}`);
  if ([String, ID].includes(field.modelRef as unknown as StringConstructor | typeof ID) && (value === "" || !value))
    throw new Error(`Invalid String Value (Default) in ${key} for value ${value}`);
  if (field.validate && !field.validate(value, self))
    throw new Error(`Invalid Value (Failed to pass validation) / ${value} in ${key}`);
  if (!field.nullable && !value && value !== 0 && value !== false)
    throw new Error(`Invalid Value (Nullable) in ${key} for value ${value}`);

  // 2. Convert Value
  const purifyFn = getPurifyFn(field.modelRef);
  return purifyFn(value);
};

export const makePurify = <I>(modelRef: ConstantCls<I>): PurifyFunc<I> => {
  const fn = ((self: { [key: string]: any }, isChild?: boolean): any => {
    try {
      if (isChild && !ConstantRegistry.isScalar(modelRef)) {
        const id = self.id as string;
        if (!id) throw new Error(`Invalid Value (No ID) for id ${modelRef}`);
        return id;
      }
      const result: { [key: string]: any } = {};
      Object.entries(modelRef[FIELD_META]).forEach(([key, field]) => {
        // if (field.fieldType === "hidden") continue;
        const value = self[key] as object;
        result[key] = purify(field.getProps(), key, value, self) as object;
      });
      return result;
    } catch (err) {
      if (isChild) throw new Error(err as string);
      Logger.debug(err as string);
      return null;
    }
  }) as PurifyFunc<I>;
  return fn;
};
