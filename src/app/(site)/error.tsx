'use client';

import { RuntimeErrorView } from '@/components/errors/RuntimeErrorView';

/** Public-site boundary: renders inside the site layout, so header, navigation and footer keep working. */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RuntimeErrorView error={error} reset={reset} as="div" />;
}
