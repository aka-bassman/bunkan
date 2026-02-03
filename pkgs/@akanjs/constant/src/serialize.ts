import {
  applyFnToArrayObjects,
  type Dayjs,
  dayjs,
  Float,
  getNonArrayModel,
  ID,
  Int,
  PrimitiveScalar,
  type Cls,
  PrimitiveRegistry,
} from "@akanjs/base";

import { type Cnst, ConstantRegistry } from ".";

const getSerializeFn = (inputRef: Cls) => {
  const serializeFn = PrimitiveRegistry.has(inputRef)
    ? (value: any) => (inputRef as typeof PrimitiveScalar)._serialize(value)
    : (value: any) => value as object;
  return serializeFn;
};
const serializeInput = <Input = any>(
  value: Input | Input[],
  inputRef: Cnst<Input>,
  arrDepth: number,
): Input | Input[] => {
  if (arrDepth && Array.isArray(value))
    return value.map(
      (v) => serializeInput(v, inputRef, arrDepth - 1) as Input,
    ) as unknown as Input[];
  else if (inputRef.prototype === Map.prototype) {
    const [valueRef] = getNonArrayModel(inputRef);
    const serializeFn = getSerializeFn(valueRef);
    return Object.fromEntries(
      [...(value as Map<string, any>).entries()].map(([key, val]) => [
        key,
        applyFnToArrayObjects(val, serializeFn),
      ]),
    ) as unknown as Input;
  } else if (PrimitiveRegistry.has(inputRef)) {
    const serializeFn = getSerializeFn(inputRef);
    return serializeFn(value) as Input;
  }
  if (!ConstantRegistry.isScalar(inputRef))
    return value as { id: string } as Input; // id string
  else
    return Object.fromEntries(
      Object.entries(inputRef.field).map(([key, field]) => [
        key,
        serializeInput(
          (value as { [key: string]: any })[key],
          field.modelRef,
          field.arrDepth,
        ),
      ]),
    ) as unknown as Input;
};

export const serializeArg = (
  argRef: Cnst,
  arrDepth: number,
  value: any,
  { nullable = false }: { nullable?: boolean },
) => {
  if (nullable && (value === null || value === undefined)) return null;
  else if (!nullable && (value === null || value === undefined))
    throw new Error(`Invalid Value (Nullable) in ${argRef} for value ${value}`);
  return serializeInput(value, argRef, arrDepth) as object[];
};

const getDeserializeFn = (inputRef: Cls) => {
  const deserializeFn = PrimitiveRegistry.has(inputRef)
    ? (value: any) =>
        (inputRef as unknown as typeof PrimitiveScalar)._parse(value)
    : (value: any) => value as object;
  return deserializeFn;
};
const deserializeInput = <Input = any>(
  value: Input | Input[],
  inputRef: Cnst<Input>,
  arrDepth: number,
): Input | Input[] => {
  if (arrDepth && Array.isArray(value))
    return value.map(
      (v) => deserializeInput(v, inputRef, arrDepth - 1) as Input,
    ) as unknown as Input[];
  else if (inputRef.prototype === Map.prototype) {
    const [valueRef] = getNonArrayModel(inputRef);
    const deserializeFn = getDeserializeFn(valueRef);
    return Object.fromEntries(
      [...(value as Map<string, any>).entries()].map(([key, val]) => [
        key,
        applyFnToArrayObjects(val, deserializeFn),
      ]),
    ) as unknown as Input;
  } else if (PrimitiveRegistry.has(inputRef)) {
    const deserializeFn = getDeserializeFn(inputRef);
    return deserializeFn(value) as Input;
  }
  if (!ConstantRegistry.isScalar(inputRef))
    return value as { id: string } as Input;
  else
    return Object.fromEntries(
      Object.entries(inputRef.field).map(([key, field]) => [
        key,
        deserializeInput(
          (value as { [key: string]: any })[key],
          field.modelRef,
          field.arrDepth,
        ),
      ]),
    ) as unknown as Input;
};

export const deserializeArg = (
  argRef: Cnst,
  arrDepth: number,
  value: any,
  { nullable = false }: { nullable?: boolean },
) => {
  if (nullable && (value === null || value === undefined)) return null;
  else if (!nullable && (value === null || value === undefined))
    throw new Error(`Invalid Value (Nullable) in ${argRef} for value ${value}`);
  return deserializeInput(value, argRef, arrDepth) as object[];
};
