import type { TemplateInput } from '@shared/types'

export const SEED_TEMPLATES: TemplateInput[] = [
  {
    tipo: 'EDA',
    nome: 'EDA normal',
    titulo: 'ENDOSCOPIA DIGESTIVA ALTA',
    padrao: true,
    temUrease: true,
    secoes: [
      {
        titulo: 'Esôfago:',
        texto:
          'Pérvio, com motilidade, contratilidade e calibre preservados. A mucosa de revestimento encontra-se íntegra em toda a sua extensão. A transição esofagogástrica (TEG) encontra-se no nível do pinçamento diafragmático, não se evidenciando hérnia hiatal por deslizamento.'
      },
      {
        titulo: 'Estômago:',
        texto:
          'Com forma e volume conservados, boa expansibilidade e contratilidade. “Lago gástrico” com pouca quantidade de líquido de aspecto mucoso claro, sem elementos patológicos. O pregueado mucoso integro. A mucosa de revestimento encontra-se regular e com coloração habitual. Na manobra de retrovisão se observa hiato diafragmático alargado sobre o aparelho. Piloro arredondado, concêntrico e pérvio.'
      },
      {
        titulo: 'Duodeno:',
        texto:
          'Bulbo duodeno amplo sem deformidades, com forma, calibre, expansibilidade e contratilidade preservados. A mucosa de revestimento encontra-se regular e com coloração habitual. Não há estenose progredindo-se para a 2ª porção e a mucosa se encontra com aspecto normal.'
      }
    ],
    conclusao: '- EXAME DENTRO DOS PADRÕES DA NORMALIDADE.',
    legendas: [
      'ESÔFAGO PROXIMAL',
      'ESÔFAGO DISTAL',
      'FUNDO',
      'CORPO GÁSTRICO',
      'INCISURA ANGULAR',
      'ANTRO',
      'PILORO',
      'BULBO DUODENAL',
      '2ª PORÇÃO'
    ]
  },
  {
    tipo: 'COLONO',
    nome: 'Colonoscopia normal',
    titulo: 'COLONOSCOPIA',
    padrao: true,
    temUrease: false,
    secoes: [
      {
        titulo: 'Preparo:',
        texto: 'Preparo intestinal adequado (Boston 9), permitindo boa visualização da mucosa em todos os segmentos.'
      },
      {
        titulo: 'Reto e canal anal:',
        texto:
          'Ampola retal com distensibilidade preservada. Mucosa de aspecto normal, incluindo a manobra de retrovisão. Linha pectínea e canal anal sem alterações.'
      },
      {
        titulo: 'Cólon:',
        texto:
          'Aparelho progredido até o ceco, identificado pela válvula ileocecal e óstio apendicular. Sigmoide, descendente, transverso, ascendente e ceco com haustrações preservadas, calibre normal e mucosa de coloração habitual, lisa e brilhante, com padrão vascular submucoso íntegro. Não foram observados pólipos, divertículos, lesões elevadas ou deprimidas.'
      },
      {
        titulo: 'Íleo terminal:',
        texto: 'Válvula ileocecal pérvia, com aspecto normal. Íleo terminal examinado em cerca de 10 cm, com mucosa de aspecto normal.'
      }
    ],
    conclusao: '- EXAME DENTRO DOS PADRÕES DA NORMALIDADE.',
    legendas: [
      'RETO',
      'SIGMOIDE',
      'DESCENDENTE',
      'TRANSVERSO',
      'ASCENDENTE',
      'CECO',
      'VÁLVULA ILEOCECAL',
      'ÍLEO TERMINAL',
      'RETROVISÃO RETAL'
    ]
  }
]

export const DEFAULT_CONVENIOS = ['AMHEMED', 'Fênix', 'Particular', 'Unimed', 'SUS']
