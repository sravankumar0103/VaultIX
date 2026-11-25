import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./ThemeContext";
import {
  DEFAULT_THEME_KEY,
  LEGACY_THEME_KEY,
  SESSION_THEME_KEY,
} from "@/lib/themePreferences";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VaultIX",
  description: "Private intelligent bookmark vault",
  icons: {
    icon: [
      { url: "/vaultix-icon.png", type: "image/png" },
    ],
    apple: "/vaultix-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const sessionTheme = sessionStorage.getItem('${SESSION_THEME_KEY}');
                  const storedDefaultTheme = localStorage.getItem('${DEFAULT_THEME_KEY}');
                  const legacyTheme = localStorage.getItem('${LEGACY_THEME_KEY}');
                  const defaultTheme = storedDefaultTheme === 'light' || storedDefaultTheme === 'dark'
                    ? storedDefaultTheme
                    : legacyTheme === 'light' || legacyTheme === 'dark'
                      ? legacyTheme
                      : 'dark';
                  const theme = sessionTheme === 'light' || sessionTheme === 'dark' ? sessionTheme : defaultTheme;

                  if (legacyTheme === 'light' || legacyTheme === 'dark') {
                    localStorage.setItem('${DEFAULT_THEME_KEY}', legacyTheme);
                    localStorage.removeItem('${LEGACY_THEME_KEY}');
                  }

                  document.documentElement.dataset.theme = theme;
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
