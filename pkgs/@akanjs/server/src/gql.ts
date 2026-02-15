import { arraiedModel, BaseObject, Dayjs, dayjs, Float, ID, Int, JSON, Type } from "@akanjs/base";
import { capitalize } from "@akanjs/common";
import { Cnst, constantInfo, DocumentModel, FieldProps } from "@akanjs/constant";
import type { Doc } from "@akanjs/document";
import * as Nest from "@nestjs/graphql";
import { Field, InputType, ObjectType } from "@nestjs/graphql";
import { isDayjs } from "dayjs";
import { Kind, ValueNode } from "graphql";
import { default as GraphQLJSON } from "graphql-type-json";

@Nest.Scalar("Date", () => Date)
export class DateScalar implements Nest.CustomScalar<Date, Dayjs> {
  description = "Date custom scalar type";
  parseValue(value: number) {
    return dayjs(value); // value from the client
  }
  serialize(value: Dayjs): Date {
    if (isDayjs(value))
      return value.toDate(); // value sent to the client
    else return new Date(value);
  }
  parseLiteral(ast: ValueNode) {
    if (ast.kind === Kind.INT) return dayjs(ast.value);
    else if (ast.kind === Kind.STRING) return dayjs(ast.value);
    else return null as unknown as Dayjs;
  }
}

class ObjectGqlStorage {}
class InputGqlStorage {}

const getPredefinedInqutGql = (refName: string) => {
  const inputGql = Reflect.getMetadata(refName, InputGqlStorage.prototype) as Type | undefined;
  return inputGql;
};
const setPredefinedInqutGql = (refName: string, inputGql: Type) => {
  Reflect.defineMetadata(refName, inputGql, InputGqlStorage.prototype);
};
const getPredefinedObjectGql = (refName: string) => {
  const objectGql = Reflect.getMetadata(refName, ObjectGqlStorage.prototype) as Type | undefined;
  return objectGql;
};
const setPredefinedObjectGql = (refName: string, objectGql: Type) => {
  Reflect.defineMetadata(refName, objectGql, ObjectGqlStorage.prototype);
};

const gqlNestFieldMap = new Map<any, any>([
  [ID, Nest.ID],
  [Int, Nest.Int],
  [Float, Nest.Float],
  [JSON, GraphQLJSON],
  [Map, GraphQLJSON],
]);
export const applyNestField = (model: Type, field: FieldProps, key: string, type: "object" | "input" = "object") => {
  if (field.fieldType === "hidden" && type === "object") return;
  const modelRef = (
    field.isClass
      ? type === "object"
        ? generateGql(field.modelRef)
        : field.isScalar
          ? generateGqlInput(field.modelRef)
          : Nest.ID
      : (gqlNestFieldMap.get(field.modelRef) ?? field.modelRef)
  ) as Type;
  Field(() => arraiedModel(modelRef, field.arrDepth), { nullable: field.nullable })(model.prototype as object, key);
};

const gqlClassMap = new Map<Type, Type>();
const getGqlClass = (modelRef: Type) => {
  return gqlClassMap.get(modelRef) ?? class GqlClass {};
};

export const generateGqlInput = <InputModel>(inputRef: Cnst<InputModel>): Type<DocumentModel<InputModel>> => {
  const refName = constantInfo.getRefName(inputRef);
  const modelType = constantInfo.getModelType(inputRef);
  const gqlName = `${capitalize(refName)}${modelType === "object" ? "Object" : "Input"}`;
  const predefinedInputGql = getPredefinedInqutGql(gqlName);
  if (predefinedInputGql) return predefinedInputGql;
  const inputGql = getGqlClass(constantInfo.isScalar(inputRef) ? inputRef : constantInfo.getDatabase(refName).input);
  Object.entries(inputRef.field).forEach(([key, field], id) => {
    applyNestField(inputGql, field.getProps(), key, "input");
  });
  InputType(gqlName)(inputGql);
  setPredefinedInqutGql(gqlName, inputGql);
  return inputGql;
};

export const generateGql = <ObjectModel>(
  objectRef: Cnst<ObjectModel>
): Type<ObjectModel extends BaseObject ? Doc<ObjectModel> : DocumentModel<ObjectModel>> => {
  const refName = constantInfo.getRefName(objectRef);
  const isLight = constantInfo.isLight(objectRef);

  const gqlName = `${isLight ? "Light" : ""}${capitalize(refName)}${constantInfo.isInsight(objectRef) ? "Insight" : ""}`;
  if (isLight) {
    const fullModelRef = constantInfo.getDatabase(refName).full;
    return generateGql(fullModelRef) as unknown as Type<
      ObjectModel extends BaseObject ? Doc<ObjectModel> : DocumentModel<ObjectModel>
    >;
  }
  const predefinedObjectGql = getPredefinedObjectGql(gqlName);
  if (predefinedObjectGql) return predefinedObjectGql;
  const objectGql = getGqlClass(
    constantInfo.isScalar(objectRef) || constantInfo.isInsight(objectRef)
      ? objectRef
      : constantInfo.getDatabase(refName).full
  );
  Object.entries(objectRef.field).forEach(([key, field], id) => {
    applyNestField(objectGql, field.getProps(), key);
  });
  ObjectType(gqlName)(objectGql);
  setPredefinedObjectGql(gqlName, objectGql);
  return objectGql;
};
