import { type Cls } from "@akanjs/base";
import { type EndpointInfo } from "./endpointInfo";
import { InternalInfo } from "./internalInfo";
import { ENDPOINT_META_KEY, type EndpointCls } from "./endpoint";
import { INTERNAL_META_KEY, type InternalCls } from "./internal";
import type { DocumentModel, FieldToValue } from "@akanjs/constant";
import type { Job, JobsOptions, Queue } from "bullmq";
import type { ServerWebSocket } from "bun";
import { BullQueue, adapt, type QueueAdaptor, type Adaptor, INJECT_META_KEY, type AdaptorCls } from "@akanjs/service";
import type { Logger } from "@akanjs/common";

export interface ServerSignal extends Adaptor {
  readonly websocket: ServerWebSocket;
  readonly queue: QueueAdaptor;
}

export type ServerSignalCls<
  EnpCls extends EndpointCls = EndpointCls,
  IntCls extends InternalCls = InternalCls,
  _EndpointInfoObj extends { [key: string]: EndpointInfo } = {
    [K in keyof EnpCls[typeof ENDPOINT_META_KEY] as EnpCls[typeof ENDPOINT_META_KEY][K]["type"] extends "pubsub"
      ? K
      : never]: EnpCls[typeof ENDPOINT_META_KEY][K];
  },
  _InternalInfoObj extends { [key: string]: InternalInfo } = {
    [K in keyof IntCls[typeof INTERNAL_META_KEY] as IntCls[typeof INTERNAL_META_KEY][K]["type"] extends "process"
      ? K
      : never]: IntCls[typeof INTERNAL_META_KEY][K];
  },
> = AdaptorCls<
  {
    [K in keyof _EndpointInfoObj]: _EndpointInfoObj[K] extends EndpointInfo<
      any,
      any,
      any,
      any,
      any,
      infer ServerArgs,
      infer Returns
    >
      ? (...args: [...ServerArgs, data: DocumentModel<FieldToValue<Returns>>]) => void
      : never;
  } & {
    [K in keyof _InternalInfoObj]: _InternalInfoObj[K] extends InternalInfo<
      any,
      any,
      infer ServerArgs,
      any,
      any,
      infer Returns
    >
      ? (...args: [...args: ServerArgs, jobOptions?: JobsOptions]) => Promise<Job<FieldToValue<Returns>>>
      : never;
  } & ServerSignal
> & {
  readonly refName: EnpCls["refName"];
  readonly [ENDPOINT_META_KEY]: _EndpointInfoObj;
  readonly [INTERNAL_META_KEY]: _InternalInfoObj;
  readonly [INJECT_META_KEY]: { queue: QueueAdaptor };
};

export const serverSignal = <EnpCls extends EndpointCls, IntCls extends InternalCls>(
  endpointRef: EnpCls,
  internalRef: IntCls
): ServerSignalCls<EnpCls, IntCls> => {
  return class ServerSignal extends adapt(`${endpointRef.refName}Signal`, ({ plug }) => ({
    // websocket: use<ServerWebSocket>(),
    queue: plug(BullQueue),
  })) {
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
  } as unknown as ServerSignalCls<EnpCls, IntCls>;
};
