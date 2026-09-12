export type ExamType = 'EDA' | 'COLONO'
export type Sexo = 'M' | 'F' | ''
export type Urease = 'NAO' | 'POSITIVO' | 'NEGATIVO'

export interface Patient {
  id: number
  nome: string
  dataNascimento: string // ISO yyyy-mm-dd ou ''
  sexo: Sexo
  convenio: string
  telefone: string
  createdAt: string
  updatedAt: string
}

export type PatientInput = Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>

export interface ReportSection {
  titulo: string
  texto: string
}

export interface Exam {
  id: number
  patientId: number
  tipo: ExamType
  data: string // ISO yyyy-mm-dd
  solicitante: string
  convenio: string
  indicacao: string
  secoes: ReportSection[]
  urease: Urease
  conclusao: string
  laudoPath: string | null
  laudoGeradoEm: string | null
  createdAt: string
  updatedAt: string
}

export interface ExamListItem {
  id: number
  tipo: ExamType
  data: string
  solicitante: string
  convenio: string
  patientId: number
  pacienteNome: string
  pacienteNascimento: string
  fotos: number
  laudoGeradoEm: string | null
}

export interface ExamInput {
  patientId: number
  tipo: ExamType
  data: string
  solicitante: string
  convenio: string
  indicacao: string
}

export interface ExamUpdate {
  data?: string
  solicitante?: string
  convenio?: string
  indicacao?: string
  secoes?: ReportSection[]
  urease?: Urease
  conclusao?: string
}

export interface Photo {
  id: number
  examId: number
  arquivo: string // caminho absoluto
  legenda: string
  ordem: number
  createdAt: string
}

export interface Template {
  id: number
  tipo: ExamType
  nome: string
  titulo: string // título impresso no cabeçalho
  secoes: ReportSection[]
  conclusao: string
  legendas: string[] // legendas padrão das fotos, em ordem
  temUrease: boolean
  padrao: boolean
}

export type TemplateInput = Omit<Template, 'id'>

export interface Settings {
  medicoNome: string
  medicoCrm: string
  cabecalhoExtra: string
  pastaImportacao: string
  dispositivoVideoId: string
  fotosPorLinha: number
  convenios: string[]
}

export interface ImportCandidate {
  path: string
  nome: string
  modificadoEm: string
  tamanho: number
}

export interface Api {
  patients: {
    list(query?: string): Promise<Patient[]>
    get(id: number): Promise<Patient | null>
    save(input: PatientInput & { id?: number }): Promise<Patient>
    remove(id: number): Promise<void>
  }
  exams: {
    list(filter?: { query?: string; patientId?: number }): Promise<ExamListItem[]>
    get(id: number): Promise<Exam | null>
    create(input: ExamInput): Promise<Exam>
    update(id: number, patch: ExamUpdate): Promise<Exam>
    remove(id: number): Promise<void>
    applyTemplate(id: number, templateId: number): Promise<Exam>
    openFolder(id: number): Promise<void>
  }
  photos: {
    list(examId: number): Promise<Photo[]>
    capture(examId: number, jpeg: ArrayBuffer): Promise<Photo>
    importFiles(examId: number, paths?: string[]): Promise<Photo[]>
    importCandidates(examId: number): Promise<ImportCandidate[]>
    update(id: number, patch: { legenda?: string }): Promise<Photo>
    reorder(examId: number, ids: number[]): Promise<Photo[]>
    remove(id: number): Promise<void>
  }
  report: {
    generate(examId: number): Promise<{ path: string }>
    open(examId: number): Promise<void>
  }
  templates: {
    list(): Promise<Template[]>
    save(input: TemplateInput & { id?: number }): Promise<Template>
    remove(id: number): Promise<void>
  }
  settings: {
    get(): Promise<Settings>
    save(patch: Partial<Settings>): Promise<Settings>
    chooseFolder(): Promise<string | null>
  }
  suggestions: {
    solicitantes(): Promise<string[]>
    convenios(): Promise<string[]>
  }
  app: {
    version(): Promise<string>
    dataDir(): Promise<string>
  }
  files: {
    /** Caminho absoluto de um File arrastado para a janela (Electron 32+ não expõe File.path). */
    pathFor(file: File): string
  }
}
