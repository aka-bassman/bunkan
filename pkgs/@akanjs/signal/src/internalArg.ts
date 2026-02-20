import type { Cls } from "@akanjs/base";
import type { SignalContext } from "./signalContext";

export interface InternalArg<ArgType = any> {
  getArg: (context: SignalContext) => ArgType | null;
}
export type InternalArgCls<ArgType = any> = Cls<InternalArg<ArgType>>;

export class Req implements InternalArg {
  getArg(context: SignalContext): Request {
    const httpContext = context.getHttpContext();
    return httpContext.req;
  }
}
export class Res implements InternalArg {
  getArg(context: SignalContext) {
    const httpContext = context.getHttpContext();
    return httpContext.res;
  }
}

export class Ws implements InternalArg {
  getArg(context: SignalContext) {
    const webSocketContext = context.getWebSocketContext();
    const ws = webSocketContext.ws;
    const { __subscribe__ } = webSocketContext.args as {
      __subscribe__: boolean;
    };
    return {
      ws,
      subscribe: __subscribe__,
      onDisconnect: (handler: () => void) => {
        ws.onclose = handler;
        // ws.on("disconnect", handler);
      },
      onSubscribe: (handler: () => void) => {
        if (__subscribe__) handler();
      },
      onUnsubscribe: (handler: () => void) => {
        if (!__subscribe__) handler();
      },
    };
  }
}
