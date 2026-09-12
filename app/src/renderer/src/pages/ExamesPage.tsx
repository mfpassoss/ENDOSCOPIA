import { useCallback, useEffect, useState } from 'react'
import type { ExamListItem, ExamType, Patient } from '@shared/types'
import type { Route } from '../App'
import { Modal } from '../components/Modal'
import { PatientForm } from '../components/PatientForm'
import { useToast } from '../toast'
import { errMsg, fmtDate, idade, today } from '../util'

export function ExamesPage({ nav }: { nav: (r: Route) => void }): JSX.Element {
  const [items, setItems] = useState<ExamListItem[]>([])
  const [query, setQuery] = useState('')
  const [novo, setNovo] = useState(false)

  const load = useCallback(() => {
    window.api.exams.list({ query }).then(setItems)
  }, [query])
  useEffect(load, [load])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Exames</h1>
          <div className="sub">{items.length} exame(s)</div>
        </div>
        <div className="row">
          <input className="search" placeholder="Buscar por paciente, solicitante ou convênio…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn primary lg" onClick={() => setNovo(true)}>
            + Novo exame
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card empty">Nenhum exame ainda. Clique em “Novo exame” para começar.</div>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>Data</th>
              <th>Paciente</th>
              <th>Idade</th>
              <th>Exame</th>
              <th>Solicitante</th>
              <th>Convênio</th>
              <th>Fotos</th>
              <th>Laudo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="clickable" onClick={() => nav({ name: 'exame', id: e.id })}>
                <td>{fmtDate(e.data)}</td>
                <td>
                  <b>{e.pacienteNome}</b>
                </td>
                <td>{idade(e.pacienteNascimento, e.data)}</td>
                <td>
                  <span className={'badge ' + e.tipo.toLowerCase()}>{e.tipo}</span>
                </td>
                <td>{e.solicitante}</td>
                <td>{e.convenio}</td>
                <td>{e.fotos}</td>
                <td>{e.laudoGeradoEm ? <span className="badge ok">gerado</span> : <span className="badge pend">pendente</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {novo && (
        <NovoExame
          onClose={() => setNovo(false)}
          onCreated={(id) => {
            setNovo(false)
            nav({ name: 'exame', id, tab: 'imagens' })
          }}
        />
      )}
    </>
  )
}

function NovoExame({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }): JSX.Element {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Patient[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [newPatient, setNewPatient] = useState(false)
  const [tipo, setTipo] = useState<ExamType>('EDA')
  const [data, setData] = useState(today())
  const [solicitante, setSolicitante] = useState('')
  const [convenio, setConvenio] = useState('')
  const [indicacao, setIndicacao] = useState('')
  const [solicitantes, setSolicitantes] = useState<string[]>([])
  const [convenios, setConvenios] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.suggestions.solicitantes().then(setSolicitantes)
    window.api.suggestions.convenios().then(setConvenios)
  }, [])

  useEffect(() => {
    if (patient) return
    const t = setTimeout(() => window.api.patients.list(q).then((r) => setFound(r.slice(0, 8))), 150)
    return () => clearTimeout(t)
  }, [q, patient])

  function choose(p: Patient): void {
    setPatient(p)
    if (!convenio) setConvenio(p.convenio)
  }

  async function create(): Promise<void> {
    if (!patient) return toast('Selecione ou cadastre o paciente', true)
    setSaving(true)
    try {
      const e = await window.api.exams.create({ patientId: patient.id, tipo, data, solicitante, convenio, indicacao })
      onCreated(e.id)
    } catch (err) {
      toast(errMsg(err), true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Novo exame" onClose={onClose}>
      <div className="field">
        <label>Paciente</label>
        {patient ? (
          <div className="row" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
            <div>
              <b>{patient.nome}</b>
              <div className="muted" style={{ fontSize: 12 }}>
                {[patient.sexo, idade(patient.dataNascimento, data), patient.convenio].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span className="spacer" />
            <button className="btn sm" onClick={() => setPatient(null)}>
              Trocar
            </button>
          </div>
        ) : (
          <>
            <input autoFocus placeholder="Digite o nome para buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {found.map((p) => (
                <div
                  key={p.id}
                  onClick={() => choose(p)}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                >
                  <b>{p.nome}</b>{' '}
                  <span className="muted" style={{ fontSize: 12 }}>
                    {[fmtDate(p.dataNascimento), p.convenio].filter(Boolean).join(' · ')}
                  </span>
                </div>
              ))}
              <div onClick={() => setNewPatient(true)} style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--teal)', fontWeight: 600 }}>
                + Cadastrar novo paciente{q ? ` “${q}”` : ''}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid2">
        <div className="field">
          <label>Tipo de exame</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as ExamType)}>
            <option value="EDA">Endoscopia digestiva alta</option>
            <option value="COLONO">Colonoscopia</option>
          </select>
        </div>
        <div className="field">
          <label>Data do exame</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label>Médico solicitante</label>
          <input list="solic-list" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} placeholder="Dr(a). …" />
          <datalist id="solic-list">
            {solicitantes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label>Convênio</label>
          <input list="conv-list" value={convenio} onChange={(e) => setConvenio(e.target.value)} />
          <datalist id="conv-list">
            {convenios.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="field">
        <label>Indicação (opcional)</label>
        <input value={indicacao} onChange={(e) => setIndicacao(e.target.value)} placeholder="Ex.: epigastralgia, rastreamento…" />
      </div>
      <div className="actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" disabled={saving || !patient} onClick={create}>
          Iniciar exame
        </button>
      </div>

      {newPatient && (
        <PatientForm
          patient={{ id: 0, nome: q, dataNascimento: '', sexo: '', convenio: '', telefone: '', createdAt: '', updatedAt: '' }}
          onClose={() => setNewPatient(false)}
          onSaved={(p) => {
            setNewPatient(false)
            choose(p)
          }}
        />
      )}
    </Modal>
  )
}
