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

// ===== HELPERS =====

const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 195;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;

function drawHorizontalLine(doc: jsPDF, y: number, color: number[] = [180, 180, 180], width = 0.3) {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(width);
    doc.line(MARGIN_LEFT, y, MARGIN_RIGHT, y);
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
    // CABEÇALHO INSTITUCIONAL
    // ============================
    
    // Logo ALECE à esquerda
    if (logoBase64) {
        const logoFormat = logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(logoBase64, logoFormat, MARGIN_LEFT, 6, 18, 20, undefined, 'FAST');
    }

    // Título principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('DIRETORIA ADMINISTRAÇÃO FINANCEIRA - DAF', pageW / 2, 15, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text('ANEXO II - RELATÓRIOS DE DIÁRIAS (Prestação de Contas)', pageW / 2, 22, { align: 'center' });

    // Linhas decorativas no cabeçalho
    doc.setDrawColor(0, 80, 50);
    doc.setLineWidth(1.2);
    doc.line(MARGIN_LEFT, 28, MARGIN_RIGHT, 28);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_LEFT, 30, MARGIN_RIGHT, 30);

    // ============================
    // DADOS GERAIS
    // ============================
    let y = 36;

    const LABEL_X = MARGIN_LEFT + 3;
    const ROW_H = 7; // Altura de cada linha de campo

    // Caixa externa da seção de dados (4 linhas × ROW_H)
    const dataBoxH = ROW_H * 4;
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(0, 80, 50);
    doc.setLineWidth(0.8);
    doc.rect(MARGIN_LEFT, y - 2, CONTENT_WIDTH, dataBoxH, 'FD');

    // Linha 1: SETOR
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('SETOR:', LABEL_X, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(10, 10, 10);
    doc.text(setor.toUpperCase(), LABEL_X + 30, y + 3);

    // Linha separadora
    y += ROW_H;
    doc.setDrawColor(0, 80, 50);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_LEFT, y - 2, MARGIN_RIGHT, y - 2);

    // Linha 2: TEMA DA ATIVIDADE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('TEMA DA ATIVIDADE:', LABEL_X, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(10, 10, 10);
    doc.text(temaAtividade.toUpperCase(), LABEL_X + 55, y + 3, { maxWidth: CONTENT_WIDTH - 60 });

    // Linha separadora
    y += ROW_H;
    doc.setDrawColor(0, 80, 50);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_LEFT, y - 2, MARGIN_RIGHT, y - 2);

    // Linha 3: DEPUTADO/CHEFE SOLICITANTE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('DEPUTADO/CHEFE SOLICITANTE:', LABEL_X, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(10, 10, 10);
    doc.text(deputadoChefe.toUpperCase(), LABEL_X + 78, y + 3);

    // Linha separadora
    y += ROW_H;
    doc.setDrawColor(0, 80, 50);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_LEFT, y - 2, MARGIN_RIGHT, y - 2);

    // Linha 4: CIDADE + DATA DA ATIVIDADE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('CIDADE:', LABEL_X, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(10, 10, 10);
    doc.text(`${cidade.toUpperCase()} - CE`, LABEL_X + 30, y + 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('DATA DA ATIVIDADE:', 110, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(10, 10, 10);
    doc.text(dataAtividade.toUpperCase(), 160, y + 3);

    y += ROW_H + 5;

    // ============================
    // TABELA DE SERVIDORES
    // ============================

    // Cabeçalho da tabela
    const tableStartY = y;
    const colServidor = MARGIN_LEFT;
    const colMatricula = 110;
    const colPeriodo = 130;
    const colAssinatura = 165;

    // Header background
    doc.setFillColor(0, 100, 60);
    doc.rect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('SERVIDOR / CPF', colServidor + 2, tableStartY + 5.5);
    doc.text('MATRÍCULA', colMatricula + 2, tableStartY + 5.5);
    doc.text('PERÍODO DA VIAGEM', colPeriodo + 2, tableStartY + 5.5);
    doc.text('ASSINATURA', colAssinatura + 2, tableStartY + 5.5);

    // Linhas verticais do cabeçalho
    doc.setDrawColor(200, 220, 200);
    doc.setLineWidth(0.5);
    doc.line(colMatricula, tableStartY, colMatricula, tableStartY + 8);
    doc.line(colPeriodo, tableStartY, colPeriodo, tableStartY + 8);
    doc.line(colAssinatura, tableStartY, colAssinatura, tableStartY + 8);

    y = tableStartY + 8;

    // Linhas de servidores
    const ROW_HEIGHT = 14;
    const maxRows = Math.max(servidores.length, 4); // Mínimo 4 linhas

    for (let i = 0; i < maxRows; i++) {
        const servidor = servidores[i];
        const isEven = i % 2 === 0;

        // Background da linha
        doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
        doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, ROW_HEIGHT, 'F');

        // Bordas
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.4);
        doc.line(MARGIN_LEFT, y + ROW_HEIGHT, MARGIN_RIGHT, y + ROW_HEIGHT);
        doc.line(colMatricula, y, colMatricula, y + ROW_HEIGHT);
        doc.line(colPeriodo, y, colPeriodo, y + ROW_HEIGHT);
        doc.line(colAssinatura, y, colAssinatura, y + ROW_HEIGHT);

        if (servidor) {
            // Nome / CPF
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`${servidor.nome.toUpperCase()} / ${servidor.cpf}`, colServidor + 2, y + 5.5, { maxWidth: colMatricula - colServidor - 4 });

            // Matrícula
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(servidor.matricula, colMatricula + 2, y + 5.5);

            // Período
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(dataAtividade.toUpperCase(), colPeriodo + 2, y + 5.5, { maxWidth: colAssinatura - colPeriodo - 4 });

            // Assinatura
            if (servidor.assinaturaBase64) {
                try {
                    doc.addImage(
                        servidor.assinaturaBase64,
                        'PNG',
                        colAssinatura + 2,
                        y + 1,
                        MARGIN_RIGHT - colAssinatura - 4,
                        ROW_HEIGHT - 2,
                        undefined,
                        'FAST'
                    );
                } catch (e) {
                    console.error('Erro ao adicionar assinatura:', e);
                }
            }
        }

        y += ROW_HEIGHT;
    }

    // Borda externa da tabela
    doc.setDrawColor(0, 60, 40);
    doc.setLineWidth(1.0);
    doc.rect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, y - tableStartY);

    y += 8;

    // ============================
    // JUSTIFICATIVA
    // ============================

    // Título
    doc.setFillColor(0, 100, 60);
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('JUSTIFICATIVA', pageW / 2, y + 5, { align: 'center' });
    y += 7;

    // Conteúdo da justificativa
    const justificativaHeight = Math.max(20, 8);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 80, 50);
    doc.setLineWidth(0.7);
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, justificativaHeight, 'FD');

    if (justificativa) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(justificativa, CONTENT_WIDTH - 6);
        doc.text(lines, MARGIN_LEFT + 3, y + 5);
    }

    y += justificativaHeight + 5;

    // ============================
    // NEXOS
    // ============================

    // Verificar se precisa de nova página
    if (y > 230) {
        doc.addPage();
        y = 20;
    }

    doc.setFillColor(0, 100, 60);
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('ANEXOS (NEXOS)', pageW / 2, y + 5, { align: 'center' });
    y += 7;

    // Texto explicativo
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(0, 80, 50);
    doc.setLineWidth(0.7);
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 22, 'FD');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const nexoTexto = 'ANEXOS ( Apresentação de docs comprobatórios, são eles: Lista de presença, Cópia de Atas, Certificados, Declarações, Relatórios, fotos, Recibos, ou outros Docs que comprovam a atividade que motivou o deslocamento)';
    const nexoLines = doc.splitTextToSize(nexoTexto, CONTENT_WIDTH - 6);
    doc.text(nexoLines, MARGIN_LEFT + 3, y + 5);

    y += 14;

    // Checkboxes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    const fotosCheck = nexoFotos ? '(x)' : '( )';
    const recibosCheck = nexoRecibos ? '(x)' : '( )';
    const ataCheck = nexoAta ? '(x)' : '( )';

    doc.text(`${fotosCheck} FOTOS    ${recibosCheck} RECIBOS    ${ataCheck} ATA`, pageW / 2, y + 4, { align: 'center' });

    y += 15;

    // ============================
    // ASSINATURA DO DEPUTADO/CHEFE
    // ============================

    if (y > 250) {
        doc.addPage();
        y = 20;
    }

    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(0, 80, 50);
    doc.setLineWidth(0.7);
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 30, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Deputado/Chefe Solicitante', MARGIN_LEFT + 5, y + 8);

    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_LEFT + 5, y + 22, MARGIN_LEFT + 80, y + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CIENTE: ______________', MARGIN_LEFT + 5, y + 27);

    y += 35;

    // ============================
    // RODAPÉ
    // ============================

    const rodapeY = 278;
    doc.setDrawColor(0, 100, 60);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_LEFT, rodapeY, MARGIN_RIGHT, rodapeY);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text('Assembleia Legislativa do Estado do Ceará — Diretoria Administração Financeira — DAF', pageW / 2, rodapeY + 4, { align: 'center' });
    doc.text('Documento gerado pelo Sistema de Gestão CIADI/ALECE', pageW / 2, rodapeY + 8, { align: 'center' });

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
                    doc.setTextColor(0, 100, 60);
                    doc.text('ANEXOS - COMPROVANTES', pageW / 2, 10, { align: 'center' });
                    drawHorizontalLine(doc, 14, [0, 100, 60], 0.5);

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

                        doc.setDrawColor(220, 220, 220);
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

                    doc.setDrawColor(0, 100, 60);
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
    const totalPages = mergedPdf.getPageCount();
    const pagesToRemove: number[] = [];
    const insertions: { pageIndex: number; anexo: AnexoDiaria }[] = [];

    // Identificar páginas placeholder
    for (let i = 0; i < totalPages; i++) {
        const page = mergedPdf.getPage(i);
        // Checar se é uma página placeholder (muito pequena em conteúdo)
        // Usamos a correspondência por ordem: cada PDF placeholder corresponde a um pdfAnexo
    }

    // Abordagem simples: remover placeholders e inserir PDFs reais na posição correta
    // Primeiro, encontrar quais páginas são placeholders (1 por pdf anexado)
    // As páginas placeholder são as últimas N páginas correspondentes a PDFs
    // Mas como a ordem pode ser mista, precisamos rastrear

    // Reconstruir: criar novo PDF, copiar páginas do jsPDF e inserir PDFs reais
    const finalPdf = await PDFDocument.create();
    let pdfAnexoIdx = 0;

    // Rastrear páginas do jsPDF que são placeholder
    // Cada grupo 'pdf' gera 1 página placeholder por anexo
    const placeholderPageIndices = new Set<number>();
    let jspdfPageIdx = 0;

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
    // O relatório principal ocupa as primeiras páginas até os anexos começarem
    // Vamos contar quantas páginas cada grupo ocupa no jsPDF
    const mainReportPages = totalPages - anexos.reduce((acc, a) => {
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
