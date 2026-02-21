import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TwilioAdapter {
  private readonly logger = new Logger(TwilioAdapter.name);
  // Replace with: import twilio from 'twilio'; const client = twilio(accountSid, authToken)
  async send(opts: { to: string; body: string }): Promise<void> {
    this.logger.log(`[SMS] To: ${opts.to} | Body: ${opts.body.slice(0, 60)}`);
  }
}
