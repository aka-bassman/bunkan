import {
  applyFnToArrayObjects,
  type Dayjs,
  dayjs,
  Float,
  getNonArrayModel,
  type GetStateObject,
  ID,
  Int,
  type Cls,
  PrimitiveRegistry,
  PrimitiveScalar,
} from "@akanjs/base";

import { ConstantRegistry, type FieldObject, type FieldProps } from ".";

export type CrystalizeFunc<Model> = (
  self: GetStateObject<Model>,
  isChild?: boolean,
) => Model;

export const crystalize = (field: FieldProps, value: any): any => {
  if (value === undefined || value === null) return value as undefined | null;
  if (field.isArray && Array.isArray(value))
    return value.map(
      (v: any) => crystalize({ ...field, isArray: false }, v) as object,
    );
  const crystalizeValue = PrimitiveRegistry.has(field.modelRef)
    ? (value: any) =>
        (field.modelRef as unknown as typeof PrimitiveScalar)._parse(value)
    : (value: any) => value as object;
  if (field.isMap) {
    const [valueRef] = getNonArrayModel(field.of as Cls);
    return new Map(
      Object.entries(value as Record<string, any>).map(([key, val]) => [
        key,
        applyFnToArrayObjects(val, crystalizeValue),
      ]),
    );
  }
  if (field.isClass)
    return new (field.modelRef as Cls<{ set: (obj: any) => object }>)().set(
      value as object,
    );
  if (field.modelRef === Date) return dayjs(value as Date);
  return crystalizeValue(value);
};

export const makeCrystalize = <M>(
  modelRef: Cls<M, { field: FieldObject }>,
  option: { partial?: string[] } = {},
): CrystalizeFunc<M> => {
  const fieldKeys = option.partial?.length
    ? ConstantRegistry.isScalar(modelRef)
      ? option.partial
      : ["id", ...option.partial, "updatedAt"]
    : Object.keys(modelRef.field);
  const fn = ((self: M, isChild?: boolean): M | null => {
    try {
      const result: { [key: string]: any } = new (modelRef as Cls<{
        set: (obj: any) => object;
      }>)().set(self);
      fieldKeys.forEach((key) => {
        const field = modelRef.field[key];
        if (!field)
          throw new Error(`Field ${key} not found in model ${modelRef.name}`);
        if (field.fieldType === "hidden") return;
        result[key] = crystalize(
          field.getProps(),
          (self as Record<string, any>)[key],
        ) as object;
      });

      return result as M;
    } catch (err) {
      if (isChild) throw new Error(err as string);
      return null;
    }
  }) as CrystalizeFunc<M>;
  return fn;
};
