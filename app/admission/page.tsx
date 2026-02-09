"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { LIST_DATES } from "@/lib/constants";
import type { ProgramWithDate } from "@/lib/admission";

type PassingScore = {
  program_code: string;
  program_name: string;
  passing_score: number | "НЕДОБОР";
  enrolled_count: number;
  budget_places: number;
};

const DATE_LABELS: Record<string, string> = {
  "2026-08-01": "01.08",
  "2026-08-02": "02.08",
  "2026-08-03": "03.08",
  "2026-08-04": "04.08",
};

export default function AdmissionPage() {
  const [selectedDate, setSelectedDate] = useState(LIST_DATES[0]);
  const [scores, setScores] = useState<PassingScore[]>([]);
  const [programs, setPrograms] = useState<ProgramWithDate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admission/passing-scores?date=${selectedDate}`).then((r) => r.json()),
      fetch("/api/programs").then((r) => r.json()),
    ])
      .then(([scoresRes, programsRes]) => {
        if (scoresRes.data) setScores(scoresRes.data);
        if (programsRes.data) setPrograms(programsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDate]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        <h2 className="text-2xl font-bold text-[#0e7490] mb-4 text-center">
          Анализ поступления
        </h2>

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Дата приёмной кампании</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full max-w-xs border border-slate-300 rounded-lg px-4 py-2"
          >
            {LIST_DATES.map((d) => (
              <option key={d} value={d}>{DATE_LABELS[d] || d}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
          <div className="bg-[#0891b2] text-white px-6 py-3">
            <h3 className="text-lg font-bold">Проходные баллы</h3>
            <p className="text-sm opacity-90">Учитываются только абитуриенты с согласием</p>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-gray-500 py-4">Загрузка…</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2">ОП</th>
                    <th className="text-left py-2">Название</th>
                    <th className="text-center py-2">Мест</th>
                    <th className="text-center py-2">Зачислено</th>
                    <th className="text-center py-2 font-bold">Проходной балл</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s) => (
                    <tr key={s.program_code} className="border-b border-slate-100">
                      <td className="py-2 font-medium">{s.program_code}</td>
                      <td className="py-2 text-gray-600">{s.program_name}</td>
                      <td className="py-2 text-center">{s.budget_places}</td>
                      <td className="py-2 text-center">{s.enrolled_count}</td>
                      <td className="py-2 text-center font-bold text-[#0891b2]">
                        {s.passing_score === "НЕДОБОР" ? (
                          <span className="text-amber-600">НЕДОБОР</span>
                        ) : (
                          s.passing_score
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <Link
            href={`/lists?date=${selectedDate}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0891b2] text-white hover:bg-[#0e7490] transition-colors"
          >
            Конкурсные списки
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-100 text-[#0891b2] hover:bg-cyan-200 transition-colors"
          >
            Загрузить данные
          </Link>
          <a
            href="/api/applicants/export"
            download="applicants.xlsx"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
          >
            Excel по дням
          </a>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-bold text-[#0e7490] mb-2">Программы, места и даты комиссий</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {programs.length ? programs.map((p) => (
              <div key={p.code} className="bg-slate-50 rounded-lg p-3">
                <div className="font-medium">{p.code}</div>
                <div className="text-sm text-gray-600 truncate" title={p.name}>{p.name}</div>
                <div className="text-[#0891b2] font-bold">{p.budget_places} мест</div>
                {p.commission_date && (
                  <div className="text-xs text-gray-500 mt-1">Дата зачисления: {new Date(p.commission_date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</div>
                )}
                {p.commission_date && (
                  <Link href={`/lists?program=${p.code}&date=${p.commission_date}`} className="text-sm text-[#0891b2] hover:underline mt-1 inline-block">Список →</Link>
                )}
              </div>
            )) : (
              <div className="text-gray-500">Загрузка…</div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
