import type { Cls, PromiseOrObject } from "@akanjs/base";

import { INJECT_META_KEY } from "./injectInfo";
import { Logger, applyMixins, capitalize } from "@akanjs/common";
import {
  getFilterMeta,
  type BaseMiddleware,
  type CRUDEventType,
  type DataInputOf,
  type Database,
  type DatabaseInstance,
  type ExtractQuery,
  type ExtractSort,
  type FilterInstance,
  type FindQueryOption,
  type ListQueryOption,
  type SaveEventType,
  getFilterInfoByKey,
} from "@akanjs/document";
import type { DatabaseService } from "./types";
import type { HydratedDocument } from "mongoose";
import type { QueryOf } from "@akanjs/constant";
import type { ServiceCls } from "./serve";
import type { AdaptorCls } from "./adapt";

export class ServiceRegistry {
  static #database = new Map<string, ServiceCls>();
  static #plain = new Map<string, ServiceCls>();
  static #adaptor = new Map<string, AdaptorCls>();
  static setDatabase(refName: string, service: ServiceCls) {
    const existingSrv = this.#database.get(refName);
    if (existingSrv) {
      applyMixins(existingSrv, [service]);
      Object.assign(existingSrv[INJECT_META_KEY], service[INJECT_META_KEY]);
    } else this.#database.set(refName, service);
  }
  static getDatabase(refName: string) {
    return this.#database.get(refName);
  }
  static setPlain(refName: string, service: ServiceCls) {
    this.#plain.set(refName, service);
  }
  static setAdaptor(refName: string, adaptor: AdaptorCls) {
    this.#adaptor.set(refName, adaptor);
  }
  static register<Srvs extends ServiceCls[]>(
    ...services: Srvs
  ): {
    [K in Srvs[number]["refName"]]: Srvs[number];
  } {
    services.forEach((srvRef) => {
      srvRef.type === "database" ? this.setDatabase(srvRef.refName, srvRef) : this.setPlain(srvRef.refName, srvRef);
    });
    return Object.fromEntries(services.map((srvRef) => [srvRef.refName, srvRef])) as {
      [K in Srvs[number]["refName"]]: Srvs[number];
    };
  }
}
