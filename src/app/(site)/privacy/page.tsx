import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/ui/primitives';
import { getProfile } from '@/server/repos/public';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy notice',
  description: 'How this website handles personal data.',
  path: '/privacy',
});

export default async function PrivacyPage() {
  const profile = await getProfile();
  return (
    <>
      <PageHero
        label="Legal"
        title="Privacy"
        intro="Short version: no tracking, no advertising, and messages you send are used only to reply."
      />
      <div className="container-page pb-section">
        <div className="article">
          <h2>What is collected</h2>
          <ul>
            <li>
              <strong>Contact form.</strong> Your name, email address, subject and message are
              stored in the site database so I can reply. A salted, one-way hash of your IP address
              and your browser&rsquo;s user-agent string are stored to prevent abuse and spam. If
              email delivery is configured, a copy of the message is forwarded to my inbox.
            </li>
            <li>
              <strong>Server logs.</strong> The hosting provider may keep standard request logs (IP
              address, time, requested page) for security and reliability.
            </li>
            <li>
              <strong>Your theme preference</strong> (dark/light) is saved in your browser&rsquo;s
              local storage. It never leaves your device.
            </li>
          </ul>
          <h2>What is not collected</h2>
          <p>
            This site uses no analytics trackers, advertising, fingerprinting or third-party
            cookies. Embedded videos from YouTube or Vimeo load only after you press play, using
            YouTube&rsquo;s privacy-enhanced (no-cookie) domain or Vimeo&rsquo;s do-not-track mode.
            Once loaded, those players are governed by their providers&rsquo; privacy policies.
          </p>
          <h2>Retention</h2>
          <p>
            Contact messages are kept only as long as needed to handle the conversation, then
            deleted or archived.
          </p>
          <h2>Your rights</h2>
          <p>
            You can ask for a copy of, or the deletion of, any message you have sent
            {profile?.email ? (
              <>
                {' '}
                by writing to <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </>
            ) : (
              ' through the contact form'
            )}
            .
          </p>
          <h2>Certificates and documents</h2>
          <p>
            Certificate images and documents are published only after the owner reviews them.
            Personal identifiers that are not needed to understand an achievement are kept private
            or redacted.
          </p>
        </div>
      </div>
    </>
  );
}
