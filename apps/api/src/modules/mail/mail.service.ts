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
        // Development only: without an email provider there was no way to follow
        // a verify/reset link locally. Never in production — these are
        // credentials, and a reset link in a log is an account takeover.
        ...(process.env.NODE_ENV !== 'production' && { link: args.html.match(/href="([^"]+token=[^"]+)"/)?.[1] }),
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
<body style="margin:0;padding:0;background:#f3f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e4e7ec">
        <tr><td style="padding:22px 32px;background:#0b1424">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff">Drikon</div>
        </td></tr>
        <tr><td style="padding:32px 32px 8px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;letter-spacing:-0.01em;color:#111827">${args.title}</h1>
          <p style="margin:0 0 8px;color:#111827">Hi ${this.escape(args.name)},</p>
          <p style="margin:0 0 24px;color:#475467;line-height:1.6">${this.escape(args.body)}</p>
          <!-- Solid colour, not a gradient: Outlook ignores CSS gradients and would render the button with no background. -->
          <a href="${args.ctaUrl}" style="display:inline-block;padding:13px 26px;background:#0b57d0;color:#ffffff;border-radius:8px;font-weight:700;text-decoration:none">${this.escape(args.ctaText)}</a>
          ${args.footnote ? `<p style="margin:24px 0 0;color:#667085;font-size:12px">${this.escape(args.footnote)}</p>` : ''}
          <p style="margin:20px 0 0;color:#667085;font-size:12px;line-height:1.5">If the button doesn't work, paste this link into your browser:<br><span style="color:#0b57d0;word-break:break-all">${this.escape(args.ctaUrl)}</span></p>
        </td></tr>
        <tr><td style="padding:22px 32px 28px;border-top:1px solid #e4e7ec;color:#667085;font-size:12px">
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
