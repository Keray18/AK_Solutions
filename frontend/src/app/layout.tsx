import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Providers from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SkinAI — AI-Powered Skincare Decisions',
    template: '%s | SkinAI',
  },
  description:
    'Understand your skin, evaluate your routine, and make informed skincare decisions with AI-powered analysis and ingredient intelligence.',
  keywords: [
    'skincare',
    'AI skincare',
    'skin analysis',
    'skincare routine',
    'ingredient analysis',
    'product comparison',
  ],
  authors: [{ name: 'SkinAI' }],
  openGraph: {
    title: 'SkinAI — AI-Powered Skincare Decisions',
    description:
      'Understand your skin, evaluate your routine, and make informed skincare decisions.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'SkinAI',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
