import { applyFnToArrayObjects, getNonArrayModel, PrimitiveScalar, type Cls, PrimitiveRegistry } from "@akanjs/base";

import { type ConstantCls, ConstantRegistry, FIELD_META } from ".";

const getSerializeFn = (inputRef: Cls) => {
  const serializeFn = PrimitiveRegistry.has(inputRef)
    ? (value: any) => (inputRef as typeof PrimitiveScalar)._serialize(value)
    : (value: any) => value as object;
  return serializeFn;
};
const serializeInput = <Input = any>(
  value: Input | Input[],
  inputRef: ConstantCls<Input> | PrimitiveScalar,
  arrDepth: number
): Input | Input[] => {
  if (arrDepth && Array.isArray(value))
    return value.map((v) => serializeInput(v, inputRef, arrDepth - 1) as Input) as unknown as Input[];
  else if ((inputRef as MapConstructor).prototype === Map.prototype) {
    const [valueRef] = getNonArrayModel(inputRef as Cls);
    const serializeFn = getSerializeFn(valueRef);
    return Object.fromEntries(
      [...(value as Map<string, any>).entries()].map(([key, val]) => [key, applyFnToArrayObjects(val, serializeFn)])
    ) as unknown as Input;
  } else if (PrimitiveRegistry.has(inputRef as Cls)) {
    const serializeFn = getSerializeFn(inputRef as Cls);
    return serializeFn(value) as Input;
  }
  if (!ConstantRegistry.isScalar(inputRef as Cls))
    return value as { id: string } as Input; // id string
  else
    return Object.fromEntries(
      Object.entries((inputRef as ConstantCls)[FIELD_META]).map(([key, field]) => [
        key,
        serializeInput((value as { [key: string]: any })[key], field.modelRef, field.arrDepth),
      ])
    ) as unknown as Input;
};

export const serialize = (
  argRef: ConstantCls | PrimitiveScalar,
  arrDepth: number,
  value: any,
  { nullable = false }: { nullable?: boolean }
) => {
  if (nullable && (value === null || value === undefined)) return null;
  else if (!nullable && (value === null || value === undefined))
    throw new Error(`Invalid Value (Nullable) in ${argRef} for value ${value}`);
  return serializeInput(value, argRef, arrDepth) as object[];
};
