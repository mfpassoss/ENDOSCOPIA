import { join, extname, basename } from 'path'
import { mkdirSync, writeFileSync, copyFileSync, readdirSync, statSync, existsSync, unlinkSync } from 'fs'
import { nativeImage } from 'electron'
import { examsDir } from './paths'
import { exams, patients, photos as photoRepo, settings } from './repo'
import type { ImportCandidate, Photo } from '@shared/types'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.webp'])

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

/** Pasta do exame: exames/<data>_<tipo>_<paciente>_<id>/ */
export function examFolder(examId: number): string {
  const e = exams.get(examId)
  if (!e) throw new Error('Exame não encontrado')
  const p = patients.get(e.patientId)
  const name = `${e.data}_${e.tipo}_${slug(p?.nome ?? 'paciente')}_${e.id}`
  const dir = join(examsDir(), name)
  mkdirSync(join(dir, 'fotos'), { recursive: true })
  return dir
}

function stamp(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${String(d.getMilliseconds()).padStart(3, '0')}`
}

export function savePhotoFromCapture(examId: number, jpeg: ArrayBuffer | Buffer): Photo {
  const dir = join(examFolder(examId), 'fotos')
  const file = join(dir, `cap_${stamp()}.jpg`)
  writeFileSync(file, Buffer.from(jpeg as ArrayBuffer))
  return photoRepo.add(examId, file)
}

export function importPhotoFiles(examId: number, paths: string[]): Photo[] {
  const dir = join(examFolder(examId), 'fotos')
  const out: Photo[] = []
  for (const src of paths) {
    const ext = extname(src).toLowerCase()
    if (!IMAGE_EXT.has(ext)) continue
    const dest = join(dir, `imp_${stamp()}_${slug(basename(src, ext))}${ext}`)
    copyFileSync(src, dest)
    out.push(photoRepo.add(examId, dest))
  }
  return out
}

/** Imagens na pasta de importação (ex.: pasta de snapshots do Debut) ainda não importadas para este exame. */
export function importCandidates(examId: number): ImportCandidate[] {
  const folder = settings.get().pastaImportacao
  if (!folder || !existsSync(folder)) return []
  const exam = exams.get(examId)
  if (!exam) return []
  const already = new Set(photoRepo.list(examId).map((p) => basename(p.arquivo)))
  const since = new Date(exam.createdAt).getTime() - 6 * 60 * 60 * 1000 // 6h de folga
  const out: ImportCandidate[] = []
  for (const name of readdirSync(folder)) {
    const ext = extname(name).toLowerCase()
    if (!IMAGE_EXT.has(ext)) continue
    const full = join(folder, name)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (!st.isFile() || st.mtimeMs < since) continue
    if ([...already].some((a) => a.endsWith(`_${slug(basename(name, ext))}${ext}`))) continue
    out.push({ path: full, nome: name, modificadoEm: st.mtime.toISOString(), tamanho: st.size })
  }
  return out.sort((a, b) => a.modificadoEm.localeCompare(b.modificadoEm))
}

export function removePhoto(id: number): void {
  const p = photoRepo.remove(id)
  if (p && existsSync(p.arquivo)) {
    try {
      unlinkSync(p.arquivo)
    } catch {
      /* ignora */
    }
  }
}

/** Redimensiona para o laudo (largura máx.) e devolve JPEG. */
export function photoForReport(file: string, maxWidth = 900): Buffer {
  const img = nativeImage.createFromPath(file)
  if (img.isEmpty()) throw new Error(`Não foi possível ler a imagem: ${file}`)
  const { width } = img.getSize()
  const resized = width > maxWidth ? img.resize({ width: maxWidth }) : img
  return resized.toJPEG(88)
}

export function imageSize(file: string): { width: number; height: number } {
  const img = nativeImage.createFromPath(file)
  if (img.isEmpty()) return { width: 4, height: 3 }
  return img.getSize()
}
