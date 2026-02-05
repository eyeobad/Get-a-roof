import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AppwriteStorageService {
  private readonly logger = new Logger(AppwriteStorageService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadFile(fileName: string, buffer: Buffer, contentType?: string) {
    const endpoint =
      this.configService.get<string>("APPWRITE_ENDPOINT") ||
      "https://fra.cloud.appwrite.io/v1";
    const bucketId =
      this.configService.get<string>("APPWRITE_BUCKET") ?? "6980843f001fcfb455c9";
    const projectId =
      this.configService.get<string>("APPWRITE_PROJECT") ?? "fra-6980842c000a08b23917";
    const apiKey = this.configService.get<string>("APPWRITE_API_SECRET");

    if (!apiKey) {
      throw new Error("Appwrite API key is not configured");
    }

    const form = new FormData();
    form.append("fileId", "unique()");
    const blob = new Blob([buffer], {
      type: contentType ?? "application/octet-stream",
    });
    form.append("file", blob, fileName);

    this.logger.log(`uploadFile ${projectId} bucket ${bucketId}`);
    const response = await fetch(`${endpoint}/storage/buckets/${bucketId}/files`, {
      method: "POST",
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      },
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      this.logger.warn("Appwrite upload failed", payload);
      throw new Error(payload?.message ?? "Unable to upload file");
    }
    const fileUrl = `${endpoint}/storage/buckets/${bucketId}/files/${payload.$id}/view?project=${projectId}`;
    return { url: fileUrl, fileId: payload?.$id };
  }
}
