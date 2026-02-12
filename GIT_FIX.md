# Загрузка на GitHub

Проект уже в папке **admission-project** (без кириллицы).

---

## Заменить старый похожий репозиторий этим проектом

Если на GitHub уже есть старый репозиторий и ты хочешь **полностью заменить** его этим проектом:

### 1. Удалить старый репозиторий на GitHub (опционально)

- Зайди на GitHub → нужный репозиторий → **Settings** → внизу **Delete this repository**.
- Либо не удаляй, а просто перезапиши его (шаг 2).

### 2. Привязать remote и перезаписать историю на GitHub

В папке проекта в терминале (подставь свой URL):

```bash
git remote add origin https://github.com/ТВОЙ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main --force
```

`--force` перезапишет ветку `main` на GitHub содержимым этого проекта. Старая история на GitHub будет заменена.

Если remote уже был добавлен ранее:

```bash
git remote -v
git push origin main --force
```

### 3. Дальше

После этого можно пользоваться **`PUSH.bat`** для обычных обновлений (без `--force`).

---

## Самый простой способ (новый репозиторий)

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
