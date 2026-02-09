"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "@/components/header";

const links = [
  { name: "Главная", href: "/" },
  { name: "Добавить абитуриентов", href: "/upload" },
  { name: "Список абитуриентов", href: "/applicants" },
  { name: "Конкурсные списки", href: "/lists" },
  { name: "Статистика", href: "/statistics" },
];

export default function MenuPage() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <section className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-[#0e7490] mb-6 text-center">Меню</h2>
          <nav>
            <ul className="flex flex-wrap justify-center gap-3">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`px-6 py-3 rounded-lg text-sm font-medium transition-all inline-block ${
                      pathname === link.href
                        ? "bg-[#0891b2] text-white shadow-md"
                        : "bg-cyan-100 text-[#0891b2] hover:bg-cyan-200"
                    }`}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>
      </main>

    </div>
  );
}
