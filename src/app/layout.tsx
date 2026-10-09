import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mobile News Bureau",
  description: "Capture, transcribe, and package reporting content.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Link
          href="/capture"
          aria-label="Quick capture"
          title="Quick capture — no project needed"
          className="fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-full bg-mint text-ground shadow-lg shadow-black/40 hover:brightness-110"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </body>
    </html>
  );
}
