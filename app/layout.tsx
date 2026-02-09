import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Приемная комиссия — предпроф олимпиада",
  description: "Простое веб-приложение для работы со списком абитуриентов",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>{props.children}</body>
    </html>
  );
}
