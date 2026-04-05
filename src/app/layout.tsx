import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthUserBar } from "@/components/auth/AuthUserBar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeInitScript = `(function(){try{var t=localStorage.getItem('biblio-theme');var d=document.documentElement;if(t==='dark'){d.classList.add('dark');}else if(t==='light'){d.classList.remove('dark');}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark');}else{d.classList.remove('dark');}d.style.colorScheme=d.classList.contains('dark')?'dark':'light';}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "Biblio",
    template: "%s – Biblio",
  },
  description: "Bible reader with verse tools, AI context, and optional Amplified text.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <div className="pointer-events-none fixed right-0 top-0 z-50 flex justify-end gap-2 p-3">
            <div className="pointer-events-auto flex items-start gap-2 pt-0.5">
              <AuthUserBar />
            </div>
            <div className="pointer-events-auto">
              <ThemeToggle />
            </div>
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
