"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { LIST_DATES, PROGRAMS } from "@/lib/constants";
import { formatFioShort } from "@/lib/utils";

const DATE_TO_PROGRAM = Object.fromEntries(
  PROGRAMS.map((p) => [p.commission_date, { code: p.code, name: p.name }])
);

type ListEntry = {
  applicant_id: number;
  fio?: string | null;
  program_code: string;
  program_name: string;
  list_date: string;
  consent: boolean;
  priority: number;
  ball_physics_ict: number;
  ball_russian: number;
  ball_math: number;
  ball_achievements: number;
  sum_balls: number;
};

function ListsPageContent() {
  const searchParams = useSearchParams();
  const urlProgram = searchParams.get("program") || "";
  const urlDate = searchParams.get("date") || "";
  const [lists, setLists] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(urlDate || "all");
  const [selectedProgram, setSelectedProgram] = useState<string>(urlProgram);
  const [sortBy, setSortBy] = useState<"date" | "program" | "sum_balls" | "priority">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [uploadMessage, setUploadMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchLists = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedProgram) params.set("program", selectedProgram);
    if (selectedDate !== "all") params.set("date", selectedDate);
    fetch(`/api/lists?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setLists(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDate, selectedProgram]);

  useEffect(() => {
    if (urlDate) setSelectedDate(urlDate);
    if (urlProgram) setSelectedProgram(urlProgram);
  }, [urlDate, urlProgram]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const exportToExcel = useCallback((date?: string) => {
    const url = date ? `/api/lists/export?date=${encodeURIComponent(date)}` : "/api/lists/export";
    window.open(url, "_blank");
  }, []);

  // Группируем по программам
  const groupedByProgram = lists.reduce((acc, entry) => {
    if (!acc[entry.program_code]) {
      acc[entry.program_code] = {
        code: entry.program_code,
        name: entry.program_name,
        entries: [],
      };
    }
    acc[entry.program_code].entries.push(entry);
    return acc;
  }, {} as Record<string, { code: string; name: string; entries: ListEntry[] }>);

  // Сортируем программы
  const sortedPrograms = Object.values(groupedByProgram).sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  // Сортируем записи внутри каждой программы
  const sortedProgramsWithEntries = sortedPrograms.map((prog) => {
    const sorted = [...prog.entries].sort((a, b) => {
      let v = 0;
      if (sortBy === "date") {
        v = a.list_date.localeCompare(b.list_date);
      } else if (sortBy === "sum_balls") {
        v = a.sum_balls - b.sum_balls;
      } else if (sortBy === "priority") {
        v = a.priority - b.priority;
      } else {
        v = a.program_code.localeCompare(b.program_code);
      }
      return sortOrder === "asc" ? v : -v;
    });
    return { ...prog, entries: sorted };
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-[#0e7490]">Конкурсные списки</h2>
          <div className="flex gap-3 flex-wrap">
            <label className="px-4 py-2 bg-cyan-100 text-[#0891b2] rounded-lg hover:bg-cyan-200 transition-colors cursor-pointer">
              Загрузить Excel (листы ПМ_01.08…)
              <input
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploadMessage({ ok: false, text: "Загрузка…" });
                  try {
                    const fd = new FormData();
                    fd.set("file", f);
                    const r = await fetch("/api/lists/upload", { method: "POST", body: fd });
                    const j = await r.json();
                    if (r.ok) {
                      setUploadMessage({ ok: true, text: `Загружено за ${j.totalTimeMs} мс. Обновите страницу.` });
                      fetchLists();
                    } else setUploadMessage({ ok: false, text: j.error || "Ошибка" });
                  } catch {
                    setUploadMessage({ ok: false, text: "Ошибка сети" });
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Скачать Excel по датам:</span>
              {LIST_DATES.map((d, i) => (
                <button
                  key={d}
                  onClick={() => exportToExcel(d)}
                  className="px-3 py-2 bg-[#0891b2] text-white rounded-lg hover:bg-[#0e7490] transition-colors text-sm"
                  title={`Списки на ${i + 1} августа`}
                >
                  {i + 1} число
                </button>
              ))}
              <button
                onClick={() => exportToExcel()}
                className="px-3 py-2 bg-cyan-100 text-[#0891b2] rounded-lg hover:bg-cyan-200 transition-colors text-sm"
              >
                Все даты
              </button>
            </div>
            <Link href="/upload" className="px-4 py-2 bg-slate-100 text-gray-700 rounded-lg hover:bg-slate-200 transition-colors">
              Добавить абитуриентов
            </Link>
          </div>
        </div>
        {uploadMessage && (
          <div className={`mb-4 p-3 rounded-lg ${uploadMessage.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
            {uploadMessage.text}
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">По дню зачисления (программа)</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {LIST_DATES.map((date, i) => {
              const prog = DATE_TO_PROGRAM[date];
              const label = prog ? `${i + 1} число — ${prog.code}` : `${i + 1} число`;
              const isActive = selectedDate === date && selectedProgram === (prog?.code ?? "");
              return (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedProgram(prog?.code ?? "");
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-[#0891b2] text-white" : "bg-slate-100 text-gray-700 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <button
              onClick={() => {
                setSelectedDate("all");
                setSelectedProgram("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedDate === "all" && !selectedProgram ? "bg-[#0891b2] text-white" : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              Все дни
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ОП</label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              >
                <option value="">Все</option>
                {PROGRAMS.map((p) => (
                  <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Дата</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
              >
                <option value="all">Все даты</option>
                {LIST_DATES.map((date, i) => {
                  const prog = DATE_TO_PROGRAM[date];
                  return (
                    <option key={date} value={date}>
                      {i + 1} число {prog ? `(${prog.code})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Сортировка</label>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSort("date")}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    sortBy === "date"
                      ? "bg-[#0891b2] text-white"
                      : "bg-slate-100 text-gray-700 hover:bg-slate-200"
                  }`}
                >
                  По дате {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => toggleSort("sum_balls")}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    sortBy === "sum_balls"
                      ? "bg-[#0891b2] text-white"
                      : "bg-slate-100 text-gray-700 hover:bg-slate-200"
                  }`}
                >
                  По баллам {sortBy === "sum_balls" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => toggleSort("priority")}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    sortBy === "priority"
                      ? "bg-[#0891b2] text-white"
                      : "bg-slate-100 text-gray-700 hover:bg-slate-200"
                  }`}
                >
                  По приоритету {sortBy === "priority" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Загрузка…</div>
        ) : sortedProgramsWithEntries.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Нет данных. <Link href="/upload" className="text-[#0891b2] hover:underline">Загрузить списки</Link>.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedProgramsWithEntries.map((prog) => (
              <div key={prog.code} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-[#0891b2] text-white px-6 py-3">
                  <h3 className="text-lg font-bold">{prog.code}</h3>
                  <p className="text-sm opacity-90">Всего записей: {prog.entries.length}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">ФИО</th>
                        <th className="px-3 py-2 text-left cursor-pointer hover:bg-slate-200" onClick={() => toggleSort("date")}>
                          Дата {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="px-3 py-2 text-center">Согласие</th>
                        <th className="px-3 py-2 text-center cursor-pointer hover:bg-slate-200" onClick={() => toggleSort("priority")}>
                          Приоритет {sortBy === "priority" && (sortOrder === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="px-3 py-2 text-center">Физ/ИКТ</th>
                        <th className="px-3 py-2 text-center">Русский</th>
                        <th className="px-3 py-2 text-center">Математика</th>
                        <th className="px-3 py-2 text-center">Достижения</th>
                        <th className="px-3 py-2 text-center cursor-pointer hover:bg-slate-200" onClick={() => toggleSort("sum_balls")}>
                          Сумма {sortBy === "sum_balls" && (sortOrder === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="px-3 py-2 text-right text-gray-500">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prog.entries.map((entry, i) => (
                        <tr key={`${entry.program_code}-${entry.list_date}-${entry.applicant_id}`} className={i % 2 ? "bg-slate-50" : ""}>
                          <td className="px-3 py-2">{formatFioShort(entry.fio)}</td>
                          <td className="px-3 py-2">
                            {new Date(entry.list_date).toLocaleDateString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </td>
                          <td className="px-3 py-2 text-center">{entry.consent ? "да" : "нет"}</td>
                          <td className="px-3 py-2 text-center">{entry.priority}</td>
                          <td className="px-3 py-2 text-center">{entry.ball_physics_ict}</td>
                          <td className="px-3 py-2 text-center">{entry.ball_russian}</td>
                          <td className="px-3 py-2 text-center">{entry.ball_math}</td>
                          <td className="px-3 py-2 text-center">{entry.ball_achievements}</td>
                          <td className="px-3 py-2 text-center font-bold text-[#0891b2]">{entry.sum_balls}</td>
                          <td className="px-3 py-2 text-right text-gray-500 text-xs">{entry.applicant_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}

export default function ListsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
          <div className="text-center text-gray-500 py-12">Загрузка…</div>
        </main>
      </div>
    }>
      <ListsPageContent />
    </Suspense>
  );
}
