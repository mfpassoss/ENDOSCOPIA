import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

/** Pasta raiz de dados do usuário: Documentos/EndoLaudo */
export function dataDir(): string {
  const dir = join(app.getPath('documents'), 'EndoLaudo')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function dbPath(): string {
  return join(dataDir(), 'endolaudo.sqlite')
}

export function examsDir(): string {
  const dir = join(dataDir(), 'exames')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function logosDir(): string {
  const dir = join(dataDir(), 'logos')
  mkdirSync(dir, { recursive: true })
  return dir
}
