export { PROGRAMS, LIST_DATES } from "./constants";

let pool: any = null;
let mysqlChecked = false;

function getPool() {
  if (mysqlChecked) return pool;
  mysqlChecked = true;
  try {
    const requireFunc = (typeof require !== "undefined" ? require :
                        (typeof module !== "undefined" && (module as any).require ? (module as any).require : null));
    if (!requireFunc) {
      pool = null;
      return null;
    }
    const mysql = requireFunc("mysql2/promise");
    if (!mysql) {
      pool = null;
      return null;
    }
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST ?? "localhost",
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER ?? "root",
      password: process.env.MYSQL_PASSWORD ?? "",
      database: process.env.MYSQL_DATABASE ?? "admission_analysis",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
    });
  } catch (e) {
    pool = null;
  }
  return pool;
}

export function isMySQLAvailable(): boolean {
  return getPool() !== null;
}

export default new Proxy({} as any, {
  get(_target, prop) {
    const p = getPool();
    if (!p) {
      if (prop === "query") {
        return async () => {
          throw new Error("MySQL недоступен. Установите mysql2: npm install mysql2");
        };
      }
      return undefined;
    }
    return (p as any)[prop];
  },
});
