import type { EnumInstance, GetStateObject, Cls } from "@akanjs/base";
import type { Document, HydratedDocument, ProjectionType, Schema } from "mongoose";
import type { FilterInfo } from ".";
import type { DocumentModel } from "@akanjs/constant";

export type DataInputOf<Input = any, Obj = any> = {
  [K in keyof Input as Input[K] extends (...args: any[]) => any ? never : K]: Input[K] extends any[]
    ? Input[K] | undefined
    : Input[K];
} & Partial<Obj>;

export type GetDocObject<D> = GetStateObject<Omit<D, Exclude<keyof Document, "id"> | "__v">>;

// export interface ConstantFilterQueryMeta<
//   Args extends any[] = any[],
//   Model = any,
// > {
//   fn: (...args: Args) => QueryOf<Model>;
//   args: FilterArgMeta[];
// }

export interface ConstantFilterMeta {
  query: { [key: string]: FilterInfo };
  sort: { [key: string]: any };
}
export interface FilterKeyProps {
  type?: "mongo" | "meili";
}

export interface FilterArgProps {
  nullable?: boolean;
  ref?: string;
  default?: string | number | boolean | object | null | (() => string | number | boolean | object | null);
  renderOption?: (value: any) => string;
  enum?: EnumInstance;
}
// export interface FilterArgMeta extends FilterArgProps {
//   name: string;
//   modelRef: Cls;
//   arrDepth: number;
//   isArray: boolean;
//   optArrDepth: number;
// }

export interface ListQueryOption<Sort = never, Obj = any> {
  skip?: number | null;
  limit?: number | null;
  sort?: Sort | null;
  sample?: number;
  select?: ProjectionType<Obj>;
}
export interface FindQueryOption<Sort = never, Obj = any> {
  skip?: number | null;
  sort?: Sort | null;
  sample?: boolean;
  select?: ProjectionType<Obj>;
}

export type SchemaOf<Mdl = any, Doc = any> = Schema<null, Mdl, Doc, undefined, null, Mdl>;
