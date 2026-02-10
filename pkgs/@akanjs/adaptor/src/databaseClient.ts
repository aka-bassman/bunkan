import { capitalize } from "@akanjs/common";
import type { Connection } from "mongoose";
import { adapt } from "@akanjs/service";

// TODO: 나중엔 Database Adaptor로 mongo, postgres, sqlite 등 다양한 데이터베이스를 지원할 수 있도록 할 것임.
export class DatabaseClient extends adapt("databaseClient", ({ use }) => ({
  connection: use<Connection>(),
})) {
  getModel(modelName: string) {
    const model = this.connection.models[capitalize(modelName)];
    return model;
  }
}
