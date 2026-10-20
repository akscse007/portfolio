import { prisma } from '@/lib/db';
import { AdminHeader } from '@/components/admin/fields';
import { ProfileForm } from './ProfileForm';
import { PasswordForm } from './PasswordForm';

export const metadata = { title: 'Profile' };

export default async function AdminProfilePage() {
  const p = await prisma.profile.findUnique({
    where: { id: 'default' },
    include: { cvMedia: true, portrait: true },
  });
  return (
    <div className="grid gap-8">
      <AdminHeader
        title="Profile"
        description="Biography, links, CV and the hero availability indicator. Changes appear on the public site immediately."
      />
      <ProfileForm
        initial={{
          name: p?.name ?? '',
          headline: p?.headline ?? '',
          tagline: p?.tagline ?? 'I build systems. I study patterns.',
          subTagline: p?.subTagline ?? '',
          location: p?.location ?? 'Kolkata, India',
          timezone: p?.timezone ?? 'Asia/Kolkata',
          shortBio: p?.shortBio ?? '',
          bio: p?.bio ?? '',
          researchInterests: p?.researchInterests ?? [],
          email: p?.email ?? '',
          githubUrl: p?.githubUrl ?? '',
          linkedinUrl: p?.linkedinUrl ?? '',
          cv: p?.cvMedia ?? null,
          cvUrl: p?.cvUrl ?? '',
          portrait: p?.portrait ?? null,
          availabilityOn: p?.availabilityOn ?? false,
          availabilityLabel: p?.availabilityLabel ?? '',
          showClock: p?.showClock ?? true,
        }}
      />
      <PasswordForm />
    </div>
  );
}
