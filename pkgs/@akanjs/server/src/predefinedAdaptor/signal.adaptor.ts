import { adapt } from "@akanjs/service";
import type { CacheAdaptor } from "./cache.adaptor";
import type { EndpointInfo, InternalInfo, SliceInfo } from "@akanjs/signal";

export interface SignalAdaptor {
  resolveEndpoint(endpoint: { [key: string]: EndpointInfo }): {
    [key: string]: (...args: any[]) => Promise<void>;
  };
  resolveInternal(internal: { [key: string]: InternalInfo<"resolveField"> }): {
    [key: string]: (...args: any[]) => Promise<void>;
  };
  resolveSlice(slices: { [key: string]: SliceInfo }): {
    [key: string]: (...args: any[]) => Promise<void>;
  };
}

export class BunResolver
  extends adapt("bunResolver", ({ use }) => ({
    cache: use<CacheAdaptor>(),
  }))
  implements SignalAdaptor
{
  resolveEndpoint(endpoint: { [key: string]: EndpointInfo }): {
    [key: string]: (...args: any[]) => Promise<void>;
  } {
    return {};
  }
  resolveInternal(internal: { [key: string]: InternalInfo<"resolveField"> }): {
    [key: string]: (...args: any[]) => Promise<void>;
  } {
    return {};
  }
  resolveSlice(slices: { [key: string]: SliceInfo }): {
    [key: string]: (...args: any[]) => Promise<void>;
  } {
    return {};
  }
}
