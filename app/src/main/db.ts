import Database from 'better-sqlite3'
import { dbPath } from './paths'
import { SEED_TEMPLATES } from './seed'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  db = new Database(dbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

function migrate(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      data_nascimento TEXT NOT NULL DEFAULT '',
      sexo TEXT NOT NULL DEFAULT '',
      convenio TEXT NOT NULL DEFAULT '',
      telefone TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_patients_nome ON patients(nome);

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      data TEXT NOT NULL,
      solicitante TEXT NOT NULL DEFAULT '',
      convenio TEXT NOT NULL DEFAULT '',
      indicacao TEXT NOT NULL DEFAULT '',
      secoes TEXT NOT NULL DEFAULT '[]',
      urease TEXT NOT NULL DEFAULT 'NAO',
      conclusao TEXT NOT NULL DEFAULT '',
      laudo_path TEXT,
      laudo_gerado_em TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_exams_patient ON exams(patient_id);
    CREATE INDEX IF NOT EXISTS idx_exams_data ON exams(data);

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      arquivo TEXT NOT NULL,
      legenda TEXT NOT NULL DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_photos_exam ON photos(exam_id, ordem);

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      nome TEXT NOT NULL,
      titulo TEXT NOT NULL,
      secoes TEXT NOT NULL DEFAULT '[]',
      conclusao TEXT NOT NULL DEFAULT '',
      legendas TEXT NOT NULL DEFAULT '[]',
      tem_urease INTEGER NOT NULL DEFAULT 0,
      padrao INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)

  const count = d.prepare('SELECT COUNT(*) AS n FROM templates').get() as { n: number }
  if (count.n === 0) {
    const ins = d.prepare(
      `INSERT INTO templates (tipo, nome, titulo, secoes, conclusao, legendas, tem_urease, padrao)
       VALUES (@tipo, @nome, @titulo, @secoes, @conclusao, @legendas, @temUrease, @padrao)`
    )
    for (const t of SEED_TEMPLATES) {
      ins.run({
        tipo: t.tipo,
        nome: t.nome,
        titulo: t.titulo,
        secoes: JSON.stringify(t.secoes),
        conclusao: t.conclusao,
        legendas: JSON.stringify(t.legendas),
        temUrease: t.temUrease ? 1 : 0,
        padrao: t.padrao ? 1 : 0
      })
    }
  }
}

export function now(): string {
  return new Date().toISOString()
}
