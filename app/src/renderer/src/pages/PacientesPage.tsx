import { useCallback, useEffect, useState } from 'react'
import type { ExamListItem, Patient } from '@shared/types'
import type { Route } from '../App'
import { PatientForm } from '../components/PatientForm'
import { useToast } from '../toast'
import { errMsg, fmtDate, idade } from '../util'

export function PacientesPage({ nav }: { nav: (r: Route) => void }): JSX.Element {
  const toast = useToast()
  const [items, setItems] = useState<Patient[]>([])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Patient | null | undefined>(undefined)
  const [selected, setSelected] = useState<Patient | null>(null)
  const [exams, setExams] = useState<ExamListItem[]>([])

  const load = useCallback(() => {
    window.api.patients.list(query).then(setItems)
  }, [query])
  useEffect(load, [load])

  useEffect(() => {
    if (selected) window.api.exams.list({ patientId: selected.id }).then(setExams)
  }, [selected])

  async function remove(p: Patient): Promise<void> {
    if (!confirm(`Excluir o paciente ${p.nome} e todos os seus exames e fotos?`)) return
    try {
      await window.api.patients.remove(p.id)
      setSelected(null)
      load()
    } catch (e) {
      toast(errMsg(e), true)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pacientes</h1>
          <div className="sub">{items.length} paciente(s)</div>
        </div>
        <div className="row">
          <input className="search" placeholder="Buscar por nome…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn primary" onClick={() => setEditing(null)}>
            + Novo paciente
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 16 }}>
        {items.length === 0 ? (
          <div className="card empty">Nenhum paciente encontrado.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Nascimento</th>
                <th>Idade</th>
                <th>Sexo</th>
                <th>Convênio</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => setSelected(p)}>
                  <td>
                    <b>{p.nome}</b>
                  </td>
                  <td>{fmtDate(p.dataNascimento)}</td>
                  <td>{idade(p.dataNascimento)}</td>
                  <td>{p.sexo}</td>
                  <td>{p.convenio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selected && (
          <div className="card" style={{ alignSelf: 'start' }}>
            <h2>{selected.nome}</h2>
            <dl className="kv">
              <dt>Nascimento</dt>
              <dd>{fmtDate(selected.dataNascimento) || '—'} {idade(selected.dataNascimento) && `(${idade(selected.dataNascimento)})`}</dd>
              <dt>Sexo</dt>
              <dd>{selected.sexo || '—'}</dd>
              <dt>Convênio</dt>
              <dd>{selected.convenio || '—'}</dd>
              <dt>Telefone</dt>
              <dd>{selected.telefone || '—'}</dd>
            </dl>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn sm" onClick={() => setEditing(selected)}>
                Editar
              </button>
              <button className="btn sm danger" onClick={() => remove(selected)}>
                Excluir
              </button>
              <span className="spacer" />
              <button className="btn sm ghost" onClick={() => setSelected(null)}>
                Fechar
              </button>
            </div>
            <h2 style={{ marginTop: 18 }}>Exames</h2>
            {exams.length === 0 ? (
              <div className="muted">Nenhum exame.</div>
            ) : (
              exams.map((e) => (
                <div key={e.id} className="row clickable" style={{ padding: '6px 0', cursor: 'pointer' }} onClick={() => nav({ name: 'exame', id: e.id })}>
                  <span className={'badge ' + e.tipo.toLowerCase()}>{e.tipo}</span>
                  <span>{fmtDate(e.data)}</span>
                  <span className="muted">{e.fotos} fotos</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {editing !== undefined && (
        <PatientForm
          patient={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(p) => {
            setEditing(undefined)
            setSelected(p)
            load()
          }}
        />
      )}
    </>
  )
}
