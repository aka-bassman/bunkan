import type { Dayjs, MergedValues, PromiseOrObject } from "@akanjs/base";
import { Logger, lowerlize } from "@akanjs/common";
import { DEFAULT_PAGE_SIZE, FIELD_META, type DocumentModel, type QueryOf } from "@akanjs/constant";
import type DataLoader from "dataloader";
import type { Filter, Index, MeiliSearch } from "meilisearch";
import type { Redis } from "ioredis";

import type { CRUDEventType, Mdl, SaveEventType } from "./into";
import { type ExtractQuery, type ExtractSort, type FilterInstance } from "./filterMeta";
import type { DataInputOf, FindQueryOption, ListQueryOption } from "./types";

export interface RedisSetOptions {
  expireAt?: Dayjs;
}

export class CacheDatabase<T = any> {
  private logger: Logger;
  constructor(
    private readonly refName: string,
    private readonly redis: Redis
  ) {
    this.logger = new Logger(`${refName}Cache`);
  }
  async set(topic: string, key: string, value: string | number | Buffer, option: RedisSetOptions = {}) {
    const expireTime = option.expireAt?.toDate().getTime();
    if (expireTime) await this.redis.set(`${this.refName}:${topic}:${key}`, value, "PXAT", expireTime);
    else await this.redis.set(`${this.refName}:${topic}:${key}`, value);
  }
  async get<T extends string | number | Buffer>(topic: string, key: string): Promise<T | undefined> {
    const value = await this.redis.get(`${this.refName}:${topic}:${key}`);
    return value as T | undefined;
  }
  async delete(topic: string, key: string) {
    await this.redis.del(`${this.refName}:${topic}:${key}`);
  }
}
export class SearchDatabase<T = any> {
  private logger: Logger;
  private index: Index;
  constructor(
    readonly refName: string,
    readonly meili: MeiliSearch
  ) {
    this.logger = new Logger(`${refName}Search`);
    this.index = meili.index(lowerlize(refName));
  }
  async searchIds(
    searchText: string | undefined | null,
    option: {
      filter?: Filter;
      skip?: number | null;
      limit?: number | null;
      sort?: string[] | null;
    } = {}
  ): Promise<{ ids: string[]; total: number }> {
    const { skip = 0, limit = DEFAULT_PAGE_SIZE, sort } = option;
    if (!searchText) {
      const { results, total } = await this.index.getDocuments({
        offset: skip ?? 0,
        limit: limit ?? 0,
      });
      return { ids: results.map((result) => result.id), total };
    }
    const { hits, estimatedTotalHits } = await this.index.search(searchText, {
      offset: skip ?? 0,
      limit: limit ?? 0,
      sort: sort ?? [],
      filter: option.filter,
      attributesToRetrieve: ["id"],
    });
    return { ids: hits.map((hit) => hit.id), total: estimatedTotalHits };
  }
  async count(
    searchText: string | undefined | null,
    option: {
      filter?: Filter;
      skip?: number | null;
      limit?: number | null;
      sort?: string | null;
    } = {}
  ): Promise<number> {
    const { skip = 0, limit = DEFAULT_PAGE_SIZE, sort = "" } = option;
    if (!searchText) {
      const { results, total } = await this.index.getDocuments({
        offset: skip ?? 0,
        limit: limit ?? 0,
      });
      return total;
    }
    const { hits, estimatedTotalHits } = await this.index.search(searchText, {
      offset: skip ?? 0,
      limit: limit ?? 0,
      filter: option.filter,
      attributesToRetrieve: ["id"],
    });
    return estimatedTotalHits;
  }
}

type QueryMethodOfKey<
  CapitalizedK extends string,
  Doc,
  Insight,
  _Args extends any[],
  _ListArgs extends any[],
  _FindArgs extends any[],
  _QueryOfDoc = QueryOf<Doc>,
> = {
  [K in `list${CapitalizedK}`]: (...args: _ListArgs) => Promise<Doc[]>;
} & {
  [K in `listIds${CapitalizedK}`]: (...args: _ListArgs) => Promise<string[]>;
} & {
  [K in `find${CapitalizedK}`]: (...args: _FindArgs) => Promise<Doc | null>;
} & {
  [K in `findId${CapitalizedK}`]: (...args: _FindArgs) => Promise<string | null>;
} & {
  [K in `pick${CapitalizedK}`]: (...args: _FindArgs) => Promise<Doc>;
} & {
  [K in `pickId${CapitalizedK}`]: (...args: _FindArgs) => Promise<string>;
} & {
  [K in `exists${CapitalizedK}`]: (...args: _Args) => Promise<string | null>;
} & {
  [K in `count${CapitalizedK}`]: (...args: _Args) => Promise<number>;
} & {
  [K in `insight${CapitalizedK}`]: (...args: _Args) => Promise<Insight>;
} & {
  [K in `query${CapitalizedK}`]: (...args: _Args) => _QueryOfDoc;
};

export type QueryMethodPart<
  Query,
  Sort,
  Obj,
  Doc,
  Insight,
  _FindQueryOption = FindQueryOption<Sort, Obj>,
  _ListQueryOption = ListQueryOption<Sort, Obj>,
  _QueryOfDoc = QueryOf<Doc>,
> = MergedValues<{
  [K in keyof Query]: K extends string
    ? Query[K] extends (...args: infer Args) => any
      ? QueryMethodOfKey<
          Capitalize<K>,
          Doc,
          Insight,
          Args,
          [...Args, queryOption?: _ListQueryOption],
          [...Args, queryOption?: _FindQueryOption]
        >
      : never
    : never;
}>;
type DatabaseModelWithQuerySort<
  T extends string,
  Input,
  Doc,
  Obj,
  Insight,
  Query,
  Sort,
  _CapitalizedT extends string = Capitalize<T>,
  _QueryOfDoc = QueryOf<Doc>,
  _DataInput = DataInputOf<Input, DocumentModel<Obj>>,
  _FindQueryOption = FindQueryOption<Sort, Obj>,
  _ListQueryOption = ListQueryOption<Sort, Obj>,
> = {
  logger: Logger;
  __model: Mdl<Doc, Obj>;
  __cache: CacheDatabase<T>;
  __searcher: SearchDatabase<T>;
  __loader: DataLoader<string, Doc, string>;
  __get: (id: string) => Promise<Doc>;
  __load: (id?: string) => Promise<Doc | null>;
  __loadMany: (ids: string[]) => Promise<Doc[]>;
  __create: (data: _DataInput) => Promise<Doc>;
  __update: (id: string, data: Partial<Doc>) => Promise<Doc>;
  __remove: (id: string) => Promise<Doc>;
  __list(query: _QueryOfDoc, queryOption?: _ListQueryOption): Promise<Doc[]>;
  __listIds(query: _QueryOfDoc, queryOption?: _ListQueryOption): Promise<string[]>;
  __find(query: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<Doc | null>;
  __findId(query: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<string | null>;
  __pick(query: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<Doc>;
  __pickId(query: _QueryOfDoc, queryOption?: _FindQueryOption): Promise<string>;
  __exists(query: _QueryOfDoc): Promise<string | null>;
  __count(query: _QueryOfDoc): Promise<number>;
  __insight(query: _QueryOfDoc): Promise<Insight>;
  __search(searchText: string, queryOption?: _ListQueryOption): Promise<{ docs: Doc[]; count: number }>;
  __searchDocs(searchText: string, queryOption?: _ListQueryOption): Promise<Doc[]>;
  __searchCount(searchText: string): Promise<number>;
  clone(data: _DataInput & { id: string }): Promise<Doc>;
  listenPre: (type: SaveEventType, listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>) => () => void;
  listenPost: (type: SaveEventType, listener: (doc: Doc, type: CRUDEventType) => PromiseOrObject<void>) => () => void;
} & {
  [key in _CapitalizedT]: Mdl<Doc, Obj>;
} & {
  [key in `${T}Loader`]: DataLoader<string, Doc, string>;
} & {
  [key in `${T}Cache`]: CacheDatabase<T>;
} & {
  [key in `${T}Search`]: SearchDatabase<T>;
} & {
  [K in `get${_CapitalizedT}`]: (id: string) => Promise<Doc>;
} & {
  [K in `load${_CapitalizedT}`]: (id?: string) => Promise<Doc | null>;
} & {
  [K in `load${_CapitalizedT}Many`]: (ids: string[]) => Promise<Doc[]>;
} & {
  [K in `create${_CapitalizedT}`]: (data: _DataInput) => Promise<Doc>;
} & {
  [K in `update${_CapitalizedT}`]: (id: string, data: _DataInput) => Promise<Doc>;
} & {
  [K in `remove${_CapitalizedT}`]: (id: string) => Promise<Doc>;
} & {
  [K in `search${_CapitalizedT}`]: (
    searchText: string,
    queryOption?: _ListQueryOption
  ) => Promise<{ docs: Doc[]; count: number }>;
} & {
  [K in `searchDocs${_CapitalizedT}`]: (searchText: string, queryOption?: _ListQueryOption) => Promise<Doc[]>;
} & {
  [K in `searchCount${_CapitalizedT}`]: (searchText: string) => Promise<number>;
} & QueryMethodPart<Query, Sort, Obj, Doc, Insight, _FindQueryOption, _ListQueryOption, _QueryOfDoc>;

export type DatabaseInstance<
  T extends string = string,
  Input = any,
  Doc = any,
  Obj = any,
  Insight = any,
  Filter extends FilterInstance = FilterInstance,
  _CapitalizedT extends string = Capitalize<T>,
  _QueryOfDoc = QueryOf<Doc>,
  _Query = ExtractQuery<Filter>,
  _Sort = ExtractSort<Filter>,
  _DataInput = DataInputOf<Input, DocumentModel<Obj>>,
  _FindQueryOption = FindQueryOption<_Sort, Obj>,
  _ListQueryOption = ListQueryOption<_Sort, Obj>,
> = DatabaseModelWithQuerySort<
  T,
  Input,
  Doc,
  Obj,
  Insight,
  _Query,
  _Sort,
  _CapitalizedT,
  _QueryOfDoc,
  _DataInput,
  _FindQueryOption,
  _ListQueryOption
>;
