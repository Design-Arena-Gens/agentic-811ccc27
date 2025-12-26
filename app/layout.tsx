import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ateliê Visual Conversacional",
  description:
    "Aplicativo estilo chat Gemini para criar imagens personalizadas consistentes a partir de mensagens."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
