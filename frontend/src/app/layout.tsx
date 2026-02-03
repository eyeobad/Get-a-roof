import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
});

export const metadata: Metadata = {
  title: "Get a Roof",
  description: "Mobile-first matchmaking for tenants and landlords",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${workSans.className} antialiased`}>
        {children}
        <Toaster
          richColors
          position="bottom-center"
          closeButton
          expand
          toastOptions={{ duration: 5000 }}
        />
      </body>
    </html>
  );
}
