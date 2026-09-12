import { useEffect, useState } from 'react'
import type { Patient, PatientInput } from '@shared/types'
import { Modal } from './Modal'
import { useToast } from '../toast'
import { errMsg, idade } from '../util'

interface Props {
  patient?: Patient | null
  onSaved: (p: Patient) => void
  onClose: () => void
}

export function PatientForm({ patient, onSaved, onClose }: Props): JSX.Element {
  const toast = useToast()
  const [convenios, setConvenios] = useState<string[]>([])
  const [form, setForm] = useState<PatientInput>({
    nome: patient?.nome ?? '',
    dataNascimento: patient?.dataNascimento ?? '',
    sexo: patient?.sexo ?? '',
    convenio: patient?.convenio ?? '',
    telefone: patient?.telefone ?? ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.suggestions.convenios().then(setConvenios)
  }, [])

  const set = <K extends keyof PatientInput>(k: K, v: PatientInput[K]): void => setForm((f) => ({ ...f, [k]: v }))

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.nome.trim()) return toast('Informe o nome do paciente', true)
    setSaving(true)
    try {
      const p = await window.api.patients.save({ ...form, id: patient?.id })
      onSaved(p)
    } catch (err) {
      toast(errMsg(err), true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={patient ? 'Editar paciente' : 'Novo paciente'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="field">
          <label>Nome completo</label>
          <input autoFocus value={form.nome} onChange={(e) => set('nome', e.target.value)} />
        </div>
        <div className="grid3">
          <div className="field">
            <label>Data de nascimento</label>
            <input type="date" value={form.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} />
            <span className="hint">{idade(form.dataNascimento) || ' '}</span>
          </div>
          <div className="field">
            <label>Sexo</label>
            <select value={form.sexo} onChange={(e) => set('sexo', e.target.value as PatientInput['sexo'])}>
              <option value="">—</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
          <div className="field">
            <label>Telefone</label>
            <input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(00) 00000-0000" />
          </div>
        </div>
        <div className="field">
          <label>Convênio</label>
          <input list="convenios-list" value={form.convenio} onChange={(e) => set('convenio', e.target.value)} placeholder="Unimed, Particular, SUS…" />
          <datalist id="convenios-list">
            {convenios.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  )
}
