import type { InternalCls } from "./internal";
import type { SliceCls } from "./slice";
import type { EndpointCls } from "./endpoint";

export interface DatabaseSignal {
  internal: InternalCls;
  endpoint: EndpointCls;
  slice: SliceCls;
}

export interface ServiceSignal {
  internal: InternalCls;
  endpoint: EndpointCls;
}

// TODO: add scalar signal for resolve field
// export interface ScalarSignal {
//   internal: InternalCls;
// }

export class SignalRegistry {
  static readonly #database = new Map<string, DatabaseSignal>();
  static readonly #service = new Map<string, ServiceSignal>();

  static registerDatabase(internal: InternalCls, endpoint: EndpointCls, slice: SliceCls) {
    this.#database.set(internal.refName, { internal, endpoint, slice });
    return this;
  }
  static getDatabase(refName: string) {
    return this.#database.get(refName);
  }
  static registerService(internal: InternalCls, endpoint: EndpointCls) {
    this.#service.set(internal.refName, { internal, endpoint });
    return this;
  }
  static getService(refName: string) {
    return this.#service.get(refName);
  }
}
