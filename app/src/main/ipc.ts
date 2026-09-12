import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron'
import { exams, patients, photos as photoRepo, settings, suggestions, templates } from './repo'
import { examFolder, importCandidates, importPhotoFiles, removePhoto, savePhotoFromCapture } from './photos'
import { generateReport } from './report/docx'
import { dataDir } from './paths'
import { existsSync } from 'fs'

function handle(channel: string, fn: (...args: any[]) => any): void {
  ipcMain.handle(channel, async (_e, ...args) => fn(...args))
}

export function registerIpc(): void {
  // Pacientes
  handle('patients:list', (q?: string) => patients.list(q))
  handle('patients:get', (id: number) => patients.get(id))
  handle('patients:save', (input) => patients.save(input))
  handle('patients:remove', (id: number) => patients.remove(id))

  // Exames
  handle('exams:list', (filter) => exams.list(filter))
  handle('exams:get', (id: number) => exams.get(id))
  handle('exams:create', (input) => exams.create(input))
  handle('exams:update', (id: number, patch) => exams.update(id, patch))
  handle('exams:remove', (id: number) => exams.remove(id))
  handle('exams:applyTemplate', (id: number, tid: number) => exams.applyTemplate(id, tid))
  handle('exams:openFolder', async (id: number) => {
    await shell.openPath(examFolder(id))
  })

  // Fotos
  handle('photos:list', (examId: number) => photoRepo.list(examId))
  handle('photos:capture', (examId: number, jpeg: ArrayBuffer) => savePhotoFromCapture(examId, jpeg))
  handle('photos:importFiles', async (examId: number, paths?: string[]) => {
    let files = paths
    if (!files || !files.length) {
      const win = BrowserWindow.getFocusedWindow() ?? undefined
      const res = await dialog.showOpenDialog(win as any, {
        title: 'Importar fotos do exame',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'webp'] }]
      })
      if (res.canceled) return []
      files = res.filePaths
    }
    return importPhotoFiles(examId, files)
  })
  handle('photos:importCandidates', (examId: number) => importCandidates(examId))
  handle('photos:update', (id: number, patch) => photoRepo.update(id, patch))
  handle('photos:reorder', (examId: number, ids: number[]) => photoRepo.reorder(examId, ids))
  handle('photos:remove', (id: number) => removePhoto(id))

  // Laudo
  handle('report:generate', (examId: number) => generateReport(examId))
  handle('report:open', async (examId: number) => {
    const e = exams.get(examId)
    if (!e?.laudoPath || !existsSync(e.laudoPath)) {
      const r = await generateReport(examId)
      await shell.openPath(r.path)
      return
    }
    await shell.openPath(e.laudoPath)
  })

  // Modelos
  handle('templates:list', () => templates.list())
  handle('templates:save', (input) => templates.save(input))
  handle('templates:remove', (id: number) => templates.remove(id))

  // Configurações
  handle('settings:get', () => settings.get())
  handle('settings:save', (patch) => settings.save(patch))
  handle('settings:chooseFolder', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? undefined
    const res = await dialog.showOpenDialog(win as any, {
      title: 'Pasta onde o programa de captura salva as fotos',
      properties: ['openDirectory']
    })
    return res.canceled ? null : res.filePaths[0]
  })

  // Sugestões
  handle('suggestions:solicitantes', () => suggestions.solicitantes())
  handle('suggestions:convenios', () => suggestions.convenios())

  // App
  handle('app:version', () => app.getVersion())
  handle('app:dataDir', () => dataDir())
}
