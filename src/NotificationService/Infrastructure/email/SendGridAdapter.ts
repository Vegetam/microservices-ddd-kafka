import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SendGridAdapter {
  private readonly logger = new Logger(SendGridAdapter.name);
  // Replace with: import sgMail from '@sendgrid/mail'; sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    this.logger.log(`[EMAIL] To: ${opts.to} | Subject: ${opts.subject}`);
  }
}
