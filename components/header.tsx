"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { name: "Главная", href: "/" },
  { name: "Анализ поступления", href: "/admission" },
  { name: "Конкурсные списки", href: "/lists" },
  { name: "Добавить абитуриентов", href: "/upload" },
  { name: "Список абитуриентов", href: "/applicants" },
  { name: "Статистика", href: "/statistics" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="py-5 text-center border-b border-white/20">
          <h1 className="text-2xl font-bold tracking-wide">Приемная комиссия</h1>
          <p className="text-cyan-100 text-sm mt-1">Приёмная кампания</p>
        </div>
        <nav className="py-3 flex flex-wrap justify-center items-center gap-2">
          {pathname !== "/" && (
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 rounded-md text-sm font-medium bg-white/10 hover:bg-white/20 text-white"
            >
              ← Назад
            </button>
          )}
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                pathname === link.href
                  ? "bg-white text-[#0891b2] shadow-md"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
