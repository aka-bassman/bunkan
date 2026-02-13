/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  arraiedModel,
  PRIMITIVE_SERVER_VALUE,
  type Dayjs,
  type EnumInstance,
  Float,
  getNonArrayModel,
  ID,
  Int,
  isEnum,
  type Cls,
  type UnCls,
  PrimitiveScalar,
  Upload,
  PrimitiveRegistry,
  Any,
  type SingleValue,
  PRIMITIVE_CLIENT_VALUE,
} from "@akanjs/base";
import type { AccumulatorOperator } from "mongoose";

import { type ConstantCls } from "./via";
import { ConstantRegistry } from "./constantRegistry";

export type ParamFieldType =
  | (typeof PrimitiveScalar & {
      [PRIMITIVE_CLIENT_VALUE]: string | number | boolean | Dayjs;
    })
  | EnumInstance<string, string>;

export type ConstantFieldType = typeof PrimitiveScalar | Cls | MapConstructor | EnumInstance<string, number>;
export type ConstantFieldTypeInput =
  | ConstantFieldType
  | ConstantFieldType[]
  | ConstantFieldType[][]
  | ConstantFieldType[][][];

export type FieldToValue<Field, MapValue = any> = Field extends null
  ? FieldToValue<Exclude<Field, null>> | null
  : Field extends MapConstructor
    ? Map<string, FieldToValue<MapValue>>
    : Field extends (infer F)[]
      ? FieldToValue<F>[]
      : Field extends typeof PrimitiveScalar
        ? Field[typeof PRIMITIVE_SERVER_VALUE]
        : Field extends EnumInstance<string, infer V>
          ? V
          : Field extends Cls
            ? UnCls<Field>
            : never;
export interface FieldInfoObject {
  [key: string]: FieldInfo<ConstantFieldTypeInput | null, any>;
}
export type ExtractFieldInfoObject<Obj extends FieldInfoObject> = {
  [K in keyof Obj]: Obj[K] extends FieldInfo<infer F, infer E, infer M>
    ? unknown extends E
      ? FieldToValue<F, M>
      : E
    : never;
};

export interface ConstantFieldProps<FieldValue = any, MapValue = any, Metadata = { [key: string]: any }> {
  nullable?: boolean;
  ref?: string;
  refPath?: string;
  refType?: "child" | "parent" | "relation";
  default?: FieldValue | ((doc: { id: string }) => FieldValue);
  type?: FieldPreset;
  fieldType?: "property" | "hidden" | "resolve";
  immutable?: boolean;
  min?: number;
  max?: number;
  enum?: EnumInstance;
  select?: boolean;
  minlength?: number;
  maxlength?: number;
  accumulate?: AccumulatorOperator;
  example?: FieldValue;
  of?: MapValue; // for Map type fields
  validate?: (value: FieldValue, model: any) => boolean;
  text?: "search" | "filter";
  meta?: Metadata;
}
export const fieldPresets = ["email", "password", "url"] as const;
export type FieldPreset = (typeof fieldPresets)[number];

class FieldInfo<
  Value extends ConstantFieldTypeInput | null = null,
  ExplicitType = unknown,
  MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
> {
  readonly value: Value;
  readonly type: ConstantFieldTypeInput;
  readonly option: ConstantFieldProps;
  declare explicitType: ExplicitType;
  constructor(value: Value, option: ConstantFieldProps<any, MapValue>) {
    this.value = value;
    const [singleValue, arrDepth] = getNonArrayModel(value as Cls);
    const isEnumValue = isEnum(singleValue);
    const valueType = isEnumValue ? arraiedModel((singleValue as EnumInstance).type, arrDepth) : value;
    this.type = valueType as ConstantFieldTypeInput;
    this.option = {
      ...option,
      ...(isEnumValue ? { enum: singleValue } : {}),
    } as any;
  }
  optional() {
    return new FieldInfo(this.value as Value | null, {
      ...this.option,
      nullable: true,
    });
  }
  meta(meta: ConstantFieldProps["meta"]) {
    this.option.meta = meta;
    return this;
  }
  toField() {
    return ConstantField.fromFieldInfo(this);
  }
}

interface ConstantFieldBuildProps<FieldValue = any, MapValue = any, Metadata = { [key: string]: any }> {
  nullable: boolean;
  ref?: string;
  refPath?: string;
  refType?: "child" | "parent" | "relation";
  default: FieldValue | ((doc: { id: string }) => FieldValue);
  type?: FieldPreset;
  fieldType: "property" | "hidden" | "resolve";
  immutable: boolean;
  min?: number;
  max?: number;
  enum?: EnumInstance;
  select: boolean;
  minlength?: number;
  maxlength?: number;
  accumulate?: AccumulatorOperator;
  example?: FieldValue;
  of?: MapValue; // for Map type fields
  validate?: (value: FieldValue, model: any) => boolean;
  text?: "search" | "filter";
  modelRef: ConstantCls;
  arrDepth: number;
  optArrDepth: number;
  meta: Metadata;
}

export interface FieldProps extends ConstantFieldBuildProps<any, any, any> {
  isClass: boolean;
  isScalar: boolean;
  isArray: boolean;
  isMap: boolean;
}
const isGqlMap = (modelRef: any) => modelRef === Map;

export class ConstantField<
  FieldValue = any,
  MapValue = any,
  Metadata = { [key: string]: any },
> implements ConstantFieldBuildProps<FieldValue, MapValue, Metadata> {
  static getBaseModelField(): FieldObject {
    return {
      id: field(ID).toField(),
      createdAt: field(Date).toField(),
      updatedAt: field(Date).toField(),
      removedAt: field(Date).optional().toField(),
    };
  }
  static getBaseInsightField(): FieldObject {
    return {
      count: field(Int, { default: 0, accumulate: { $sum: 1 } }).toField(),
    };
  }
  readonly nullable: boolean;
  readonly ref?: string;
  readonly refPath?: string;
  readonly refType?: "child" | "parent" | "relation";
  readonly default: FieldValue | ((doc: { id: string }) => FieldValue);
  readonly type?: FieldPreset;
  readonly fieldType: "property" | "hidden" | "resolve";
  readonly immutable: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly enum?: EnumInstance;
  readonly select: boolean;
  readonly minlength?: number;
  readonly maxlength?: number;
  readonly accumulate?: AccumulatorOperator;
  readonly example?: FieldValue;
  readonly of?: MapValue; // for Map type fields
  readonly validate?: (value: FieldValue, model: any) => boolean;
  readonly text?: "search" | "filter";
  readonly modelRef: ConstantCls;
  readonly arrDepth: number;
  readonly optArrDepth: number;
  readonly meta: Metadata;

  constructor(props: ConstantFieldBuildProps<FieldValue, MapValue, Metadata>) {
    this.nullable = props.nullable;
    this.ref = props.ref;
    this.refPath = props.refPath;
    this.refType = props.refType;
    this.default = props.default;
    this.type = props.type;
    this.fieldType = props.fieldType;
    this.immutable = props.immutable;
    this.min = props.min;
    this.max = props.max;
    this.enum = props.enum;
    this.select = props.select;
    this.minlength = props.minlength;
    this.maxlength = props.maxlength;
    this.accumulate = props.accumulate;
    this.example = props.example;
    this.of = props.of;
    this.validate = props.validate;
    this.text = props.text;
    this.modelRef = props.modelRef;
    this.arrDepth = props.arrDepth;
    this.optArrDepth = props.optArrDepth;
    this.meta = props.meta;
  }

  static fromFieldInfo<FieldValue = any, MapValue = any, Metadata = { [key: string]: any }>(
    fieldInfo: FieldInfo<any, MapValue, Metadata>
  ): ConstantField<FieldValue, MapValue, Metadata> {
    const [modelRef, arrDepth] = getNonArrayModel(fieldInfo.type as Cls);
    const [option, optArrDepth] = getNonArrayModel(fieldInfo.option);

    const isArray = arrDepth > 0;
    const isMap = isGqlMap(modelRef);
    if (isMap && !option.of) throw new Error("Map type must have 'of' option");

    return new ConstantField({
      nullable: option.nullable ?? (option.default === "" ? true : false),
      ref: option.ref,
      refPath: option.refPath,
      refType: option.refType,
      default: option.default ?? (isArray ? [] : null),
      type: option.type,
      fieldType: option.fieldType ?? "property",
      immutable: option.immutable ?? false,
      min: option.min,
      max: option.max,
      enum: option.enum,
      select: option.select ?? true,
      minlength: option.minlength,
      maxlength: option.maxlength,
      accumulate: option.accumulate,
      example: option.example,
      of: option.of,
      validate: option.validate,
      text: option.text,
      modelRef,
      arrDepth: arrDepth,
      optArrDepth: optArrDepth,
      meta: (option.meta ?? {}) as Metadata,
    } as ConstantFieldBuildProps<FieldValue, MapValue, Metadata>);
  }
  get isClass() {
    return !PrimitiveRegistry.has(this.modelRef);
  }
  get isScalar() {
    return ConstantRegistry.isScalar(this.modelRef) || PrimitiveRegistry.has(this.modelRef);
  }
  get isArray() {
    return this.arrDepth > 0;
  }
  get isMap() {
    return isGqlMap(this.modelRef);
  }
  getProps(): FieldProps {
    return {
      nullable: this.nullable,
      ref: this.ref,
      refPath: this.refPath,
      refType: this.refType,
      default: this.default,
      type: this.type,
      fieldType: this.fieldType,
      immutable: this.immutable,
      min: this.min,
      max: this.max,
      enum: this.enum,
      select: this.select,
      minlength: this.minlength,
      maxlength: this.maxlength,
      accumulate: this.accumulate,
      example: this.example,
      of: this.of,
      validate: this.validate,
      text: this.text,
      modelRef: this.modelRef,
      arrDepth: this.arrDepth,
      optArrDepth: this.optArrDepth,
      meta: this.meta,
      isClass: this.isClass,
      isScalar: this.isScalar,
      isArray: this.isArray,
      isMap: this.isMap,
    };
  }
}
export interface FieldObject {
  [key: string]: ConstantField;
}

type FieldOption<
  Value extends ConstantFieldTypeInput,
  MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
  Metadata extends { [key: string]: any } = { [key: string]: any },
  _FieldToValue = FieldToValue<Value> | null | undefined,
> =
  | Omit<ConstantFieldProps<_FieldToValue, MapValue, Metadata>, "enum" | "meta" | "nullable" | "fieldType" | "select">
  | Omit<
      ConstantFieldProps<SingleValue<_FieldToValue>, MapValue, Metadata>,
      "enum" | "meta" | "nullable" | "fieldType" | "select"
    >[];

export type PlainTypeToFieldType<PlainType> = PlainType extends [infer First, ...infer Rest]
  ? PlainTypeToFieldType<First>[]
  : PlainType extends number
    ? typeof Int | typeof Float
    : PlainType extends string
      ? StringConstructor
      : typeof Any;

export const field = <
  ExplicitType,
  Value extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
  MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
>(
  value: Value,
  option: FieldOption<Value, MapValue> = {}
) =>
  new FieldInfo<Value, ExplicitType, MapValue>(value, {
    ...option,
    fieldType: "property",
  });

field.secret = <
  ExplicitType,
  Value extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
  MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
>(
  value: Value,
  option: FieldOption<Value, MapValue> = {}
) =>
  new FieldInfo<Value | null, ExplicitType | null, MapValue>(value, {
    ...option,
    fieldType: "hidden",
    nullable: true,
  });
field.hidden = <
  ExplicitType,
  Value extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
  MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
>(
  value: Value,
  option: FieldOption<Value, MapValue> = {}
) =>
  new FieldInfo<Value | null, ExplicitType | null, MapValue>(value, {
    ...option,
    fieldType: "hidden",
    select: false,
    nullable: true,
  });
export const resolve = <
  ExplicitType,
  Value extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
  MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
>(
  value: Value,
  option: FieldOption<Value, MapValue> = {}
) =>
  new FieldInfo<Value, ExplicitType, MapValue>(value, {
    ...option,
    fieldType: "resolve",
  });
export type FieldBuilder = typeof field;
export type FieldResolver = typeof resolve;
