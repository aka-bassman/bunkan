import { adapt } from "@akanjs/service";
import { type BaseEnv } from "@akanjs/base";
import { MeiliSearch } from "meilisearch";

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
  getClient() {
    return this.meili;
  }
}
