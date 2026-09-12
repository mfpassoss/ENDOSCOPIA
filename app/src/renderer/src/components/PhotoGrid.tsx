import { useState } from 'react'
import type { Photo } from '@shared/types'
import { fotoUrl } from '../util'

interface Props {
  photos: Photo[]
  /** Quantidade de fotos que entram no laudo (as demais ficam só na pasta do exame). */
  maxNoLaudo?: number
  onLabel: (id: number, legenda: string) => void
  onReorder: (ids: number[]) => void
  onRemove: (id: number) => void
}

export function PhotoGrid({ photos, maxNoLaudo, onLabel, onReorder, onRemove }: Props): JSX.Element {
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  function drop(targetId: number): void {
    if (drag == null || drag === targetId) return
    const ids = photos.map((p) => p.id)
    const from = ids.indexOf(drag)
    const to = ids.indexOf(targetId)
    ids.splice(from, 1)
    ids.splice(to, 0, drag)
    onReorder(ids)
    setDrag(null)
    setOver(null)
  }

  if (photos.length === 0) return <div className="muted">Nenhuma foto neste exame ainda.</div>

  return (
    <div className="photos">
      {photos.map((p, i) => (
        <div
          key={p.id}
          className={'photo' + (drag === p.id ? ' dragging' : '') + (over === p.id ? ' over' : '') + (maxNoLaudo != null && i >= maxNoLaudo ? ' fora' : '')}
          title={maxNoLaudo != null && i >= maxNoLaudo ? 'Não entra no laudo (além das legendas do modelo)' : undefined}
          draggable
          onDragStart={() => setDrag(p.id)}
          onDragEnd={() => {
            setDrag(null)
            setOver(null)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(p.id)
          }}
          onDrop={() => drop(p.id)}
        >
          <span className="n">{maxNoLaudo != null && i >= maxNoLaudo ? 'fora do laudo' : i + 1}</span>
          <button className="del" title="Excluir foto" onClick={() => onRemove(p.id)}>
            ×
          </button>
          <img src={fotoUrl(p.arquivo)} alt={p.legenda} />
          <input value={p.legenda} placeholder="legenda" onChange={(e) => onLabel(p.id, e.target.value)} />
        </div>
      ))}
    </div>
  )
}
