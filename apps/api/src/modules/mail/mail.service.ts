import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = config.get<string>('EMAIL_FROM', 'Drikon <noreply@drikon.com>');
    this.appUrl = config.get<string>('WEB_ORIGIN', 'http://localhost:3000').split(',')[0];
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const url = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Verify your Drikon account',
      html: this.template({
        title: 'Welcome to Drikon',
        name,
        body: 'Thanks for signing up. Click the button below to verify your email and start shopping.',
        ctaText: 'Verify email',
        ctaUrl: url,
        footnote: 'This link expires in 24 hours.',
      }),
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const url = `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Reset your Drikon password',
      html: this.template({
        title: 'Reset your password',
        name,
        body: "We received a request to reset your password. If you didn't make this request, you can ignore this email.",
        ctaText: 'Reset password',
        ctaUrl: url,
        footnote: 'This link expires in 1 hour.',
      }),
    });
  }

  private async send(args: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.resend) {
      this.logger.log({
        msg: 'mail.dev.skipped',
        to: args.to,
        subject: args.subject,
      });
      return;
    }
    try {
      await this.resend.emails.send({
        from: this.from,
        to: args.to,
        subject: args.subject,
        html: args.html,
      });
    } catch (err: any) {
      this.logger.error({ msg: 'mail.send.failed', err: err?.message });
    }
  }

  private template(args: {
    title: string;
    name: string;
    body: string;
    ctaText: string;
    ctaUrl: string;
    footnote?: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e6e8ee">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#16192a;border-radius:16px;overflow:hidden;border:1px solid #232842">
        <tr><td style="padding:32px 32px 0">
          <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em">Drikon</div>
          <div style="color:#8590a8;font-size:13px;margin-top:4px">Vision, engineered.</div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px">
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;letter-spacing:-0.01em">${args.title}</h1>
          <p style="margin:0 0 8px;color:#c0c7d8">Hi ${this.escape(args.name)},</p>
          <p style="margin:0 0 24px;color:#a8b1c5;line-height:1.6">${this.escape(args.body)}</p>
          <a href="${args.ctaUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;border-radius:10px;font-weight:600;text-decoration:none">${this.escape(args.ctaText)}</a>
          ${args.footnote ? `<p style="margin:24px 0 0;color:#6c7591;font-size:12px">${this.escape(args.footnote)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:24px 32px 32px;border-top:1px solid #232842;color:#6c7591;font-size:12px">
          © ${new Date().getFullYear()} Drikon. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  private escape(s: string): string {
    return s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));
  }
}
