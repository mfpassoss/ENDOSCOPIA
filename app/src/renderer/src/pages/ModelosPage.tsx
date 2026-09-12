import { useEffect, useState } from 'react'
import type { ExamType, Template, TemplateInput } from '@shared/types'
import { useToast } from '../toast'
import { errMsg, tipoLabel } from '../util'

const EMPTY = (tipo: ExamType): TemplateInput => ({
  tipo,
  nome: '',
  titulo: tipo === 'EDA' ? 'ENDOSCOPIA DIGESTIVA ALTA' : 'COLONOSCOPIA',
  secoes: [],
  conclusao: '',
  legendas: [],
  temUrease: tipo === 'EDA',
  padrao: false
})

export function ModelosPage(): JSX.Element {
  const toast = useToast()
  const [items, setItems] = useState<Template[]>([])
  const [sel, setSel] = useState<(TemplateInput & { id?: number }) | null>(null)
  const [dirty, setDirty] = useState(false)

  const load = (): Promise<void> => window.api.templates.list().then(setItems)
  useEffect(() => {
    load()
  }, [])

  function pick(t: Template): void {
    if (dirty && !confirm('Descartar alterações não salvas?')) return
    setSel({ ...t, secoes: t.secoes.map((s) => ({ ...s })), legendas: [...t.legendas] })
    setDirty(false)
  }
  function set(p: Partial<TemplateInput>): void {
    setSel((s) => (s ? { ...s, ...p } : s))
    setDirty(true)
  }

  async function save(): Promise<void> {
    if (!sel) return
    try {
      const t = await window.api.templates.save(sel)
      await load()
      setSel({ ...t })
      setDirty(false)
      toast('Modelo salvo')
    } catch (e) {
      toast(errMsg(e), true)
    }
  }
  async function remove(): Promise<void> {
    if (!sel?.id || !confirm(`Excluir o modelo “${sel.nome}”?`)) return
    await window.api.templates.remove(sel.id)
    setSel(null)
    load()
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Modelos de laudo</h1>
          <div className="sub">As “máscaras” de texto e as legendas padrão das fotos para cada tipo de exame.</div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => pick({ id: 0, ...EMPTY('EDA') } as Template)}>
            + Modelo EDA
          </button>
          <button className="btn" onClick={() => pick({ id: 0, ...EMPTY('COLONO') } as Template)}>
            + Modelo Colono
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
        <div className="card" style={{ alignSelf: 'start' }}>
          {(['EDA', 'COLONO'] as ExamType[]).map((tipo) => (
            <div key={tipo} style={{ marginBottom: 12 }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                {tipoLabel(tipo)}
              </div>
              {items
                .filter((t) => t.tipo === tipo)
                .map((t) => (
                  <div
                    key={t.id}
                    onClick={() => pick(t)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: sel?.id === t.id ? '#e3f0fb' : undefined,
                      fontWeight: sel?.id === t.id ? 700 : 500
                    }}
                  >
                    {t.nome} {t.padrao && <span className="badge ok">padrão</span>}
                  </div>
                ))}
            </div>
          ))}
        </div>

        {sel ? (
          <div className="card">
            <div className="grid2">
              <div className="field">
                <label>Nome do modelo</label>
                <input value={sel.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: EDA normal" />
              </div>
              <div className="field">
                <label>Título impresso no cabeçalho</label>
                <input value={sel.titulo} onChange={(e) => set({ titulo: e.target.value })} />
              </div>
            </div>
            <div className="row" style={{ marginBottom: 14 }}>
              <label className="row" style={{ gap: 6 }}>
                <input type="checkbox" checked={sel.padrao} onChange={(e) => set({ padrao: e.target.checked })} /> Modelo padrão para{' '}
                {tipoLabel(sel.tipo)}
              </label>
              {sel.tipo === 'EDA' && (
                <label className="row" style={{ gap: 6 }}>
                  <input type="checkbox" checked={sel.temUrease} onChange={(e) => set({ temUrease: e.target.checked })} /> Inclui teste da urease
                </label>
              )}
            </div>

            <h2>Seções do laudo</h2>
            {sel.secoes.map((s, i) => (
              <div className="section-edit" key={i}>
                <div className="head">
                  <input value={s.titulo} onChange={(e) => set({ secoes: sel.secoes.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} />
                  <button className="btn sm ghost" onClick={() => set({ secoes: sel.secoes.filter((_, j) => j !== i) })}>
                    ×
                  </button>
                </div>
                <textarea value={s.texto} onChange={(e) => set({ secoes: sel.secoes.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
              </div>
            ))}
            <button className="btn sm" onClick={() => set({ secoes: [...sel.secoes, { titulo: 'Nova seção:', texto: '' }] })}>
              + Seção
            </button>

            <h2 style={{ marginTop: 18 }}>Conclusão padrão</h2>
            <div className="field">
              <textarea value={sel.conclusao} onChange={(e) => set({ conclusao: e.target.value })} style={{ minHeight: 60 }} />
            </div>

            <h2>Legendas das fotos (em ordem)</h2>
            <div className="field">
              <textarea
                value={sel.legendas.join('\n')}
                onChange={(e) => set({ legendas: e.target.value.split('\n') })}
                style={{ minHeight: 160, textTransform: 'uppercase' }}
              />
              <span className="hint">Uma legenda por linha. Cada foto capturada recebe a próxima legenda da lista.</span>
            </div>

            <div className="row">
              {sel.id ? (
                <button className="btn danger sm" onClick={remove}>
                  Excluir modelo
                </button>
              ) : null}
              <span className="spacer" />
              <button className="btn primary" onClick={save} disabled={!dirty && !!sel.id}>
                Salvar modelo
              </button>
            </div>
          </div>
        ) : (
          <div className="card empty">Selecione um modelo à esquerda ou crie um novo.</div>
        )}
      </div>
    </>
  )
}
