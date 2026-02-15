import type { InternalCls } from "./internal";
import type { SliceCls } from "./slice";
import type { EndpointCls } from "./endpoint";

export class SignalRegistry {
  static readonly #internal = new Map<string, InternalCls>();
  static readonly #slice = new Map<string, SliceCls>();
  static readonly #endpoint = new Map<string, EndpointCls>();

  static register(internal: InternalCls, endpoint: EndpointCls, slice?: SliceCls) {
    this.#internal.set(internal.refName, internal);
    this.#endpoint.set(endpoint.refName, endpoint);
    if (slice) this.#slice.set(slice.refName, slice);
    return this;
  }
  static getInternal(refName: string) {
    return this.#internal.get(refName);
  }
  static getEndpoint(refName: string) {
    return this.#endpoint.get(refName);
  }
  static getSlice(refName: string) {
    return this.#slice.get(refName);
  }
}
