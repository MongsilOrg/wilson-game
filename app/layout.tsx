import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/globals.css";
import { GameProvider } from "@/contexts/GameContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "윌슨게임",
  description: "윌슨게임입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="bg-background" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 테마 설정
                  const theme = localStorage.getItem('wilson-game-theme');
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const initialTheme = theme === 'dark' || theme === 'light' ? theme : systemTheme;
                  
                  // HTML 태그에 클래스 및 data attribute 설정
                  if (initialTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  document.documentElement.setAttribute('data-theme', initialTheme);
                  
                  // 볼륨 설정
                  const storedVolume = localStorage.getItem('wilson-game-volume');
                  const initialVolume = storedVolume !== null ? parseFloat(storedVolume) : 0.1;
                  const safeVolume = isNaN(initialVolume) || initialVolume < 0 || initialVolume > 1 ? 0.1 : initialVolume;
                  document.documentElement.setAttribute('data-volume', safeVolume.toString());
                  
                  // 닉네임 설정
                  const storedNickname = localStorage.getItem('playerNickname');
                  if (storedNickname) {
                    document.documentElement.setAttribute('data-nickname', storedNickname);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen text-foreground antialiased`}
      >
        <SessionProvider>
          <ThemeProvider>
            <GameProvider>
              <div className="relative min-h-screen">
                <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl">
                  <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/10" />
                  <div className="absolute right-0 top-24 h-64 w-64 rounded-full bg-info/10" />
                </div>
                <div className="relative">{children}</div>
              </div>
            </GameProvider>
          </ThemeProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}

