import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./ThemeContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vaultix",
  description: "Private intelligent bookmark vault",
  icons: {
    icon: [
      { url: "/vaultix-icon.png", type: "image/png" },
      { url: "/vaultix-icon.svg", type: "image/svg+xml" },
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
                  const sessionTheme = sessionStorage.getItem('vaultix-session-theme');
                  const storedDefaultTheme = localStorage.getItem('vaultix-default-theme');
                  const legacyTheme = localStorage.getItem('vaultix-theme');
                  const defaultTheme = storedDefaultTheme === 'light' || storedDefaultTheme === 'dark'
                    ? storedDefaultTheme
                    : legacyTheme === 'light' || legacyTheme === 'dark'
                      ? legacyTheme
                      : 'dark';
                  const theme = sessionTheme === 'light' || sessionTheme === 'dark' ? sessionTheme : defaultTheme;

                  if (legacyTheme === 'light' || legacyTheme === 'dark') {
                    localStorage.setItem('vaultix-default-theme', legacyTheme);
                    localStorage.removeItem('vaultix-theme');
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
