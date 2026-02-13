export type SignalTransportType = "http" | "websocket";
export class SignalContext {
  transport: SignalTransportType;
  ctx: HttpExecutionContext | WebSocketExecutionContext;
  constructor(transport: SignalTransportType, ctx: HttpExecutionContext | WebSocketExecutionContext) {
    this.transport = transport;
    this.ctx = ctx;
  }
  getHttpContext() {
    if (this.transport !== "http") throw new Error("Transport is not http");
    return this.ctx as HttpExecutionContext;
  }
  getWebSocketContext() {
    if (this.transport !== "websocket") throw new Error("Transport is not websocket");
    return this.ctx as WebSocketExecutionContext;
  }
}

export class HttpExecutionContext {
  req: Request;
  res = Response;
  args: { [key: string]: any };
  param: { [key: string]: any };
  query: { [key: string]: any };
  body: { [key: string]: any };
  constructor(req: Request, args: { [key: string]: any }) {
    this.req = req;
    this.args = args;
    this.param = {};
    this.query = {};
    this.body = {};
  }
}

export class WebSocketExecutionContext {
  args: { [key: string]: any };
  ws: WebSocket;
  constructor(ws: WebSocket, args: { [key: string]: any }) {
    this.ws = ws;
    this.args = args;
  }
}
