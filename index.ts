import { baseEnv, Int, Float, PrimitiveScalar } from "@akanjs/base";
import { Logger } from "@akanjs/common";

console.log(baseEnv);
const a = new Float();
console.log(
  Float.prototype instanceof PrimitiveScalar,
  Float.prototype instanceof Float,
  Float.prototype instanceof Int,
);

Logger.info("Hello, world!");
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
