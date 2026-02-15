import { baseEnv, Int, Float, PrimitiveScalar, enumOf, dayjs, ID } from "@akanjs/base";
import { Logger } from "@akanjs/common";
import { ConstantRegistry, via } from "@akanjs/constant";
import { DatabaseRegistry, FILTER_META_KEY, beyond, by, from, into, type SchemaOf } from "@akanjs/document";
import { INJECT_META_KEY, ServiceModule, adapt, serve } from "@akanjs/service";
import { internal, slice, endpoint, SLICE_META_KEY, serverSignal, SignalRegistry } from "@akanjs/signal";

Logger.info("Hello, world!");

export class AdminRole extends enumOf("adminRole", ["manager", "admin", "superAdmin"] as const) {}

export class AdminInput extends via((field) => ({
  accountId: field(String, {
    type: "email",
    example: "hello@naver.com",
    text: "search",
  }),
})) {}

export class AdminObject extends via(AdminInput, (field) => ({
  password: field(String, {
    type: "password",
    example: "qwer1234",
    minlength: 8,
  }).optional(),
  roles: field([AdminRole], { example: ["admin", "superAdmin"] }),
  lastLoginAt: field(Date, { default: () => dayjs(), example: dayjs() }),
})) {}

export class LightAdmin extends via(AdminObject, ["accountId", "roles"] as const, (resolve) => ({})) {
  hasAccess(role: AdminRole["value"]) {
    if (role === "superAdmin") return this.roles.includes("superAdmin");
    if (role === "admin") return this.roles.includes("superAdmin") || this.roles.includes("admin");
    else return false;
  }
}

export class Admin extends via(AdminObject, LightAdmin, (resolve) => ({})) {}

export class AdminInsight extends via(Admin, (field) => ({})) {}

const admin = ConstantRegistry.buildModel("admin" as const, AdminInput, AdminObject, Admin, LightAdmin, AdminInsight);

export class AdminFilter extends from(Admin, (filter) => ({
  query: {
    byAccountId: filter()
      .arg("accountId", String)
      .query((accountId) => ({ accountId })),
  },
  sort: {},
})) {}

class DbAdminInput extends by(AdminInput) {}
export class DbAdmin extends by(Admin) {
  addRole(role: AdminRole["value"]) {
    if (!this.roles.includes(role)) this.roles = [...this.roles, role];
    return this;
  }
  subRole(role: AdminRole["value"]) {
    this.roles = this.roles.filter((r) => r !== role);
    return this;
  }
  updateAccess() {
    this.lastLoginAt = dayjs();
    return this;
  }
}

export class AdminModel extends into(Admin, AdminFilter, admin, ({ byField }) => ({
  adminAccountIdLoader: byField("accountId"),
})) {
  async hasAnotherAdmin(accountId: string) {
    const exists = await this.Admin.exists({
      accountId: { $ne: accountId },
      status: "active",
    });
    return !!exists;
  }
  async getAdminSecret(accountId: string): Promise<{ id: string; roles: AdminRole["value"][]; password: string }> {
    const adminSecret = await this.Admin.pickOne(
      { accountId, removedAt: { $exists: false } },
      { roles: true, password: true }
    );
    return adminSecret as {
      id: string;
      roles: AdminRole["value"][];
      password: string;
    };
  }
}
export class AdminMiddleware extends beyond(AdminModel, Admin) {}

export class Authorizer extends adapt("authorizer", ({ use }) => ({
  hello: use<string>(),
})) {
  test() {
    console.log(this.hello);
    this.logger.info("test");
  }
}
export const dbAdmin = DatabaseRegistry.buildModel(
  "admin" as const,
  DbAdminInput,
  DbAdmin,
  AdminModel,
  AdminMiddleware,
  Admin,
  AdminInsight,
  AdminFilter
);

export class AdminService extends serve(dbAdmin, ({ use, service, signal }) => ({
  authorizer: use<Authorizer>(),
  adminSignal: signal<AdminServeSignal>(),
})) {
  test() {
    this.authorizer.test();
    this.adminSignal.archiveAdmin("1");
  }
}

const srv = {
  admin: new ServiceModule("admin", AdminService, admin),
};

export class AdminInternal extends internal(srv.admin, ({ initialize, process }) => ({
  initializeAdmin: initialize().exec(async function () {
    this.adminService.test();
  }),
  archiveAdmin: process(Int)
    .msg("adminId", ID)
    .exec(async function (adminId, job) {
      return await Promise.resolve(1);
    }),
})) {}

export class AdminSlice extends slice(srv.admin, {}, () => ({})) {}

export class AdminEndpoint extends endpoint(srv.admin, ({ query, mutation, pubsub, message }) => ({})) {}

export class AdminServeSignal extends serverSignal(AdminEndpoint, AdminInternal) {}

SignalRegistry.register(AdminInternal, AdminEndpoint, AdminSlice);
console.log(AdminServeSignal);
