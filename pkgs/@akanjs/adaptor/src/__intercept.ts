import type { Cls } from "@akanjs/base";
import type { SignalContext } from "./__signalContext";
import {
  injectionBuilder,
  type InjectBuilder,
  INJECT_META_KEY,
  InjectInfo,
  type ExtractInjectInfoObject,
} from "@akanjs/service";
import { Logger } from "@akanjs/common";

export type InterceptorCls<
  Methods = {},
  InjectMap extends { [key: string]: InjectInfo<any> } = {},
> = Cls<
  Methods &
    ExtractInjectInfoObject<InjectMap> & {
      readonly logger: Logger;
      onInit(): Promise<void>;
      onDestroy(): Promise<void>;
      intercept(context: SignalContext): AsyncGenerator | Promise<any>;
    },
  { readonly [INJECT_META_KEY]: InjectMap; readonly refName: string }
>;

export function intercept<Name extends string>(name: Name): InterceptorCls;

export function intercept<
  Name extends string,
  Injection extends InjectBuilder<
    "use" | "env" | "generate" | "member" | "memory"
  >,
>(
  refName: Name,
  injectBuilder: Injection,
): InterceptorCls<{}, ReturnType<Injection>>;

export function intercept(refName: string, injectBuilder?: InjectBuilder) {
  const injectInfoMap = injectBuilder?.(injectionBuilder) ?? {};
  return class Interceptor {
    static readonly refName = refName;
    static readonly [INJECT_META_KEY] = injectInfoMap;

    readonly logger = new Logger(refName);
    intercept(
      context: SignalContext,
    ): AsyncGenerator | Promise<(res: Response) => Promise<Response>> {
      return Promise.resolve((res: Response) => Promise.resolve(res));
    }
    async onInit() {
      //
    }
    async onDestroy() {
      //
    }
  };
}
