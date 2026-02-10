import {
  baseEnv,
  Int,
  Float,
  PrimitiveScalar,
  enumOf,
  dayjs,
} from "@akanjs/base";
import { Logger } from "@akanjs/common";
import { ConstantRegistry, via } from "@akanjs/constant";
import {
  DatabaseRegistry,
  FILTER_META_KEY,
  beyond,
  by,
  from,
  into,
  type SchemaOf,
} from "@akanjs/document";
import { INJECT_META_KEY, adapt, serve } from "@akanjs/service";

Logger.info("Hello, world!");

export class AdminRole extends enumOf("adminRole", [
  "manager",
  "admin",
  "superAdmin",
] as const) {}

export class AdminInput extends via((field) => ({
  accountId: field(String, {
    type: "email",
    example: "hello@naver.com",
    text: "search",
  }),
})) {}

export class AdminObject extends via(AdminInput, (field) => ({
  password: field(String, {
    type: "password",
    example: "qwer1234",
    minlength: 8,
  }).optional(),
  roles: field([AdminRole], { example: ["admin", "superAdmin"] }),
  lastLoginAt: field(Date, { default: () => dayjs(), example: dayjs() }),
})) {}

export class LightAdmin extends via(
  AdminObject,
  ["accountId", "roles"] as const,
  (resolve) => ({}),
) {
  hasAccess(role: AdminRole["value"]) {
    if (role === "superAdmin") return this.roles.includes("superAdmin");
    if (role === "admin")
      return this.roles.includes("superAdmin") || this.roles.includes("admin");
    else return false;
  }
}

export class Admin extends via(AdminObject, LightAdmin, (resolve) => ({})) {}

export class AdminInsight extends via(Admin, (field) => ({})) {}

const admin = ConstantRegistry.buildModel(
  "admin" as const,
  AdminInput,
  AdminObject,
  Admin,
  LightAdmin,
  AdminInsight,
);

console.log(AdminInput.field, AdminInput.modelType);

export class AdminFilter extends from(Admin, (filter) => ({
  query: {
    byAccountId: filter()
      .arg("accountId", String)
      .query((accountId) => ({ accountId })),
  },
  sort: {},
})) {}

class DbAdminInput extends by(AdminInput) {}
export class DbAdmin extends by(Admin) {
  addRole(role: AdminRole["value"]) {
    if (!this.roles.includes(role)) this.roles = [...this.roles, role];
    return this;
  }
  subRole(role: AdminRole["value"]) {
    this.roles = this.roles.filter((r) => r !== role);
    return this;
  }
  updateAccess() {
    this.lastLoginAt = dayjs();
    return this;
  }
}

export class AdminModel extends into(
  Admin,
  AdminFilter,
  admin,
  ({ byField }) => ({
    adminAccountIdLoader: byField("accountId"),
  }),
) {
  async hasAnotherAdmin(accountId: string) {
    const exists = await this.Admin.exists({
      accountId: { $ne: accountId },
      status: "active",
    });
    return !!exists;
  }
  async getAdminSecret(
    accountId: string,
  ): Promise<{ id: string; roles: AdminRole["value"][]; password: string }> {
    const adminSecret = await this.Admin.pickOne(
      { accountId, removedAt: { $exists: false } },
      { roles: true, password: true },
    );
    return adminSecret as {
      id: string;
      roles: AdminRole["value"][];
      password: string;
    };
  }
}
export class AdminMiddleware extends beyond(AdminModel, Admin) {}

export class Authorizer extends adapt("authorizer", ({ use }) => ({
  hello: use<string>(),
})) {
  test() {
    console.log(this.hello);
    this.logger.info("test");
  }
}
export const dbAdmin = DatabaseRegistry.buildModel(
  "admin" as const,
  DbAdminInput,
  DbAdmin,
  AdminModel,
  AdminMiddleware,
  Admin,
  AdminInsight,
  AdminFilter,
);

export class AdminService extends serve(dbAdmin, ({ use, service }) => ({
  authorizer: use<Authorizer>(),
})) {
  test() {
    this.authorizer.test();
  }
}

console.log(AdminService);

// import { graphql, buildSchema, GraphQLSchema } from "graphql"; // ✅ 이것만

// const graphiqlHtml = `
// <!DOCTYPE html>
// <html>
// <head>
//   <title>GraphiQL</title>
//   <style>
//     body { height: 100%; margin: 0; width: 100%; overflow: hidden; }
//     #graphiql { height: 100vh; }
//   </style>
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
//   <link href="https://cdnjs.cloudflare.com/ajax/libs/graphiql/3.0.10/graphiql.min.css" rel="stylesheet" />
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/graphiql/3.0.10/graphiql.min.js"></script>
// </head>
// <body>
//   <div id="graphiql"></div>
//   <script>
//     const fetcher = GraphiQL.createFetcher({ url: '/graphql' });
//     const root = ReactDOM.createRoot(document.getElementById('graphiql'));
//     root.render(React.createElement(GraphiQL, { fetcher }));
//   </script>
// </body>
// </html>
// `;

// Bun.serve({
//   port: 4000,
//   async fetch(req) {
//     const url = new URL(req.url);

//     // GraphiQL UI
//     if (url.pathname === "/" || url.pathname === "/graphiql") {
//       return new Response(graphiqlHtml, {
//         headers: { "Content-Type": "text/html" },
//       });
//     }

//     // GraphQL endpoint
//     if (url.pathname === "/graphql" && req.method === "POST") {
//       const { query, variables } = await req.json();
//       const result = await graphql({
//         schema,
//         source: query,
//         rootValue: resolvers,
//         variableValues: variables,
//       });
//       return Response.json(result);
//     }

//     return new Response("Not Found", { status: 404 });
//   },
// });

// const schema = buildSchema(`
//   type Query {
//     hello(name: String): String
//   }
// `);

// const resolvers = {
//   hello: ({ name }: { name?: string }) => `Hello, ${name ?? "World"}!`,
// };

// Bun.serve({
//   port: 3000,
//   async fetch(req) {
//     if (req.method === "POST") {
//       const { query, variables } = await req.json();

//       const result = await graphql({
//         schema,
//         source: query,
//         rootValue: resolvers,
//         variableValues: variables,
//       });

//       return Response.json(result);
//     }

//     return new Response(graphiqlHtml, {
//       headers: { "Content-Type": "text/html" },
//     });
//   },
// });
