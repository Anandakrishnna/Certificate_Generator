import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CertifyFlow | Automated Certificate Generation & Distribution",
  description:
    "Bulk-generate personalized certificates and automatically email them to participants with real-time tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@600;700;800&family=Dancing+Script:wght@600;700&family=Great+Vibes&family=Montserrat:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
