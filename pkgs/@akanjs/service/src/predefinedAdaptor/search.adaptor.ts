import { adapt } from "@akanjs/service";
import { baseEnv, type BaseEnv } from "@akanjs/base";
import { MeiliSearch } from "meilisearch";
import { DEFAULT_PAGE_SIZE, type TextDoc } from "@akanjs/constant";

export interface SearchAdaptor {
  //
}

export class MeiliDatabase
  extends adapt("meiliDatabase", ({ env }) => ({
    meili: env(({ environment, operationMode, appName, serveDomain }: BaseEnv) => {
      const getUri = () => {
        if (process.env.MEILI_URI) return process.env.MEILI_URI;
        else if (environment === "local") return "http://localhost:7700";
        const protocol = operationMode === "local" ? "https" : "http";
        const url =
          operationMode === "cloud"
            ? `meili-0.meili-svc.${appName}-${environment}.svc.cluster.local:7700`
            : operationMode === "local"
              ? `${appName}-${environment}.${serveDomain}/search`
              : "localhost:7700";
        return `${protocol}://${url}`;
      };
      const generateMeiliKey = ({ appName, environment }: { appName: string; environment: string }) => {
        if (process.env.MEILI_MASTER_KEY) return process.env.MEILI_MASTER_KEY;
        else if (environment === "local") return "masterKey";
        return `meilisearch-key-${appName}-${environment}`;
      };
      return new MeiliSearch({ host: getUri(), apiKey: generateMeiliKey({ appName, environment }) });
    }),
  }))
  implements SearchAdaptor
{
  // override async onInit(): Promise<void> {
  //   if (baseEnv.operationMode === "local") return; // temporary disable for local
  //   const databaseRefNames = [...constantInfo.database.keys()];
  //   const indexes = (await this.meili.getIndexes({ limit: 1000 })).results;
  //   const indexMap = new Map(indexes.map((index) => [index.uid, index]));
  //   const indexCreationNames: string[] = [];
  //   const indexUpdateNames: string[] = [];
  //   for (const refName of databaseRefNames) {
  //     const indexName = refName;
  //     const modelRef = constantInfo.getDatabase(refName).full;
  //     if (!hasTextField(modelRef)) continue;
  //     const index = indexMap.get(indexName);
  //     if (!index) indexCreationNames.push(indexName);
  //     else if (index.primaryKey !== "id") indexUpdateNames.push(indexName);
  //   }
  //   for (const indexName of indexCreationNames) await this.meili.createIndex(indexName, { primaryKey: "id" });
  //   for (const indexName of indexUpdateNames) await this.meili.updateIndex(indexName, { primaryKey: "id" });

  //   for (const refName of databaseRefNames) {
  //     const indexName = refName;
  //     const model = this.connection.models[capitalize(refName)];
  //     const modelRef = constantInfo.getDatabase(refName).full;
  //     if (!hasTextField(modelRef)) continue;
  //     const searchIndex = this.meili.index(indexName);
  //     const { stringTextFields, scalarTextFields, allSearchFields, allFilterFields } = getTextFieldKeys(modelRef);
  //     const settings = await searchIndex.getSettings();
  //     const allSearchFieldSet = new Set(allSearchFields);
  //     const allFilterFieldSet = new Set(allFilterFields);
  //     const searchFieldSet = new Set(settings.searchableAttributes);
  //     const filterFieldSet = new Set(settings.filterableAttributes);
  //     const needUpdateSetting =
  //       !allSearchFields.every((field) => searchFieldSet.has(field)) ||
  //       !allFilterFields.every((field) => filterFieldSet.has(field)) ||
  //       !settings.searchableAttributes?.every((field) => allSearchFieldSet.has(field)) ||
  //       !settings.filterableAttributes?.every((field) => allFilterFieldSet.has(field));
  //     if (needUpdateSetting) {
  //       this.logger.info(`update index settings (${refName})`);
  //       await searchIndex.updateSettings({
  //         searchableAttributes: allSearchFields,
  //         filterableAttributes: allFilterFields,
  //         sortableAttributes: getSortableAttributes(indexName),
  //       });
  //     }
  //     const stringTextFieldSet = new Set(stringTextFields);
  //     const scalarTextFieldSet = new Set(scalarTextFields);

  //     const filterText = makeTextFilter(modelRef);
  //     model.watch().on("change", async (data: ChangedData) => {
  //       try {
  //         const id = data.documentKey._id.toString();
  //         if (data.operationType === "delete") {
  //           this.logger.trace(`delete text doc (${refName}): ${id}`);
  //           return await searchIndex.deleteDocument(id);
  //         } else if (data.operationType === "insert") {
  //           this.logger.trace(`insert text doc (${refName}): ${data.documentKey._id}`);
  //           if (!data.fullDocument) throw new Error("No fullDocument");
  //           const textFilteredData = filterText(data.fullDocument);
  //           return await searchIndex.addDocuments([textFilteredData]);
  //         } else if (data.operationType === "update") {
  //           const updatedFields = data.updateDescription?.updatedFields ?? {};
  //           const isRemoved = !!updatedFields.removedAt;
  //           if (isRemoved) {
  //             this.logger.trace(`remove text doc (${refName}): ${id}`);
  //             return await searchIndex.deleteDocument(id);
  //           }
  //           this.logger.trace(`update text doc (${refName}): ${data.documentKey._id}`);
  //           const updatedFieldKeys = Object.keys(updatedFields);
  //           const removedFieldKeys = data.updateDescription?.removedFields ?? [];
  //           const isScalarTextFieldUpdated = [...updatedFieldKeys, ...removedFieldKeys]
  //             .map((key) => key.split(".")[0])
  //             .some((key) => scalarTextFieldSet.has(key));
  //           if (isScalarTextFieldUpdated) {
  //             const doc = await model.findById(data.documentKey._id);
  //             if (!doc) this.logger.error(`No doc for ${data.documentKey._id}`);
  //             const textFilteredData = filterText(doc, { id });
  //             return await searchIndex.updateDocuments([textFilteredData]);
  //           } else {
  //             const updateKeys = updatedFieldKeys.filter((key) => stringTextFieldSet.has(key));
  //             const removeKeys = removedFieldKeys.filter((key) => stringTextFieldSet.has(key));
  //             if (!updateKeys.length && !removeKeys.length) return;
  //             const textFilteredData = Object.fromEntries([
  //               ["id", id],
  //               ...updateKeys.map((key) => [key, updatedFields[key]]),
  //               ...removeKeys.map((key) => [key, null]),
  //             ]);
  //             return await searchIndex.updateDocuments([textFilteredData]);
  //           }
  //         }
  //       } catch (e) {
  //         this.logger.error(e as string);
  //       }
  //     });
  //   }
  // }
  getClient() {
    return this.meili;
  }
  async getIndexNames() {
    const { results } = await this.meili.getIndexes({ limit: 1000 });
    return results.map((index) => index.uid);
  }
  async getSearchResult(
    indexName: string,
    option: {
      skip?: number;
      limit?: number;
      sort?: string;
      searchString?: string;
    }
  ) {
    const { skip = 0, limit = DEFAULT_PAGE_SIZE, sort = "", searchString } = option;
    if (!searchString) {
      const { results, total } = await this.meili.index(indexName).getDocuments({ offset: skip, limit });
      return { docs: results, skip, limit, sort, total };
    }
    const { hits, estimatedTotalHits } = await this.meili
      .index(indexName)
      .search(searchString, { offset: skip, limit });
    return {
      docs: hits,
      skip,
      limit,
      sort,
      total: estimatedTotalHits,
      query: searchString,
    };
  }
  async upsertDocuments(indexName: string, documents: TextDoc[]) {
    const task = await this.meili.index(indexName).addDocuments(documents);
    return task;
  }
  async dropIndex(indexName: string) {
    const task = await this.meili.index(indexName).delete();
    return task;
  }
}
