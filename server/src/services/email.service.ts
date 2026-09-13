import nodemailer, { Transporter } from 'nodemailer';

export interface SendOtpEmailInput {
  toEmail: string;
  otpCode: string;
  userName?: string;
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    // Lazy transporter initialization via getTransporter()
  }

  private getTransporter(): Transporter | null {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      if (!this.transporter) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        console.log(`[EmailService] Configured live Gmail SMTP transporter for ${user}`);
      }
      return this.transporter;
    }

    console.log('[EmailService] SMTP credentials not provided in .env — using console & dev logger fallback');
    return null;
  }

  public async sendOtpEmail(input: SendOtpEmailInput): Promise<boolean> {
    const { toEmail, otpCode, userName = 'EcoVolt Driver' } = input;
    const fromAddress = process.env.SMTP_FROM || '"EcoVolt Security" <no-reply@ecovolt.in>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background-color: #0F172A; color: #FFFFFF; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #10B981; margin: 0; font-size: 24px; letter-spacing: -0.5px;">⚡ EcoVolt</h1>
          <p style="color: #94A3B8; font-size: 13px; margin-top: 4px;">Smart EV Charging & Energy Network</p>
        </div>

        <div style="background-color: #1E293B; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #334155;">
          <h2 style="font-size: 18px; margin: 0 0 12px 0; color: #F8FAFC;">Password Reset Verification</h2>
          <p style="color: #94A3B8; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5;">
            Hello ${userName}, use the 6-digit verification code below to reset your EcoVolt account password. This code will expire in <strong>10 minutes</strong>.
          </p>

          <div style="background-color: #059669; color: #FFFFFF; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 14px 24px; border-radius: 10px; display: inline-block; margin: 10px 0;">
            ${otpCode}
          </div>

          <p style="color: #64748B; font-size: 12px; margin-top: 20px; margin-bottom: 0;">
            If you did not request a password reset, please ignore this email or secure your account.
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #64748B;">
          &copy; 2026 EcoVolt Networks India. All rights reserved.
        </div>
      </div>
    `;

    // Log to server console so developer can immediately test even without live SMTP creds
    console.log(`\n==================================================`);
    console.log(`✉️  [SMTP EMAIL OTP SENT] To: ${toEmail}`);
    console.log(`🔑  OTP Code: ${otpCode}`);
    console.log(`==================================================\n`);

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: '⚡ Your EcoVolt Password Reset OTP Code',
          html: htmlContent,
        });
        console.log(`[EmailService] Live email successfully dispatched via Gmail SMTP to ${toEmail}`);
        return true;
      } catch (err: any) {
        console.error('[EmailService] SMTP send error:', err?.message);
        return false;
      }
    }

    return true;
  }
}

export const emailService = new EmailService();

export async function sendOtpEmail(toEmail: string, otpCode: string, userName?: string): Promise<boolean> {
  return emailService.sendOtpEmail({ toEmail, otpCode, userName });
}
