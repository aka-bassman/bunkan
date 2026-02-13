import { Any } from "@akanjs/base";
import { getAllDictionary, getDictionary } from "@akanjs/dictionary";
import { srv } from "@akanjs/service";

import { serverSignal } from "./serverSignal";
import { internal } from "./internal";
import { endpoint } from "./endpoint";

export class BaseInternal extends internal(srv.base, ({ interval }) => ({
  publishPing: interval(3000).exec(function () {
    this.baseService.publishPing();
  }),
})) {}

export class BaseEndpoint extends endpoint(srv.base, ({ query, mutation, message, pubsub }) => ({
  ping: query(String, { cache: 3000 }).exec(function () {
    return "ping";
  }),
  pingBody: query(String, { cache: 10000 })
    .body("data", String)
    .exec(function () {
      return "pingBody";
    }),
  pingParam: query(String, { cache: 10000 })
    .param("id", String)
    .exec(function () {
      return "pingParam";
    }),
  pingQuery: query(String, { nullable: true })
    .search("id", String)
    .exec(function (id) {
      return id;
    }),
  pingEvery: query(String).exec(function () {
    return "pingEvery";
  }),
  pingUser: query(String).exec(function () {
    return "pingUser";
  }),
  pingAdmin: query(String).exec(function () {
    return "pingAdmin";
  }),
  getDictionary: query(Any)
    .param("lang", String)
    .exec(function (lang) {
      const dictionary = getDictionary(lang as "en") as Record<string, object>;
      return dictionary;
    }),
  getAllDictionary: query(Any).exec(function () {
    const dictionary = getAllDictionary() as Record<string, Record<string, object>>;
    return dictionary;
  }),
  cleanup: mutation(Boolean).exec(async function () {
    if (process.env.NODE_ENV !== "test") throw new Error("cleanup is only available in test environment");
    await this.baseService.cleanup();
    return true;
  }),
  wsPing: message(String).exec(function () {
    return "wsPing";
  }),
  pubsubPing: pubsub(String).exec(function () {
    //
  }),
  // getSignals: query(Any).exec(function () {
  //   return signalInfo.serializedSignals;
  // }),
})) {}

export class Base extends serverSignal(BaseEndpoint, BaseInternal) {}
