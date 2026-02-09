// node scripts/seed-competitive-list.mjs — 100–200 абитуриентов в MySQL

import mysql from "mysql2/promise";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Загрузка .env.local из корня проекта
try {
  const dotenv = await import("dotenv");
  const envPath = join(root, ".env.local");
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
} catch (_) {}

const SURNAMES_M = ["Иванов", "Петров", "Сидоров", "Козлов", "Новиков", "Морозов", "Волков", "Соколов", "Лебедев", "Кузнецов", "Попов", "Васильев", "Смирнов", "Михайлов", "Федоров", "Андреев"];
const SURNAMES_F = ["Иванова", "Петрова", "Сидорова", "Козлова", "Новикова", "Морозова", "Волкова", "Соколова", "Лебедева", "Кузнецова", "Попова", "Васильева", "Смирнова", "Михайлова", "Федорова", "Андреева"];
const FIRST_M = ["Александр", "Дмитрий", "Максим", "Иван", "Артём", "Никита", "Михаил", "Егор", "Андрей", "Кирилл", "Илья", "Роман", "Сергей", "Владимир"];
const FIRST_F = ["Анастасия", "Мария", "Дарья", "Анна", "Елизавета", "Полина", "Виктория", "Екатерина", "Александра", "София", "Валерия", "Ксения", "Вероника", "Алина"];
const PATRONYMICS_M = ["Александрович", "Дмитриевич", "Иванович", "Михайлович", "Сергеевич", "Андреевич", "Артёмович", "Никитич", "Егорович", "Кириллович", "Романович", "Владимирович"];
const PATRONYMICS_F = ["Александровна", "Дмитриевна", "Ивановна", "Михайловна", "Сергеевна", "Андреевна", "Артёмовна", "Никитична", "Егоровна", "Кирилловна", "Романовна", "Владимировна"];

const CODES = ["ПМ", "ИВТ", "ИТСС", "ИБ"];
const DATES = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"];
const MIN_PER_PROGRAM = 100;
const MAX_PER_PROGRAM = 150;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFio() {
  const isMale = Math.random() < 0.5;
  const last = isMale ? pick(SURNAMES_M) : pick(SURNAMES_F);
  const first = isMale ? pick(FIRST_M) : pick(FIRST_F);
  const pat = isMale ? pick(PATRONYMICS_M) : pick(PATRONYMICS_F);
  return `${last} ${first} ${pat}`;
}

async function main() {
  console.log("Подключение к MySQL...");
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "admission_analysis",
    charset: "utf8mb4",
  });

  console.log("Загрузка программ из БД...");
  const [progRows] = await conn.query("SELECT id, code FROM programs");
  const programIdByCode = Object.fromEntries(progRows.map((r) => [r.code, r.id]));

  if (Object.keys(programIdByCode).length === 0) {
    console.error("В таблице programs нет записей. Выполните: npm run db:init");
    await conn.end();
    process.exit(1);
  }

  console.log("Очистка старых данных...");
  await conn.query("DELETE FROM competitive_list_entries");
  await conn.query("DELETE FROM list_applicants");

  const n = MIN_PER_PROGRAM + Math.floor(Math.random() * (MAX_PER_PROGRAM - MIN_PER_PROGRAM + 1));
  const applicantIds = new Set();
  while (applicantIds.size < n) {
    applicantIds.add(1000 + Math.floor(Math.random() * 9000));
  }
  const ids = [...applicantIds];

  console.log("Добавление " + ids.length + " абитуриентов в list_applicants...");
  for (const id of ids) {
    await conn.query(
      "INSERT INTO list_applicants (applicant_id, fio) VALUES (?, ?)",
      [id, randomFio()]
    );
  }

  console.log("Заполнение competitive_list_entries...");
  for (const code of CODES) {
    const programId = programIdByCode[code];
    if (!programId) continue;
    let prev = [...ids];
    for (const listDate of DATES) {
      const toRemove = Math.min(Math.floor(prev.length * 0.08), prev.length - 1);
      const toAdd = Math.max(1, Math.floor(prev.length * 0.12));
      const next = new Set(prev);
      for (let i = 0; i < toRemove && next.size > 1; i++) {
        const v = [...next][Math.floor(Math.random() * next.size)];
        next.delete(v);
      }
      const pool = ids.filter((id) => !next.has(id));
      for (let i = 0; i < toAdd && pool.length > 0; i++) {
        const v = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        next.add(v);
      }
      prev = [...next];
      for (const applicantId of prev) {
        const consent = Math.random() < 0.4 ? 1 : 0;
        const priority = 1 + Math.floor(Math.random() * 4);
        const b1 = 88 + Math.floor(Math.random() * 13);
        const b2 = 88 + Math.floor(Math.random() * 13);
        const b3 = 88 + Math.floor(Math.random() * 13);
        const b4 = Math.floor(Math.random() * 11);
        const sum = b1 + b2 + b3 + b4;
        await conn.query(
          `INSERT INTO competitive_list_entries (applicant_id, program_id, list_date, consent, priority, ball_physics_ict, ball_russian, ball_math, ball_achievements, sum_balls)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [applicantId, programId, listDate, consent, priority, b1, b2, b3, b4, sum]
        );
      }
      console.log("  " + code + " " + listDate + ": " + prev.length + " записей");
    }
  }

  await conn.end();
  console.log("");
  console.log("Готово. В БД записано " + ids.length + " абитуриентов.");
}

main().catch((err) => {
  console.error("Ошибка:", err.message);
  if (err.code === "ECONNREFUSED") {
    console.error("MySQL не запущен или неверный host/port.");
  }
  if (err.code === "ER_ACCESS_DENIED_ERROR") {
    console.error("Неверный логин или пароль. Проверьте .env.local");
  }
  if (err.code === "ER_BAD_DB_ERROR") {
    console.error("База не найдена. Выполните: npm run db:init");
  }
  process.exit(1);
});
