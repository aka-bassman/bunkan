import type { Base } from "@akanjs/signal";

import { serve } from "./serve";
import { ServiceRegistry } from "./serviceRegistry";
import { ServiceModule } from "./serviceModule";

export class BaseService extends serve("base" as const, ({ generate, signal }) => ({
  onCleanup: generate<(() => Promise<void>) | undefined>((env) => env.onCleanup ?? undefined),
  baseSignal: signal<Base>(),
})) {
  publishPing() {
    // TODO: Revive this
    // this.baseSignal.pubsubPing("ping");
  }
  async cleanup() {
    if (!this.onCleanup) throw new Error("onCleanup is not defined");
    await this.onCleanup();
  }
}

export const allSrvs = ServiceRegistry.register(BaseService);
export const srv = { base: new ServiceModule("base", BaseService) };
