import type { MergeAllKeyOfObjects, Cls, UnCls } from "@akanjs/base";
import type { ConstantModel } from "@akanjs/constant";
import type { ServiceCls } from "./serve";
import { lowerlize } from "@akanjs/common";

export class ServiceModule<
  Srv extends ServiceCls = ServiceCls,
  CnstModel extends ConstantModel = ConstantModel<Srv["refName"]>,
  SrvMap extends { [key: string]: any } = { [K in `${Uncapitalize<Srv["refName"]>}Service`]: UnCls<Srv> },
> {
  srv: Srv;
  cnst: CnstModel | null;
  srvMap: SrvMap;
  constructor(srv: Srv, cnst?: CnstModel | null, srvMap?: { [key: string]: ServiceCls }) {
    this.srv = srv;
    this.cnst = cnst ?? null;
    this.srvMap = (srvMap ?? { [`${lowerlize(srv.refName)}Service`]: srv }) as unknown as SrvMap;
  }
  with<SrvModules extends ServiceModule[]>(...srvs: SrvModules) {
    return new ServiceModule(
      this.srv,
      this.cnst,
      Object.assign({}, this.srvMap, ...srvs.map((srv) => srv.srvMap))
    ) as unknown as ServiceModule<
      Srv & MergeAllKeyOfObjects<SrvModules, "srv">,
      CnstModel,
      SrvMap & MergeAllKeyOfObjects<SrvModules, "srvMap">
    >;
  }
}
