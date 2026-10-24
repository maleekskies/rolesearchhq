import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to RoleSearchHQ with your email and password. Roles scored against your profile, nothing sends until you approve it.',
  alternates: {
    canonical: 'https://rolesearchhq.vercel.app/login',
  },
  openGraph: {
    type: 'website',
    siteName: 'RoleSearchHQ',
    title: 'RoleSearchHQ',
    description: 'Roles scored against your profile. Nothing sends until you say so.',
    url: 'https://rolesearchhq.vercel.app/login',
  },
  twitter: {
    card: 'summary',
    title: 'RoleSearchHQ',
    description: 'Roles scored against your profile. Nothing sends until you say so.',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
