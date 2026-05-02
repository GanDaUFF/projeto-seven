import fs from 'fs';
import path from 'path';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, HeightRule, ShadingType, VerticalAlign,
} from 'docx';
import type { ITableCellOptions } from 'docx';

const FONT  = 'Arial';
const BLACK = '000000';
const GRAY  = 'D9D9D9';
const DARK  = '1F1F1F';

function txt(text: string, opts: Record<string, unknown> = {}): TextRun {
  return new TextRun({ text, font: FONT, color: BLACK, ...opts });
}

function para(children: TextRun | TextRun[], opts: Record<string, unknown> = {}): Paragraph {
  return new Paragraph({ children: Array.isArray(children) ? children : [children], ...opts });
}

function spacer(lines = 1): Paragraph[] {
  return Array.from({ length: lines }, () => para([txt('')]));
}

function cell(children: Paragraph | Paragraph[], opts: Partial<ITableCellOptions> = {}): TableCell {
  const paras = Array.isArray(children) ? children : [children];
  return new TableCell({
    children: paras,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    ...opts,
  });
}

function noBorder(): ITableCellOptions['borders'] {
  const side = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: side, bottom: side, left: side, right: side };
}

function solidBorder(color = BLACK, size = 6): ITableCellOptions['borders'] {
  const side = { style: BorderStyle.SINGLE, size, color };
  return { top: side, bottom: side, left: side, right: side };
}

function buildHeader(clienteNome: string, data: string): (Table | Paragraph)[] {
  const title = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell(
            [para([txt('ORDEM DE SERVIÇO', { bold: true, size: 36, color: '1F1F1F' })],
              { alignment: AlignmentType.CENTER })],
            { shading: { fill: GRAY, type: ShadingType.CLEAR }, borders: solidBorder(BLACK, 8) },
          ),
        ],
      }),
    ],
  });

  const fmtData = data.replace(',', '.').replace('.', '/');
  const hoje = new Date().toLocaleDateString('pt-BR');

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell([para([txt('Empresa:', { bold: true }), txt('  SEVEN')])],
            { width: { size: 50, type: WidthType.PERCENTAGE }, borders: solidBorder() }),
          cell([para([txt('Data emissão:', { bold: true }), txt(`  ${hoje}`)])],
            { width: { size: 50, type: WidthType.PERCENTAGE }, borders: solidBorder() }),
        ],
      }),
      new TableRow({
        children: [
          cell([para([txt('Cliente:', { bold: true }), txt(`  ${clienteNome.replace(/_/g, ' ')}`)])],
            { borders: solidBorder() }),
          cell([para([txt('Pasta:', { bold: true }), txt(`  ${fmtData}`)])],
            { borders: solidBorder() }),
        ],
      }),
    ],
  });

  return [title, ...spacer(1), infoTable];
}

function buildMateriais(arquivos: string[]): Table {
  const itens = arquivos.filter(
    (f) => !f.startsWith('OS_') && f !== 'Thumbs.db' && f !== 'desktop.ini',
  );

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell([para([txt('#', { bold: true })], { alignment: AlignmentType.CENTER })],
        { width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: DARK, type: ShadingType.CLEAR }, borders: solidBorder(BLACK) }),
      cell([para([txt('MATERIAL', { bold: true, color: 'FFFFFF' })], { alignment: AlignmentType.LEFT })],
        { shading: { fill: DARK, type: ShadingType.CLEAR }, borders: solidBorder(BLACK) }),
      cell([para([txt('QTD', { bold: true, color: 'FFFFFF' })], { alignment: AlignmentType.CENTER })],
        { width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: DARK, type: ShadingType.CLEAR }, borders: solidBorder(BLACK) }),
    ],
  });

  const itemRows = itens.length > 0
    ? itens.map((arquivo, i) =>
        new TableRow({
          children: [
            cell([para([txt(String(i + 1))], { alignment: AlignmentType.CENTER })],
              { shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5', type: ShadingType.CLEAR }, borders: solidBorder() }),
            cell([para([txt(arquivo)])],
              { shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5', type: ShadingType.CLEAR }, borders: solidBorder() }),
            cell([para([txt('1')], { alignment: AlignmentType.CENTER })],
              { shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5', type: ShadingType.CLEAR }, borders: solidBorder() }),
          ],
        }),
      )
    : [new TableRow({
        children: [
          cell([para([txt('(sem arquivos)')], { alignment: AlignmentType.CENTER })],
            { columnSpan: 3, borders: solidBorder() }),
        ],
      })];

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...itemRows] });
}

function buildRodape(): Table {
  const row = (label: string) =>
    new TableRow({
      children: [
        cell([para([txt(label, { bold: true })])],
          { width: { size: 50, type: WidthType.PERCENTAGE }, borders: solidBorder() }),
        cell([para([txt('R$ ___________')])], { borders: solidBorder() }),
      ],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [row('TOTAL:'), row('PAGO:'), row('SALDO:')],
  });
}

function buildEvidencia(): (Paragraph | Table)[] {
  const label = para(
    [txt('ESPAÇO PARA EVIDÊNCIA / FOTO', { bold: true, size: 20 })],
    { alignment: AlignmentType.CENTER },
  );

  const areaRows = Array.from({ length: 10 }, () =>
    new TableRow({
      height: { value: 400, rule: HeightRule.EXACT },
      children: [
        cell([para([txt('')])],
          { borders: solidBorder(GRAY, 4), shading: { fill: 'FAFAFA', type: ShadingType.CLEAR } }),
      ],
    }),
  );

  return [label, new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: areaRows })];
}

export async function generateOS(
  impressaoDir: string,
  data: string,
  clienteNome: string,
): Promise<{ fileName: string; filePath: string }> {
  const clientePath = path.join(impressaoDir, data, clienteNome);

  if (!fs.existsSync(clientePath)) {
    throw new Error(`Pasta não encontrada: ${clientePath}`);
  }

  const arquivos = fs.readdirSync(clientePath)
    .filter((f) => fs.statSync(path.join(clientePath, f)).isFile())
    .sort();

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        ...buildHeader(clienteNome, data),
        ...spacer(1),
        para([txt('MATERIAIS', { bold: true, size: 22 })]),
        ...spacer(0),
        buildMateriais(arquivos),
        ...spacer(1),
        para([txt('FINANCEIRO', { bold: true, size: 22 })]),
        ...spacer(0),
        buildRodape(),
        ...spacer(1),
        ...buildEvidencia(),
        ...spacer(1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell(
                  [para([txt('Assinatura do cliente: ________________________')],
                    { alignment: AlignmentType.CENTER })],
                  { borders: noBorder() },
                ),
              ],
            }),
          ],
        }),
      ],
    }],
  });

  const dataSlug    = data.replace(/[,.]/g, '-');
  const clienteSlug = clienteNome.replace(/\s+/g, '_');
  const fileName    = `OS_${clienteSlug}_${dataSlug}.docx`;
  const filePath    = path.join(clientePath, fileName);

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);

  return { fileName, filePath };
}
