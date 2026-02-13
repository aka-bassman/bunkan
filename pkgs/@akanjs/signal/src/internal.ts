import { type InternalBuilder, type InternalInfo, buildInternal } from "./internalInfo";
import type { ServiceModule } from "@akanjs/service";
import type { Cls, MergeAllKeyOfObjects, MergeAllTypes } from "@akanjs/base";

export const INTERNAL_META_KEY = Symbol("internalApi");
export type InternalCls<
  SrvModule extends ServiceModule = ServiceModule,
  InternalInfoMap extends { [key: string]: InternalInfo<any, any, any, any, any, any, any> } = {
    [key: string]: InternalInfo<any, any, any, any, any, any, any>;
  },
> = Cls<any, { refName: SrvModule["refName"]; srv: SrvModule; [INTERNAL_META_KEY]: InternalInfoMap }>;

export function internal<
  SrvModule extends ServiceModule,
  BuildInternal extends InternalBuilder<SrvModule>,
  LibInternals extends InternalCls[],
>(
  srv: SrvModule,
  internalBuilder: BuildInternal,
  ...libInternals: LibInternals
): InternalCls<SrvModule, MergeAllKeyOfObjects<LibInternals, typeof INTERNAL_META_KEY> & ReturnType<BuildInternal>> {
  const sigRef: InternalCls =
    libInternals.at(0) ??
    class Internal {
      static refName = srv.refName;
      static srv = srv;
      static [INTERNAL_META_KEY] = {};
    };
  Object.assign(sigRef[INTERNAL_META_KEY], internalBuilder(buildInternal));
  Object.assign(sigRef.srv.srvMap, srv.srvMap);
  return sigRef as any;
}
