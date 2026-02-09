"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { PROGRAMS } from "@/lib/constants";
import { programToShortCode } from "@/lib/utils";

type Applicant = {
  id: number;
  fio: string;
  matematika: number;
  russkiy: number;
  informatika: number;
  summa: number;
  prioritet: number;
  soglasie: boolean;
  program: string;
};

export default function ApplicantsPage() {
  const [list, setList] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"summa" | "fio" | "prioritet">("summa");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [programFilter, setProgramFilter] = useState<string>("all");

  const fetchList = useCallback(() => {
    fetch("/api/applicants")
      .then((r) => r.json())
      .then((j) => { if (j.data) setList(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const updateSoglasie = useCallback((id: number, soglasie: boolean) => {
    fetch(`/api/applicants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soglasie }),
    })
      .then((r) => r.ok && fetchList());
  }, [fetchList]);

  const deleteOne = useCallback((id: number, fio: string) => {
    if (!confirm(`Удалить ${fio}?`)) return;
    fetch(`/api/applicants/${id}`, { method: "DELETE" })
      .then((r) => r.ok && fetchList());
  }, [fetchList]);

  const filtered = list.filter((a) => programFilter === "all" || a.program === programFilter);
  const sorted = [...filtered].sort((a, b) => {
    let v = 0;
    if (sortBy === "summa") v = a.summa - b.summa;
    else if (sortBy === "fio") v = a.fio.localeCompare(b.fio);
    else v = a.prioritet - b.prioritet;
    return sortOrder === "desc" ? -v : v;
  });

  const toggleSort = (f: "summa" | "fio" | "prioritet") => {
    if (sortBy === f) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(f); setSortOrder("desc"); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        <h2 className="text-2xl font-bold text-[#0e7490] mb-4 text-center">Список абитуриентов</h2>
        <p className="text-gray-600 text-center mb-4 flex flex-wrap items-center justify-center gap-3">
          <Link href="/upload" className="text-[#0891b2] hover:underline">Добавить абитуриентов</Link>
          <a
            href="/api/applicants/export"
            download="applicants.xlsx"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0891b2] text-white hover:bg-[#0e7490] transition-colors"
          >
            Добавить в Excel по дням
          </a>
        </p>

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Программа</label>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="w-full max-w-md border border-slate-300 rounded-lg px-4 py-2"
          >
            <option value="all">Все</option>
            {PROGRAMS.map((p) => (
              <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Загрузка…</div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {list.length === 0 ? (
                <>Нет данных. <Link href="/upload" className="text-[#0891b2] hover:underline">Добавить абитуриентов</Link>.</>
              ) : (
                "Нет записей по выбранной программе."
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0891b2] text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-[#0e7490]" onClick={() => toggleSort("fio")}>
                      ФИО {sortBy === "fio" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-3 py-2 text-center">Мат</th>
                    <th className="px-3 py-2 text-center">Рус</th>
                    <th className="px-3 py-2 text-center">Инф</th>
                    <th className="px-3 py-2 text-center cursor-pointer hover:bg-[#0e7490]" onClick={() => toggleSort("summa")}>
                      Сумма {sortBy === "summa" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-3 py-2 text-center cursor-pointer hover:bg-[#0e7490]" onClick={() => toggleSort("prioritet")}>
                      Приор. {sortBy === "prioritet" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-3 py-2 text-center">Согласие</th>
                    <th className="px-3 py-2 text-center">Программа</th>
                    <th className="px-3 py-2 text-center">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((a, i) => (
                    <tr key={a.id} className={i % 2 ? "bg-slate-50" : ""}>
                      <td className="px-3 py-2 text-gray-600">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{a.fio}</td>
                      <td className="px-3 py-2 text-center">{a.matematika}</td>
                      <td className="px-3 py-2 text-center">{a.russkiy}</td>
                      <td className="px-3 py-2 text-center">{a.informatika}</td>
                      <td className="px-3 py-2 text-center font-bold text-[#0891b2]">{a.summa}</td>
                      <td className="px-3 py-2 text-center">{a.prioritet}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={a.soglasie}
                          onChange={(e) => updateSoglasie(a.id, e.target.checked)}
                          className="accent-[#0891b2]"
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{programToShortCode(a.program) || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => deleteOne(a.id, a.fio)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-gray-600">
          Всего: <strong>{list.length}</strong>
          {programFilter !== "all" && <> (по программе: <strong>{sorted.length}</strong>)</>}
        </p>
      </main>

    </div>
  );
}
