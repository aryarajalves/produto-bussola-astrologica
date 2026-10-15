import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bússola Astrológica",
  description: "Leitura astrológica profunda e personalizada com Crassus Gobbi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
