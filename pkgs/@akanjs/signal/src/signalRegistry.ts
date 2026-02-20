import type { InternalCls } from "./internal";
import type { SliceCls } from "./slice";
import type { EndpointCls } from "./endpoint";
import type { ServerSignalCls } from "./serverSignal";

export interface DatabaseSignal {
  internal: InternalCls;
  endpoint: EndpointCls;
  slice: SliceCls;
  server: ServerSignalCls;
}

export interface ServiceSignal {
  internal: InternalCls;
  endpoint: EndpointCls;
  server: ServerSignalCls;
}

// TODO: add scalar signal for resolve field
// export interface ScalarSignal {
//   internal: InternalCls;
// }

export class SignalRegistry {
  static readonly #database = new Map<string, DatabaseSignal>();
  static readonly #service = new Map<string, ServiceSignal>();

  static registerDatabase(internal: InternalCls, endpoint: EndpointCls, slice: SliceCls, server: ServerSignalCls) {
    this.#database.set(internal.refName, { internal, endpoint, slice, server });
    return this;
  }
  static getDatabase(refName: string) {
    return this.#database.get(refName);
  }
  static registerService(internal: InternalCls, endpoint: EndpointCls, server: ServerSignalCls) {
    this.#service.set(internal.refName, { internal, endpoint, server });
    return this;
  }
  static getService(refName: string) {
    return this.#service.get(refName);
  }
}
