-- Выполнить один раз, если таблица programs уже была без commission_date:
-- mysql -u root -p admission_analysis < sql/migrate-commission-date.sql

ALTER TABLE programs ADD COLUMN commission_date DATE NULL COMMENT 'Дата зачисления по этой ОП';

UPDATE programs SET commission_date = CASE code
  WHEN 'ПМ'   THEN '2026-08-01'
  WHEN 'ИВТ'  THEN '2026-08-02'
  WHEN 'ИТСС' THEN '2026-08-03'
  WHEN 'ИБ'   THEN '2026-08-04'
  ELSE NULL END
WHERE commission_date IS NULL;
