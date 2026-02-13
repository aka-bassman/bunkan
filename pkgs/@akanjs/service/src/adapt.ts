import type { Cls } from "@akanjs/base";
import {
  injectionBuilder,
  type InjectBuilder,
  INJECT_META_KEY,
  InjectInfo,
  type ExtractInjectInfoObject,
} from "./injectInfo";
import { Logger } from "@akanjs/common";

export type AdaptorCls<Methods = {}, InjectMap extends { [key: string]: InjectInfo<any> } = {}> = Cls<
  Methods &
    ExtractInjectInfoObject<InjectMap> & {
      readonly logger: Logger;
      onInit(): Promise<void>;
      onDestroy(): Promise<void>;
    },
  { readonly [INJECT_META_KEY]: InjectMap; readonly refName: string }
>;

export function adapt<Name extends string>(name: Name): AdaptorCls;

export function adapt<
  Name extends string,
  Injection extends InjectBuilder<"use" | "env" | "generate" | "member" | "memory">,
>(name: Name, injectBuilder: Injection): AdaptorCls<{}, ReturnType<Injection>>;

export function adapt(name: string, injectBuilder?: InjectBuilder) {
  const injectInfoMap = injectBuilder?.(injectionBuilder) ?? {};
  class Adaptor {
    readonly logger = new Logger(name);
    static readonly [INJECT_META_KEY] = injectInfoMap;
    static readonly refName = name;
    async onInit() {
      //
    }
    async onDestroy() {
      //
    }
  }
  return Adaptor;
}
