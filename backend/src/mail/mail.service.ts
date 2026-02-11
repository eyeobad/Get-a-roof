import { Injectable } from "@nestjs/common";
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
  private transporter?: ReturnType<typeof createTransport>;
  private sender: string;
  private resendApiKey?: string;

  constructor(private readonly configService: ConfigService) {
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
        throw new Error(errorText || "Resend email failed");
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

    // No mail provider configured; fail softly to avoid blocking signup in dev.
    // You can set RESEND_API_KEY (preferred) or MAIL_HOST/MAIL_PORT for SMTP.
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
