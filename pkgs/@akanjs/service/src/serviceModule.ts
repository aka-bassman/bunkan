import type { MergeAllKeyOfObjects, Cls, UnCls } from "@akanjs/base";
import type { ConstantModel } from "@akanjs/constant";
import type { ServiceCls } from "./serve";
import { lowerlize } from "@akanjs/common";

export class ServiceModule<
  RefName extends string = string,
  Srv extends ServiceCls = ServiceCls,
  CnstModel extends ConstantModel<RefName, any, any, any, any, any> = ConstantModel<RefName, any, any, any, any, any>,
  SrvMap extends { [key: string]: any } = { [K in `${Uncapitalize<RefName>}Service`]: UnCls<Srv> },
> {
  refName: RefName;
  srv: Srv;
  cnst: CnstModel | null;
  srvMap: SrvMap;
  constructor(refName: RefName, srv: Srv, cnst?: CnstModel | null, srvMap?: { [key: string]: ServiceCls }) {
    this.refName = refName;
    this.srv = srv;
    this.cnst = cnst ?? null;
    this.srvMap = (srvMap ?? { [`${lowerlize(refName)}Service`]: srv }) as unknown as SrvMap;
  }
  with<SrvModules extends ServiceModule[]>(...srvs: SrvModules) {
    return new ServiceModule(
      this.refName,
      this.srv,
      this.cnst,
      Object.assign({}, this.srvMap, ...srvs.map((srv) => srv.srvMap))
    ) as unknown as ServiceModule<
      RefName,
      Srv & MergeAllKeyOfObjects<SrvModules, "srv">,
      CnstModel,
      SrvMap & MergeAllKeyOfObjects<SrvModules, "srvMap">
    >;
  }
}
