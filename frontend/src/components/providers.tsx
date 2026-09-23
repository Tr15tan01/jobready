"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { applyFontSize, loadFontSize } from "@/lib/font-size";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => applyFontSize(loadFontSize()), []);

  return (
    <AuthProvider>
      <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </NextThemeProvider>
    </AuthProvider>
  );
}
