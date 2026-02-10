import type { Guard } from "./__guard";
import type { SignalContext } from "./__signalContext";

export class Public implements Guard {
  static name = "Public";
  canPass(context: SignalContext): boolean {
    return true;
  }
}

export class None implements Guard {
  static name = "None";
  canPass(context: SignalContext): boolean {
    return false;
  }
}
