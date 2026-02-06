import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { UserSyncProvider } from "@/components/providers/UserSyncProvider";
import { BuilderProvider } from "@/components/builder";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RigForgeBD - Plan. Compare. Build.",
  description: "The ultimate PC building platform tailored for Bangladesh. Compare prices from local retailers, check compatibility, and share your builds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <UserSyncProvider>
              <BuilderProvider>
                {children}
                <Toaster richColors position="bottom-right" />
              </BuilderProvider>
            </UserSyncProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}


