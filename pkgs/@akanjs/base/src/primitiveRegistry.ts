import dayjsLib, { type Dayjs } from "dayjs";
import type { ReadStream } from "fs";
import type { Readable } from "stream";

import type { Cls } from "./types";

export type { Dayjs };

export const dayjs = dayjsLib;

export class PrimitiveRegistry {
  static readonly #namePrimitiveMap = new Map<string, PrimitiveScalar>();
  static readonly #primitiveNameMap = new Map<PrimitiveScalar, string>();
  static register(scalar: typeof PrimitiveScalar, { overwrite = false } = {}) {
    if (!overwrite && (this.#namePrimitiveMap.has(scalar.refName) || this.#primitiveNameMap.has(scalar)))
      throw new Error(`Scalar ${scalar.refName} already registered`);
    this.#namePrimitiveMap.set(scalar.refName, scalar);
    this.#primitiveNameMap.set(scalar, scalar.refName);
  }
  static get(name: string): PrimitiveScalar {
    const scalar = this.#namePrimitiveMap.get(name);
    if (!scalar) throw new Error(`Scalar ${name} not found`);
    return scalar;
  }
  static getName(scalar: PrimitiveScalar): string {
    const name = this.#primitiveNameMap.get(scalar);
    if (!name) throw new Error(`Scalar ${scalar} not found`);
    return name;
  }
  static has(modelRef: Cls): boolean {
    return this.#primitiveNameMap.has(modelRef);
  }
  static hasName(name: string): boolean {
    return this.#namePrimitiveMap.has(name);
  }
  static getNames(): string[] {
    return [...this.#namePrimitiveMap.keys()];
  }
  static getAll(): PrimitiveScalar[] {
    return [...this.#namePrimitiveMap.values()];
  }
}

export const PRIMITIVE_SERVER_VALUE = Symbol("PRIMITIVE_SERVER_VALUE");
export const PRIMITIVE_CLIENT_VALUE = Symbol("PRIMITIVE_CLIENT_VALUE");
export const PRIMITIVE_DEFAULT_VALUE = Symbol("PRIMITIVE_DEFAULT_VALUE");
export const PRIMITIVE_EXAMPLE_VALUE = Symbol("PRIMITIVE_EXAMPLE_VALUE");

export class PrimitiveScalar {
  static refName: string;
  static [PRIMITIVE_SERVER_VALUE]: unknown;
  static [PRIMITIVE_CLIENT_VALUE]: unknown;
  static [PRIMITIVE_DEFAULT_VALUE]: unknown = null;
  static [PRIMITIVE_EXAMPLE_VALUE]: unknown = null;

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
    if (!this.validate(value)) throw new Error(`Invalid ${this.refName} value: ${value}`);
  }
}

export class Int extends PrimitiveScalar {
  static override refName: "Int" = "Int";
  static [PRIMITIVE_SERVER_VALUE]: number;
  static [PRIMITIVE_CLIENT_VALUE]: number;
  static [PRIMITIVE_DEFAULT_VALUE]: number = 0;
  static [PRIMITIVE_EXAMPLE_VALUE]: number = 0;

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
PrimitiveRegistry.register(Int);

export class Float extends PrimitiveScalar {
  static override refName: "Float" = "Float";
  static [PRIMITIVE_SERVER_VALUE]: number;
  static [PRIMITIVE_CLIENT_VALUE]: number;
  static [PRIMITIVE_DEFAULT_VALUE]: number = 0;
  static [PRIMITIVE_EXAMPLE_VALUE]: number = 0;

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
PrimitiveRegistry.register(Float);

export class ID extends PrimitiveScalar {
  static override refName: "ID" = "ID";
  static [PRIMITIVE_SERVER_VALUE]: string;
  static [PRIMITIVE_CLIENT_VALUE]: string;
  static [PRIMITIVE_DEFAULT_VALUE]: string = "000000000000000000000000";
  static [PRIMITIVE_EXAMPLE_VALUE]: string = "1234567890abcdef12345678";

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
PrimitiveRegistry.register(ID);

export class Any<ServerValue = any, ClientValue = ServerValue> extends PrimitiveScalar {
  static override refName: "Any" = "Any";
  static [PRIMITIVE_DEFAULT_VALUE]: any = null;
  static [PRIMITIVE_EXAMPLE_VALUE]: any = {};
}
PrimitiveRegistry.register(Any);

export class Upload extends PrimitiveScalar {
  static override refName: "Upload" = "Upload";
  static [PRIMITIVE_SERVER_VALUE]: File;
  static [PRIMITIVE_CLIENT_VALUE]: {
    filename: string;
    mimetype: string;
    encoding: string;
    createReadStream: () => ReadStream | Readable;
  };
  static [PRIMITIVE_DEFAULT_VALUE]: any = null;
  static [PRIMITIVE_EXAMPLE_VALUE] = "FileUpload";
}
PrimitiveRegistry.register(Upload);

declare global {
  interface StringConstructor {
    refName: "String";
    [PRIMITIVE_SERVER_VALUE]: string;
    [PRIMITIVE_CLIENT_VALUE]: string;
    [PRIMITIVE_DEFAULT_VALUE]: string;
    [PRIMITIVE_EXAMPLE_VALUE]: string;
    validate(value: any): boolean;
    parseValue(input: any): string;
    serializeValue(value: string): string;
    _parse(input: any): string;
    _serialize(value: string): string;
    _checkValue(value: any): void;
  }
  interface BooleanConstructor {
    refName: "Boolean";
    [PRIMITIVE_SERVER_VALUE]: boolean;
    [PRIMITIVE_CLIENT_VALUE]: boolean;
    [PRIMITIVE_DEFAULT_VALUE]: boolean;
    [PRIMITIVE_EXAMPLE_VALUE]: boolean;
    validate(value: any): boolean;
    parseValue(input: any): boolean;
    serializeValue(value: boolean): boolean;
    _parse(input: any): boolean;
    _serialize(value: boolean): boolean;
    _checkValue(value: any): void;
  }
  interface DateConstructor {
    refName: "Date";
    [PRIMITIVE_SERVER_VALUE]: Dayjs;
    [PRIMITIVE_CLIENT_VALUE]: Dayjs;
    [PRIMITIVE_DEFAULT_VALUE]: Dayjs;
    [PRIMITIVE_EXAMPLE_VALUE]: string;
    validate(value: any): boolean;
    parseValue(input: any): Dayjs;
    serializeValue(value: Date): string;
    _parse(input: any): Dayjs;
    _serialize(value: Dayjs): string;
    _checkValue(value: any): void;
  }
}

const scalarPrimitiveStatics = {
  _parse(this: typeof PrimitiveScalar, input: any): any {
    const value = this.parseValue(input);
    this._checkValue(value);
    return value;
  },
  _serialize(this: typeof PrimitiveScalar, value: any): any {
    this._checkValue(value);
    return this.serializeValue(value);
  },
  _checkValue(this: typeof PrimitiveScalar, value: any): void {
    if (!this.validate(value)) throw new Error(`Invalid ${this.refName} value: ${value}`);
  },
};

// String
Object.assign(String, {
  ...scalarPrimitiveStatics,
  refName: "String",
  [PRIMITIVE_DEFAULT_VALUE]: "",
  [PRIMITIVE_EXAMPLE_VALUE]: "String",
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
PrimitiveRegistry.register(String);

// Boolean
Object.assign(Boolean, {
  ...scalarPrimitiveStatics,
  refName: "Boolean",
  [PRIMITIVE_DEFAULT_VALUE]: false,
  [PRIMITIVE_EXAMPLE_VALUE]: true,
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
PrimitiveRegistry.register(Boolean);

// Date
Object.assign(Date, {
  ...scalarPrimitiveStatics,
  refName: "Date",
  [PRIMITIVE_DEFAULT_VALUE]: dayjs(new Date(-1)),
  [PRIMITIVE_EXAMPLE_VALUE]: dayjs(new Date().toISOString()),
  validate(value: any) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;
    return true;
  },
  parseValue(input: any) {
    return dayjs(input);
  },
  serializeValue(value: Dayjs) {
    return value.toDate();
  },
});
PrimitiveRegistry.register(Date);
