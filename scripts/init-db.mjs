// npm run db:init
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(join(__dirname, ".."));
dotenv.config({ path: join(rootDir, ".env.local") });

const schemaFile = join(rootDir, "sql", "schema.sql");

async function main() {
  const connectionOptions = {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    multipleStatements: true,
    charset: "utf8mb4",
  };

  console.log("Подключаюсь к MySQL...");
  const connection = await mysql.createConnection(connectionOptions);

  console.log("Читаю файл схемы:", schemaFile);
  const sqlText = readFileSync(schemaFile, "utf-8");

  console.log("Выполняю SQL...");
  await connection.query(sqlText);

  console.log("База данных и таблицы созданы.");
  await connection.end();
}

main().catch((error) => {
  console.error("Ошибка при инициализации базы данных:", error);
  process.exit(1);
});
