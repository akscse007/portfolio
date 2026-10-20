import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/ui/primitives';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of use',
  description: 'Terms for using this website and its content.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <>
      <PageHero label="Legal" title="Terms" intro="Plain terms for a personal website." />
      <div className="container-page pb-section">
        <div className="article">
          <h2>Content</h2>
          <p>
            Articles, code samples, diagrams and visualisations on this site are written by Akash
            Roy unless stated otherwise. You are welcome to quote short excerpts with attribution
            and a link. Code snippets in the notes may be used freely in your own projects.
          </p>
          <h2>Certificates and personal records</h2>
          <p>
            Certificates, award photographs and documents are shown to evidence the owner&rsquo;s
            own achievements. They may not be copied, altered or re-used to represent anyone else.
          </p>
          <h2>No warranty</h2>
          <p>
            Educational material is provided as-is for learning. Research summaries are deliberately
            high-level and are not a substitute for the original sources. Project demonstrations may
            use simulated data where stated.
          </p>
          <h2>Third-party links</h2>
          <p>
            External links and embedded players are provided for convenience; their content and
            policies belong to their owners.
          </p>
          <h2>Acceptable use</h2>
          <p>
            Do not attempt to disrupt the site, access private areas, or submit spam or abusive
            content through the contact form.
          </p>
        </div>
      </div>
    </>
  );
}
