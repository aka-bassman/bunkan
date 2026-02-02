export const getNonArrayModel = <T>(arraiedModel: T | T[]): [T, number] => {
  let arrDepth = 0;
  let target: T | T[] = arraiedModel;
  while (Array.isArray(target)) {
    target = target[0] as T;
    arrDepth++;
  }
  return [target, arrDepth];
};
export const arraiedModel = <T = any>(modelRef: T, arrDepth = 0) => {
  let target: T | T[] | T[][] | T[][][] = modelRef;
  for (let i = 0; i < arrDepth; i++) target = [target as T];
  return target;
};
export const applyFnToArrayObjects = (
  arraiedData: any,
  fn: (arg: any) => any,
): any[] => {
  if (Array.isArray(arraiedData))
    return arraiedData.map(
      (data) => applyFnToArrayObjects(data, fn) as unknown,
    );
  return fn(arraiedData) as unknown as any[];
};
