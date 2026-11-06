import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'DoodleGuess' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, interactiveWidget: 'resizes-content' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
