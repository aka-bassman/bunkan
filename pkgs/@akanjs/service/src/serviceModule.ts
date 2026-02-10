import type { MergeAllKeyOfObjects, Cls } from "@akanjs/base";
import type { ConstantModel } from "@akanjs/constant";
import type { ServiceCls } from "./serve";

export class ServiceModule<
  T extends string = string,
  Srv extends { [key: string]: ServiceCls } = { [key: string]: ServiceCls },
  Input = never,
  Obj = never,
  Full = never,
  Light = never,
  Insight = never,
> {
  refName: T;
  srv: Srv;
  cnst: ConstantModel<string, Input, Obj, Full, Light, Insight> | null;
  constructor(
    refName: T,
    srv: Srv,
    cnst?: ConstantModel<string, Input, Obj, Full, Light, Insight>,
  ) {
    this.refName = refName;
    this.srv = srv;
    this.cnst = cnst ?? null;
  }
  with<
    SrvModules extends ServiceModule<string, any, any, any, any, any, any>[],
  >(...srvs: SrvModules) {
    this.srv = Object.assign(
      this.srv,
      ...srvs.map(
        (srv: ServiceModule<string, any, any, any, any, any, any>) => srv.srv,
      ),
    ) as Srv;
    return this as unknown as ServiceModule<
      T,
      Srv & MergeAllKeyOfObjects<SrvModules, "srv">,
      Input,
      Obj,
      Full,
      Light,
      Insight
    >;
  }
}
