import nodemailer, { type Transporter } from 'nodemailer';

// ponytail: minimal HTML entity escape for email template interpolation
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 邮件服务 · 基于 nodemailer
 * - 支持 SMTP / 第三方邮件服务（QQ、163、Gmail 等）
 * - 提供 HTML 模板发送
 * - 优雅降级：未配置 SMTP 时仅打印日志
 */
export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private fromAddress: string;

  constructor(opts?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
    secure?: boolean;
  }) {
    const host = opts?.host || process.env.SMTP_HOST;
    const port = Number(opts?.port || process.env.SMTP_PORT || 465);
    const user = opts?.user || process.env.SMTP_USER;
    const pass = opts?.pass || process.env.SMTP_PASS;
    this.fromAddress = opts?.from || process.env.SMTP_FROM || user || 'noreply@campus-forum.local';

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: opts?.secure ?? port === 465,
          auth: { user, pass },
        });
        console.log(`✓ EmailService 已配置 SMTP: ${host}:${port}`);
      } catch (err) {
        console.warn('⚠️  SMTP 配置失败，邮件功能将仅打印日志:', (err as Error).message);
        this.transporter = null;
      }
    } else {
      console.log('ℹ️  未配置 SMTP，邮件功能仅打印日志（开发模式）');
    }
  }

  /**
   * 发送邮件
   */
  async send(opts: SendMailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log(`[Email][dev] To: ${opts.to} | Subject: ${opts.subject}`);
      // ponytail: never log email body — production data leak risk
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      console.log(`✓ 邮件已发送: ${opts.to} (${info.messageId})`);
      return true;
    } catch (err) {
      console.error('✗ 邮件发送失败:', (err as Error).message);
      return false;
    }
  }

  /**
   * 发送验证码邮件
   */
  async sendVerificationCode(to: string, code: string, expireMinutes: number = 10): Promise<boolean> {
    const subject = '【十三境论坛】邮箱验证码';
    const safeCode = escapeHtml(code);
    const text = `您的验证码是：${code}，${expireMinutes} 分钟内有效。如非本人操作，请忽略此邮件。`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #fafaf7;">
        <div style="background: white; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px; color: #2d3142; font-size: 20px;">十三境 · 邮箱验证</h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">您好，欢迎注册十三境校园论坛。您的验证码是：</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #d4a574, #c89968); color: white; font-size: 28px; font-weight: bold; letter-spacing: 8px; border-radius: 6px; font-family: 'Courier New', monospace;">${safeCode}</span>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">验证码 ${expireMinutes} 分钟内有效</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">如非本人操作，请忽略此邮件</p>
        </div>
      </div>
    `;
    return this.send({ to, subject, text, html });
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordReset(to: string, resetLink: string): Promise<boolean> {
    const subject = '【十三境论坛】密码重置';
    const safeLink = escapeHtml(resetLink);
    const text = `请点击以下链接重置密码：${resetLink}\n链接 30 分钟内有效。如非本人操作，请忽略此邮件。`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #fafaf7;">
        <div style="background: white; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px; color: #2d3142; font-size: 20px;">十三境 · 密码重置</h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">您好，我们收到了您的密码重置请求。请点击下方按钮重置密码：</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${safeLink}" style="display: inline-block; padding: 12px 32px; background: #d4a574; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">重置密码</a>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">链接 30 分钟内有效</p>
          <p style="color: #9ca3af; font-size: 11px; word-break: break-all;">如果按钮无法点击，请复制此链接到浏览器：${safeLink}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">如非本人操作，请忽略此邮件</p>
        </div>
      </div>
    `;
    return this.send({ to, subject, text, html });
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}
