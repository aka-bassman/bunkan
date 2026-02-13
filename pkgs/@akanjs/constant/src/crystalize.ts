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

export type CrystalizeFunc<Model> = (self: GetStateObject<Model>, isChild?: boolean) => Model;

export const crystalize = (field: FieldProps, value: any): any => {
  if (value === undefined || value === null) return value as undefined | null;
  if (field.isArray && Array.isArray(value))
    return value.map((v: any) => crystalize({ ...field, isArray: false }, v) as object);
  const crystalizeValue = PrimitiveRegistry.has(field.modelRef)
    ? (value: any) => (field.modelRef as unknown as typeof PrimitiveScalar)._parse(value)
    : (value: any) => value as object;
  if (field.isMap) {
    return new Map(
      Object.entries(value as Record<string, any>).map(([key, val]) => [
        key,
        applyFnToArrayObjects(val, crystalizeValue),
      ])
    );
  }
  if (field.isClass) return new (field.modelRef as Cls<{ set: (obj: any) => object }>)().set(value as object);
  if (field.modelRef === Date) return dayjs(value as Date);
  return crystalizeValue(value);
};
