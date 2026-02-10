import { arraiedModel, getNonArrayModel, isGqlScalar, JSON as GqlJSON, type Type } from "@akanjs/base";
import { Cnst, constantInfo, getScalarExample } from "@akanjs/constant";

import { SerializedArg, SerializedEndpoint } from ".";
import { SignalType } from "./signalDecorators";

class ResponseExampleStorage {}

const getPredefinedRequestExample = (modelRef: Type) => {
  return Reflect.getMetadata(modelRef, ResponseExampleStorage.prototype) as { [key: string]: any } | undefined;
};
const getPredefinedResponseExample = (modelRef: Type) => {
  return Reflect.getMetadata(modelRef, ResponseExampleStorage.prototype) as { [key: string]: any } | undefined;
};

const getResponseExample = (ref: Cnst | Cnst[]) => {
  const [modelRef, arrDepth] = getNonArrayModel(ref);
  const existing = getPredefinedRequestExample(modelRef);
  if (existing) return existing;
  const isScalar = isGqlScalar(modelRef);
  if (isScalar) return arraiedModel(getScalarExample(modelRef), arrDepth);

  const example: { [key: string]: any } = {};
  Object.entries(modelRef.field).forEach(([key, field]) => {
    if (field.example) example[key] = field.example as unknown;
    else if (field.enum) example[key] = arraiedModel<string>(field.enum.values[0] as string, field.arrDepth);
    else example[key] = getResponseExample(field.modelRef);
  });
  const result = arraiedModel(example, arrDepth);
  Reflect.defineMetadata(ref, result, ResponseExampleStorage.prototype);
  return result;
};

class RequestExampleStorage {}

const getRequestExample = (modelRef: Cnst) => {
  const existing = getPredefinedRequestExample(modelRef);
  if (existing) return existing;
  const example = {};
  const isScalar = isGqlScalar(modelRef);
  if (isScalar) return getScalarExample(modelRef);
  else {
    Object.entries(modelRef.field).forEach(([key, field]) => {
      if (!field.isScalar && field.isClass) example[key] = "ObjectID";
      else
        example[key] = (
          (field.example ?? field.enum)
            ? arraiedModel(field.example ?? (field.enum?.values as string[])[0], field.optArrDepth)
            : arraiedModel(getRequestExample(field.modelRef), field.arrDepth)
        ) as unknown;
    });
  }

  Reflect.defineMetadata(modelRef, example, RequestExampleStorage.prototype);
  return example;
};

export const makeRequestExample = (gqlMeta: SerializedEndpoint) => {
  return getExampleData(gqlMeta.args);
};
export const getExampleData = (argMetas: SerializedArg[], signalType: SignalType = "graphql"): { [key: string]: any } =>
  Object.fromEntries(
    argMetas
      .filter((argMeta) => argMeta.type !== "Upload")
      .map((argMeta) => {
        const argRef = constantInfo.getModelRef(argMeta.refName, argMeta.modelType) as Cnst;
        const example = argMeta.argsOption.example ?? getRequestExample(argRef);
        return [
          argMeta.name,
          arraiedModel(
            signalType === "restapi" && argRef.prototype === GqlJSON.prototype
              ? JSON.stringify(example, null, 2)
              : example,
            argMeta.arrDepth
          ),
        ];
      })
  );

export const makeResponseExample = (gqlMeta: SerializedEndpoint) => {
  const returnRef = constantInfo.getModelRef(gqlMeta.returns.refName, gqlMeta.returns.modelType);
  const example = getResponseExample(arraiedModel(returnRef, gqlMeta.returns.arrDepth) as Cnst);
  return example;
};
