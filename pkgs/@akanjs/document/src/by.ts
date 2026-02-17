import { type MergeAllActionTypes, type Cls } from "@akanjs/base";
import { FIELD_META, BaseObject, type ConstantCls, type DocumentModel, type FieldObject } from "@akanjs/constant";
import type { HydratedDocument } from "mongoose";

export type DatabaseCls<Schema = any> = Cls<Schema, { [FIELD_META]: FieldObject }>;

export interface DefaultDocMtds<TDocument> {
  refresh(): Promise<this>;
  set(data: Partial<TDocument>): this;
  save(): Promise<this>;
}
type HydratedDocumentWithId<TDocument> = Omit<
  HydratedDocument<TDocument, DefaultDocMtds<TDocument>>,
  "id" | "set" | "save"
> & { id: string } & DefaultDocMtds<TDocument>;
export type Doc<M> = HydratedDocumentWithId<DocumentModel<M>>;

export const by = <
  Model,
  AddDbModels extends ConstantCls[],
  _DocModel = Model extends BaseObject ? Doc<Model> : DocumentModel<Model>,
>(
  modelRef: ConstantCls<Model>,
  ...addRefs: AddDbModels
): DatabaseCls<MergeAllActionTypes<AddDbModels, keyof _DocModel & string> & _DocModel> => {
  Object.assign(modelRef[FIELD_META], ...addRefs.map((addRef) => addRef[FIELD_META]));
  return modelRef as any;
};
