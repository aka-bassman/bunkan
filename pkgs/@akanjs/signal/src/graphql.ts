import { isGqlScalar, Type } from "@akanjs/base";
import { capitalize, lowerlize } from "@akanjs/common";
import { Cnst, ConstantField, constantInfo, getGqlTypeStr } from "@akanjs/constant";

import { SerializedArg, SerializedEndpoint } from ".";

class FragmentStorage {}

const getPredefinedFragment = (refName: string) => {
  const fragment = Reflect.getMetadata(refName, FragmentStorage.prototype) as string | undefined;
  return fragment;
};
const setPredefinedFragment = (refName: string, fragment: string) => {
  Reflect.defineMetadata(refName, fragment, FragmentStorage.prototype);
};

const makeArgStr = (args: SerializedArg[]) => {
  return args.length
    ? `(${args
        .map((arg) => {
          const argRef = constantInfo.getModelRef(arg.refName, arg.modelType);
          const argRefType = isGqlScalar(argRef) ? "gqlScalar" : "class";
          const gqlTypeStr =
            "[".repeat(arg.arrDepth) +
            `${getGqlTypeStr(argRef)}${argRefType === "class" ? (constantInfo.isObject(argRef) ? "Object" : "Input") : ""}` +
            "!]".repeat(arg.arrDepth);
          return `$${arg.name}: ` + gqlTypeStr + (arg.argsOption.nullable ? "" : "!");
        })
        .join(", ")})`
    : "";
};

const makeArgAssignStr = (args: SerializedArg[]) => {
  return args.length ? `(${args.map((arg) => `${arg.name}: $${arg.name}`).join(", ")})` : "";
};

const makeReturnStr = (returnRef: Cnst, partial?: string[]) => {
  const isScalar = isGqlScalar(returnRef);
  if (isScalar) return "";
  const refName = constantInfo.getRefName(returnRef);
  const fragmentName = `${constantInfo.isLight(returnRef) ? "Light" : ""}${capitalize(refName)}${constantInfo.isInsight(returnRef) ? "Insight" : ""}`;
  if (!partial?.length)
    return ` {
        ...${lowerlize(fragmentName)}Fragment
      }`;
  const targetKeys = constantInfo.isScalar(returnRef) ? partial : [...new Set(["id", ...partial, "updatedAt"])];
  return ` {
    ${targetKeys
      .map((key) => [key, returnRef.field[key]] as [string, ConstantField])
      .filter(([_, field]) => field.fieldType !== "hidden")
      .map(([key, field]) =>
        field.isClass
          ? `    ${key} {
          ...${lowerlize(getGqlTypeStr(field.modelRef))}Fragment
        }`
          : `    ${key}`
      )
      .join("\n")}
      }`;
};
const fragmentize = (modelRef: Cnst, fragMap = new Map<string, string>(), partial?: string[]) => {
  const refName = constantInfo.getRefName(modelRef);
  const fragmentName = `${constantInfo.isLight(modelRef) ? "Light" : ""}${capitalize(refName)}${constantInfo.isInsight(modelRef) ? "Insight" : ""}`;
  const gqlName = `${capitalize(refName)}${constantInfo.isInsight(modelRef) ? "Insight" : ""}`;
  const selectKeys = partial ? ["id", ...partial, "updatedAt"] : Object.keys(modelRef.field);
  const selectKeySet = new Set(selectKeys);
  const fragment =
    `fragment ${lowerlize(fragmentName)}Fragment on ${gqlName} {\n` +
    Object.entries(modelRef.field)
      .filter(([key, field]) => field.fieldType !== "hidden" && selectKeySet.has(key))
      .map(([key, field]) => {
        return field.isClass
          ? `  ${key} {\n    ...${lowerlize(`${constantInfo.isLight(field.modelRef) ? "Light" : ""}${capitalize(constantInfo.getRefName(field.modelRef))}${constantInfo.isInsight(field.modelRef) ? "Insight" : ""}`)}Fragment\n  }`
          : `  ${key}`;
      })
      .join(`\n`) +
    `\n}`;
  fragMap.set(fragmentName, fragment);
  Object.entries(modelRef.field)
    .filter(([key, field]) => field.fieldType !== "hidden" && selectKeySet.has(key) && field.isClass)
    .forEach(([key, field]) => fragmentize(field.modelRef, fragMap));
  return fragMap;
};

export const makeFragment = (
  modelRef: Type,
  option: { overwrite?: any; excludeSelf?: boolean; partial?: string[] } = {}
) => {
  const refName = constantInfo.getRefName(modelRef);
  const fragmentName = `${constantInfo.isLight(modelRef) ? "Light" : ""}${capitalize(refName)}${constantInfo.isInsight(modelRef) ? "Insight" : ""}`;
  const fragment = getPredefinedFragment(fragmentName);
  if (fragment && !option.overwrite && !option.excludeSelf && !option.partial?.length) return fragment;
  const fragMap = new Map(fragmentize(modelRef as Cnst, new Map(), option.partial));
  if (option.excludeSelf) fragMap.delete(fragmentName);
  const gqlStr = [...fragMap.values()].join("\n");
  if (!option.excludeSelf) setPredefinedFragment(fragmentName, gqlStr);
  return gqlStr;
};

export const getGqlStr = (
  modelRef: Type,
  key: string,
  endpoint: SerializedEndpoint,
  returnRef: Type,
  partial?: string[]
) => {
  const isScalar = isGqlScalar(modelRef);
  const argStr = makeArgStr(endpoint.args);
  const argAssignStr = makeArgAssignStr(endpoint.args);
  const returnStr = makeReturnStr(returnRef as Cnst, partial);
  const gqlStr = `${isScalar ? "" : makeFragment(returnRef, { excludeSelf: !!partial?.length, partial })}
    ${endpoint.type + " " + key + argStr}{
      ${key}${argAssignStr}${returnStr}
    }
    `;
  return gqlStr;
};

export function graphql(literals: string | readonly string[], ...args: any[]) {
  if (typeof literals === "string") literals = [literals];
  let result = literals[0];
  args.forEach((arg: { [key: string]: any } | undefined, i: number) => {
    if (arg?.kind === "Document") result += (arg as { loc: { source: { body: string } } }).loc.source.body;
    else result += arg as unknown as string;
    result += literals[i + 1];
  });
  return result;
}
