import 'server-only';

export type MailMessage = { to: string; subject: string; text: string; replyTo?: string };
export type MailResult = { sent: boolean; provider: string; error?: string };

/**
 * Email delivery is configured by EMAIL_PROVIDER:
 *  - none    : never send (messages are still stored in the admin inbox)
 *  - console : log to server output (development default)
 *  - smtp    : send through any SMTP provider (Resend, Postmark, SES, Mailgun, Gmail, Mailpit...)
 */
export async function sendMail(msg: MailMessage): Promise<MailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'console';
  if (provider === 'none') return { sent: false, provider };
  if (provider === 'console') {
    console.info(
      `[email:console] to=${msg.to} subject=${JSON.stringify(msg.subject)}\n${msg.text}`,
    );
    return { sent: true, provider };
  }
  if (provider === 'smtp') {
    const host = process.env.SMTP_HOST;
    const from = process.env.EMAIL_FROM;
    if (!host || !from)
      return { sent: false, provider, error: 'SMTP_HOST and EMAIL_FROM must be set' };
    try {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      });
      await transport.sendMail({
        from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        replyTo: msg.replyTo,
      });
      return { sent: true, provider };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[email:smtp] delivery failed', message);
      return { sent: false, provider, error: message.slice(0, 300) };
    }
  }
  return { sent: false, provider, error: `Unknown EMAIL_PROVIDER "${provider}"` };
}

/** Removes CR/LF to prevent header injection in subjects. */
export function headerSafe(input: string) {
  return input.replace(/[\r\n]+/g, ' ').slice(0, 200);
}
