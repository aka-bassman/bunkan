import type { ServerSignalCls } from "@akanjs/signal";

export class SignalResolver {
  static resolveServerSignal(signal: ServerSignalCls): ServerSignalCls {
    return signal;
  }
}
