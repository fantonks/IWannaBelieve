"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import type { ProgramWithDate } from "@/lib/admission";

export default function Home() {
  const [programs, setPrograms] = useState<ProgramWithDate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/programs")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setPrograms(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <section className="bg-white rounded-xl shadow-md p-8 mb-8 border border-slate-200">
          <h2 className="text-3xl font-bold text-[#0e7490] mb-4">Приёмная кампания</h2>
          <p className="text-gray-600 mb-6 text-lg leading-relaxed">
            Конкурсные списки по ОП, проходные баллы, загрузка Excel. У каждой программы — своя дата проведения комиссии (зачисления).
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-md p-8 mb-8 border border-slate-200">
          <h3 className="text-2xl font-bold text-[#0e7490] mb-5">Программы и даты комиссий</h3>
          {loading ? (
            <p className="text-gray-500">Загрузка…</p>
          ) : programs.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {programs.map((p) => (
                <div key={p.code} className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                  <div className="font-bold text-[#0891b2]">{p.code}</div>
                  <div className="text-sm text-gray-600 truncate" title={p.name}>{p.name}</div>
                  <div className="mt-1">{p.budget_places} мест</div>
                  {p.commission_date && (
                    <div className="text-xs text-gray-500 mt-1">Дата зачисления: {new Date(p.commission_date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</div>
                  )}
                  {p.commission_date && (
                    <Link href={`/lists?program=${p.code}&date=${p.commission_date}`} className="inline-block mt-2 text-sm text-[#0891b2] hover:underline">Список →</Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Нет данных. Запустите инициализацию БД (npm run db:init).</p>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
          <h3 className="text-xl font-bold text-[#0e7490] mb-4">Действия</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/admission" className="px-4 py-2 bg-[#0891b2] text-white rounded-lg hover:bg-[#0e7490] transition-colors">Анализ поступления</Link>
            <Link href="/lists" className="px-4 py-2 bg-cyan-100 text-[#0891b2] rounded-lg hover:bg-cyan-200 transition-colors">Конкурсные списки</Link>
            <Link href="/upload" className="px-4 py-2 bg-slate-100 text-gray-700 rounded-lg hover:bg-slate-200 transition-colors">Добавить абитуриентов</Link>
            <Link href="/applicants" className="px-4 py-2 bg-slate-100 text-gray-700 rounded-lg hover:bg-slate-200 transition-colors">Список абитуриентов</Link>
            <Link href="/statistics" className="px-4 py-2 bg-slate-100 text-gray-700 rounded-lg hover:bg-slate-200 transition-colors">Статистика</Link>
          </div>
        </section>
      </main>

    </div>
  );
}
