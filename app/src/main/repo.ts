import { getDb, now } from './db'
import type {
  Exam,
  ExamInput,
  ExamListItem,
  ExamUpdate,
  Patient,
  PatientInput,
  Photo,
  Settings,
  Template,
  TemplateInput
} from '@shared/types'
import { DEFAULT_CONVENIOS } from './seed'

// ---------- Pacientes ----------
function rowToPatient(r: any): Patient {
  return {
    id: r.id,
    nome: r.nome,
    dataNascimento: r.data_nascimento,
    sexo: r.sexo,
    convenio: r.convenio,
    telefone: r.telefone,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

export const patients = {
  list(query = ''): Patient[] {
    const db = getDb()
    const q = query.trim()
    const rows = q
      ? db
          .prepare('SELECT * FROM patients WHERE nome LIKE ? ORDER BY nome LIMIT 200')
          .all(`%${q}%`)
      : db.prepare('SELECT * FROM patients ORDER BY updated_at DESC LIMIT 200').all()
    return rows.map(rowToPatient)
  },
  get(id: number): Patient | null {
    const r = getDb().prepare('SELECT * FROM patients WHERE id = ?').get(id)
    return r ? rowToPatient(r) : null
  },
  save(input: PatientInput & { id?: number }): Patient {
    const db = getDb()
    const ts = now()
    const nome = input.nome.trim()
    if (!nome) throw new Error('Nome do paciente é obrigatório')
    if (input.id) {
      db.prepare(
        `UPDATE patients SET nome=@nome, data_nascimento=@dn, sexo=@sexo, convenio=@convenio,
         telefone=@telefone, updated_at=@ts WHERE id=@id`
      ).run({
        id: input.id,
        nome,
        dn: input.dataNascimento || '',
        sexo: input.sexo || '',
        convenio: input.convenio || '',
        telefone: input.telefone || '',
        ts
      })
      return patients.get(input.id)!
    }
    const res = db
      .prepare(
        `INSERT INTO patients (nome, data_nascimento, sexo, convenio, telefone, created_at, updated_at)
         VALUES (@nome, @dn, @sexo, @convenio, @telefone, @ts, @ts)`
      )
      .run({
        nome,
        dn: input.dataNascimento || '',
        sexo: input.sexo || '',
        convenio: input.convenio || '',
        telefone: input.telefone || '',
        ts
      })
    return patients.get(Number(res.lastInsertRowid))!
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM patients WHERE id = ?').run(id)
  }
}

// ---------- Exames ----------
function rowToExam(r: any): Exam {
  return {
    id: r.id,
    patientId: r.patient_id,
    tipo: r.tipo,
    data: r.data,
    solicitante: r.solicitante,
    convenio: r.convenio,
    local: r.local,
    indicacao: r.indicacao,
    secoes: safeJson(r.secoes, []),
    urease: r.urease,
    conclusao: r.conclusao,
    laudoPath: r.laudo_path,
    laudoGeradoEm: r.laudo_gerado_em,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export const exams = {
  list(filter: { query?: string; patientId?: number } = {}): ExamListItem[] {
    const db = getDb()
    const where: string[] = []
    const params: any = {}
    if (filter.patientId) {
      where.push('e.patient_id = @pid')
      params.pid = filter.patientId
    }
    if (filter.query && filter.query.trim()) {
      where.push('(p.nome LIKE @q OR e.solicitante LIKE @q OR e.convenio LIKE @q)')
      params.q = `%${filter.query.trim()}%`
    }
    const sql = `
      SELECT e.id, e.tipo, e.data, e.solicitante, e.convenio, e.local, e.patient_id, e.laudo_gerado_em,
             p.nome AS paciente_nome, p.data_nascimento AS paciente_nascimento,
             (SELECT COUNT(*) FROM photos ph WHERE ph.exam_id = e.id) AS fotos
      FROM exams e JOIN patients p ON p.id = e.patient_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY e.data DESC, e.id DESC LIMIT 500`
    return (db.prepare(sql).all(params) as any[]).map((r) => ({
      id: r.id,
      tipo: r.tipo,
      data: r.data,
      solicitante: r.solicitante,
      convenio: r.convenio,
      local: r.local,
      patientId: r.patient_id,
      pacienteNome: r.paciente_nome,
      pacienteNascimento: r.paciente_nascimento,
      fotos: r.fotos,
      laudoGeradoEm: r.laudo_gerado_em
    }))
  },
  get(id: number): Exam | null {
    const r = getDb().prepare('SELECT * FROM exams WHERE id = ?').get(id)
    return r ? rowToExam(r) : null
  },
  create(input: ExamInput): Exam {
    const db = getDb()
    const ts = now()
    const tpl = templates.defaultFor(input.tipo)
    const cfg = settings.get()
    const localPadrao = cfg.locais.find((l) => l.id === cfg.localPadraoId)?.nome ?? ''
    const res = db
      .prepare(
        `INSERT INTO exams (patient_id, tipo, data, solicitante, convenio, local, indicacao, secoes, urease, conclusao, created_at, updated_at)
         VALUES (@patientId, @tipo, @data, @solicitante, @convenio, @local, @indicacao, @secoes, 'NAO', @conclusao, @ts, @ts)`
      )
      .run({
        patientId: input.patientId,
        tipo: input.tipo,
        data: input.data,
        solicitante: input.solicitante || '',
        convenio: input.convenio || '',
        local: input.local ?? localPadrao,
        indicacao: input.indicacao || '',
        secoes: JSON.stringify(tpl?.secoes ?? []),
        conclusao: tpl?.conclusao ?? '',
        ts
      })
    return exams.get(Number(res.lastInsertRowid))!
  },
  update(id: number, patch: ExamUpdate): Exam {
    const db = getDb()
    const cur = exams.get(id)
    if (!cur) throw new Error('Exame não encontrado')
    db.prepare(
      `UPDATE exams SET data=@data, solicitante=@solicitante, convenio=@convenio, local=@local, indicacao=@indicacao,
       secoes=@secoes, urease=@urease, conclusao=@conclusao, updated_at=@ts WHERE id=@id`
    ).run({
      id,
      data: patch.data ?? cur.data,
      solicitante: patch.solicitante ?? cur.solicitante,
      convenio: patch.convenio ?? cur.convenio,
      local: patch.local ?? cur.local,
      indicacao: patch.indicacao ?? cur.indicacao,
      secoes: JSON.stringify(patch.secoes ?? cur.secoes),
      urease: patch.urease ?? cur.urease,
      conclusao: patch.conclusao ?? cur.conclusao,
      ts: now()
    })
    return exams.get(id)!
  },
  setLaudo(id: number, path: string): void {
    getDb()
      .prepare('UPDATE exams SET laudo_path=?, laudo_gerado_em=? WHERE id=?')
      .run(path, now(), id)
  },
  applyTemplate(id: number, templateId: number): Exam {
    const t = templates.get(templateId)
    if (!t) throw new Error('Modelo não encontrado')
    return exams.update(id, { secoes: t.secoes, conclusao: t.conclusao })
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM exams WHERE id = ?').run(id)
  }
}

// ---------- Fotos ----------
function rowToPhoto(r: any): Photo {
  return {
    id: r.id,
    examId: r.exam_id,
    arquivo: r.arquivo,
    legenda: r.legenda,
    ordem: r.ordem,
    createdAt: r.created_at
  }
}

export const photos = {
  list(examId: number): Photo[] {
    return (
      getDb().prepare('SELECT * FROM photos WHERE exam_id = ? ORDER BY ordem, id').all(examId) as any[]
    ).map(rowToPhoto)
  },
  get(id: number): Photo | null {
    const r = getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id)
    return r ? rowToPhoto(r) : null
  },
  add(examId: number, arquivo: string): Photo {
    const db = getDb()
    const next = db
      .prepare('SELECT COALESCE(MAX(ordem), -1) + 1 AS n FROM photos WHERE exam_id = ?')
      .get(examId) as { n: number }
    const exam = exams.get(examId)
    const tpl = exam ? templates.defaultFor(exam.tipo) : null
    const legenda = tpl?.legendas[next.n] ?? ''
    const res = db
      .prepare('INSERT INTO photos (exam_id, arquivo, legenda, ordem, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(examId, arquivo, legenda, next.n, now())
    return photos.get(Number(res.lastInsertRowid))!
  },
  update(id: number, patch: { legenda?: string }): Photo {
    const cur = photos.get(id)
    if (!cur) throw new Error('Foto não encontrada')
    getDb()
      .prepare('UPDATE photos SET legenda = ? WHERE id = ?')
      .run(patch.legenda ?? cur.legenda, id)
    return photos.get(id)!
  },
  reorder(examId: number, ids: number[]): Photo[] {
    const db = getDb()
    const stmt = db.prepare('UPDATE photos SET ordem = ? WHERE id = ? AND exam_id = ?')
    db.transaction(() => {
      ids.forEach((id, i) => stmt.run(i, id, examId))
    })()
    return photos.list(examId)
  },
  remove(id: number): Photo | null {
    const cur = photos.get(id)
    if (!cur) return null
    getDb().prepare('DELETE FROM photos WHERE id = ?').run(id)
    // compacta a ordem
    const rest = photos.list(cur.examId)
    photos.reorder(
      cur.examId,
      rest.map((p) => p.id)
    )
    return cur
  }
}

// ---------- Modelos (máscaras) ----------
function rowToTemplate(r: any): Template {
  return {
    id: r.id,
    tipo: r.tipo,
    nome: r.nome,
    titulo: r.titulo,
    tituloCorpo: r.titulo_corpo ?? '',
    secoes: safeJson(r.secoes, []),
    conclusao: r.conclusao,
    legendas: safeJson(r.legendas, []),
    temUrease: !!r.tem_urease,
    padrao: !!r.padrao
  }
}

export const templates = {
  list(): Template[] {
    return (getDb().prepare('SELECT * FROM templates ORDER BY tipo, padrao DESC, nome').all() as any[]).map(
      rowToTemplate
    )
  },
  get(id: number): Template | null {
    const r = getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id)
    return r ? rowToTemplate(r) : null
  },
  defaultFor(tipo: string): Template | null {
    const r = getDb()
      .prepare('SELECT * FROM templates WHERE tipo = ? ORDER BY padrao DESC, id LIMIT 1')
      .get(tipo)
    return r ? rowToTemplate(r) : null
  },
  save(input: TemplateInput & { id?: number }): Template {
    const db = getDb()
    const params = {
      id: input.id ?? null,
      tipo: input.tipo,
      nome: input.nome.trim() || 'Modelo',
      titulo: input.titulo.trim(),
      tituloCorpo: (input.tituloCorpo ?? '').trim(),
      secoes: JSON.stringify(input.secoes ?? []),
      conclusao: input.conclusao ?? '',
      legendas: JSON.stringify(input.legendas ?? []),
      temUrease: input.temUrease ? 1 : 0,
      padrao: input.padrao ? 1 : 0
    }
    const tx = db.transaction(() => {
      if (params.padrao) {
        db.prepare('UPDATE templates SET padrao = 0 WHERE tipo = ?').run(params.tipo)
      }
      if (params.id) {
        db.prepare(
          `UPDATE templates SET tipo=@tipo, nome=@nome, titulo=@titulo, titulo_corpo=@tituloCorpo, secoes=@secoes,
           conclusao=@conclusao, legendas=@legendas, tem_urease=@temUrease, padrao=@padrao WHERE id=@id`
        ).run(params)
        return params.id
      }
      const res = db
        .prepare(
          `INSERT INTO templates (tipo, nome, titulo, titulo_corpo, secoes, conclusao, legendas, tem_urease, padrao)
           VALUES (@tipo, @nome, @titulo, @tituloCorpo, @secoes, @conclusao, @legendas, @temUrease, @padrao)`
        )
        .run(params)
      return Number(res.lastInsertRowid)
    })
    return templates.get(tx())!
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM templates WHERE id = ?').run(id)
  }
}

// ---------- Configurações ----------
const DEFAULT_SETTINGS: Settings = {
  medicoNome: 'Dr. Marcelo Ferraz Passos',
  medicoCrm: '135.046',
  cabecalhoExtra: '',
  locais: [],
  localPadraoId: '',
  pastaImportacao: '',
  dispositivoVideoId: '',
  fotosPorLinha: 3,
  convenios: DEFAULT_CONVENIOS
}

export const settings = {
  get(): Settings {
    const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    const out: any = { ...DEFAULT_SETTINGS }
    for (const r of rows) out[r.key] = safeJson(r.value, out[r.key])
    return out as Settings
  },
  save(patch: Partial<Settings>): Settings {
    const db = getDb()
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    db.transaction(() => {
      for (const [k, v] of Object.entries(patch)) stmt.run(k, JSON.stringify(v))
    })()
    return settings.get()
  }
}

// ---------- Sugestões ----------
export const suggestions = {
  solicitantes(): string[] {
    return (
      getDb()
        .prepare(
          `SELECT solicitante, COUNT(*) AS n FROM exams WHERE solicitante <> ''
           GROUP BY solicitante ORDER BY n DESC, solicitante LIMIT 100`
        )
        .all() as any[]
    ).map((r) => r.solicitante)
  },
  convenios(): string[] {
    const base = settings.get().convenios
    const used = (
      getDb()
        .prepare(`SELECT DISTINCT convenio FROM patients WHERE convenio <> '' ORDER BY convenio`)
        .all() as any[]
    ).map((r) => r.convenio)
    return Array.from(new Set([...base, ...used]))
  }
}
