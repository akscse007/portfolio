import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/auth';
import { safeAdminRedirect } from '@/lib/security/redirect';
import { LoginForm } from './LoginForm';
import { LogoMark } from '@/components/brand/Logo';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await getCurrentAdmin();
  if (session) redirect(safeAdminRedirect(next));
  return (
    <main id="main" className="grid min-h-[100dvh] place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div>
            <p className="font-display text-lg font-bold uppercase" style={{ fontStretch: '80%' }}>
              Digital Lab
            </p>
            <p className="label">Owner sign-in</p>
          </div>
        </div>
        <LoginForm next={safeAdminRedirect(next)} />
        <p className="mt-8 text-xs text-muted">
          There is no default account. Create the first administrator with{' '}
          <code className="font-mono">npm run admin:create</code>.
        </p>
      </div>
    </main>
  );
}
