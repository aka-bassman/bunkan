import dayjsLib, { type Dayjs } from "dayjs";
import type { ReadStream } from "fs";
import type { Readable } from "stream";

import type { Cls } from "./types";

export type { Dayjs };

export const dayjs = dayjsLib;
export class BaseObject {
  declare id: string;
  declare createdAt: Dayjs;
  declare updatedAt: Dayjs;
  declare removedAt: Dayjs | null;
}
export class BaseInsight {
  declare count: number;
}

export class ScalarRegistry {
  static readonly #nameScalarMap = new Map<string, PrimitiveScalar>();
  static readonly #scalarNameMap = new Map<PrimitiveScalar, string>();
  static registerScalar(
    scalar: typeof PrimitiveScalar,
    { overwrite = false } = {},
  ) {
    if (
      !overwrite &&
      (this.#nameScalarMap.has(scalar.$scalarName) ||
        this.#scalarNameMap.has(scalar))
    )
      throw new Error(`Scalar ${scalar.$scalarName} already registered`);
    this.#nameScalarMap.set(scalar.$scalarName, scalar);
    this.#scalarNameMap.set(scalar, scalar.$scalarName);
  }
  static getScalar(name: string): PrimitiveScalar | undefined {
    const scalar = this.#nameScalarMap.get(name);
    if (!scalar) throw new Error(`Scalar ${name} not found`);
    return scalar;
  }
  static getScalarName(scalar: PrimitiveScalar): string | undefined {
    const name = this.#scalarNameMap.get(scalar);
    if (!name) throw new Error(`Scalar ${scalar} not found`);
    return name;
  }
  static isScalar(modelRef: Cls): boolean {
    return this.#scalarNameMap.has(modelRef);
  }
  static isScalarName(name: string): boolean {
    return this.#nameScalarMap.has(name);
  }
  static getScalarNames(): string[] {
    return [...this.#nameScalarMap.keys()];
  }
  static getScalars(): PrimitiveScalar[] {
    return [...this.#nameScalarMap.values()];
  }
}

export class PrimitiveScalar {
  static $scalarName: string;
  static $serverValue: any;
  static $clientValue: any;
  static $defaultValue: any = null;

  static validate(value: any): boolean {
    return true;
  }
  static parseValue(value: any): any {
    return value;
  }
  static serializeValue(value: any): any {
    return value;
  }
  static _parse(this: typeof PrimitiveScalar, input: any): any {
    const value = this.parseValue(input);
    this._checkValue(value);
    return value;
  }
  static _serialize(this: typeof PrimitiveScalar, value: any): any {
    this._checkValue(value);
    return this.serializeValue(value);
  }
  static _checkValue(this: typeof PrimitiveScalar, value: any): void {
    if (!this.validate(value))
      throw new Error(`Invalid ${this.$scalarName} value: ${value}`);
  }
}

export class Int extends PrimitiveScalar {
  static override $scalarName: "Int" = "Int";
  static override $serverValue: number;
  static override $clientValue: number;
  static override $defaultValue: number = 0;

  static override validate(value: any): boolean {
    return typeof value === "number" && Number.isSafeInteger(value);
  }
  static override parseValue(input: any): number {
    return Number(input);
  }
  static override serializeValue(value: number): number {
    return value;
  }
}
ScalarRegistry.registerScalar(Int);

export class Float extends PrimitiveScalar {
  static override $scalarName: "Float" = "Float";
  static override $serverValue: number;
  static override $clientValue: number;
  static override $defaultValue: number = 0;

  static override validate(value: any): boolean {
    return typeof value === "number" && Number.isFinite(value);
  }
  static override parseValue(input: any): number {
    return Number(input);
  }
  static override serializeValue(value: number): number {
    return value;
  }
}
ScalarRegistry.registerScalar(Float);

export class ID extends PrimitiveScalar {
  static override $scalarName: "ID" = "ID";
  static override $serverValue: string;
  static override $clientValue: string;
  static override $defaultValue: string = "000000000000000000000000";

  static override validate(value: any): boolean {
    if (typeof value !== "string") return false;
    return /^[0-9a-fA-F]{24}$/.test(value);
  }
  static override parseValue(input: any): string {
    return String(input);
  }
  static override serializeValue(value: string): string {
    return String(value);
  }
}
ScalarRegistry.registerScalar(ID);

export class Any<
  ServerValue = any,
  ClientValue = ServerValue,
> extends PrimitiveScalar {
  static override $scalarName: "Any" = "Any";
  static override $defaultValue: any = null;
}
ScalarRegistry.registerScalar(Any);

export class Upload extends PrimitiveScalar {
  static override $scalarName: "Upload" = "Upload";
  static override $serverValue: File;
  static override $clientValue: {
    filename: string;
    mimetype: string;
    encoding: string;
    createReadStream: () => ReadStream | Readable;
  };
  static override $defaultValue: any = null;
}
ScalarRegistry.registerScalar(Upload);

declare global {
  interface StringConstructor {
    $scalarName: "String";
    $serverValue: string;
    $clientValue: string;
    $defaultValue: string;
    validate(value: any): boolean;
    parseValue(input: any): string;
    serializeValue(value: string): string;
    _parse(input: any): string;
    _serialize(value: string): string;
    _checkValue(value: any): void;
  }
  interface BooleanConstructor {
    $scalarName: "Boolean";
    $serverValue: boolean;
    $clientValue: boolean;
    $defaultValue: boolean;
    validate(value: any): boolean;
    parseValue(input: any): boolean;
    serializeValue(value: boolean): boolean;
    _parse(input: any): boolean;
    _serialize(value: boolean): boolean;
    _checkValue(value: any): void;
  }
  interface DateConstructor {
    $scalarName: "Date";
    $serverValue: Dayjs;
    $clientValue: Dayjs;
    $defaultValue: Dayjs;
    validate(value: any): boolean;
    parseValue(input: any): Dayjs;
    serializeValue(value: Date): string;
    _parse(input: any): Dayjs;
    _serialize(value: Dayjs): string;
    _checkValue(value: any): void;
  }
}

// String
Object.assign(String, {
  $scalarName: "String",
  $defaultValue: "",
  validate(value: any) {
    return typeof value === "string";
  },
  parseValue(input: any) {
    return String(input);
  },
  serializeValue(value: string) {
    return String(value);
  },
});
ScalarRegistry.registerScalar(String);

// Boolean
Object.assign(Boolean, {
  $scalarName: "Boolean",
  $defaultValue: false,
  validate(value: any) {
    return typeof value === "boolean";
  },
  parseValue(input: any) {
    return Boolean(input);
  },
  serializeValue(value: boolean) {
    return Boolean(value);
  },
});
ScalarRegistry.registerScalar(Boolean);

// Date
Object.assign(Date, {
  $scalarName: "Date",
  $defaultValue: dayjs(new Date(-1)),
  validate(value: any) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;
    return true;
  },
  parseValue(input: any) {
    return dayjs(input);
  },
  serializeValue(value: Dayjs) {
    return value.toISOString();
  },
});
ScalarRegistry.registerScalar(Date);

// export type SingleFieldType =
//   | Int
//   | Float
//   | StringConstructor
//   | BooleanConstructor
//   | ID
//   | DateConstructor
//   | Any
//   | Cls
//   | GraphQLJSON
//   | GraphQLUpload;

// export const gqlScalars = [
//   String,
//   Boolean,
//   Date,
//   ID,
//   Int,
//   Float,
//   Upload,
//   Any,
//   Map,
// ] as const;
// export type GqlScalar = (typeof gqlScalars)[number];
// export const gqlScalarNames = [
//   "ID",
//   "Int",
//   "Float",
//   "String",
//   "Boolean",
//   "Date",
//   "Upload",
//   "Any",
//   "Map",
// ] as const;
// export type GqlScalarName = (typeof gqlScalarNames)[number];
// export const scalarSet = new Set<GqlScalar>([
//   String,
//   Boolean,
//   Date,
//   ID,
//   Int,
//   Float,
//   Upload,
//   Any,
//   Map,
// ]);
// export const gqlScalarMap = new Map<GqlScalarName, GqlScalar>([
//   ["ID", ID],
//   ["Int", Int],
//   ["Float", Float],
//   ["String", String],
//   ["Boolean", Boolean],
//   ["Date", Date],
//   ["Upload", Upload],
//   ["Any", Any],
//   ["Map", Map],
// ]);
// export const scalarNameMap = new Map<GqlScalar, GqlScalarName>([
//   [ID, "ID"],
//   [Int, "Int"],
//   [Float, "Float"],
//   [String, "String"],
//   [Boolean, "Boolean"],
//   [Date, "Date"],
//   [Upload, "Upload"],
//   [Any, "Any"],
//   [Map, "Map"],
// ]);
// export const scalarArgMap = new Map<GqlScalar, any>([
//   [ID, null],
//   [String, ""],
//   [Boolean, false],
//   [Date, dayjs(new Date(-1))],
//   [Int, 0],
//   [Float, 0],
//   [Any, {}],
//   [Map, {}],
// ]);
// export const scalarDefaultMap = new Map<GqlScalar, any>([
//   [ID, null],
//   [String, ""],
//   [Boolean, false],
//   [Date, dayjs(new Date(-1))],
//   [Int, 0],
//   [Float, 0],
//   [Any, {}],
// ]);

// export const isGqlClass = (modelRef: Cls) =>
//   !(modelRef.prototype instanceof PrimitiveScalar);
// export const isGqlScalar = (modelRef: Cls) =>
//   modelRef.prototype instanceof PrimitiveScalar;
// export const isGqlMap = (modelRef: any) => modelRef === Map;
