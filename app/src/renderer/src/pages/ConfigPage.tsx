import { useEffect, useState } from 'react'
import type { Local, Settings } from '@shared/types'
import { useToast } from '../toast'
import { errMsg, fotoUrl } from '../util'

export function ConfigPage(): JSX.Element {
  const toast = useToast()
  const [s, setS] = useState<Settings | null>(null)
  const [dataDir, setDataDir] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    window.api.settings.get().then(setS)
    window.api.app.dataDir().then(setDataDir)
  }, [])

  if (!s) return <div className="muted">Carregando…</div>

  const set = (p: Partial<Settings>): void => {
    setS({ ...s, ...p })
    setDirty(true)
  }

  async function save(): Promise<void> {
    try {
      setS(await window.api.settings.save(s!))
      setDirty(false)
      toast('Configurações salvas')
    } catch (e) {
      toast(errMsg(e), true)
    }
  }

  async function chooseFolder(): Promise<void> {
    const f = await window.api.settings.chooseFolder()
    if (f) set({ pastaImportacao: f })
  }

  return (
    <>
      <div className="page-head">
        <h1>Configurações</h1>
        <button className="btn primary" onClick={save} disabled={!dirty}>
          Salvar
        </button>
      </div>

      <div className="card">
        <h2>Médico responsável (rodapé do laudo)</h2>
        <div className="grid2">
          <div className="field">
            <label>Nome</label>
            <input value={s.medicoNome} onChange={(e) => set({ medicoNome: e.target.value })} />
          </div>
          <div className="field">
            <label>CRM</label>
            <input value={s.medicoCrm} onChange={(e) => set({ medicoCrm: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Linha extra no topo do cabeçalho (opcional)</label>
          <input value={s.cabecalhoExtra} onChange={(e) => set({ cabecalhoExtra: e.target.value })} placeholder="Ex.: nome da clínica, endereço, telefone" />
        </div>
      </div>

      <div className="card">
        <h2>Locais de exame (hospital / clínica) e logos</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          O logo do local escolhido no exame vai no cabeçalho do laudo. Marque um como padrão para os novos exames.
        </p>
        {s.locais.map((l) => (
          <div key={l.id} className="row" style={{ marginBottom: 10, alignItems: 'center' }}>
            <input type="radio" name="localPadrao" title="Padrão" checked={s.localPadraoId === l.id} onChange={() => set({ localPadraoId: l.id })} />
            <input
              value={l.nome}
              placeholder="Nome do hospital / clínica"
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}
              onChange={(e) => set({ locais: s.locais.map((x) => (x.id === l.id ? { ...x, nome: e.target.value } : x)) })}
            />
            <div style={{ width: 160, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: 8, background: '#fff' }}>
              {l.logo ? <img src={fotoUrl(l.logo)} alt="" style={{ maxWidth: 150, maxHeight: 40 }} /> : <span className="muted" style={{ fontSize: 12 }}>sem logo</span>}
            </div>
            <button
              className="btn sm"
              onClick={async () => {
                const f = await window.api.settings.chooseLogo()
                if (f) set({ locais: s.locais.map((x) => (x.id === l.id ? { ...x, logo: f } : x)) })
              }}
            >
              Logo…
            </button>
            {l.logo && (
              <button className="btn sm ghost" title="Remover logo" onClick={() => set({ locais: s.locais.map((x) => (x.id === l.id ? { ...x, logo: '' } : x)) })}>
                sem logo
              </button>
            )}
            <button
              className="btn sm danger"
              onClick={() => {
                if (!confirm(`Remover o local “${l.nome}”?`)) return
                const locais = s.locais.filter((x) => x.id !== l.id)
                set({ locais, localPadraoId: s.localPadraoId === l.id ? (locais[0]?.id ?? '') : s.localPadraoId })
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="btn sm"
          onClick={() => {
            const novo: Local = { id: `local-${Date.now()}`, nome: '', logo: '' }
            set({ locais: [...s.locais, novo], localPadraoId: s.localPadraoId || novo.id })
          }}
        >
          + Local
        </button>
      </div>

      <div className="card">
        <h2>Fotos</h2>
        <div className="field">
          <label>Pasta onde o programa de captura (ex.: Debut) salva as fotos</label>
          <div className="row">
            <input value={s.pastaImportacao} onChange={(e) => set({ pastaImportacao: e.target.value })} style={{ flex: 1 }} placeholder="C:\Users\...\Pictures\Debut" />
            <button className="btn" onClick={chooseFolder}>
              Escolher…
            </button>
          </div>
          <span className="hint">Usada em “Imagens → Importar arquivos → Fotos novas na pasta de captura”.</span>
        </div>
        <div className="field" style={{ maxWidth: 240 }}>
          <label>Fotos por linha no laudo</label>
          <select value={s.fotosPorLinha} onChange={(e) => set({ fotosPorLinha: Number(e.target.value) })}>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h2>Convênios sugeridos</h2>
        <div className="field">
          <textarea value={s.convenios.join('\n')} onChange={(e) => set({ convenios: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
          <span className="hint">Um por linha. Convênios digitados nos cadastros também passam a ser sugeridos.</span>
        </div>
      </div>

      <div className="card">
        <h2>Dados</h2>
        <div className="kv">
          <dt>Pasta de dados</dt>
          <dd style={{ userSelect: 'text' }}>{dataDir}</dd>
        </div>
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Banco de dados, fotos e laudos ficam nessa pasta. Faça backup dela regularmente (ou aponte o OneDrive/Google Drive para ela).
        </p>
      </div>
    </>
  )
}
