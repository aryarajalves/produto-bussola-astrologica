import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bussola Astrologica",
  description: "Leitura astrológica profunda e personalizada por Andrieli Oliver.",
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
