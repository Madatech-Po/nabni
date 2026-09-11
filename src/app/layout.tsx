import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nabni - Foundation Teachers",
  description: "Connect with the best foundation teachers in Egypt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
