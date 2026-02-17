/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */

import type { Cls } from "@akanjs/base";
import { lowerlize, capitalize, Logger } from "@akanjs/common";
import type { BaseMiddleware, Database, FilterInstance } from "@akanjs/document";

import {
  type InjectBuilder,
  injectionBuilder,
  InjectInfo,
  type ExtractInjectInfoObject,
  INJECT_META_KEY,
  type InjectType,
} from "./injectInfo";
import type { DatabaseService } from "./types";
import type { Connection } from "mongoose";

interface ServiceOptions {
  enabled?: boolean;
  serverMode?: "batch" | "federation";
}
export type ServiceType = "database" | "plain";

export interface DefaultServiceMethods {
  readonly logger: Logger;
  readonly connection: Connection;
}

export type ServiceCls<
  RefName extends string = string,
  Methods = {},
  InjectMap extends { [key: string]: InjectInfo } = {},
> = Cls<
  Methods & ExtractInjectInfoObject<InjectMap> & DefaultServiceMethods,
  {
    readonly refName: RefName;
    readonly type: ServiceType;
    readonly [INJECT_META_KEY]: InjectMap;
    readonly enabled: boolean;
  }
>;

export function serve<RefName extends string, Injection extends InjectBuilder>(
  refName: RefName,
  injectBuilder: Injection,
  ...extendSrvs: Cls[]
): ServiceCls<RefName, {}, ReturnType<Injection>>;
export function serve<RefName extends string, Injection extends InjectBuilder>(
  refName: RefName,
  option: ServiceOptions,
  injectBuilder: Injection,
  ...extendSrvs: Cls[]
): ServiceCls<RefName, {}, ReturnType<Injection>>;
export function serve<
  T extends string,
  Input,
  Doc,
  Model,
  Middleware extends BaseMiddleware,
  Obj,
  Insight,
  Filter extends FilterInstance,
  Injection extends InjectBuilder,
  LibSrvs extends Cls[] = [],
>(
  db: Database<T, Input, Doc, Model, Middleware, Obj, Insight, Filter>,
  injectBuilder: Injection,
  ...extendSrvs: LibSrvs
): ServiceCls<T, DatabaseService<T, Input, Doc, Obj, Model, Insight, Filter, LibSrvs>, ReturnType<Injection>>;
export function serve<
  T extends string,
  Input,
  Doc,
  Model,
  Middleware extends BaseMiddleware,
  Obj,
  Insight,
  Filter extends FilterInstance,
  Injection extends InjectBuilder,
  LibSrvs extends Cls[] = [],
>(
  db: Database<T, Input, Doc, Model, Middleware, Obj, Insight, Filter>,
  injectBuilder: Injection,
  ...extendSrvs: LibSrvs
): ServiceCls<T, DatabaseService<T, Input, Doc, Obj, Model, Insight, Filter, LibSrvs>, ReturnType<Injection>>;

export function serve<
  T extends string,
  Input,
  Doc,
  Model,
  Middleware extends BaseMiddleware,
  Obj,
  Insight,
  Filter extends FilterInstance,
  Injection extends InjectBuilder,
  LibSrvs extends Cls[] = [],
>(
  db: Database<T, Input, Doc, Model, Middleware, Obj, Insight, Filter>,
  option: ServiceOptions,
  injectBuilder: Injection,
  ...extendSrvs: LibSrvs
): ServiceCls<T, DatabaseService<T, Input, Doc, Obj, Model, Insight, Filter, LibSrvs>, ReturnType<Injection>>;

export function serve(
  refNameOrDb: string | Database,
  optionOrInjectBuilder: ServiceOptions | InjectBuilder,
  injectBuilderOrExtendSrv?: InjectBuilder<Exclude<InjectType, "database">> | Cls,
  ...extendSrvs: Cls[]
) {
  const refName = typeof refNameOrDb === "string" ? lowerlize(refNameOrDb) : refNameOrDb.refName;
  const option = typeof optionOrInjectBuilder === "object" ? optionOrInjectBuilder : { enabled: true };
  const injectBuilder =
    typeof optionOrInjectBuilder === "function" ? optionOrInjectBuilder : (injectBuilderOrExtendSrv as InjectBuilder);
  const extSrvs = [
    ...(typeof optionOrInjectBuilder === "function" && injectBuilderOrExtendSrv ? [injectBuilderOrExtendSrv] : []),
    ...extendSrvs,
  ] as Cls[];
  const isEnabled =
    option.enabled ??
    (!option.serverMode || process.env.SERVER_MODE === option.serverMode || process.env.SERVER_MODE === "all");
  const serviceType = typeof refNameOrDb === "string" ? "plain" : "database";
  const injectInfoMap = injectBuilder(injectionBuilder);
  if (serviceType === "database")
    Object.assign(injectInfoMap, {
      [`${refName}Model`]: new InjectInfo("database", {
        additionalPropKeys: ["__databaseModel"],
      }),
    });
  const srvRef =
    extSrvs[0] ??
    class Service {
      static readonly type = serviceType;
      static readonly refName = refName;
      static readonly enabled = isEnabled;
      static get name() {
        return `${capitalize(refName)}Service`;
      }
      static readonly [INJECT_META_KEY] = injectInfoMap;
      readonly logger = new Logger(this.constructor.name);
    };

  return srvRef;
}
