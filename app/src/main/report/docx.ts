import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx'
import { writeFileSync } from 'fs'
import { join } from 'path'
import type { Exam, Patient, Photo, Settings, Template } from '@shared/types'
import { examFolder, imageSize, photoForReport } from '../photos'
import { exams, patients, photos as photoRepo, settings as settingsRepo, templates } from '../repo'

const FONT = 'Arial'
const BLACK = '000000'

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

export function idade(dn: string, ref: string): string {
  if (!dn) return ''
  const a = new Date(dn + 'T00:00:00')
  const b = new Date((ref || new Date().toISOString().slice(0, 10)) + 'T00:00:00')
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return ''
  let y = b.getFullYear() - a.getFullYear()
  const m = b.getMonth() - a.getMonth()
  if (m < 0 || (m === 0 && b.getDate() < a.getDate())) y--
  return y >= 0 ? `${y} anos` : ''
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' }
const NO_BORDERS = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }
const thin = { style: BorderStyle.SINGLE, size: 4, color: 'auto' }
const THIN_BORDERS = { top: thin, bottom: thin, left: thin, right: thin }

function bodyRun(text: string, bold = false): TextRun {
  return new TextRun({ text, bold, font: FONT, color: BLACK })
}

function bodyPara(children: TextRun[], opts: { alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.alignment ?? AlignmentType.JUSTIFIED,
    spacing: { before: 0, after: 0 },
    children
  })
}

function blank(): Paragraph {
  return new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })
}

function headerCell(width: number, runs: TextRun[]): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: NO_BORDERS,
    children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: runs })]
  })
}

function hdrRun(text: string, bold = true): TextRun {
  return new TextRun({ text, bold, font: FONT, size: 24 })
}

function buildHeader(exam: Exam, patient: Patient, tpl: Template | null, cfg: Settings): Header {
  const title = tpl?.titulo || (exam.tipo === 'EDA' ? 'ENDOSCOPIA DIGESTIVA ALTA' : 'COLONOSCOPIA')
  const W = 5385
  const idadeTxt = idade(patient.dataNascimento, exam.data)
  const rows = [
    new TableRow({
      children: [
        headerCell(W, [hdrRun('Paciente: '), new TextRun({ text: patient.nome.toUpperCase(), font: 'Calibri', color: BLACK })]),
        headerCell(W, [])
      ]
    }),
    new TableRow({
      children: [
        headerCell(W, [
          hdrRun('Sexo:   '),
          hdrRun(patient.sexo || '-'),
          ...(idadeTxt ? [hdrRun('        Idade: '), hdrRun(idadeTxt)] : [])
        ]),
        headerCell(W, [hdrRun('Data: '), hdrRun(fmtDate(exam.data))])
      ]
    }),
    new TableRow({
      children: [
        headerCell(W, [hdrRun('Solicitante: '), hdrRun(exam.solicitante || '-')]),
        headerCell(W, exam.convenio ? [hdrRun('Convênio: '), hdrRun(exam.convenio)] : [])
      ]
    })
  ]
  const children: (Paragraph | Table)[] = []
  if (cfg.cabecalhoExtra.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: cfg.cabecalhoExtra.trim(), font: FONT, size: 18 })]
      })
    )
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [new TextRun({ text: title, bold: true, underline: {}, size: 36, font: FONT })]
    }),
    new Table({
      width: { size: W * 2, type: WidthType.DXA },
      columnWidths: [W, W],
      borders: { ...NO_BORDERS, insideHorizontal: noBorder, insideVertical: noBorder },
      rows
    }),
    blank()
  )
  return new Header({ children })
}

function buildFooter(cfg: Settings): Footer {
  const center = (text: string, bold = false, size = 22): Paragraph =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text, bold, font: FONT, size })]
    })
  return new Footer({
    children: [blank(), center('_____________________________', false, 24), center(cfg.medicoNome, true), center(cfg.medicoCrm, true)]
  })
}

function ureaseTable(urease: Exam['urease']): Table {
  const W = 5310
  const cell = (label: string, marked: boolean): TableCell =>
    new TableCell({
      width: { size: W, type: WidthType.DXA },
      borders: NO_BORDERS,
      children: [bodyPara([bodyRun(`( ${marked ? 'X' : '  '} ) ${label}`)], { alignment: AlignmentType.LEFT })]
    })
  return new Table({
    width: { size: W * 2, type: WidthType.DXA },
    columnWidths: [W, W],
    borders: { ...NO_BORDERS, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [new TableRow({ children: [cell('POSITIVO', urease === 'POSITIVO'), cell('NEGATIVO', urease === 'NEGATIVO')] })]
  })
}

function photoTable(photos: Photo[], perRow: number): Table {
  const TOTAL = 10800
  const colW = Math.floor(TOTAL / perRow)
  const cellPxWidth = Math.round((colW / 1440) * 96) - 10 // pontos → pixels @96dpi, com folga
  const rows: TableRow[] = []
  for (let i = 0; i < photos.length; i += perRow) {
    const chunk = photos.slice(i, i + perRow)
    const imgCells: TableCell[] = []
    const labelCells: TableCell[] = []
    for (let c = 0; c < perRow; c++) {
      const p = chunk[c]
      let imgChildren: Paragraph[] = [blank()]
      if (p) {
        try {
          const data = photoForReport(p.arquivo)
          const { width, height } = imageSize(p.arquivo)
          const h = Math.round((cellPxWidth * height) / width)
          imgChildren = [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [new ImageRun({ type: 'jpg', data, transformation: { width: cellPxWidth, height: h } })]
            })
          ]
        } catch {
          imgChildren = [bodyPara([bodyRun('[imagem indisponível]')], { alignment: AlignmentType.CENTER })]
        }
      }
      imgCells.push(
        new TableCell({
          width: { size: colW, type: WidthType.DXA },
          borders: THIN_BORDERS,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 40, bottom: 40, left: 40, right: 40 },
          children: imgChildren
        })
      )
      labelCells.push(
        new TableCell({
          width: { size: colW, type: WidthType.DXA },
          borders: THIN_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [new TextRun({ text: p?.legenda ?? '', font: 'Calibri', size: 22 })]
            })
          ]
        })
      )
    }
    rows.push(new TableRow({ cantSplit: true, children: imgCells }))
    rows.push(new TableRow({ cantSplit: true, children: labelCells }))
  }
  return new Table({
    width: { size: colW * perRow, type: WidthType.DXA },
    columnWidths: Array(perRow).fill(colW),
    borders: { ...THIN_BORDERS, insideHorizontal: thin, insideVertical: thin },
    rows
  })
}

export async function generateReport(examId: number): Promise<{ path: string }> {
  const exam = exams.get(examId)
  if (!exam) throw new Error('Exame não encontrado')
  const patient = patients.get(exam.patientId)
  if (!patient) throw new Error('Paciente não encontrado')
  const cfg = settingsRepo.get()
  const tpl = templates.defaultFor(exam.tipo)
  const fotos = photoRepo.list(examId)

  const body: (Paragraph | Table)[] = []
  if (exam.indicacao.trim()) {
    body.push(bodyPara([bodyRun('Indicação: ', true), bodyRun(exam.indicacao.trim())]), blank())
  }
  exam.secoes.forEach((s, i) => {
    if (i > 0) body.push(blank())
    const titulo = s.titulo.trim()
    const texto = s.texto.trim()
    body.push(bodyPara([bodyRun(titulo, true)]))
    if (texto) body.push(bodyPara([bodyRun(texto)]))
  })

  if (exam.tipo === 'EDA' && (tpl?.temUrease ?? true) && exam.urease !== 'NAO') {
    body.push(blank())
    body.push(
      bodyPara([
        bodyRun('Realizada a biópsia para o Teste da Urease para pesquisa de ', true),
        new TextRun({ text: 'H. pylori', bold: true, italics: true, font: FONT, color: BLACK }),
        bodyRun(', que resultou:', true)
      ])
    )
    body.push(ureaseTable(exam.urease))
  }

  body.push(blank(), bodyPara([bodyRun('Conclusão:', true)]))
  for (const line of exam.conclusao.split(/\r?\n/)) {
    body.push(bodyPara([bodyRun(line)], { alignment: AlignmentType.LEFT }))
  }

  if (fotos.length) {
    body.push(new Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 0 }, children: [] }))
    body.push(photoTable(fotos, Math.max(2, Math.min(4, cfg.fotosPorLinha || 3))))
  }

  const doc = new Document({
    creator: cfg.medicoNome,
    title: `${tpl?.titulo ?? exam.tipo} - ${patient.nome}`,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1954, right: 566, bottom: 1417, left: 709, header: 426, footer: 708 }
          }
        },
        headers: { default: buildHeader(exam, patient, tpl, cfg) },
        footers: { default: buildFooter(cfg) },
        children: body
      }
    ]
  })

  const buf = await Packer.toBuffer(doc)
  const dir = examFolder(examId)
  const safeName = patient.nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 50)
  const path = join(dir, `Laudo_${exam.tipo}_${safeName}_${exam.data}.docx`)
  writeFileSync(path, buf)
  exams.setLaudo(examId, path)
  return { path }
}
