import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "mapbox-gl/dist/mapbox-gl.css";
import SocketBridge from "@/components/SocketBridge";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className={`${workSans.className} antialiased`}>
        {children}
        <SocketBridge />
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
