import {
  ID,
  type Dayjs,
  type PrimitiveScalar,
  Int,
  Float,
  Any,
  dayjs,
  arraiedModel,
  applyFnToArrayObjects,
  type PromiseOrObject,
} from "@akanjs/base";
import { ConstantRegistry, type FieldProps, type ConstantCls, FIELD_META, type QueryOf } from "@akanjs/constant";
import * as mongoose from "mongoose";
import {
  ObjectId,
  type DatabaseModel,
  type Mdl,
  type Doc,
  convertAggregateMatch,
  type CRUDEventType,
  type SaveEventType,
  type DatabaseCls,
  DatabaseRegistry,
} from "@akanjs/document";
import { isDayjs } from "dayjs";

export class MongoResolver {
  static resolveDatabase(database: DatabaseModel): Mdl<any, any> {
    const schema = this.#createSchema(
      database.doc,
      {
        createdAt: {
          type: Date,
          get: (date: Date | null) => (date ? dayjs(date) : date),
          set: (day: Dayjs | null) => (day ? dayjs(day).toDate() : day),
        },
        updatedAt: {
          type: Date,
          get: (date: Date | null) => (date ? dayjs(date) : date),
          set: (day: Dayjs | null) => (day ? dayjs(day).toDate() : day),
        },
      },
      this.#getDefaultSchemaOptions()
    );
    Object.getOwnPropertyNames(database.doc.prototype).forEach((name) => {
      if (name === "constructor") return;
      schema.methods[name] = Object.getOwnPropertyDescriptor(database.doc.prototype, name)?.value;
    });
    const onSchema = Object.getOwnPropertyDescriptor(database.middleware.prototype, "onSchema")?.value;
    onSchema?.(schema);
    console.log("schemaOptions", database.refName);
    const model = mongoose.model(database.refName, schema);
    console.log(database.refName, model);
    return model as unknown as Mdl<any, any>;
  }
  static #primitiveMongoTypeMap = new Map<PrimitiveScalar, any>([
    [ID, ObjectId],
    [Int, Number],
    [Float, Number],
    [Any, mongoose.Schema.Types.Mixed],
    [Map, Map],
    [String, String],
    [Boolean, Boolean],
    [Date, Date],
  ]);
  static #applyMongoProp(schemaProps: any, field: FieldProps, key: string) {
    if (["id", "createdAt", "updatedAt"].includes(key) || field.fieldType === "resolve") return;
    const type = field.isClass
      ? field.isScalar
        ? this.#createSchema(field.modelRef)
        : ObjectId
      : (this.#primitiveMongoTypeMap.get(field.modelRef) ?? field.modelRef);
    let prop: any = {};
    if (field.optArrDepth) {
      prop.type = type;
      prop.required = true;
      if (field.isClass && !field.refPath) prop.ref = ConstantRegistry.getRefName(field.modelRef);
      if (field.refPath) prop.refPath = field.refPath;
      if (typeof field.min === "number") prop.min = field.min;
      if (typeof field.max === "number") prop.max = field.max;
      if (field.enum) prop.enum = [...field.enum.values, ...(field.nullable ? [null] : [])];
      if (typeof field.minlength === "number") prop.minlength = field.minlength;
      if (typeof field.maxlength === "number") prop.maxlength = field.maxlength;
      if (field.validate) {
        prop.validate = function (value: any) {
          return field.validate?.(field.modelRef === Date && !!value ? dayjs() : value, this) ?? true;
        };
      }
      prop = { type: arraiedModel(prop, field.optArrDepth), default: [], required: true };
      if (field.modelRef.prototype === Date.prototype) {
        prop.get = (dates: Date[]) => applyFnToArrayObjects(dates, (date: Date) => dayjs(date));
        prop.set = (days: Dayjs[]) => applyFnToArrayObjects(days, (day: Dayjs) => day.toDate());
      }
      if ((field.isClass && !field.isScalar) || field.modelRef.prototype === ID.prototype) {
        prop.get = (ids: mongoose.Types.ObjectId[]) =>
          applyFnToArrayObjects(ids, (id: mongoose.Types.ObjectId) => id.toString());
        prop.set = (ids: string[]) => applyFnToArrayObjects(ids, (id: string) => new mongoose.Types.ObjectId(id));
      }
    } else {
      prop.type = arraiedModel(type, field.arrDepth);
      prop.required = !field.nullable;
      if (field.isMap) {
        prop.of =
          this.#primitiveMongoTypeMap.get(field.of as PrimitiveScalar) ?? this.#createSchema(field.of as ConstantCls);
        if (!field.default) prop.default = new Map();
      }
      if (field.default !== null) {
        if (typeof field.default === "function")
          prop.default = function () {
            const def = field.default(this);
            return isDayjs(def) ? def.toDate() : def;
          };
        else prop.default = isDayjs(field.default) ? field.default.toDate() : field.default;
      }
      if (typeof field.immutable !== "undefined") prop.immutable = field.immutable;
      if (field.isClass && !field.refPath) prop.ref = ConstantRegistry.getRefName(field.modelRef);
      if (field.refPath) prop.refPath = field.refPath;
      if (typeof field.min === "number") prop.min = field.min;
      if (typeof field.max === "number") prop.max = field.max;
      if (field.enum) prop.enum = [...field.enum.values, ...(field.nullable ? [null] : [])];
      if (typeof field.select === "boolean") prop.select = field.select;
      if (typeof field.minlength === "number") prop.minlength = field.minlength;
      if (typeof field.maxlength === "number") prop.maxlength = field.maxlength;
      if (field.nullable) {
        prop.get = (v: any) => (v === undefined ? undefined : v);
        prop.set = (v: any) => (v === null ? undefined : v);
      }
      if (field.modelRef.prototype === Date.prototype) {
        prop.get = (date: Date[] | Date | null) =>
          applyFnToArrayObjects(date, (date: Date | null) => (date ? dayjs(date) : undefined));
        prop.set = (day: Dayjs[] | Dayjs | null) =>
          applyFnToArrayObjects(day, (day: Dayjs | null) => (day ? dayjs(day).toDate() : undefined));
      }
      if ((field.isClass && !field.isScalar) || field.modelRef.prototype === ID.prototype) {
        if (field.arrDepth === 0) {
          prop.get = (id: mongoose.Types.ObjectId | null) => (id ? id.toString() : undefined);
          prop.set = (id: string | null) => (id ? new mongoose.Types.ObjectId(id) : undefined);
        } else {
          prop.get = (val: mongoose.Types.ObjectId[] | mongoose.Types.ObjectId | null) =>
            applyFnToArrayObjects(val, (id: mongoose.Types.ObjectId | null) => (id ? id.toString() : undefined));
          prop.set = (val: string[] | string | null) =>
            applyFnToArrayObjects(val, (id: string | null) => (id ? new mongoose.Types.ObjectId(id) : undefined));
        }
      }
      if (field.isClass && field.isScalar && field.default === null && !field.nullable) {
        prop.default = field.modelRef.getDefault();
      }
      if (field.validate) {
        prop.validate = function (value: any) {
          return field.validate?.(field.modelRef === Date && !!value ? dayjs() : value, this) ?? true;
        };
      }
    }
    schemaProps[key] = prop;
  }

  static #schemaMap = new Map<string, mongoose.Schema>();
  static #createSchema(
    modelRef: ConstantCls | DatabaseCls,
    schemaProps: mongoose.SchemaDefinition = {},
    schemaOptions: mongoose.SchemaOptions = {}
  ): mongoose.Schema {
    const refName = DatabaseRegistry.getRefName(modelRef);
    const predefinedSchema = this.#schemaMap.get(refName);
    if (predefinedSchema) return predefinedSchema;
    Object.entries(modelRef[FIELD_META]).forEach(([key, field]) => {
      this.#applyMongoProp(schemaProps, field.getProps(), key);
    });
    const schema = new mongoose.Schema(schemaProps, schemaOptions);
    this.#schemaMap.set(refName, schema);
    return schema;
  }

  static #getDefaultSchemaOptions<TSchema = any, TDocument = any>(): any {
    return {
      toJSON: { getters: false, virtuals: true },
      toObject: { getters: false, virtuals: true },
      _id: true,
      id: true,
      timestamps: true,
      methods: {
        refresh: async function (this: Doc<any>) {
          const model = this.constructor as Mdl<any, any>;
          Object.assign(this, await model.findById(this._id));
          return this;
        },
      },
      statics: {
        pickOne: async function (
          this: Mdl<Doc<any>, TSchema>,
          query: QueryOf<TSchema>,
          projection?: mongoose.ProjectionType<TSchema>
        ): Promise<TDocument> {
          const doc = await this.findOne(query, projection);
          if (!doc) throw new Error("No Document");
          return doc;
        },
        pickById: async function (
          this: Mdl<Doc<any>, TSchema>,
          docId: string | undefined,
          projection?: mongoose.ProjectionType<TSchema>
        ): Promise<TDocument> {
          if (!docId) throw new Error("No Document ID");
          const doc = await this.findById(docId, projection);
          if (!doc) throw new Error("No Document");
          return doc;
        },
        sample: async function (
          this: Mdl<Doc<any>, TSchema>,
          query: QueryOf<TSchema>,
          size = 1,
          aggregations: mongoose.PipelineStage[] = []
        ): Promise<TDocument[]> {
          const objs = await this.aggregate([
            { $match: convertAggregateMatch(query) },
            { $sample: { size } },
            ...aggregations,
          ]);
          return objs.map((obj) => new this(obj) as TDocument);
        },
        sampleOne: async function (
          this: Mdl<Doc<any>, TSchema>,
          query: QueryOf<TSchema>,
          aggregations: mongoose.PipelineStage[] = []
        ): Promise<TDocument | null> {
          const obj = await this.aggregate([
            { $match: convertAggregateMatch(query) },
            { $sample: { size: 1 } },
            ...aggregations,
          ]);
          return obj.length ? new this(obj[0]) : null;
        },
        preSaveListenerSet: new Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>(),
        postSaveListenerSet: new Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>(),
        preCreateListenerSet: new Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>(),
        postCreateListenerSet: new Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>(),
        preUpdateListenerSet: new Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>(),
        postUpdateListenerSet: new Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>(),
        preRemoveListenerSet: new Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>(),
        postRemoveListenerSet: new Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>(),
        listenPre: function (
          type: SaveEventType,
          listener: (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
        ) {
          if (type === "save") {
            this.preSaveListenerSet.add(listener);
            return () => {
              this.preSaveListenerSet.delete(listener);
            };
          } else if (type === "create") {
            this.preCreateListenerSet.add(listener);
            return () => {
              this.preCreateListenerSet.delete(listener);
            };
          } else if (type === "update") {
            this.preUpdateListenerSet.add(listener);
            return () => {
              this.preUpdateListenerSet.delete(listener);
            };
          } else {
            this.preRemoveListenerSet.add(listener);
            return () => {
              this.preRemoveListenerSet.delete(listener);
            };
          }
        },
        listenPost: function (
          type: SaveEventType,
          listener: (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>
        ) {
          if (type === "save") {
            this.postSaveListenerSet.add(listener);
            return () => {
              this.postSaveListenerSet.delete(listener);
            };
          } else if (type === "create") {
            this.postCreateListenerSet.add(listener);
            return () => {
              this.postCreateListenerSet.delete(listener);
            };
          } else if (type === "update") {
            this.postUpdateListenerSet.add(listener);
            return () => {
              this.postUpdateListenerSet.delete(listener);
            };
          } else {
            this.postRemoveListenerSet.add(listener);
            return () => {
              this.postSaveListenerSet.delete(listener);
            };
          }
        },
      },
    };
  }
}
