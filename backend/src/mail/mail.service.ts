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
  private transporter: ReturnType<typeof createTransport>;
  private sender: string;

  constructor(private readonly configService: ConfigService) {
    const host = configService.get("MAIL_HOST") || "localhost";
    const port = Number(configService.get("MAIL_PORT")) || 1025;
    const user = configService.get("MAIL_USERNAME");
    const pass = configService.get("MAIL_PASSWORD");
    this.sender = configService.get("MAIL_FROM") || "no-reply@get-a-roof.com";

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

  async sendMail(options: MailOptions) {
    await this.transporter.sendMail({
      from: this.sender,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
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

