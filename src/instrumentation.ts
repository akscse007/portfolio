import type { Instrumentation } from 'next';

export function register() {
  // No tracing provider configured; onRequestError below provides structured error logs.
}

const REDACT = [
  /(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, // database credentials in connection strings
  /((?:password|secret|token|key|salt)["'=:\s]+)[^\s"',}]+/gi,
];

function redact(text: string | undefined) {
  if (!text) return text;
  return REDACT.reduce((t, re) => t.replace(re, '$1[redacted]'), text);
}

/**
 * Structured server-side error log for every failed request (server components, route handlers,
 * server actions, middleware). The `digest` equals the "Reference" shown on the error screen, so a
 * user report can be matched to the full stack trace. Query strings, cookies and bodies are not
 * logged (they may contain personal data); credentials in messages are redacted.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const err = error as Error & { digest?: string };
  const entry = {
    level: 'error',
    event: 'request_error',
    digest: err.digest,
    method: request.method,
    path: request.path.split('?')[0],
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    message: redact(err.message),
    stack: redact(err.stack),
    time: new Date().toISOString(),
  };
  console.error(`[digital-lab] ${JSON.stringify(entry)}`);
};
