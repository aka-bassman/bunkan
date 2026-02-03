import {
  type Cls,
  type EnumInstance,
  Float,
  ID,
  Int,
  Upload,
  PrimitiveRegistry,
  PrimitiveScalar,
} from "@akanjs/base";
import { capitalize } from "@akanjs/common";
import type { AccumulatorOperator } from "mongoose";

import { ConstantRegistry } from "./constantRegistry";

export const getGqlTypeStr = (ref: Cls): string =>
  PrimitiveRegistry.has(ref)
    ? PrimitiveRegistry.getName(ref as PrimitiveScalar)
    : `${ConstantRegistry.isLight(ref) ? "Light" : ""}${capitalize(ConstantRegistry.getRefName(ref))}${ConstantRegistry.isInsight(ref) ? "Insight" : ""}`;

export interface ConstantClassMeta {
  refName: string;
  modelRef: any;
  type: "input" | "full" | "light" | "scalar";
  modelType: "data" | "ephemeral" | "insight";
  hasTextField: boolean;
}

export const fieldPresets = ["email", "password", "url"] as const;
export type FieldPreset = (typeof fieldPresets)[number];

export interface ConstantFieldProps<
  FieldValue = any,
  MapValue = any,
  Metadata = { [key: string]: any },
> {
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
export type ConstantFieldMeta<
  FieldValue = any,
  MapValue = any,
  Metadata = { [key: string]: any },
> = ConstantFieldProps<FieldValue, MapValue, Metadata> & {
  nullable: boolean;
  default: any;
  fieldType: "property" | "hidden" | "resolve";
  immutable: boolean;
  select: boolean;
} & {
  key: string;
  isClass: boolean;
  isScalar: boolean;
  modelRef: Cls;
  arrDepth: number;
  isArray: boolean;
  optArrDepth: number;
  isMap: boolean;
  meta: Metadata;
};
