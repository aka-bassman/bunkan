// TODO: deprecate
import type { Cls } from "@akanjs/base";
import type { SchemaOf } from "./types";

export interface BaseMiddleware {
  onSchema: (schema: SchemaOf<any, any>) => void;
}
export const beyond = <DbModel, Doc>(model: Cls<DbModel>, doc: Cls<Doc>) => {
  return class Middleware {
    onSchema(schema: SchemaOf<DbModel, Doc>) {
      //
    }
  };
};
