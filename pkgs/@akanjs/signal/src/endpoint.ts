import type { Assign, Cls, MergeAllTypes, UnCls } from "@akanjs/base";
import { buildEndpoint, type EndpointBuilder, type EndpointInfo } from "./endpointInfo";
import type { ServiceModule } from "@akanjs/service";

export const ENDPOINT_META_KEY = Symbol("endpoint");

export interface EndpointCls<
  SrvModule extends ServiceModule = ServiceModule,
  EndpointInfoObj extends { [key: string]: EndpointInfo<any, any, any, any, any, any, any, any, any> } = {
    [key: string]: EndpointInfo<any, any, any, any, any, any, any, any, any>;
  },
> extends Cls<
  any,
  {
    refName: SrvModule["refName"];
    srv: SrvModule;
    [ENDPOINT_META_KEY]: EndpointInfoObj;
  }
> {}

type ExtendedEndpointReturn<Return, Full, Light, Insight, _UnTypeReturn = UnCls<Return>> = Return extends (infer R)[]
  ? ExtendedEndpointReturn<R, Full, Light, Insight>[]
  : Full extends _UnTypeReturn
    ? Cls<Full>
    : Light extends _UnTypeReturn
      ? Cls<Light>
      : Insight extends _UnTypeReturn
        ? Cls<Insight>
        : Return;

type ExtendEndpoints<
  SrvModule extends ServiceModule,
  LibEndpoints extends EndpointCls[],
  _Full = NonNullable<SrvModule["cnst"]>["full"],
  _Light = NonNullable<SrvModule["cnst"]>["light"],
  _Insight = NonNullable<SrvModule["cnst"]>["insight"],
  _Merged = MergeAllTypes<LibEndpoints>,
> = {
  [K in keyof _Merged]: _Merged[K] extends EndpointInfo<
    infer ReqType,
    infer Srvs,
    infer ArgNames,
    infer Args,
    infer InternalArgs,
    infer ServerArgs,
    infer Returns,
    infer ServerReturns,
    infer Nullable
  >
    ? EndpointInfo<
        ReqType,
        Srvs,
        ArgNames,
        Args,
        InternalArgs,
        ServerArgs,
        ExtendedEndpointReturn<Returns, _Full, _Light, _Insight>,
        ServerReturns,
        Nullable
      >
    : never;
};

export function endpoint<
  SrvModule extends ServiceModule,
  Builder extends EndpointBuilder<SrvModule>,
  LibEndpoints extends EndpointCls[],
>(
  srv: SrvModule,
  builder: Builder,
  ...libEndpoints: LibEndpoints
): EndpointCls<SrvModule, Assign<ReturnType<Builder>, ExtendEndpoints<SrvModule, LibEndpoints>>> {
  const sigRef =
    libEndpoints.at(0) ??
    class Endpoint {
      static refName = srv.refName;
      static srv = srv;
      static [ENDPOINT_META_KEY] = {};
    };
  Object.assign(sigRef[ENDPOINT_META_KEY], builder(buildEndpoint));
  Object.assign(sigRef.srv.srvMap, srv.srvMap);
  // TODO: Implement
  //   signalInfo.setRefNameTemp(sigRef, srv.refName);
  //   // signalInfo.setPrefixTemp(Signal, refName);
  //   const apiInfoMap = builder(makeApiBuilder());
  //   Object.entries(apiInfoMap).forEach(([key, apiInfo]) => {
  //     apiInfo.applyApiMeta(sigRef, key);
  //   });
  return sigRef as any;
}
