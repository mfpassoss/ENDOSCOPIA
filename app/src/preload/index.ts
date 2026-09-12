import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { Api } from '@shared/types'

const inv = (ch: string) => (...args: any[]) => ipcRenderer.invoke(ch, ...args)

const api: Api = {
  patients: {
    list: inv('patients:list'),
    get: inv('patients:get'),
    save: inv('patients:save'),
    remove: inv('patients:remove')
  },
  exams: {
    list: inv('exams:list'),
    get: inv('exams:get'),
    create: inv('exams:create'),
    update: inv('exams:update'),
    remove: inv('exams:remove'),
    applyTemplate: inv('exams:applyTemplate'),
    openFolder: inv('exams:openFolder')
  },
  photos: {
    list: inv('photos:list'),
    capture: inv('photos:capture'),
    importFiles: inv('photos:importFiles'),
    importCandidates: inv('photos:importCandidates'),
    update: inv('photos:update'),
    reorder: inv('photos:reorder'),
    remove: inv('photos:remove')
  },
  report: {
    generate: inv('report:generate'),
    open: inv('report:open')
  },
  templates: {
    list: inv('templates:list'),
    save: inv('templates:save'),
    remove: inv('templates:remove')
  },
  settings: {
    get: inv('settings:get'),
    save: inv('settings:save'),
    chooseFolder: inv('settings:chooseFolder'),
    chooseLogo: inv('settings:chooseLogo')
  },
  suggestions: {
    solicitantes: inv('suggestions:solicitantes'),
    convenios: inv('suggestions:convenios')
  },
  app: {
    version: inv('app:version'),
    dataDir: inv('app:dataDir')
  },
  files: {
    pathFor: (file: File) => webUtils.getPathForFile(file)
  }
}

contextBridge.exposeInMainWorld('api', api)
