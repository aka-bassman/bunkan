import { type BaseEnv, type SshOptions } from "@akanjs/base";
import { adapt } from "@akanjs/service";
import { createTunnel, type ForwardOptions, type ServerOptions, type TunnelOptions } from "tunnel-ssh";
import * as mongoose from "mongoose";
import { Logger } from "@akanjs/common";

export interface DatabaseAdaptor {
  //
}

interface MongoEnv extends BaseEnv {
  mongo?: { username?: string; password?: string; sshOptions?: SshOptions };
}

export class MongoDatabase
  extends adapt("mongoDatabase", ({ env, use }) => ({
    mongo: env(
      async ({
        appName,
        environment,
        serveDomain,
        operationMode,
        repoName,
        mongo = {
          sshOptions: {
            host: `${appName}-${environment}.${serveDomain}`,
            port: 32767,
            username: process.env.TUNNEL_USERNAME ?? "root",
            password: process.env.TUNNEL_PASSWORD ?? repoName,
            dstPort: 27017,
          },
        },
      }: MongoEnv) => {
        const dbName = `${appName}-${environment}`;
        const authInfo = mongo.password ? `${mongo.username}:${mongo.password}@` : "";
        const createMongo = async (uri: string) => {
          initMongoDB({ logging: environment !== "main" });
          return await mongoose.connect(uri);
        };
        if (process.env.MONGO_URI) return await createMongo(process.env.MONGO_URI);
        else if (environment === "local") return await createMongo(`mongodb://localhost:27017/${dbName}`);
        const DEFAULT_CLOUD_PORT = 30000;
        const environmentPort =
          environment === "main" ? 3000 : environment === "develop" ? 2000 : environment === "debug" ? 1000 : 0;
        const SERVICE_PORT = 200;
        const port = operationMode === "local" ? DEFAULT_CLOUD_PORT + environmentPort + SERVICE_PORT : 27017;
        if (operationMode === "cloud")
          return await createMongo(
            `mongodb+srv://${authInfo}mongo-svc.${appName}-${environment}.svc.cluster.local/${dbName}?authSource=${dbName}&readPreference=primary&ssl=false&retryWrites=true`
          );
        else if (operationMode === "local") {
          const tunnelOptions: TunnelOptions = { autoClose: true, reconnectOnError: false };
          const serverOptions: ServerOptions = { port };
          const forwardOptions: ForwardOptions = {
            srcAddr: "0.0.0.0",
            srcPort: port,
            dstAddr: `mongo-0.mongo-svc.${appName}-${environment}`,
            dstPort: 27017,
          };
          await createTunnel(tunnelOptions, serverOptions, mongo.sshOptions, forwardOptions);
          return await createMongo(
            `mongodb://${authInfo}localhost:${port}/${dbName}?authSource=${dbName}&readPreference=primary&ssl=false&retryWrites=true&directConnection=true`
          );
        } else return await createMongo(`mongodb://localhost:27017/${dbName}`);
      }
    ),
  }))
  implements DatabaseAdaptor
{
  getConnection() {
    return this.mongo.connection;
  }
}

const initMongoDB = ({ logging }: { logging: boolean }) => {
  const mongoDBLogger = new Logger("MongoDB");
  if (logging)
    mongoose.set("debug", function (collection: string, method: string, ...methodArgs: object[]) {
      mongoDBLogger.verbose(
        `${collection}.${method}(${methodArgs
          .slice(0, -1)
          .map((arg) => JSON.stringify(arg))
          .join(", ")})`
      );
    });

  // 1. Query duration logging
  const originalExec = mongoose.Query.prototype.exec as (...args: any[]) => Promise<object>;
  const getQueryInfo = (queryAgent: mongoose.Query<any, any>) => {
    const model = queryAgent.model;
    const collectionName = model.collection.collectionName;
    const dbName = model.db.name;
    const query = queryAgent.getQuery();
    const queryOptions = queryAgent.getOptions();
    return { dbName, collectionName, query, queryOptions };
  };
  mongoose.Query.prototype.exec = function (...args: object[]) {
    const start = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return originalExec.apply(this, args).then((result: object) => {
      const duration = Date.now() - start;
      const { dbName, collectionName, query, queryOptions } = getQueryInfo(this as mongoose.Query<any, any>);
      if (logging)
        mongoDBLogger.verbose(
          `Queried ${dbName}.${collectionName}.query(${JSON.stringify(query)}, ${JSON.stringify(
            queryOptions
          )}) - ${duration}ms`
        );
      return result;
    }) as unknown as Promise<any>;
  };

  // 2. Aggregate duration logging)
  const originalAggregate = mongoose.Model.aggregate;
  const getAggregateInfo = (aggregateModel: mongoose.Model<any>) => {
    const dbName = aggregateModel.db.db?.databaseName ?? "unknown";
    const collectionName = aggregateModel.collection.collectionName;
    return { dbName, collectionName };
  };
  Object.assign(mongoose.Model.prototype, {
    aggregate: function (this: mongoose.Model<any>, ...args: any[]) {
      const startTime = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
      return originalAggregate.apply(this, [args] as [mongoose.PipelineStage[]]).then((result: object) => {
        const duration = Date.now() - startTime;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const { dbName, collectionName } = getAggregateInfo(this);
        if (logging)
          mongoDBLogger.verbose(
            `Aggregated ${dbName}.${collectionName}.aggregate(${args
              .map((arg) => JSON.stringify(arg))
              .join(", ")}) - ${duration}ms`
          );
        return result;
      });
    },
  });

  // 3. Set transaction settings
  mongoose.set("transactionAsyncLocalStorage", true);
};
