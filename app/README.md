# EndoLaudo

Aplicativo de mesa (Windows agora, Mac depois com o mesmo código) para exames de endoscopia digestiva:

- cadastro de pacientes (nome, nascimento/idade, sexo, convênio, telefone);
- exames de **EDA** e **Colonoscopia** com data, médico solicitante, convênio e indicação;
- **captura de imagens direto da placa de captura** (mesmo dispositivo que o Debut usa), com atalho de teclado;
- importação de fotos (arrastar e soltar, seletor de arquivos ou "fotos novas na pasta do Debut");
- **laudo em Word (.docx)** gerado a partir das máscaras, com as fotos em grade legendada, pronto para revisar e imprimir;
- modelos de laudo editáveis dentro do app (texto de cada seção, conclusão e legendas das fotos).

Tudo fica local, sem servidor: banco SQLite + fotos + laudos na pasta `Documentos\EndoLaudo`.

## Stack

Electron 33 · React 18 · TypeScript · electron-vite · better-sqlite3 · docx

```
app/
  src/main/        processo principal (banco, fotos, geração do .docx, IPC)
  src/preload/     ponte segura renderer ↔ main
  src/renderer/    interface (React)
  src/shared/      tipos compartilhados
```

## Rodar em desenvolvimento

Pré-requisito: Node.js 22 LTS (https://nodejs.org).

```bash
cd app
npm install
npm run dev
```

## Gerar o instalador do Windows

```bash
cd app
npm run build:win     # gera app/dist/EndoLaudo-<versão>-Setup.exe
```

Ou, sem instalar nada no PC: na aba **Actions** do GitHub, rode o workflow *Build EndoLaudo* e baixe o artefato
`EndoLaudo-windows`. Criar uma tag `v0.1.0` também dispara o build (Windows e Mac).

## Onde ficam os dados

`Documentos\EndoLaudo\`
- `endolaudo.sqlite` – pacientes, exames, modelos, configurações
- `exames\<data>_<tipo>_<paciente>_<id>\fotos\` – fotos do exame
- `exames\...\Laudo_<tipo>_<paciente>_<data>.docx` – laudo gerado

Faça backup dessa pasta (ou coloque-a dentro do OneDrive/Google Drive).

## Fluxo de uso

1. **Exames → Novo exame**: busca ou cadastra o paciente, escolhe EDA/Colono, data, solicitante, convênio.
2. **Imagens**: vídeo ao vivo da placa de captura. `Espaço` ou `F9` captura; cada foto recebe a próxima legenda do modelo
   (Esôfago proximal, distal, fundo…). Reordene arrastando, edite legendas, exclua.
   Se preferir continuar fotografando pelo Debut, use *Importar arquivos* → *Fotos novas na pasta de captura*.
3. **Laudo**: texto já preenchido pelo modelo "normal"; edite o que for alterado, marque a urease, ajuste a conclusão e
   clique em **Gerar e abrir no Word**.
