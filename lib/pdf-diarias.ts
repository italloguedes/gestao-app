import jsPDF from 'jspdf';
import { PDFDocument } from 'pdf-lib';

// ===== TIPOS =====

export interface ServidorDiaria {
    nome: string;
    cpf: string;
    matricula: string;
    assinaturaUrl?: string | null; // URL da assinatura salva no sistema
    assinaturaBase64?: string | null; // Base64 da assinatura carregada
}

export interface AnexoDiaria {
    id: string;
    nome: string;
    tipo: 'image' | 'pdf';
    dataUrl: string; // base64 data URL
    ordem: number;
}

export interface DiariasPdfParams {
    setor: string;
    temaAtividade: string;
    deputadoChefe: string;
    cidade: string;
    dataAtividade: string;
    servidores: ServidorDiaria[];
    justificativa: string;
    nexoFotos: boolean;
    nexoRecibos: boolean;
    nexoAta: boolean;
    logoBase64: string;
    anexos: AnexoDiaria[];
}

// ===== CONSTANTES DE COR E LAYOUT (baseadas na planilha original) =====

// Cores da planilha original
const BORDER_COLOR: [number, number, number] = [0, 0, 0]; // Preto para bordas
const HEADER_BG: [number, number, number] = [198, 170, 105]; // Dourado/tan do cabeçalho da tabela
const HEADER_TEXT: [number, number, number] = [0, 0, 0]; // Texto preto
const CELL_BG: [number, number, number] = [255, 255, 255]; // Branco
const TITLE_COLOR: [number, number, number] = [0, 0, 0]; // Preto

const MARGIN_LEFT = 10;
const MARGIN_RIGHT = 200;
const CONTENT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;

function drawBorderedRect(doc: jsPDF, x: number, y: number, w: number, h: number, fillColor?: [number, number, number]) {
    if (fillColor) {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    }
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.setLineWidth(0.4);
    doc.rect(x, y, w, h, fillColor ? 'FD' : 'S');
}

// ===== GERADOR PRINCIPAL =====

export const generateDiariasPDF = async ({
    setor,
    temaAtividade,
    deputadoChefe,
    cidade,
    dataAtividade,
    servidores,
    justificativa,
    nexoFotos,
    nexoRecibos,
    nexoAta,
    logoBase64,
    anexos,
}: DiariasPdfParams): Promise<string> => {
    const doc = new jsPDF({ compress: true });
    const pageW = doc.internal.pageSize.getWidth();

    // ============================
    // LINHA 1-2: CABEÇALHO COM LOGO + TÍTULO
    // ============================

    // Célula do logo (coluna A, linhas 1-2)
    const logoColW = 30;
    const headerH = 20;
    drawBorderedRect(doc, MARGIN_LEFT, 8, logoColW, headerH, CELL_BG);

    // Logo ALECE
    if (logoBase64) {
        const logoFormat = logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(logoBase64, logoFormat, MARGIN_LEFT + 2, 9, 26, 18, undefined, 'FAST');
    }

    // Célula do título (colunas B-H, linha 1)
    const titleCellW = CONTENT_WIDTH - logoColW;
    drawBorderedRect(doc, MARGIN_LEFT + logoColW, 8, titleCellW, 10, CELL_BG);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(TITLE_COLOR[0], TITLE_COLOR[1], TITLE_COLOR[2]);
    doc.text('DIRETORIA ADMINISTRAÇÃO FINANCEIRA - DAF', MARGIN_LEFT + logoColW + titleCellW / 2, 15, { align: 'center' });

    // Célula do subtítulo (colunas B-H, linha 2)
    drawBorderedRect(doc, MARGIN_LEFT + logoColW, 18, titleCellW, 10, CELL_BG);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(TITLE_COLOR[0], TITLE_COLOR[1], TITLE_COLOR[2]);
    doc.text('ANEXO II - RELATÓRIOS DE DIÁRIAS (Prestação de Contas)', MARGIN_LEFT + logoColW + titleCellW / 2, 25, { align: 'center' });

    // ============================
    // LINHA 3: Vazia (separador)
    // ============================
    let y = 28;
    const ROW_H = 7;
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    y += ROW_H;

    // ============================
    // LINHA 4: SETOR
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`SETOR: ${setor.toUpperCase()}`, MARGIN_LEFT + 3, y + 5);
    y += ROW_H;

    // ============================
    // LINHA 5: TEMA DA ATIVIDADE
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TEMA DA ATIVIDADE: ', MARGIN_LEFT + 3, y + 5);
    const temaLabelW = doc.getTextWidth('TEMA DA ATIVIDADE: ');
    doc.setFont('helvetica', 'normal');
    doc.text(temaAtividade.toUpperCase(), MARGIN_LEFT + 3 + temaLabelW, y + 5, { maxWidth: CONTENT_WIDTH - temaLabelW - 6 });
    y += ROW_H;

    // ============================
    // LINHA 6: DEPUTADO/CHEFE SOLICITANTE
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DEPUTADO/CHEFE SOLICITANTE: ', MARGIN_LEFT + 3, y + 5);
    const depLabelW = doc.getTextWidth('DEPUTADO/CHEFE SOLICITANTE: ');
    doc.setFont('helvetica', 'normal');
    doc.text(deputadoChefe.toUpperCase(), MARGIN_LEFT + 3 + depLabelW, y + 5);
    y += ROW_H;

    // ============================
    // LINHA 7: CIDADE + DATA DA ATIVIDADE
    // ============================
    const halfW = CONTENT_WIDTH / 2;
    // Célula da cidade
    drawBorderedRect(doc, MARGIN_LEFT, y, halfW, ROW_H, CELL_BG);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CIDADE: ', MARGIN_LEFT + 3, y + 5);
    const cidLabelW = doc.getTextWidth('CIDADE: ');
    doc.setFont('helvetica', 'normal');
    doc.text(`${cidade.toUpperCase()} - CE`, MARGIN_LEFT + 3 + cidLabelW, y + 5);

    // Célula da data
    drawBorderedRect(doc, MARGIN_LEFT + halfW, y, halfW, ROW_H, CELL_BG);
    doc.setFont('helvetica', 'bold');
    doc.text('DATA DA ATIVIDADE:  ', MARGIN_LEFT + halfW + 3, y + 5);
    const dataLabelW = doc.getTextWidth('DATA DA ATIVIDADE:  ');
    doc.setFont('helvetica', 'normal');
    doc.text(dataAtividade.toUpperCase(), MARGIN_LEFT + halfW + 3 + dataLabelW, y + 5);
    y += ROW_H;

    // ============================
    // LINHA 8: Vazia (separador)
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    y += ROW_H;

    // ============================
    // LINHA 9: CABEÇALHO DA TABELA DE SERVIDORES
    // ============================
    const colServidor = MARGIN_LEFT;
    const colMatricula = 115;
    const colPeriodo = 140;
    const colAssinatura = 175;

    const headerRowH = 8;

    // Background dourado/tan para o cabeçalho
    drawBorderedRect(doc, colServidor, y, colMatricula - colServidor, headerRowH, HEADER_BG);
    drawBorderedRect(doc, colMatricula, y, colPeriodo - colMatricula, headerRowH, HEADER_BG);
    drawBorderedRect(doc, colPeriodo, y, colAssinatura - colPeriodo, headerRowH, HEADER_BG);
    drawBorderedRect(doc, colAssinatura, y, MARGIN_RIGHT - colAssinatura, headerRowH, HEADER_BG);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(HEADER_TEXT[0], HEADER_TEXT[1], HEADER_TEXT[2]);
    doc.text('SERVIDOR / CPF', colServidor + (colMatricula - colServidor) / 2, y + 5.5, { align: 'center' });
    doc.text('MATRÍCULA', colMatricula + (colPeriodo - colMatricula) / 2, y + 5.5, { align: 'center' });
    doc.text('PERÍODO DA VIAGEM', colPeriodo + (colAssinatura - colPeriodo) / 2, y + 5.5, { align: 'center' });
    doc.text('ASSINATURA', colAssinatura + (MARGIN_RIGHT - colAssinatura) / 2, y + 5.5, { align: 'center' });

    y += headerRowH;

    // ============================
    // LINHAS 10+: DADOS DOS SERVIDORES
    // ============================
    const DATA_ROW_H = 10;
    // Garantir pelo menos 5 linhas (como a planilha)
    const totalRows = Math.max(servidores.length, 5);

    for (let i = 0; i < totalRows; i++) {
        const servidor = servidores[i];

        // Cada célula da linha
        drawBorderedRect(doc, colServidor, y, colMatricula - colServidor, DATA_ROW_H, CELL_BG);
        drawBorderedRect(doc, colMatricula, y, colPeriodo - colMatricula, DATA_ROW_H, CELL_BG);
        drawBorderedRect(doc, colPeriodo, y, colAssinatura - colPeriodo, DATA_ROW_H, CELL_BG);
        drawBorderedRect(doc, colAssinatura, y, MARGIN_RIGHT - colAssinatura, DATA_ROW_H, CELL_BG);

        if (servidor) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);

            // Nome / CPF
            const nomeText = `${servidor.nome.toUpperCase()} / ${servidor.cpf}`;
            doc.text(nomeText, colServidor + 2, y + 6, { maxWidth: colMatricula - colServidor - 4 });

            // Matrícula (centralizada)
            doc.text(servidor.matricula, colMatricula + (colPeriodo - colMatricula) / 2, y + 6, { align: 'center' });

            // Período da viagem (centralizado)
            doc.text(dataAtividade.toUpperCase(), colPeriodo + (colAssinatura - colPeriodo) / 2, y + 6, { align: 'center', maxWidth: colAssinatura - colPeriodo - 4 });

            // Assinatura
            if (servidor.assinaturaBase64) {
                try {
                    doc.addImage(
                        servidor.assinaturaBase64,
                        'PNG',
                        colAssinatura + 2,
                        y + 1,
                        MARGIN_RIGHT - colAssinatura - 4,
                        DATA_ROW_H - 2,
                        undefined,
                        'FAST'
                    );
                } catch (e) {
                    console.error('Erro ao adicionar assinatura:', e);
                }
            }
        }

        y += DATA_ROW_H;
    }

    // ============================
    // LINHA VAZIA (separador antes da justificativa)
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    y += ROW_H;

    // ============================
    // JUSTIFICATIVA (título centralizado em negrito)
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('JUSTIFICATIVA', pageW / 2, y + 5, { align: 'center' });
    y += ROW_H;

    // Conteúdo da justificativa
    const justH = Math.max(14, 8);
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, justH, CELL_BG);

    if (justificativa) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(justificativa, CONTENT_WIDTH - 6);
        doc.text(lines, MARGIN_LEFT + 3, y + 5);
    }
    y += justH;

    // ============================
    // LINHA VAZIA (separador)
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    y += ROW_H;

    // ============================
    // ANEXOS - Texto explicativo
    // ============================
    const anexoTexto = 'ANEXOS ( Apresentação de docs comprobatórios, são eles: Lista de presença, Cópia de Atas,Certificados, Declarações, Relatórios, fotos, Recibos, ou outros Docs que comprovam a atividade que motivou o deslocamento';
    const anexoLines = doc.splitTextToSize(anexoTexto, CONTENT_WIDTH - 6);
    const anexoTextH = Math.max(14, anexoLines.length * 4 + 4);

    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, anexoTextH, CELL_BG);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(anexoLines, MARGIN_LEFT + 3, y + 5);
    y += anexoTextH;

    // ============================
    // CHECKBOXES (FOTOS, RECIBOS, ATA)
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const fotosCheck = nexoFotos ? '(x)' : '( )';
    const recibosCheck = nexoRecibos ? '(x)' : '( )';
    const ataCheck = nexoAta ? '(x)' : '( )';

    doc.text(`${fotosCheck} FOTOS    ${recibosCheck}RECIBOS    ${ataCheck} ATA`, pageW / 2, y + 5, { align: 'center' });
    y += ROW_H;

    // ============================
    // LINHA VAZIA (separador)
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);
    y += ROW_H;

    // ============================
    // ASSINATURA DO DEPUTADO/CHEFE
    // ============================
    const sigH = 18;
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, sigH, CELL_BG);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Deputado/Chefe Solicitante', MARGIN_LEFT + 3, y + 6);
    doc.text('CIENTE: ______________', MARGIN_LEFT + 3, y + 13);

    y += sigH;

    // ============================
    // LINHA VAZIA FINAL
    // ============================
    drawBorderedRect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_H, CELL_BG);

    // ============================
    // PÁGINAS DE ANEXOS
    // Respeita a ordem definida pelo usuário.
    // Fotos consecutivas: 4 por página (grid 2x2)
    // PDFs: página inteira cada
    // ============================

    if (anexos.length > 0) {
        // Agrupa anexos consecutivos do mesmo tipo
        const grupos: AnexoDiaria[][] = [];
        let grupoAtual: AnexoDiaria[] = [];
        let tipoAtual: string | null = null;

        for (const anexo of anexos) {
            if (anexo.tipo !== tipoAtual) {
                if (grupoAtual.length > 0) grupos.push([...grupoAtual]);
                grupoAtual = [anexo];
                tipoAtual = anexo.tipo;
            } else {
                grupoAtual.push(anexo);
            }
        }
        if (grupoAtual.length > 0) grupos.push([...grupoAtual]);

        for (const grupo of grupos) {
            const tipo = grupo[0].tipo;

            if (tipo === 'image') {
                const IMGS_PER_PAGE = 4;
                const totalPages = Math.ceil(grupo.length / IMGS_PER_PAGE);

                for (let page = 0; page < totalPages; page++) {
                    doc.addPage();

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(0, 0, 0);
                    doc.text('ANEXOS - COMPROVANTES', pageW / 2, 10, { align: 'center' });

                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(0.5);
                    doc.line(MARGIN_LEFT, 14, MARGIN_RIGHT, 14);

                    const gridStartY = 18;
                    const cellPadding = 4;
                    const cellW = (CONTENT_WIDTH - cellPadding) / 2;
                    const cellH = 122;
                    const positions = [
                        { x: MARGIN_LEFT, y: gridStartY },
                        { x: MARGIN_LEFT + cellW + cellPadding, y: gridStartY },
                        { x: MARGIN_LEFT, y: gridStartY + cellH + cellPadding + 6 },
                        { x: MARGIN_LEFT + cellW + cellPadding, y: gridStartY + cellH + cellPadding + 6 },
                    ];

                    const startIdx = page * IMGS_PER_PAGE;
                    const endIdx = Math.min(startIdx + IMGS_PER_PAGE, grupo.length);

                    for (let i = startIdx; i < endIdx; i++) {
                        const anexo = grupo[i];
                        const pos = positions[i - startIdx];

                        doc.setDrawColor(0, 0, 0);
                        doc.setLineWidth(0.3);
                        doc.rect(pos.x, pos.y, cellW, cellH + 6, 'S');

                        try {
                            const imgFormat = anexo.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
                            doc.addImage(
                                anexo.dataUrl, imgFormat,
                                pos.x + 2, pos.y + 2,
                                cellW - 4, cellH - 4,
                                undefined, 'FAST'
                            );
                        } catch (e) {
                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(7);
                            doc.setTextColor(200, 50, 50);
                            doc.text('Erro ao carregar', pos.x + cellW / 2, pos.y + cellH / 2, { align: 'center' });
                        }

                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(6);
                        doc.setTextColor(100, 100, 100);
                        const labelText = anexo.nome.length > 30 ? anexo.nome.substring(0, 27) + '...' : anexo.nome;
                        doc.text(labelText, pos.x + cellW / 2, pos.y + cellH + 3, { align: 'center' });
                    }

                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(0.3);
                    doc.line(MARGIN_LEFT, 280, MARGIN_RIGHT, 280);
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(6);
                    doc.setTextColor(120, 120, 120);
                    doc.text(`Comprovantes — Pág. ${page + 1}/${totalPages}`, pageW / 2, 284, { align: 'center' });
                }
            } else {
                // PDFs serão inseridos via pdf-lib depois
                // Marca posição para inserir depois
                for (const anexo of grupo) {
                    doc.addPage();
                    // Página marcadora (será substituída pelo pdf-lib)
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.setTextColor(255, 255, 255);
                    doc.text(`__PDF_PLACEHOLDER__${anexo.id}`, 0, 0);
                }
            }
        }
    }

    // ============================
    // MERGE com pdf-lib para embutir PDFs reais
    // ============================

    const pdfAnexos = anexos.filter(a => a.tipo === 'pdf');

    if (pdfAnexos.length === 0) {
        // Sem PDFs anexados, retorna direto
        const pdfBlob = doc.output('blob');
        return URL.createObjectURL(pdfBlob);
    }

    // Converter jsPDF para pdf-lib
    const jspdfBytes = doc.output('arraybuffer');
    const mergedPdf = await PDFDocument.load(jspdfBytes);

    // Encontrar páginas marcadoras e substituir por páginas reais do PDF
    const totalPdfPages = mergedPdf.getPageCount();

    // Abordagem simples: remover placeholders e inserir PDFs reais na posição correta
    // Reconstruir: criar novo PDF, copiar páginas do jsPDF e inserir PDFs reais

    const finalPdf = await PDFDocument.create();

    // Rastrear páginas do jsPDF que são placeholder
    // Recalcular: percorrer os grupos na mesma ordem e identificar
    const grupos2: AnexoDiaria[][] = [];
    let ga: AnexoDiaria[] = [];
    let ta: string | null = null;
    for (const anexo of anexos) {
        if (anexo.tipo !== ta) {
            if (ga.length > 0) grupos2.push([...ga]);
            ga = [anexo]; ta = anexo.tipo;
        } else { ga.push(anexo); }
    }
    if (ga.length > 0) grupos2.push([...ga]);

    // Contar páginas: relatório principal (antes dos anexos)
    const mainReportPages = totalPdfPages - anexos.reduce((acc, a) => {
        if (a.tipo === 'pdf') return acc + 1;
        return acc;
    }, 0) - (() => {
        // Contar páginas de imagens
        let imgPages = 0;
        for (const g of grupos2) {
            if (g[0].tipo === 'image') {
                imgPages += Math.ceil(g.length / 4);
            }
        }
        return imgPages;
    })();

    // Copiar páginas do relatório principal
    let srcPageIdx = 0;
    const mainPages = await finalPdf.copyPages(mergedPdf, Array.from({ length: mainReportPages }, (_, i) => i));
    for (const p of mainPages) {
        finalPdf.addPage(p);
    }
    srcPageIdx = mainReportPages;

    // Agora processar grupos na ordem do usuário
    for (const grupo of grupos2) {
        if (grupo[0].tipo === 'image') {
            const imgGroupPages = Math.ceil(grupo.length / 4);
            const indices = Array.from({ length: imgGroupPages }, (_, i) => srcPageIdx + i);
            const copiedPages = await finalPdf.copyPages(mergedPdf, indices);
            for (const p of copiedPages) {
                finalPdf.addPage(p);
            }
            srcPageIdx += imgGroupPages;
        } else {
            // PDF: inserir páginas reais do arquivo
            for (const anexo of grupo) {
                srcPageIdx++; // pular placeholder
                try {
                    // Converter data URL para bytes
                    const base64Data = anexo.dataUrl.split(',')[1];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const attachedPdf = await PDFDocument.load(bytes);
                    const attachedPages = await finalPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
                    for (const p of attachedPages) {
                        finalPdf.addPage(p);
                    }
                } catch (e) {
                    console.error(`Erro ao embutir PDF ${anexo.nome}:`, e);
                    // Fallback: copiar a página placeholder
                    const [fallback] = await finalPdf.copyPages(mergedPdf, [srcPageIdx - 1]);
                    finalPdf.addPage(fallback);
                }
            }
        }
    }

    const finalBytes = await finalPdf.save();
    const finalBlob = new Blob([finalBytes], { type: 'application/pdf' });
    return URL.createObjectURL(finalBlob);
};
