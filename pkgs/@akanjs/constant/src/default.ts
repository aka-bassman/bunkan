import { type FieldObject } from ".";
import type { PrimitiveScalar } from "@akanjs/base";
import { type DefaultOf } from "./types";

export const makeDefault = <T>(fieldObj: FieldObject): DefaultOf<T> => {
  const result: { [key: string]: any } = {};
  for (const [key, field] of Object.entries(fieldObj)) {
    if (field.fieldType === "hidden") result[key] = null;
    else if (field.default) {
      if (typeof field.default === "function")
        result[key] = (field.default as () => object)();
      else result[key] = field.default as object;
    } else if (field.isArray) result[key] = [];
    else if (field.nullable) result[key] = null;
    else if (field.isClass)
      result[key] = field.isScalar ? makeDefault(field.modelRef.field) : null;
    else
      result[key] = (
        field.modelRef as unknown as typeof PrimitiveScalar
      ).$defaultValue;
  }
  return result as DefaultOf<T>;
};
