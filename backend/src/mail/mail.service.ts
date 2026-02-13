import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

type MailOptions = {
  to: string;
  subject: string;
  html: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: ReturnType<typeof createTransport>;
  private sender: string;
  private resendApiKey?: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.get("NODE_ENV") === "production";
    const host = configService.get("MAIL_HOST");
    const port = Number(configService.get("MAIL_PORT")) || 0;
    const user = configService.get("MAIL_USERNAME");
    const pass = configService.get("MAIL_PASSWORD");
    this.sender =
      configService.get("RESEND_FROM") ||
      configService.get("MAIL_FROM") ||
      "no-reply@get-a-roof.com";
    this.resendApiKey = configService.get("RESEND_API_KEY");

    const allowLocal = configService.get("MAIL_ALLOW_LOCAL") === "true";
    const isLocalHost =
      host === "localhost" || host === "127.0.0.1" || host === "::1";

    if (host && port && (!isLocalHost || allowLocal)) {
      const transportOptions: SMTPTransport.Options = {
        host,
        port,
        secure: false,
      };

      if (user && pass) {
        transportOptions.auth = { user, pass };
      }

      this.transporter = createTransport(transportOptions);
    }

    if (this.resendApiKey) {
      this.logger.log("Email provider enabled: Resend API");
    } else if (this.transporter) {
      this.logger.log("Email provider enabled: SMTP");
    } else {
      this.logger.warn(
        "No email provider configured. Set RESEND_API_KEY or MAIL_HOST/MAIL_PORT."
      );
    }
  }

  async sendMail(options: MailOptions) {
    if (this.resendApiKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.sender,
          to: options.to,
          subject: options.subject,
          html: options.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Resend email failed (${response.status}): ${errorText || "unknown error"}`
        );
      }
      return;
    }

    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.sender,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      return;
    }

    if (this.isProduction) {
      throw new Error("Email provider is not configured.");
    }

    // Dev fallback so local setup can proceed without a provider.
    this.logger.warn(
      `Email provider missing. Skipping send to ${options.to}. Subject: ${options.subject}`
    );
  }

  async sendVerificationOtp(email: string, otp: string) {
    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <p>Hi there,</p>
        <p>Use the code below to verify your email for Get a Roof:</p>
        <h2 style="color:#0a44b8;letter-spacing:0.2rem;">${otp}</h2>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `;
    await this.sendMail({
      to: email,
      subject: "Verify your Get a Roof email",
      html,
    });
  }
}
