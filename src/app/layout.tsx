import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from '@/components/NavBar'
import { Toaster } from 'sonner'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Library Management System",
  description: "Secure access for staff and borrowers",
  applicationName: "LMS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LMS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

import { PowerSyncProvider } from '@/lib/powersync/PowerSyncProvider';
import SyncStatusBadge from '@/components/SyncStatusBadge';
import SyncErrorBanner from '@/components/SyncErrorBanner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-indigo-500/30 font-sans`}
      >
        <PowerSyncProvider>
          <SyncErrorBanner />
          <NavBar />
          {children}
          <SyncStatusBadge />
        </PowerSyncProvider>
        <Toaster position="bottom-center" richColors theme="light" />
      </body>
    </html>
  );
}
