/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { baseEnv } from "@akanjs/base";
import { capitalize, Logger } from "@akanjs/common";
import { Cnst, constantInfo, type TextDoc } from "@akanjs/constant";
import { documentInfo, getFilterSortMap } from "@akanjs/document";
import { Global, Inject, Injectable, Module } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { default as MeiliSearch } from "meilisearch";
import type { Connection, Types } from "mongoose";

export interface ChangedData {
  _id: { _data: string };
  operationType: "update" | "insert" | "delete";
  clusterTime: { t: number; i: number };
  wallTime: Date;
  ns: { db: string; coll: string };
  documentKey: { _id: Types.ObjectId };
  updateDescription?: {
    updatedFields: Record<string, any>;
    removedFields: string[];
    truncatedArrays: any[];
  };
  fullDocument?: Record<string, any>;
}

const hasTextField = (modelRef: Cnst) => {
  return Object.entries(modelRef.field).some(
    ([_, field]) => !!field.text || (field.isScalar && field.isClass && field.select && hasTextField(field.modelRef))
  );
};
const getTextFieldKeys = (
  modelRef: Cnst
): {
  stringTextFields: string[];
  scalarTextFields: string[];
  allTextFields: string[];
  allSearchFields: string[];
  allFilterFields: string[];
} => {
  const allSearchFields: string[] = [];
  const allFilterFields: string[] = [];
  const stringTextFields = Object.entries(modelRef.field)
    .filter(([_, field]) => !!field.text)
    .map(([key, field]) => {
      if (field.text === "filter") allFilterFields.push(key);
      else if (field.text === "search") allSearchFields.push(key);
      return key;
    });
  const scalarTextFields = Object.entries(modelRef.field)
    .filter(([_, field]) => field.isScalar && field.isClass && field.select && hasTextField(field.modelRef))
    .map(([key, field]) => key);
  const deepFields = scalarTextFields
    .map((key) => {
      const field = modelRef.field[key];
      const { stringTextFields, allTextFields, allSearchFields, allFilterFields } = getTextFieldKeys(field.modelRef);
      allFilterFields.push(...allSearchFields.map((field) => `${key}.${field}`));
      allSearchFields.push(...stringTextFields.map((field) => `${key}.${field}`));
      return [
        ...stringTextFields.map((field) => `${key}.${field}`),
        ...allTextFields.map((field) => `${key}.${field}`),
      ];
    })
    .flat();
  return {
    stringTextFields,
    scalarTextFields,
    allTextFields: [...stringTextFields, ...deepFields],
    allSearchFields,
    allFilterFields,
  };
};
export const makeTextFilter = (modelRef: Cnst) => {
  const { stringTextFields, scalarTextFields } = getTextFieldKeys(modelRef);
  const filterData = (data: Record<string, any> | Record<string, any>[], assignObj: { [key: string]: string } = {}) => {
    if (Array.isArray(data)) return data.map((d) => filterData(d));
    return Object.assign(
      Object.fromEntries([
        ...stringTextFields.map((key) => [key, data[key]]),
        ...scalarTextFields.map((key) => {
          const field = modelRef.field[key];
          const filterFunc = makeTextFilter(field.modelRef);
          return [key, filterFunc(data[key])];
        }),
      ]),
      assignObj
    );
  };
  return filterData as (data: Record<string, any>, assignObj?: { [key: string]: string }) => TextDoc;
};
const getSortableAttributes = (refName: string) => {
  const docInfo = documentInfo.getDatabase(refName);
  const sortMap = getFilterSortMap(docInfo.filter);
  const sortFields = Object.values(sortMap)
    .filter((val) => typeof val === "object")
    .map((sort: { [key: string]: any }) => Object.keys(sort))
    .flat();
  return [...new Set(sortFields)];
};

@Injectable()
class SearchDaemon {
  private readonly logger = new Logger("SearchDaemon");
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject("MEILI_CLIENT") private readonly meili: MeiliSearch
  ) {}
  async onModuleInit() {
    if (baseEnv.operationMode === "local") return; // temporary disable for local
    const databaseRefNames = [...constantInfo.database.keys()];
    const indexes = (await this.meili.getIndexes({ limit: 1000 })).results;
    const indexMap = new Map(indexes.map((index) => [index.uid, index]));
    const indexCreationNames: string[] = [];
    const indexUpdateNames: string[] = [];
    for (const refName of databaseRefNames) {
      const indexName = refName;
      const modelRef = constantInfo.getDatabase(refName).full;
      if (!hasTextField(modelRef)) continue;
      const index = indexMap.get(indexName);
      if (!index) indexCreationNames.push(indexName);
      else if (index.primaryKey !== "id") indexUpdateNames.push(indexName);
    }
    for (const indexName of indexCreationNames) await this.meili.createIndex(indexName, { primaryKey: "id" });
    for (const indexName of indexUpdateNames) await this.meili.updateIndex(indexName, { primaryKey: "id" });

    for (const refName of databaseRefNames) {
      const indexName = refName;
      const model = this.connection.models[capitalize(refName)];
      const modelRef = constantInfo.getDatabase(refName).full;
      if (!hasTextField(modelRef)) continue;
      const searchIndex = this.meili.index(indexName);
      const { stringTextFields, scalarTextFields, allSearchFields, allFilterFields } = getTextFieldKeys(modelRef);
      const settings = await searchIndex.getSettings();
      const allSearchFieldSet = new Set(allSearchFields);
      const allFilterFieldSet = new Set(allFilterFields);
      const searchFieldSet = new Set(settings.searchableAttributes);
      const filterFieldSet = new Set(settings.filterableAttributes);
      const needUpdateSetting =
        !allSearchFields.every((field) => searchFieldSet.has(field)) ||
        !allFilterFields.every((field) => filterFieldSet.has(field)) ||
        !settings.searchableAttributes?.every((field) => allSearchFieldSet.has(field)) ||
        !settings.filterableAttributes?.every((field) => allFilterFieldSet.has(field));
      if (needUpdateSetting) {
        this.logger.info(`update index settings (${refName})`);
        await searchIndex.updateSettings({
          searchableAttributes: allSearchFields,
          filterableAttributes: allFilterFields,
          sortableAttributes: getSortableAttributes(indexName),
        });
      }
      const stringTextFieldSet = new Set(stringTextFields);
      const scalarTextFieldSet = new Set(scalarTextFields);

      const filterText = makeTextFilter(modelRef);
      model.watch().on("change", async (data: ChangedData) => {
        try {
          const id = data.documentKey._id.toString();
          if (data.operationType === "delete") {
            this.logger.trace(`delete text doc (${refName}): ${id}`);
            return await searchIndex.deleteDocument(id);
          } else if (data.operationType === "insert") {
            this.logger.trace(`insert text doc (${refName}): ${data.documentKey._id}`);
            if (!data.fullDocument) throw new Error("No fullDocument");
            const textFilteredData = filterText(data.fullDocument);
            return await searchIndex.addDocuments([textFilteredData]);
          } else if (data.operationType === "update") {
            const updatedFields = data.updateDescription?.updatedFields ?? {};
            const isRemoved = !!updatedFields.removedAt;
            if (isRemoved) {
              this.logger.trace(`remove text doc (${refName}): ${id}`);
              return await searchIndex.deleteDocument(id);
            }
            this.logger.trace(`update text doc (${refName}): ${data.documentKey._id}`);
            const updatedFieldKeys = Object.keys(updatedFields);
            const removedFieldKeys = data.updateDescription?.removedFields ?? [];
            const isScalarTextFieldUpdated = [...updatedFieldKeys, ...removedFieldKeys]
              .map((key) => key.split(".")[0])
              .some((key) => scalarTextFieldSet.has(key));
            if (isScalarTextFieldUpdated) {
              const doc = await model.findById(data.documentKey._id);
              if (!doc) this.logger.error(`No doc for ${data.documentKey._id}`);
              const textFilteredData = filterText(doc, { id });
              return await searchIndex.updateDocuments([textFilteredData]);
            } else {
              const updateKeys = updatedFieldKeys.filter((key) => stringTextFieldSet.has(key));
              const removeKeys = removedFieldKeys.filter((key) => stringTextFieldSet.has(key));
              if (!updateKeys.length && !removeKeys.length) return;
              const textFilteredData = Object.fromEntries([
                ["id", id],
                ...updateKeys.map((key) => [key, updatedFields[key]]),
                ...removeKeys.map((key) => [key, null]),
              ]);
              return await searchIndex.updateDocuments([textFilteredData]);
            }
          }
        } catch (e) {
          this.logger.error(e as string);
        }
      });
    }
  }
}

@Global()
@Module({ providers: [SearchDaemon] })
export class SearchDaemonModule {}
