# Загрузка на GitHub

Проект уже в папке **admission-project** (без кириллицы).

## Самый простой способ

Запусти **`PUSH.bat`** — он сделает `git add`, `git commit`, `git push`.

При первом запуске (если ещё нет remote):

1. В терминале: `git remote add origin https://github.com/ТВОЙ_ЛОГИН/ИМЯ_РЕПО.git`
2. Снова запусти **PUSH.bat**

## Вручную

```bash
git add .
git commit -m "Update"
git push origin main
```

Если remote не добавлен: `git remote add origin https://github.com/ЛОГИН/РЕПО.git`
