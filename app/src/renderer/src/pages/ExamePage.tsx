import { useCallback, useEffect, useRef, useState } from 'react'
import type { Exam, ImportCandidate, Patient, Photo, ReportSection, Settings, Template, Urease } from '@shared/types'
import type { Route } from '../App'
import { Capture } from '../components/Capture'
import { PhotoGrid } from '../components/PhotoGrid'
import { PatientForm } from '../components/PatientForm'
import { useToast } from '../toast'
import { errMsg, fmtDate, fmtDateTime, idade, tipoLabel } from '../util'

type Tab = 'dados' | 'imagens' | 'laudo'

interface Props {
  id: number
  initialTab?: Tab
  nav: (r: Route) => void
}

export function ExamePage({ id, initialTab, nav }: Props): JSX.Element {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>(initialTab ?? 'dados')
  const [exam, setExam] = useState<Exam | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [editPatient, setEditPatient] = useState(false)

  const reloadPhotos = useCallback(() => window.api.photos.list(id).then(setPhotos), [id])

  useEffect(() => {
    window.api.exams.get(id).then(async (e) => {
      setExam(e)
      if (e) setPatient(await window.api.patients.get(e.patientId))
    })
    reloadPhotos()
    window.api.templates.list().then(setTemplates)
    window.api.settings.get().then(setSettings)
  }, [id, reloadPhotos])

  // Salva alterações do exame com debounce
  const pending = useRef<Partial<Exam>>({})
  const timer = useRef<number | undefined>(undefined)
  const patch = useCallback(
    (p: Partial<Exam>) => {
      setExam((e) => (e ? { ...e, ...p } : e))
      pending.current = { ...pending.current, ...p }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(async () => {
        const body = pending.current
        pending.current = {}
        try {
          await window.api.exams.update(id, body)
        } catch (err) {
          toast(errMsg(err), true)
        }
      }, 500)
    },
    [id, toast]
  )

  if (!exam || !patient || !settings) return <div className="muted">Carregando…</div>

  const tpl = templates.find((t) => t.tipo === exam.tipo && t.padrao) ?? templates.find((t) => t.tipo === exam.tipo) ?? null
  const maxNoLaudo = tpl?.legendas.filter((l) => l.trim()).length || undefined
  const nextLabel = tpl?.legendas[photos.length] ?? ''

  return (
    <>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm" onClick={() => nav({ name: 'exames' })}>
              ← Exames
            </button>
          </div>
          <h1>
            {patient.nome} <span className={'badge ' + exam.tipo.toLowerCase()}>{exam.tipo}</span>
          </h1>
          <div className="sub">
            {tipoLabel(exam.tipo)} · {fmtDate(exam.data)} ·{' '}
            {[patient.sexo, idade(patient.dataNascimento, exam.data), exam.convenio || patient.convenio, exam.local].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => window.api.exams.openFolder(id)}>
            📁 Pasta do exame
          </button>
          <button className="btn primary" onClick={() => setTab('laudo')}>
            Laudo →
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'dados' ? 'active' : ''} onClick={() => setTab('dados')}>
          1. Dados
        </button>
        <button className={tab === 'imagens' ? 'active' : ''} onClick={() => setTab('imagens')}>
          2. Imagens ({photos.length})
        </button>
        <button className={tab === 'laudo' ? 'active' : ''} onClick={() => setTab('laudo')}>
          3. Laudo
        </button>
      </div>

      {tab === 'dados' && (
        <DadosTab exam={exam} patient={patient} settings={settings} patch={patch} onEditPatient={() => setEditPatient(true)} onDeleted={() => nav({ name: 'exames' })} />
      )}
      {tab === 'imagens' && (
        <ImagensTab
          exam={exam}
          photos={photos}
          nextLabel={nextLabel}
          maxNoLaudo={maxNoLaudo}
          settings={settings}
          setSettings={setSettings}
          reload={reloadPhotos}
        />
      )}
      {tab === 'laudo' && (
        <LaudoTab exam={exam} patch={patch} templates={templates.filter((t) => t.tipo === exam.tipo)} photos={photos} maxNoLaudo={maxNoLaudo} setExam={setExam} />
      )}

      {editPatient && (
        <PatientForm
          patient={patient}
          onClose={() => setEditPatient(false)}
          onSaved={(p) => {
            setPatient(p)
            setEditPatient(false)
          }}
        />
      )}
    </>
  )
}

// ---------------- Dados ----------------
function DadosTab({
  exam,
  patient,
  settings,
  patch,
  onEditPatient,
  onDeleted
}: {
  exam: Exam
  patient: Patient
  settings: Settings
  patch: (p: Partial<Exam>) => void
  onEditPatient: () => void
  onDeleted: () => void
}): JSX.Element {
  const toast = useToast()
  const [solicitantes, setSolicitantes] = useState<string[]>([])
  const [convenios, setConvenios] = useState<string[]>([])
  useEffect(() => {
    window.api.suggestions.solicitantes().then(setSolicitantes)
    window.api.suggestions.convenios().then(setConvenios)
  }, [])

  async function remove(): Promise<void> {
    if (!confirm('Excluir este exame e todas as fotos? Esta ação não pode ser desfeita.')) return
    try {
      await window.api.exams.remove(exam.id)
      onDeleted()
    } catch (e) {
      toast(errMsg(e), true)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card">
        <h2>Paciente</h2>
        <dl className="kv">
          <dt>Nome</dt>
          <dd>{patient.nome}</dd>
          <dt>Nascimento</dt>
          <dd>
            {fmtDate(patient.dataNascimento) || '—'} {idade(patient.dataNascimento, exam.data) && `(${idade(patient.dataNascimento, exam.data)} na data do exame)`}
          </dd>
          <dt>Sexo</dt>
          <dd>{patient.sexo || '—'}</dd>
          <dt>Convênio</dt>
          <dd>{patient.convenio || '—'}</dd>
          <dt>Telefone</dt>
          <dd>{patient.telefone || '—'}</dd>
        </dl>
        <button className="btn sm" style={{ marginTop: 12 }} onClick={onEditPatient}>
          Editar paciente
        </button>
      </div>
      <div className="card">
        <h2>Exame</h2>
        <div className="grid2">
          <div className="field">
            <label>Tipo</label>
            <input value={tipoLabel(exam.tipo)} disabled />
          </div>
          <div className="field">
            <label>Data do exame</label>
            <input type="date" value={exam.data} onChange={(e) => patch({ data: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Médico solicitante</label>
          <input list="solic2" value={exam.solicitante} onChange={(e) => patch({ solicitante: e.target.value })} />
          <datalist id="solic2">
            {solicitantes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label>Convênio (neste exame)</label>
          <input list="conv2" value={exam.convenio} onChange={(e) => patch({ convenio: e.target.value })} />
          <datalist id="conv2">
            {convenios.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label>Local do exame (logo do laudo)</label>
          <select value={exam.local} onChange={(e) => patch({ local: e.target.value })}>
            {!settings.locais.some((l) => l.nome === exam.local) && <option value={exam.local}>{exam.local || '(sem local)'}</option>}
            {settings.locais.map((l) => (
              <option key={l.id} value={l.nome}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Indicação</label>
          <input value={exam.indicacao} onChange={(e) => patch({ indicacao: e.target.value })} />
        </div>
        <div className="row">
          <span className="spacer" />
          <button className="btn sm danger" onClick={remove}>
            Excluir exame
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------- Imagens ----------------
function ImagensTab({
  exam,
  photos,
  nextLabel,
  maxNoLaudo,
  settings,
  setSettings,
  reload
}: {
  exam: Exam
  photos: Photo[]
  nextLabel: string
  maxNoLaudo?: number
  settings: Settings
  setSettings: (s: Settings) => void
  reload: () => void
}): JSX.Element {
  const toast = useToast()
  const [mode, setMode] = useState<'captura' | 'importar'>('captura')
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null)
  const [over, setOver] = useState(false)

  async function setDevice(idv: string): Promise<void> {
    const s = await window.api.settings.save({ dispositivoVideoId: idv })
    setSettings(s)
  }

  async function importDialog(): Promise<void> {
    try {
      const added = await window.api.photos.importFiles(exam.id)
      if (added.length) toast(`${added.length} foto(s) importada(s)`)
      reload()
    } catch (e) {
      toast(errMsg(e), true)
    }
  }

  async function loadCandidates(): Promise<void> {
    setCandidates(await window.api.photos.importCandidates(exam.id))
  }

  async function importCandidates(paths: string[]): Promise<void> {
    try {
      const added = await window.api.photos.importFiles(exam.id, paths)
      toast(`${added.length} foto(s) importada(s)`)
      reload()
      loadCandidates()
    } catch (e) {
      toast(errMsg(e), true)
    }
  }

  async function onDrop(e: React.DragEvent): Promise<void> {
    e.preventDefault()
    setOver(false)
    const paths: string[] = []
    for (const f of Array.from(e.dataTransfer.files)) {
      const p = window.api.files.pathFor(f)
      if (p) paths.push(p)
    }
    if (paths.length) await importCandidates(paths)
  }

  useEffect(() => {
    if (mode === 'importar') loadCandidates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  return (
    <>
      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <button className={'btn sm' + (mode === 'captura' ? ' primary' : '')} onClick={() => setMode('captura')}>
            Capturar do aparelho
          </button>
          <button className={'btn sm' + (mode === 'importar' ? ' primary' : '')} onClick={() => setMode('importar')}>
            Importar arquivos
          </button>
        </div>
        {mode === 'captura' ? (
          <Capture examId={exam.id} nextLabel={nextLabel} deviceId={settings.dispositivoVideoId} onDevice={setDevice} onCaptured={reload} />
        ) : (
          <div>
            <div
              className={'dropzone' + (over ? ' over' : '')}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(true)
              }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
            >
              Arraste as fotos para cá ou{' '}
              <button className="btn sm" onClick={importDialog}>
                escolher arquivos…
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <b>Fotos novas na pasta de captura</b>
                <span className="muted" style={{ fontSize: 12 }}>
                  {settings.pastaImportacao || 'pasta não configurada (Configurações → Pasta de fotos do programa de captura)'}
                </span>
                <span className="spacer" />
                <button className="btn sm" onClick={loadCandidates}>
                  Atualizar
                </button>
                {candidates && candidates.length > 0 && (
                  <button className="btn sm primary" onClick={() => importCandidates(candidates.map((c) => c.path))}>
                    Importar todas ({candidates.length})
                  </button>
                )}
              </div>
              {candidates && candidates.length === 0 && <div className="muted">Nenhuma foto nova encontrada.</div>}
              {candidates && candidates.length > 0 && (
                <table className="list">
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.path}>
                        <td>{c.nome}</td>
                        <td className="muted">{fmtDateTime(c.modificadoEm)}</td>
                        <td className="muted">{Math.round(c.tamanho / 1024)} KB</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn sm" onClick={() => importCandidates([c.path])}>
                            Importar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>
          Fotos do exame ({photos.length}
          {maxNoLaudo ? ` · ${Math.min(photos.length, maxNoLaudo)} de ${maxNoLaudo} no laudo` : ''})
        </h2>
        {maxNoLaudo != null && photos.length > maxNoLaudo && (
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            O modelo tem {maxNoLaudo} posições. As fotos além disso ficam só na pasta do exame. Arraste para escolher quais entram.
          </p>
        )}
        <PhotoGrid
          photos={photos}
          maxNoLaudo={maxNoLaudo}
          onLabel={async (pid, legenda) => {
            await window.api.photos.update(pid, { legenda })
            reload()
          }}
          onReorder={async (ids) => {
            await window.api.photos.reorder(exam.id, ids)
            reload()
          }}
          onRemove={async (pid) => {
            if (!confirm('Excluir esta foto?')) return
            await window.api.photos.remove(pid)
            reload()
          }}
        />
      </div>
    </>
  )
}

// ---------------- Laudo ----------------
function LaudoTab({
  exam,
  patch,
  templates,
  photos,
  maxNoLaudo,
  setExam
}: {
  exam: Exam
  patch: (p: Partial<Exam>) => void
  templates: Template[]
  photos: Photo[]
  maxNoLaudo?: number
  setExam: (e: Exam) => void
}): JSX.Element {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  function setSection(i: number, s: Partial<ReportSection>): void {
    const secoes = exam.secoes.map((x, j) => (j === i ? { ...x, ...s } : x))
    patch({ secoes })
  }
  function addSection(): void {
    patch({ secoes: [...exam.secoes, { titulo: 'Nova seção:', texto: '' }] })
  }
  function removeSection(i: number): void {
    patch({ secoes: exam.secoes.filter((_, j) => j !== i) })
  }

  async function applyTemplate(tid: number): Promise<void> {
    if (!confirm('Substituir o texto atual do laudo pelo modelo selecionado?')) return
    try {
      setExam(await window.api.exams.applyTemplate(exam.id, tid))
    } catch (e) {
      toast(errMsg(e), true)
    }
  }

  async function generate(open: boolean): Promise<void> {
    setBusy(true)
    try {
      const r = await window.api.report.generate(exam.id)
      setExam({ ...exam, laudoPath: r.path, laudoGeradoEm: new Date().toISOString() })
      toast('Laudo gerado' + (open ? ' — abrindo no Word…' : ''))
      if (open) await window.api.report.open(exam.id)
    } catch (e) {
      toast(errMsg(e), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="status-bar">
        <span>
          {exam.laudoGeradoEm ? (
            <>
              Último laudo gerado em <b>{fmtDateTime(exam.laudoGeradoEm)}</b>
            </>
          ) : (
            'Laudo ainda não gerado.'
          )}{' '}
          · {maxNoLaudo ? Math.min(photos.length, maxNoLaudo) : photos.length} foto(s) serão incluídas.
        </span>
        <span className="spacer" />
        <select onChange={(e) => e.target.value && applyTemplate(Number(e.target.value))} value="">
          <option value="">Aplicar modelo…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <button className="btn" disabled={busy} onClick={() => generate(false)}>
          Gerar .docx
        </button>
        <button className="btn primary" disabled={busy} onClick={() => generate(true)}>
          Gerar e abrir no Word
        </button>
      </div>

      <div className="card">
        {exam.secoes.map((s, i) => (
          <div className="section-edit" key={i}>
            <div className="head">
              <input value={s.titulo} onChange={(e) => setSection(i, { titulo: e.target.value })} />
              <button className="btn sm ghost" title="Remover seção" onClick={() => removeSection(i)}>
                ×
              </button>
            </div>
            <textarea value={s.texto} onChange={(e) => setSection(i, { texto: e.target.value })} spellCheck />
          </div>
        ))}
        <button className="btn sm" onClick={addSection}>
          + Seção
        </button>
      </div>

      {exam.tipo === 'EDA' && (
        <div className="card">
          <h2>Teste da urease (H. pylori)</h2>
          <div className="row">
            {(
              [
                ['NAO', 'Não realizado'],
                ['POSITIVO', 'Positivo'],
                ['NEGATIVO', 'Negativo']
              ] as [Urease, string][]
            ).map(([v, l]) => (
              <label key={v} className="row" style={{ gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="urease" checked={exam.urease === v} onChange={() => patch({ urease: v })} /> {l}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Conclusão</h2>
        <div className="field">
          <textarea value={exam.conclusao} onChange={(e) => patch({ conclusao: e.target.value })} style={{ minHeight: 70 }} />
          <span className="hint">Uma linha por item. Ex.: “- EXAME DENTRO DOS PADRÕES DA NORMALIDADE.”</span>
        </div>
      </div>
    </>
  )
}
