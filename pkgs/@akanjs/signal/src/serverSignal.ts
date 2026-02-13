import { type Cls } from "@akanjs/base";
import { type EndpointInfo } from "./endpointInfo";
import { InternalInfo } from "./internalInfo";
import { ENDPOINT_META_KEY, type EndpointCls } from "./endpoint";
import { INTERNAL_META_KEY, type InternalCls } from "./internal";

export type ServerSignalCls<EnpCls extends EndpointCls, IntCls extends InternalCls> = Cls<
  {},
  {
    readonly [ENDPOINT_META_KEY]: {
      [K in keyof EnpCls[typeof ENDPOINT_META_KEY] as EnpCls[typeof ENDPOINT_META_KEY][K] extends EndpointInfo<
        "pubsub",
        any,
        any,
        any,
        any,
        any,
        any
      >
        ? K
        : never]: EnpCls[typeof ENDPOINT_META_KEY][K];
    };
    readonly [INTERNAL_META_KEY]: {
      [K in keyof IntCls[typeof INTERNAL_META_KEY] as IntCls[typeof INTERNAL_META_KEY][K] extends InternalInfo<
        "process",
        any,
        any,
        any,
        any,
        any,
        any
      >
        ? K
        : never]: IntCls[typeof INTERNAL_META_KEY][K];
    };
  }
>;

export const serverSignal = <EnpCls extends EndpointCls, IntCls extends InternalCls>(
  endpointRef: EnpCls,
  internalRef: IntCls
): ServerSignalCls<EnpCls, IntCls> => {
  return class ServerSignal {
    static readonly [ENDPOINT_META_KEY] = Object.fromEntries(
      Object.entries(endpointRef[ENDPOINT_META_KEY])
        .filter(([key, endpointInfo]) => endpointInfo.type === "pubsub")
        .map(([key, value]) => [key, value])
    );
    static readonly [INTERNAL_META_KEY] = Object.fromEntries(
      Object.entries(internalRef[INTERNAL_META_KEY])
        .filter(([key, internalInfo]) => internalInfo.type === "process")
        .map(([key, value]) => [key, value])
    );
  } as ServerSignalCls<EnpCls, IntCls>;
};
