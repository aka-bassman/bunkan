import type { Cnst } from "@akanjs/constant";
import { immerable } from "immer";

export const immerify = <T extends object | object[]>(
  modelRef: Cnst,
  objOrArr: T,
): T => {
  if (Array.isArray(objOrArr))
    return objOrArr.map((val) => immerify(modelRef, val as object)) as T;
  const immeredObj = Object.assign({}, objOrArr, { [immerable]: true });
  Object.entries(modelRef.field).forEach(([key, field]) => {
    if (field.isScalar && field.isClass && !!objOrArr[key])
      immeredObj[key] = immerify(field.modelRef, objOrArr[key] as object);
  });
  return immeredObj;
};
