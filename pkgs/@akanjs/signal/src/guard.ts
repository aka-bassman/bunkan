import type { Cls } from "@akanjs/base";
import type { SignalContext } from "./signalContext";

export interface Guard {
  canPass(context: SignalContext): boolean;
}

export type GuardCls<Name extends string> = Cls<Guard, { readonly name: Name }>;

export const guard = <T extends string>(name: T): GuardCls<T> => {
  return class Guard {
    static name = name;
    canPass(context: SignalContext): boolean {
      return true;
    }
  };
};
