import jsPDF from 'jspdf';

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
    doc.setDrawColor(0, 100, 60);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_LEFT, 28, MARGIN_RIGHT, 28);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, 29.5, MARGIN_RIGHT, 29.5);

    // ============================
    // DADOS GERAIS
    // ============================
    let y = 36;

    const drawField = (label: string, value: string, yPos: number, startX: number = MARGIN_LEFT, maxWidth?: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(label, startX, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        const labelWidth = doc.getTextWidth(label) + 2;
        if (maxWidth) {
            doc.text(value, startX + labelWidth, yPos, { maxWidth });
        } else {
            doc.text(value, startX + labelWidth, yPos);
        }
    };

    // Background para seção de dados
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, 30, 'FD');

    drawField('SETOR:', setor.toUpperCase(), y);
    y += 6;
    drawField('TEMA DA ATIVIDADE:', temaAtividade.toUpperCase(), y, MARGIN_LEFT, 145);
    y += 6;
    drawField('DEPUTADO/CHEFE SOLICITANTE:', deputadoChefe.toUpperCase(), y);
    y += 6;
    drawField('CIDADE:', `${cidade.toUpperCase()} - CE`, y);
    drawField('DATA DA ATIVIDADE:', dataAtividade.toUpperCase(), y, 110);

    y += 12;

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
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
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
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.15);
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
    doc.setDrawColor(0, 100, 60);
    doc.setLineWidth(0.5);
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
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
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
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(220, 220, 220);
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

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(220, 220, 220);
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
    // ============================

    if (anexos.length > 0) {
        const imageAnexos = anexos.filter(a => a.tipo === 'image');
        const pdfAnexos = anexos.filter(a => a.tipo === 'pdf');

        // ---- FOTOS: 4 por página (grid 2x2) ----
        if (imageAnexos.length > 0) {
            const IMGS_PER_PAGE = 4;
            const totalPages = Math.ceil(imageAnexos.length / IMGS_PER_PAGE);

            for (let page = 0; page < totalPages; page++) {
                doc.addPage();

                // Mini cabeçalho
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(0, 100, 60);
                doc.text('ANEXOS - COMPROVANTES FOTOGRÁFICOS', pageW / 2, 10, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                doc.text(`Página ${page + 1} de ${totalPages}`, pageW / 2, 15, { align: 'center' });

                drawHorizontalLine(doc, 18, [0, 100, 60], 0.5);

                // Grid 2x2 positions
                const gridStartY = 22;
                const cellPadding = 4;
                const cellW = (CONTENT_WIDTH - cellPadding) / 2;
                const cellH = 120;
                const positions = [
                    { x: MARGIN_LEFT, y: gridStartY },
                    { x: MARGIN_LEFT + cellW + cellPadding, y: gridStartY },
                    { x: MARGIN_LEFT, y: gridStartY + cellH + cellPadding + 8 },
                    { x: MARGIN_LEFT + cellW + cellPadding, y: gridStartY + cellH + cellPadding + 8 },
                ];

                const startIdx = page * IMGS_PER_PAGE;
                const endIdx = Math.min(startIdx + IMGS_PER_PAGE, imageAnexos.length);

                for (let i = startIdx; i < endIdx; i++) {
                    const anexo = imageAnexos[i];
                    const pos = positions[i - startIdx];

                    // Border around image cell
                    doc.setDrawColor(220, 220, 220);
                    doc.setLineWidth(0.3);
                    doc.rect(pos.x, pos.y, cellW, cellH + 6, 'S');

                    // Image
                    try {
                        doc.addImage(
                            anexo.dataUrl, 'JPEG',
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

                    // Label below image
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.setTextColor(100, 100, 100);
                    const labelText = anexo.nome.length > 30 ? anexo.nome.substring(0, 27) + '...' : anexo.nome;
                    doc.text(labelText, pos.x + cellW / 2, pos.y + cellH + 3, { align: 'center' });
                }

                // Rodapé do anexo
                doc.setDrawColor(0, 100, 60);
                doc.setLineWidth(0.3);
                doc.line(MARGIN_LEFT, 272, MARGIN_RIGHT, 272);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(6);
                doc.setTextColor(120, 120, 120);
                doc.text(`Fotos comprobatórias — Pág. ${page + 1}/${totalPages}`, pageW / 2, 276, { align: 'center' });
            }
        }

        // ---- PDFs: página inteira cada ----
        if (pdfAnexos.length > 0) {
            for (const anexo of pdfAnexos) {
                doc.addPage();

                // Mini cabeçalho
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(0, 100, 60);
                doc.text('ANEXO - DOCUMENTO', pageW / 2, 10, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                doc.text(anexo.nome, pageW / 2, 15, { align: 'center' });

                drawHorizontalLine(doc, 18, [0, 100, 60], 0.5);

                // Placeholder for PDF content
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(220, 220, 220);
                doc.rect(MARGIN_LEFT, 22, CONTENT_WIDTH, 245, 'FD');

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text('📄 Documento PDF anexado:', pageW / 2, 130, { align: 'center' });
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.text(anexo.nome, pageW / 2, 140, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text('(Este documento deve ser impresso separadamente)', pageW / 2, 150, { align: 'center' });

                // Rodapé
                doc.setDrawColor(0, 100, 60);
                doc.setLineWidth(0.3);
                doc.line(MARGIN_LEFT, 272, MARGIN_RIGHT, 272);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(6);
                doc.setTextColor(120, 120, 120);
                doc.text(`Anexo: ${anexo.nome}`, pageW / 2, 276, { align: 'center' });
            }
        }
    }

    // Gerar URL do PDF
    const pdfBlob = doc.output('blob');
    return URL.createObjectURL(pdfBlob);
};
