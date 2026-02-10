/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { Cls } from "@akanjs/base";
import DataLoader from "dataloader";
import { flatMap, get, groupBy, keyBy } from "lodash";
import type { Document, Model } from "mongoose";
import { Schema, Types } from "mongoose";
import type { QueryOf } from "@akanjs/constant";

export const Id = Types.ObjectId;
export const ObjectId = Schema.Types.ObjectId;
export const Mixed = Schema.Types.Mixed;
export { DataLoader };

export const createLoader = <Key, Value>(
  model: Model<any>,
  fieldName = "_id",
  defaultQuery: QueryOf<unknown> = {},
) => {
  return new DataLoader<Key, Value>(
    (fields) => {
      const query: QueryOf<unknown> = { ...defaultQuery };
      query[fieldName] = { $in: fields };
      const data = model.find(query).then((list: Document[]) => {
        const listByKey = keyBy(list, fieldName);
        return fields.map((id: unknown) => get(listByKey, id as any, null));
      });
      return data as unknown as Promise<Value[]>;
    },
    { name: "dataloader", cache: false },
  );
};
export const createArrayLoader = <K, V>(
  model: Model<any>,
  fieldName = "_id",
  defaultQuery: QueryOf<unknown> = {},
) => {
  return new DataLoader<K, V>((fields) => {
    const query: QueryOf<unknown> = { ...defaultQuery };
    query[fieldName] = { $in: fields };
    const data = model.find(query).then((list) => {
      return fields.map((field) =>
        list.filter((item) => field === item[fieldName]),
      );
    });
    return data as unknown as Promise<V[]>;
  });
};
export const createArrayElementLoader = <K, V>(
  model: Model<any>,
  fieldName = "_id",
  defaultQuery: QueryOf<unknown> = {},
) => {
  return new DataLoader<K, V>(
    (fields: any) => {
      const query: QueryOf<unknown> = { ...defaultQuery };
      query[fieldName] = { $in: fields };
      const data = model.find(query).then((list: Document[]) => {
        const flat = flatMap(list, (datum: { [key: string]: any }) =>
          datum[fieldName].map((datField: any) => ({
            ...datum.toObject(),
            key: datField,
          })),
        );
        const listByKey = groupBy(flat, (dat) => dat.key);
        return fields.map((id: any) => get(listByKey, id, null));
      });
      return data;
    },
    { name: "dataloader", cache: false },
  );
};

export const createQueryLoader = <Key, Value>(
  model: Model<any>,
  queryKeys: string[],
  defaultQuery: QueryOf<unknown> = {},
) => {
  return new DataLoader<Key, Value, Key>(
    (queries: any): any => {
      const query: QueryOf<unknown> = {
        $and: [{ $or: queries }, defaultQuery],
      };
      const getQueryKey = (query: QueryOf<unknown>) =>
        queryKeys.map((key) => query[key].toString()).join("");
      const data = model.find(query).then((list: Document[]) => {
        const listByKey = keyBy(list, getQueryKey);
        return queries.map((query: QueryOf<unknown>) =>
          get(listByKey, getQueryKey(query), null),
        );
      });
      return data;
    },
    { name: "dataloader", cache: false },
  );
};

export type Loader<Field, Value> = DataLoader<Field, Value | null>;
