import { applyFnToArrayObjects, getNonArrayModel, PrimitiveScalar, type Cls, PrimitiveRegistry } from "@akanjs/base";

import { type ConstantCls, ConstantRegistry, FIELD_META } from ".";

const getDeserializeFn = (inputRef: Cls) => {
  const deserializeFn = PrimitiveRegistry.has(inputRef)
    ? (value: any) => (inputRef as unknown as typeof PrimitiveScalar)._parse(value)
    : (value: any) => value as object;
  return deserializeFn;
};
const deserializeInput = <Input = any>(
  value: Input | Input[],
  inputRef: ConstantCls<Input>,
  arrDepth: number
): Input | Input[] => {
  if (arrDepth && Array.isArray(value))
    return value.map((v) => deserializeInput(v, inputRef, arrDepth - 1) as Input) as unknown as Input[];
  else if (inputRef.prototype === Map.prototype) {
    const [valueRef] = getNonArrayModel(inputRef);
    const deserializeFn = getDeserializeFn(valueRef);
    return Object.fromEntries(
      [...(value as Map<string, any>).entries()].map(([key, val]) => [key, applyFnToArrayObjects(val, deserializeFn)])
    ) as unknown as Input;
  } else if (PrimitiveRegistry.has(inputRef)) {
    const deserializeFn = getDeserializeFn(inputRef);
    return deserializeFn(value) as Input;
  }
  if (!ConstantRegistry.isScalar(inputRef)) return value as { id: string } as Input;
  else
    return Object.fromEntries(
      Object.entries(inputRef[FIELD_META]).map(([key, field]) => [
        key,
        deserializeInput((value as { [key: string]: any })[key], field.modelRef, field.arrDepth),
      ])
    ) as unknown as Input;
};

export const deserialize = (
  argRef: ConstantCls,
  arrDepth: number,
  value: any,
  { nullable = false }: { nullable?: boolean }
) => {
  if (nullable && (value === null || value === undefined)) return null;
  else if (!nullable && (value === null || value === undefined))
    throw new Error(`Invalid Value (Nullable) in ${argRef} for value ${value}`);
  return deserializeInput(value, argRef, arrDepth) as object[];
};
