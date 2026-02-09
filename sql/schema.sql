-- Схема БД: программы, конкурсные списки.

CREATE DATABASE IF NOT EXISTS admission_analysis
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE admission_analysis;

-- Образовательные программы (у каждой — своя дата комиссии/зачисления)
CREATE TABLE IF NOT EXISTS programs (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code             VARCHAR(20)  NOT NULL UNIQUE COMMENT 'ПМ, ИВТ, ИТСС, ИБ',
  name             VARCHAR(255) NOT NULL,
  budget_places    INT UNSIGNED NOT NULL,
  commission_date  DATE         NULL COMMENT 'Дата зачисления по этой ОП',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ФИО абитуриентов конкурсных списков (applicant_id из файла загрузки)
CREATE TABLE IF NOT EXISTS list_applicants (
  applicant_id INT NOT NULL PRIMARY KEY,
  fio          VARCHAR(255) NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Конкурсные списки: одна строка = одна заявка на одну ОП на одну дату
CREATE TABLE IF NOT EXISTS competitive_list_entries (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  applicant_id     INT            NOT NULL COMMENT 'Уникальный ID абитуриента из файла',
  program_id       INT UNSIGNED   NOT NULL,
  list_date        DATE           NOT NULL COMMENT 'Дата приёмной кампании 01.08–04.08',
  consent          TINYINT(1)     NOT NULL DEFAULT 0 COMMENT 'Согласие на зачисление',
  priority         TINYINT UNSIGNED NOT NULL COMMENT 'Приоритет ОП 1–4',
  ball_physics_ict INT UNSIGNED   NOT NULL DEFAULT 0,
  ball_russian     INT UNSIGNED   NOT NULL DEFAULT 0,
  ball_math        INT UNSIGNED   NOT NULL DEFAULT 0,
  ball_achievements INT UNSIGNED  NOT NULL DEFAULT 0,
  sum_balls        INT UNSIGNED   NOT NULL DEFAULT 0,
  created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_app_prog_date (applicant_id, program_id, list_date),
  KEY idx_prog_date (program_id, list_date),
  KEY idx_list_date (list_date),
  CONSTRAINT fk_entries_program FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Заполняем ОП с датами комиссий (у каждой — свой день)
INSERT INTO programs (code, name, budget_places, commission_date) VALUES
  ('ПМ',   'Прикладная математика', 40, '2026-08-01'),
  ('ИВТ',  'Информатика и вычислительная техника', 50, '2026-08-02'),
  ('ИТСС', 'Инфокоммуникационные технологии и системы связи', 30, '2026-08-03'),
  ('ИБ',   'Информационная безопасность', 20, '2026-08-04')
ON DUPLICATE KEY UPDATE name = VALUES(name), budget_places = VALUES(budget_places), commission_date = COALESCE(VALUES(commission_date), commission_date);

-- Абитуриенты (предпроф олимпиада)
CREATE TABLE IF NOT EXISTS applicants (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fio          VARCHAR(255)    NOT NULL,
  matematika   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  russkiy      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  informatika  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  summa        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  prioritet    TINYINT UNSIGNED NOT NULL DEFAULT 1,
  soglasie     TINYINT(1)      NOT NULL DEFAULT 0,
  program      VARCHAR(255)    NOT NULL DEFAULT '',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
