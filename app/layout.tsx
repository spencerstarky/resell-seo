import Script from 'next/script';
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ResellSEO | eBay Title Optimizer",
  description: "Optimize your eBay listings with AI to boost visibility and sales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.variable}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-H0T4S9X7KD"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-H0T4S9X7KD');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
