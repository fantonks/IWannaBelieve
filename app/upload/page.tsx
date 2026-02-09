"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { PROGRAMS } from "@/lib/constants";

const CSV_HEADERS = "ФИО;Математика;Русский язык;Информатика;Приоритет;Согласие;Образовательная программа";
const CSV_EXAMPLE = "Иванов Иван Иванович;85;78;92;1;да;09.03.01 Информатика и вычислительная техника";

export default function UploadPage() {
  const [mode, setMode] = useState<"one" | "list" | "file">("one");
  const [fio, setFio] = useState("");
  const [mat, setMat] = useState("");
  const [rus, setRus] = useState("");
  const [inf, setInf] = useState("");
  const [prior, setPrior] = useState(1);
  const [soglasie, setSoglasie] = useState(false);
  const [program, setProgram] = useState("");
  const [listText, setListText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [autoPriority, setAutoPriority] = useState(true);
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [randomizeResult, setRandomizeResult] = useState<{ ok: boolean; text: string } | null>(null);

  const sendOne = useCallback(async () => {
    if (!fio.trim()) {
      setMessage({ ok: false, text: "Введите ФИО." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fio: fio.trim(),
          matematika: Math.max(0, Math.min(100, parseInt(mat, 10) || 0)),
          russkiy: Math.max(0, Math.min(100, parseInt(rus, 10) || 0)),
          informatika: Math.max(0, Math.min(100, parseInt(inf, 10) || 0)),
          prioritet: prior,
          soglasie,
          program: program.trim(),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка");
      setMessage({ ok: true, text: "Абитуриент добавлен." });
      setFio("");
      setMat("");
      setRus("");
      setInf("");
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Ошибка" });
    } finally {
      setLoading(false);
    }
  }, [fio, mat, rus, inf, prior, soglasie, program]);

  const sendListOrFile = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("autoPriority", String(autoPriority));
      form.set("replace", String(replace));
      if (mode === "list" && listText.trim()) {
        form.set("list", listText.trim());
      } else if (mode === "file" && file) {
        form.set("file", file);
      } else {
        setMessage({ ok: false, text: mode === "list" ? "Вставьте список (CSV)." : "Выберите файл." });
        setLoading(false);
        return;
      }
      const res = await fetch("/api/applicants/upload", { method: "POST", body: form });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка");
      const errs = (j.errors || []).length;
      const parseErrs = (j.parseErrors || []).length;
      let text = `Добавлено: ${j.added}`;
      if (errs) text += `. Ошибок: ${errs}.`;
      if (parseErrs) text += ` Предупреждений разбора: ${parseErrs}.`;
      setMessage({ ok: true, text });
      if (mode === "list") setListText("");
      else setFile(null);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Ошибка" });
    } finally {
      setLoading(false);
    }
  }, [mode, listText, file, autoPriority, replace]);

  const downloadTemplate = useCallback(() => {
    const blob = new Blob(["\uFEFF" + [CSV_HEADERS, CSV_EXAMPLE].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "shablon.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const downloadExcel = useCallback(() => {
    window.open("/api/applicants/export", "_blank");
  }, []);

  const clearAll = useCallback(async () => {
    if (!confirm("Удалить всех абитуриентов?")) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/applicants/clear", { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка");
      setMessage({ ok: true, text: "Список очищен." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Ошибка" });
    } finally {
      setLoading(false);
    }
  }, []);

  const runRandomize = useCallback(async () => {
    setLoading(true);
    setRandomizeResult(null);
    try {
      const res = await fetch("/api/applicants/randomize", { method: "POST" });
      let j: { added?: number; total?: number; error?: string; errors?: string[] } = {};
      try {
        const text = await res.text();
        if (text) j = JSON.parse(text);
      } catch {
        setRandomizeResult({ ok: false, text: `Ответ сервера: ${res.status}. Проверьте консоль (F12).` });
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setRandomizeResult({ ok: false, text: j.error || `Ошибка ${res.status}` });
        setLoading(false);
        return;
      }
      const errs = (j.errors || []).length;
      let msg = `Добавлено в БД: ${j.added ?? 0} абитуриентов (сгенерировано: ${j.total ?? 0}).`;
      if (errs) {
        msg += ` Ошибок при записи: ${errs}.`;
        if (j.firstError) msg += ` Пример: ${j.firstError}`;
      }
      setRandomizeResult({ ok: errs === 0, text: msg });
    } catch (e) {
      setRandomizeResult({ ok: false, text: e instanceof Error ? e.message : "Ошибка сети или сервера" });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        <h2 className="text-2xl font-bold text-[#0e7490] mb-4">Добавить абитуриентов</h2>
        <p className="text-gray-600 mb-6">
          По одному, списком (CSV) или файлом (CSV/Excel). Данные хранятся в общей базе — все
          устройства видят одно и то же.
        </p>

        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-[#0e7490] mb-2">Рандомайзер</h3>
          <p className="text-sm text-gray-600 mb-3">
            Сгенерировать 400–600 случайных абитуриентов с ФИО и баллами. Заносятся в БД так же, как при ручном вводе.
          </p>
          <button
            type="button"
            onClick={runRandomize}
            disabled={loading}
            className="px-4 py-2 bg-[#0891b2] text-white rounded-lg hover:bg-[#0e7490] disabled:opacity-50 font-medium"
          >
            {loading ? "Генерация…" : "Сгенерировать 400–600 абитуриентов"}
          </button>
          {randomizeResult && (
            <div className={`mt-3 rounded-lg border p-3 text-sm ${randomizeResult.ok ? "bg-green-50 border-green-300 text-green-800" : "bg-amber-50 border-amber-300 text-amber-800"}`}>
              {randomizeResult.text}
              {randomizeResult.ok && (
                <p className="mt-2">
                  <Link href="/applicants" className="text-[#0891b2] font-medium hover:underline">Перейти к списку абитуриентов →</Link>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 mb-4 border-b border-slate-200">
          {(["one", "list", "file"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-2 font-medium rounded-t-lg ${
                mode === m ? "bg-[#0891b2] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {m === "one" ? "Вручную" : m === "list" ? "Списком" : "Файлом"}
            </button>
          ))}
        </div>

        {mode === "one" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                <input
                  type="text"
                  value={fio}
                  onChange={(e) => setFio(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Математика</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={mat}
                    onChange={(e) => setMat(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Русский</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rus}
                    onChange={(e) => setRus(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Информатика</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={inf}
                    onChange={(e) => setInf(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={prior}
                    onChange={(e) => setPrior(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-8">
                  <input
                    type="checkbox"
                    checked={soglasie}
                    onChange={(e) => setSoglasie(e.target.checked)}
                    className="accent-[#0891b2]"
                  />
                  <span className="text-sm">Согласие на зачисление</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Программа</label>
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                >
                  <option value="">—</option>
                  {PROGRAMS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={sendOne}
                disabled={loading}
                className="bg-[#0891b2] text-white px-6 py-2 rounded-lg hover:bg-[#0e7490] disabled:opacity-50 font-medium"
              >
                {loading ? "Отправка…" : "Добавить"}
              </button>
            </div>
          </div>
        )}

        {mode === "list" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Вставьте CSV (заголовок + строки). Колонки: ФИО;Математика;Русский язык;Информатика;Приоритет;Согласие;Программа.
              Разделитель — <kbd className="px-1 bg-slate-100 rounded">;</kbd> или <kbd className="px-1 bg-slate-100 rounded">,</kbd>.
            </p>
            <textarea
              value={listText}
              onChange={(e) => setListText(e.target.value)}
              rows={8}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 font-mono text-sm"
              placeholder={[CSV_HEADERS, CSV_EXAMPLE].join("\n")}
            />
            <div className="flex flex-wrap gap-4 mt-4">
              <button type="button" onClick={downloadTemplate} className="text-[#0891b2] hover:underline font-medium">
                Скачать шаблон
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPriority}
                  onChange={(e) => setAutoPriority(e.target.checked)}
                  className="accent-[#0891b2]"
                />
                <span className="text-sm">Авто-приоритет по баллам</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                  className="accent-[#0891b2]"
                />
                <span className="text-sm">Заменить всех</span>
              </label>
              <button
                type="button"
                onClick={sendListOrFile}
                disabled={loading || !listText.trim()}
                className="bg-[#0891b2] text-white px-6 py-2 rounded-lg hover:bg-[#0e7490] disabled:opacity-50 font-medium"
              >
                {loading ? "Загрузка…" : "Добавить из списка"}
              </button>
            </div>
          </div>
        )}

        {mode === "file" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <p className="text-sm text-gray-600 mb-4">
              CSV или Excel (.xlsx, .xls). Те же колонки, что в шаблоне. Файл добавляется в общую базу.
            </p>
            <label className="cursor-pointer inline-block">
              <span className="bg-[#0891b2] text-white px-4 py-2 rounded-lg hover:bg-[#0e7490] font-medium inline-block">
                Выбрать файл
              </span>
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="sr-only"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setMessage(null); }}
              />
            </label>
            {file && <span className="ml-3 text-sm text-gray-600">{file.name}</span>}
            <div className="flex flex-wrap gap-4 mt-4">
              <button type="button" onClick={downloadTemplate} className="text-[#0891b2] hover:underline font-medium">
                Скачать шаблон CSV
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPriority}
                  onChange={(e) => setAutoPriority(e.target.checked)}
                  className="accent-[#0891b2]"
                />
                <span className="text-sm">Авто-приоритет по баллам</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                  className="accent-[#0891b2]"
                />
                <span className="text-sm">Заменить всех</span>
              </label>
              <button
                type="button"
                onClick={sendListOrFile}
                disabled={loading || !file}
                className="bg-[#0891b2] text-white px-6 py-2 rounded-lg hover:bg-[#0e7490] disabled:opacity-50 font-medium"
              >
                {loading ? "Загрузка…" : "Загрузить в базу"}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`rounded-xl border p-4 mb-6 ${
              message.ok ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-6">
          <button type="button" onClick={downloadExcel} className="text-[#0891b2] hover:underline font-medium">
            Экспорт в Excel
          </button>
          <button type="button" onClick={clearAll} className="text-red-600 hover:underline font-medium">
            Очистить базу
          </button>
        </div>
      </main>

    </div>
  );
}
