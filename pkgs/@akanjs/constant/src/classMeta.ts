import { type EnumInstance } from "@akanjs/base";

import { type Cnst } from "./baseGql";
import { ConstantRegistry } from "./constantRegistry";

export const getChildClassRefs = (target: Cnst): Cnst[] => {
  const refMap = new Map<string, Cnst>();
  const childRefs = Object.entries(target.field)
    .filter(([_, field]) => field.isClass)
    .reduce((acc: Cnst[], [key, field]) => {
      return [...acc, field.modelRef, ...getChildClassRefs(field.modelRef)];
    }, []);
  childRefs
    .filter(
      (modelRef, idx) =>
        childRefs.findIndex((ref) => ref.prototype === modelRef.prototype) ===
        idx,
    )
    .map((modelRef) =>
      refMap.set(ConstantRegistry.getRefName(modelRef), modelRef),
    ); // remove duplicates
  return [...refMap.values()] as Cnst[];
};

export const getFieldEnumMetas = (
  modelRef: Cnst,
): { key: string; enum: EnumInstance }[] => {
  return Object.entries(modelRef.field)
    .filter(([_, field]) => !!field.enum)
    .map(
      ([key, field]) =>
        ({ key, enum: field.enum }) as { key: string; enum: EnumInstance },
    );
};

export const hasTextField = (modelRef: Cnst): boolean => {
  return Object.entries(modelRef.field).some(
    ([_, field]) =>
      !!field.text ||
      (field.isScalar &&
        field.isClass &&
        field.select &&
        hasTextField(field.modelRef)),
  );
};
