import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import TabBar from "@/components/TabBar";
import ThemeToggle from "@/components/ThemeToggle";
import { ThemeProvider, NO_FLASH_THEME_SCRIPT } from "@/components/ThemeProvider";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workout Tracker",
  description: "Personal workout tracker — strength, cardio, bodyweight, and calendar history.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Workout",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d1420",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${inter.variable} h-full`}>
      <head>
        {/* Sets data-theme on <html> before first paint, using the saved
            preference, so there's no flash of the wrong theme on load. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <ThemeProvider>
          <ThemeToggle />
          <div className="flex-1 overflow-y-auto pb-24">{children}</div>
          <TabBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
