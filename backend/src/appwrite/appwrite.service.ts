import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
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
      throw new ServiceUnavailableException(
        "File upload is not configured on the server (missing APPWRITE_API_SECRET)."
      );
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
      const reason =
        typeof payload?.message === "string" && payload.message.trim()
          ? payload.message
          : `Upload provider error (${response.status})`;
      throw new BadGatewayException(`Unable to upload file: ${reason}`);
    }
    const fileUrl = `${endpoint}/storage/buckets/${bucketId}/files/${payload.$id}/view?project=${projectId}`;
    return { url: fileUrl, fileId: payload?.$id };
  }
}
