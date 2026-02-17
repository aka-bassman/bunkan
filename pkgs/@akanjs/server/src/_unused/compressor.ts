import {
  applyFnToArrayObjects,
  type Dayjs,
  dayjs,
  Float,
  getNonArrayModel,
  type GqlScalar,
  ID,
  Int,
  JSON as GqlJSON,
  type Type,
} from "@akanjs/base";
import { capitalize, Logger } from "@akanjs/common";
import {
  Cnst,
  constantInfo,
  ConstantMethods,
  FieldProps,
  getChildClassRefs,
  getFieldEnumMetas,
} from "@akanjs/constant";
import * as proto from "protobufjs";

class ProtoModelStorage {}
const protobufTypeMap = new Map<any, string>([
  [String, "string"],
  [Int, "int32"],
  [Float, "float"],
  [Boolean, "bool"],
  [Date, "double"],
]);
const getPredefinedProtoModel = (modelRef: Type) => {
  const protoModel = Reflect.getMetadata(modelRef, ProtoModelStorage.prototype) as proto.Type | undefined;
  return protoModel;
};
const setPredefinedProtoModel = (modelRef: Type, protoModel: proto.Type) => {
  Reflect.defineMetadata(modelRef, protoModel, ProtoModelStorage.prototype);
};
const getProtoModel = (modelRef: Cnst) => {
  const refName = constantInfo.getRefName(modelRef);
  const predefinedProtoModel = getPredefinedProtoModel(modelRef);
  if (predefinedProtoModel) return predefinedProtoModel;
  const namespace = refName.toLowerCase();
  const childModelRefs = getChildClassRefs(modelRef);
  const allModelRefs = [modelRef, ...childModelRefs];

  const modelDatas = allModelRefs.map((modelRef) => {
    const refName = constantInfo.getRefName(modelRef);

    return [
      refName,
      {
        fields: Object.fromEntries(
          Object.entries(modelRef.field).map(([key, field], id) => {
            const rule = field.isArray ? "repeated" : field.nullable ? "optional" : "required";
            const type = field.isClass
              ? constantInfo.getRefName(field.modelRef)
              : field.enum
                ? `${refName}${capitalize(key)}Enum`
                : (protobufTypeMap.get(field.modelRef) ?? "string");
            return [key, { type, id, rule }] as [string, proto.IField];
          })
        ),
      },
    ] as [string, proto.IType];
  });
  const modelJson = Object.fromEntries(modelDatas);

  const enumDatas = allModelRefs
    .map((modelRef) => {
      const refName = constantInfo.getRefName(modelRef);
      const enumMetas = getFieldEnumMetas(modelRef);
      const enumJsons = enumMetas.map((enumMeta) => {
        const enumName = `${refName}${capitalize(enumMeta.key)}Enum`;
        const enumData: proto.IEnum = {
          values: Object.fromEntries(enumMeta.enum.values.map((value, idx) => [value, idx])),
        };
        return [enumName, enumData] as [string, proto.IEnum];
      });
      return enumJsons;
    })
    .flat();
  const enumJson = Object.fromEntries(enumDatas);
  const protoJson: proto.INamespace = {
    nested: {
      [namespace]: {
        nested: {
          ...modelJson,
          ...enumJson,
        },
      },
    },
  };
  const root = proto.Root.fromJSON(protoJson);
  const protoModel = root.lookupType(`${namespace}.${refName}`);
  setPredefinedProtoModel(modelRef, protoModel);
  return protoModel;
};

class ProtoEncodeStorage {}
const scalarProtoEncodeMap = new Map<GqlScalar, (value: any) => any>([
  [Date, (value: Date | Dayjs) => dayjs(value).toDate().getTime()],
  [String, (value: string) => value],
  [ID, (value: string) => value],
  [Boolean, (value: boolean) => value],
  [Int, (value: number) => value],
  [Float, (value: number) => value],
  [GqlJSON, (value: object) => JSON.stringify(value)],
]);
const getProtoEncodeFn = (modelRef: Type): ((value: any) => object) => {
  const [valueRef] = getNonArrayModel(modelRef);
  return scalarProtoEncodeMap.get(valueRef) ?? ((value) => value as object);
};

const protoEncode = (field: FieldProps, value: any) => {
  if (field.nullable && (value === null || value === undefined)) return null;
  if (field.isArray && Array.isArray(value)) {
    return (value as object[]).map((v: object) => protoEncode(field, v) as object) as object[];
  }
  if (field.isMap && field.of) {
    const protoEncodeFn = getProtoEncodeFn(field.of as Type);
    return Object.fromEntries(
      [...(value as Map<string, any>).entries()].map(([key, val]) => [key, applyFnToArrayObjects(val, protoEncodeFn)])
    );
  }
  if (field.isClass) return makeProtoEncode(field.modelRef)(value as object);
  if (field.enum) return field.enum.indexOf(value as string);
  return getProtoEncodeFn(field.modelRef)(value);
};
const getPredefinedProtoEncodeFn = (refName: string) => {
  const protoEncode = Reflect.getMetadata(refName, ProtoEncodeStorage.prototype) as
    | ((value: any) => object)
    | undefined;
  return protoEncode;
};
const setPredefinedProtoEncodeFn = (refName: string, protoEncode: (value: any) => object) => {
  Reflect.defineMetadata(refName, protoEncode, ProtoEncodeStorage.prototype);
};

const makeProtoEncode = <T>(modelRef: Cnst<T>): ((value: any) => object) => {
  const refName = constantInfo.getRefName(modelRef);
  const predefinedProtoEncode = getPredefinedProtoEncodeFn(refName);
  if (predefinedProtoEncode) return predefinedProtoEncode;
  const protoEncodeFn = (value: T) => {
    const result: { [key: string]: any } = {};
    Object.entries(modelRef.field).forEach(([key, field], id) => {
      result[key] = protoEncode(field.getProps(), value[key]) as object;
    });
    return result;
  };
  setPredefinedProtoEncodeFn(refName, protoEncodeFn);
  return protoEncodeFn;
};

export const encode = <T>(modelRef: Cnst<T>, value: object) => {
  try {
    const protoModel = getProtoModel(modelRef);
    const protoEncode = makeProtoEncode(modelRef);
    const data = protoEncode(value);
    const errMsg = protoModel.verify(data);
    if (errMsg) {
      throw new Error(errMsg);
    }
    const message = protoModel.create(data);
    const buffer = protoModel.encode(message).finish();
    return buffer as unknown as Buffer;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to encode ${modelRef.name}: ${errMsg}`);
    return null;
  }
};

class ProtoDecodeStorage {}
const scalarProtoDecodeMap = new Map<GqlScalar, (value: any) => any>([
  [Date, (value: Date | Dayjs) => dayjs(value)],
  [String, (value: string) => value],
  [ID, (value: string) => value],
  [Boolean, (value: boolean) => value],
  [Int, (value: number) => value],
  [Float, (value: number) => value],
  [GqlJSON, (value: string) => JSON.parse(value) as object],
]);
const getProtoDecodeFn = (modelRef: Type): ((value: any) => object) => {
  const [valueRef] = getNonArrayModel(modelRef);
  return scalarProtoDecodeMap.get(valueRef) ?? ((value) => value as object);
};

const protoDecode = (field: FieldProps, value: any) => {
  if (field.nullable && (value === null || value === undefined)) return null;
  if (field.isArray) {
    if (value === undefined) return [];
    if (Array.isArray(value))
      return (value as object[]).map((v: object) => protoDecode(field, v) as object) as object[];
  }
  if (field.isMap && field.of) {
    const protoDecodeFn = getProtoDecodeFn(field.of as Type);
    return new Map(
      Object.entries(value as { [key: string]: string | number }).map(([key, val]) => [
        key,
        applyFnToArrayObjects(val, protoDecodeFn),
      ])
    );
  }
  if (field.isClass) return makeProtoDecode(field.modelRef)(value as object);
  if (field.enum) return field.enum.values.at(value as number);
  return getProtoDecodeFn(field.modelRef)(value);
};
const getPredefinedProtoDecodeFn = (refName: string) => {
  const protoDecode = Reflect.getMetadata(refName, ProtoDecodeStorage.prototype) as
    | ((value: any) => object)
    | undefined;
  return protoDecode;
};
const setPredefinedProtoDecodeFn = (refName: string, protoDecode: (value: any) => object) => {
  Reflect.defineMetadata(refName, protoDecode, ProtoDecodeStorage.prototype);
};

const makeProtoDecode = <T>(modelRef: Cnst<T>): ((value: any) => object) => {
  const refName = constantInfo.getRefName(modelRef);
  const predefinedProtoDecode = getPredefinedProtoDecodeFn(refName);
  if (predefinedProtoDecode) return predefinedProtoDecode;
  const protoDecodeFn = (value: T) => {
    const result: { [key: string]: any } = {};
    Object.entries(modelRef.field).forEach(([key, field], id) => {
      result[key] = protoDecode(field.getProps(), value[key]) as object;
    });
    return result;
  };
  setPredefinedProtoDecodeFn(refName, protoDecodeFn);
  return protoDecodeFn;
};

export const decode = <T>(modelRef: Cnst<T & ConstantMethods<T>>, buffer: Buffer) => {
  const protoModel = getProtoModel(modelRef);
  const message = protoModel.decode(Buffer.from(buffer));
  const data = protoModel.toObject(message);
  const protoDecode = makeProtoDecode(modelRef);
  const result = new modelRef().set(protoDecode(data) as T);
  return result;
};
