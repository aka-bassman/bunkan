import {
  ENDPOINT_META_KEY,
  EndpointInfo,
  INTERNAL_META_KEY,
  InternalInfo,
  type ServerSignal,
  type ServerSignalCls,
} from "@akanjs/signal";
import type { JobsOptions } from "bullmq";
import { serialize } from "@akanjs/constant";

export class SignalResolver {
  static resolveServerSignal(
    serverSignalCls: ServerSignalCls,
    getServer: () => Bun.Server<undefined> | null
  ): ServerSignalCls {
    const endpointMeta = serverSignalCls[ENDPOINT_META_KEY] as { [key: string]: EndpointInfo };
    const internalMeta = serverSignalCls[INTERNAL_META_KEY] as { [key: string]: InternalInfo };
    Object.entries(endpointMeta).forEach(([key, endpointInfo]) => {
      if (endpointInfo.type !== "pubsub") throw new Error(`Endpoint ${key} is not a pubsub endpoint`);
      const serializeArgs = (args: any[]) => {
        return endpointInfo.args.map(({ argRef, arrDepth, option }, idx) => {
          return serialize(argRef, arrDepth, args[idx], { nullable: option?.nullable });
        });
      };
      Object.assign(serverSignalCls.prototype, {
        [key]: async function (this: ServerSignal, ...args: any) {
          const server = getServer();
          if (server) server.publish(key, serializeArgs(args));
          else {
            this.logger.warn(`Server is not initialized, skipping publish ${key}`);
            return;
          }
        },
      });
    });
    Object.entries(internalMeta).forEach(([key, internalInfo]) => {
      if (internalInfo.type !== "process") throw new Error(`Internal ${key} is not a process internal`);
      const argLength = internalInfo.args.length;
      Object.assign(serverSignalCls.prototype, {
        [key]: async function (this: ServerSignal, ...args: [...args: any, jobOptions?: JobsOptions]) {
          const serverArgs = args.slice(0, argLength);
          const jobOptions = args.at(argLength) as JobsOptions | undefined;
          return await this.queue.registerProcessQueue(key, serverArgs, jobOptions);
        },
      });
    });
    return serverSignalCls;
  }
}
