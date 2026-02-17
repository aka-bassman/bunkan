import { adapt } from "@akanjs/service";
import type { Readable } from "stream";
import fs from "fs";
import type { BaseEnv } from "@akanjs/base";
import p from "path";

export interface DownloadRequest {
  path: string;
  localPath: string;
  renamePath?: string;
}
export interface LocalFilePath {
  localPath: string;
}
export interface UploadRequest {
  path: string;
  localPath: string;
  meta?: { [key: string]: string };
  rename?: string;
  host?: string;
}
export interface CopyRequest {
  bucket: string;
  copyPath: string;
  pastePath: string;
  filename: string;
  host?: string;
}
export interface UploadFromStreamRequest {
  path: string;
  body: fs.ReadStream | Readable;
  mimetype: string;
  root?: string;
  updateProgress: (progress: { loaded?: number; total?: number; part?: number }) => void;
  uploadSuccess: (url: string) => void;
}
export interface UploadProgress {
  loaded?: number;
  total?: number;
  part?: number;
}

export interface StorageAdaptor {
  readData(path: string): Promise<fs.ReadStream>;
  readDataAsJson<T>(path: string): Promise<T>;
  getDataList(prefix?: string): Promise<string[]>;
  uploadDataFromLocal(request: UploadRequest): Promise<string>;
  uploadDataFromStream(request: UploadFromStreamRequest): void;
  saveData(request: DownloadRequest): Promise<LocalFilePath>;
  copyData(request: CopyRequest): Promise<string>;
  deleteData(url: string): Promise<boolean>;
}

export interface BlobStorageOptions extends BaseEnv {
  blobStorage?: { baseDir?: string; urlPrefix?: string };
}

export class BlobStorage
  extends adapt("blobStorage", ({ env }) => ({
    root: env(
      ({ appName, blobStorage = { baseDir: "local", urlPrefix: "/backend/localFile/getBlob" } }: BlobStorageOptions) =>
        `${process.env.AKAN_WORKSPACE_ROOT ?? "."}/${blobStorage.baseDir}/${appName}/backend`
    ),
    urlPrefix: env(
      ({ blobStorage = { urlPrefix: "/backend/localFile/getBlob" } }: BlobStorageOptions) => blobStorage.urlPrefix
    ),
  }))
  implements StorageAdaptor
{
  #localPathToUrl(path: string) {
    return `${this.urlPrefix}/${path}`;
  }
  async readData(path: string) {
    const filePath = `${this.root}/${path}`;
    return Promise.resolve(fs.createReadStream(filePath));
  }
  async readDataAsJson<T>(path: string) {
    const filePath = `${this.root}/${path}`;
    const data = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(data) as T;
  }
  async getDataList(prefix?: string) {
    const dir = `${this.root}${prefix ? `/${prefix}` : ""}`;
    const paths = await fs.promises.readdir(dir);
    return paths.map((path) => this.#localPathToUrl(path));
  }
  async uploadDataFromLocal({ path, localPath, meta }: UploadRequest) {
    const filePath = `${this.root}/${path}`;
    await this.#generateDir(filePath);
    await fs.promises.copyFile(localPath, filePath);
    if (meta) await fs.promises.writeFile(`${filePath}.meta`, JSON.stringify(meta));
    return this.#localPathToUrl(path);
  }
  async uploadDataFromStream({ path, body, mimetype, updateProgress, uploadSuccess }: UploadFromStreamRequest) {
    const filePath = `${this.root}/${path}`;
    await this.#generateDir(filePath);
    const stream = body.pipe(fs.createWriteStream(filePath));
    stream.on("finish", () => {
      uploadSuccess(this.#localPathToUrl(path));
    });
    stream.on("error", (error) => {
      this.logger.error(error.message);
    });
  }
  async #generateDir(path: string) {
    const fileDir = p.dirname(path);
    if (!fs.existsSync(fileDir)) await fs.promises.mkdir(fileDir, { recursive: true });
  }
  async saveData({ path, localPath, renamePath }: DownloadRequest): Promise<LocalFilePath> {
    await this.#generateDir(localPath);
    const stream = (await this.readData(path)).pipe(
      fs.createWriteStream(localPath) as unknown as NodeJS.WritableStream
    );
    return new Promise((resolve, reject) => {
      stream.on("end", () => {
        if (renamePath) fs.renameSync(localPath, renamePath);
        setTimeout(() => {
          resolve({ localPath: renamePath ?? localPath });
        }, 100);
      });
      stream.on("error", (error) => {
        reject("File Download Error");
      });
    });
  }
  async copyData({ copyPath, pastePath, host }: CopyRequest) {
    await fs.promises.copyFile(`${this.root}/${copyPath}`, `${this.root}/${pastePath}`);
    return pastePath;
  }
  async deleteData(url: string) {
    try {
      const basePath = this.#localPathToUrl("");
      if (!url.startsWith(basePath)) throw new Error("Invalid Base URL, Unable to delete data");
      const path = url.replace(basePath, "");
      await fs.promises.unlink(`${this.root}/${path}`);
      return true;
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  }
}
