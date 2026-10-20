'use client';

import { RuntimeErrorView } from '@/components/errors/RuntimeErrorView';

/** Root boundary (admin and routes outside the public site layout). */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RuntimeErrorView error={error} reset={reset} />;
}
