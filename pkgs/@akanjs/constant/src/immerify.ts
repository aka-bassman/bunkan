import { type Cls } from "@akanjs/base";
import { immerable } from "immer";

import { type FieldObject } from "./fieldInfo";

export const immerify = <T extends object>(
  modelRef: Cls<any, { field: FieldObject }>,
  objOrArr: T,
): T => {
  if (Array.isArray(objOrArr))
    return objOrArr.map((val) => immerify(modelRef, val as object)) as T;
  const immeredObj = Object.assign({}, objOrArr, {
    [immerable]: true,
  }) as Record<string, any>;
  const objRecord = objOrArr as Record<string, any>;
  Object.entries(modelRef.field).forEach(([key, field]) => {
    if (field.isScalar && field.isClass && !!objRecord[key])
      immeredObj[key] = immerify(field.modelRef, objRecord[key] as object);
  });
  return immeredObj as T;
};
