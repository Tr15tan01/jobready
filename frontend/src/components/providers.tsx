"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </NextThemeProvider>
    </AuthProvider>
  );
}
