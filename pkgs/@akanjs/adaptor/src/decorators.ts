/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { Connection } from "mongoose";
import type { AdaptorCls, DatabaseService, ServiceCls } from "@akanjs/service";
import type { UnCls } from "@akanjs/base";
import type { Database, DatabaseModel, Mdl } from "../../document/src";

export const Try = () => {
  return function (target: object, key: string, descriptor: PropertyDescriptor) {
    const originMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      try {
        const result = await originMethod.apply(this, args);
        return result;
      } catch (e) {
        (this as UnCls<ServiceCls | AdaptorCls>).logger?.warn(`${key} action error return: ${e}`);
      }
    };
  };
};

export const Transaction = () => {
  return function (target: object, key: string, descriptor: PropertyDescriptor) {
    const originMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const connection = (this as UnCls<ServiceCls>).connection;
      if (!connection) throw new Error(`No Connection in function ${key}`);
      return new Promise((resolve, reject) => {
        connection
          .transaction(async () => {
            const res = await originMethod.apply(this, args);
            resolve(res);
          })
          .catch(reject);
      });
    };
    return descriptor;
  };
};

// TODO: Need to be refactored.
export const Cache = (timeout = 1000, getCacheKey?: (...args: any[]) => string): MethodDecorator => {
  return function (target: object, key: string | symbol, descriptor: PropertyDescriptor) {
    const originMethod = descriptor.value;
    const cacheMap = new Map<string, any>();
    const timerMap = new Map<string, NodeJS.Timeout>();
    descriptor.value = async function (...args: any[]) {
      const classType = (this as { __model: any }).__model
        ? "doc"
        : (this as { __databaseModel: any }).__databaseModel
          ? "service"
          : "class";
      const model =
        (this as { __model: any; __databaseModel: any }).__model ??
        (this as { __databaseModel: any }).__databaseModel?.__model;
      const cache =
        (this as { __cache: any; __databaseModel: any }).__cache ??
        (this as { __databaseModel: any }).__databaseModel?.__cache;
      const getCacheKeyFn = getCacheKey ?? JSON.stringify;
      const cacheKey = `${classType}:${model.modelName}:${String(key)}:${getCacheKeyFn(args)}`;
      const getCache = async (cacheKey: string) => {
        if (classType === "class") return cacheMap.get(cacheKey);
        const cached = (await cache.get(cacheKey)) as string | null;
        if (cached) return JSON.parse(cached);
        return null;
      };
      const setCache = async (cacheKey: string, value: any) => {
        if (classType === "class") {
          const existingTimer = timerMap.get(cacheKey);
          if (existingTimer) clearTimeout(existingTimer);
          cacheMap.set(cacheKey, value);
          const timer = setTimeout(() => {
            cacheMap.delete(cacheKey);
            timerMap.delete(cacheKey);
          }, timeout);
          timerMap.set(cacheKey, timer);
        } else await cache.set(cacheKey, JSON.stringify(value), { PX: timeout });
      };
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        (this as UnCls<ServiceCls | AdaptorCls>).logger?.trace(`${model.modelName} cache hit: ${cacheKey}`);
        return cachedData;
      }
      const result = await originMethod.apply(this, args);
      await setCache(cacheKey, result);
      (this as UnCls<ServiceCls | AdaptorCls>).logger?.trace(`${model.modelName} cache set: ${cacheKey}`);
      return result;
    };
  };
};
