/** Константы приложения без зависимостей от Node/MySQL — можно импортировать на клиенте */

export const PROGRAMS = [
  { code: "ПМ", name: "Прикладная математика", budget_places: 40, commission_date: "2026-08-01" },
  { code: "ИВТ", name: "Информатика и вычислительная техника", budget_places: 50, commission_date: "2026-08-02" },
  { code: "ИТСС", name: "Инфокоммуникационные технологии и системы связи", budget_places: 30, commission_date: "2026-08-03" },
  { code: "ИБ", name: "Информационная безопасность", budget_places: 20, commission_date: "2026-08-04" },
] as const;

export const LIST_DATES = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"] as const;
