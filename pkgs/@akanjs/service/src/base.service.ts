import type { Base } from "@akanjs/signal";

import { serve } from "./serve";
import { ServiceRegistry } from "./serviceRegistry";
import { ServiceModule } from "./serviceModule";

export class BaseService extends serve("base" as const, ({ env, signal }) => ({
  onCleanup: env(({ onCleanup }: { onCleanup?: () => Promise<void> }) => onCleanup),
  baseSignal: signal<Base>(),
})) {
  publishPing() {
    this.baseSignal.pubsubPing("ping");
  }
  async cleanup() {
    if (!this.onCleanup) throw new Error("onCleanup is not defined");
    await this.onCleanup();
  }
}

export const allSrvs = ServiceRegistry.register(BaseService);
export const srv = { base: new ServiceModule(BaseService) };
