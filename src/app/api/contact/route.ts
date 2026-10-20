import type { NextRequest } from 'next/server';
import { contactSchema } from '@/lib/validation/schemas';
import { errorResponse, HttpError, json, readJson } from '@/lib/api';
import { submitContact } from '@/server/services/contact';
import { clientIp, hashIp, userAgent } from '@/lib/security/request';

/** Public contact endpoint. Responds 201 only after the message is persisted. */
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    if (origin && host && new URL(origin).host !== host)
      throw new HttpError(403, 'Cross-origin request rejected');
    const input = contactSchema.parse(await readJson(req, 20_000));
    const result = await submitContact(input, {
      ipHash: hashIp(clientIp(req.headers)),
      userAgent: userAgent(req.headers),
    });
    return json({ ok: true, id: result.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
