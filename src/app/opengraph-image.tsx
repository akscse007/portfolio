import { ogImage, OG_SIZE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Akash Roy — Digital Lab. I build systems. I study patterns.';

export default function Image() {
  return ogImage({
    kicker: 'Kolkata, India · AI Engineer · Full-Stack Developer',
    title: 'I build systems. I study patterns.',
    footer: 'Mathematics → intelligent software',
  });
}
