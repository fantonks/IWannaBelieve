"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { programToShortCode } from "@/lib/utils";

type Stats = {
  total: number;
  sSoglasiem: number;
  sredniyBall: number;
  maxBall: number;
  minBall: number;
  prioritet1: number;
  prioritet2: number;
  prioritet3: number;
};

type Applicant = { id: number; fio: string; summa: number; soglasie: boolean; prioritet: number; program: string };

const BALL_GROUPS = [
  { label: "0–120", min: 0, max: 120 },
  { label: "121–180", min: 121, max: 180 },
  { label: "181–240", min: 181, max: 240 },
  { label: "241–300", min: 241, max: 300 },
];

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [list, setList] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"fio" | "summa" | "prioritet" | "program">("summa");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterBy, setFilterBy] = useState<{ program: string; soglasie: string }>({ program: "all", soglasie: "all" });

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/stats/home").then((r) => r.json()),
      fetch("/api/applicants").then((r) => r.json()),
    ])
      .then(([s, a]) => {
        if (s.data) setStats(s.data);
        if (a.data) setList(a.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Фильтрация
  const filtered = list.filter((a) => {
    if (filterBy.program !== "all" && a.program !== filterBy.program) return false;
    if (filterBy.soglasie === "yes" && !a.soglasie) return false;
    if (filterBy.soglasie === "no" && a.soglasie) return false;
    return true;
  });

  // Сортировка
  const sorted = [...filtered].sort((a, b) => {
    let v = 0;
    if (sortBy === "summa") {
      v = a.summa - b.summa;
    } else if (sortBy === "fio") {
      v = a.fio.localeCompare(b.fio);
    } else if (sortBy === "prioritet") {
      v = a.prioritet - b.prioritet;
    } else if (sortBy === "program") {
      v = (a.program || "").localeCompare(b.program || "");
    }
    return sortOrder === "asc" ? v : -v;
  });

  const countInRange = (min: number, max: number) =>
    filtered.filter((a) => a.summa >= min && a.summa <= max).length;
  const maxCount = Math.max(...BALL_GROUPS.map((g) => countInRange(g.min, g.max)), 1);
  const top5 = [...sorted].slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
        <h2 className="text-2xl font-bold text-[#0e7490] mb-4 text-center">Статистика</h2>
        <p className="text-gray-600 text-center mb-6">
          <Link href="/upload" className="text-[#0891b2] hover:underline">Добавить абитуриентов</Link>
        </p>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Загрузка…</div>
        ) : !stats ? (
          <div className="text-center text-gray-500 py-8">
            Нет данных. <Link href="/upload" className="text-[#0891b2] hover:underline">Добавить абитуриентов</Link>.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[#0e7490]">Сводка</h3>
                <div className="flex gap-3">
                  <select
                    value={filterBy.program}
                    onChange={(e) => setFilterBy({ ...filterBy, program: e.target.value })}
                    className="border border-slate-300 rounded-lg px-3 py-1 text-sm"
                  >
                    <option value="all">Все программы</option>
                    <option value="09.03.01 Информатика и вычислительная техника">09.03.01</option>
                    <option value="09.03.02 Информационные системы и технологии">09.03.02</option>
                    <option value="09.03.03 Прикладная информатика">09.03.03</option>
                    <option value="09.03.04 Программная инженерия">09.03.04</option>
                  </select>
                  <select
                    value={filterBy.soglasie}
                    onChange={(e) => setFilterBy({ ...filterBy, soglasie: e.target.value })}
                    className="border border-slate-300 rounded-lg px-3 py-1 text-sm"
                  >
                    <option value="all">Все</option>
                    <option value="yes">С согласием</option>
                    <option value="no">Без согласия</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-cyan-50 p-4 rounded-lg text-center border border-cyan-100">
                  <div className="text-2xl font-bold text-[#0891b2]">{stats.total}</div>
                  <div className="text-sm text-gray-600">всего</div>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg text-center border border-cyan-100">
                  <div className="text-2xl font-bold text-[#0891b2]">{stats.sSoglasiem}</div>
                  <div className="text-sm text-gray-600">с согласием</div>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg text-center border border-cyan-100">
                  <div className="text-2xl font-bold text-[#0891b2]">{stats.sredniyBall}</div>
                  <div className="text-sm text-gray-600">средний балл</div>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg text-center border border-cyan-100">
                  <div className="text-2xl font-bold text-green-600">{stats.maxBall}</div>
                  <div className="text-sm text-gray-600">макс. балл</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-bold text-[#0e7490] mb-4">Распределение по баллам</h3>
              <div className="space-y-3">
                {BALL_GROUPS.map((g) => {
                  const c = countInRange(g.min, g.max);
                  const w = (c / maxCount) * 100;
                  return (
                    <div key={g.label} className="flex items-center gap-3">
                      <div className="w-16 text-sm text-gray-600 text-right">{g.label}</div>
                      <div className="flex-1 bg-gray-200 rounded h-5 overflow-hidden">
                        <div className="bg-[#0891b2] h-full rounded" style={{ width: `${w}%` }} />
                      </div>
                      <div className="w-8 text-sm font-medium">{c}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-bold text-[#0e7490] mb-4">По приоритетам</h3>
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Приоритет</th>
                    <th className="px-4 py-2 text-center">Кол-во</th>
                    <th className="px-4 py-2 text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((p) => {
                    const n = stats[`prioritet${p}` as keyof Stats] as number;
                    return (
                      <tr key={p} className="border-t border-slate-200">
                        <td className="px-4 py-2">{p}</td>
                        <td className="px-4 py-2 text-center font-bold">{n}</td>
                        <td className="px-4 py-2 text-center">{stats.total ? Math.round((n / stats.total) * 100) : 0}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-[#0e7490] mb-4">Детальный список абитуриентов</h3>
              <div className="mb-4 text-sm text-gray-600">
                Всего отфильтровано: <strong>{filtered.length}</strong> из {list.length}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left cursor-pointer hover:bg-slate-200" onClick={() => toggleSort("fio")}>
                        ФИО {sortBy === "fio" && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-200" onClick={() => toggleSort("summa")}>
                        Балл {sortBy === "summa" && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-200" onClick={() => toggleSort("prioritet")}>
                        Приоритет {sortBy === "prioritet" && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-200" onClick={() => toggleSort("program")}>
                        Программа {sortBy === "program" && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-2 text-center">Согласие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Нет данных по выбранным фильтрам
                        </td>
                      </tr>
                    ) : (
                      sorted.map((a, i) => (
                        <tr key={a.id} className="border-t border-slate-200">
                          <td className="px-4 py-2 font-bold text-[#0891b2]">{i + 1}</td>
                          <td className="px-4 py-2">{a.fio}</td>
                          <td className="px-4 py-2 text-center font-bold">{a.summa}</td>
                          <td className="px-4 py-2 text-center">{a.prioritet}</td>
                          <td className="px-4 py-2 text-center text-sm">{programToShortCode(a.program) || "—"}</td>
                          <td className="px-4 py-2 text-center">{a.soglasie ? "да" : "нет"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

    </div>
  );
}
