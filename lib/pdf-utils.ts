import jsPDF from 'jspdf';

interface GeneratePdfParams {
    atendimento: {
        protocolo: string;
        nome: string;
        cpf: string;
        dia_atual: string;
    };
    recebedor: {
        nome: string;
        cpf: string;
        vinculo: string;
    };
    atendenteNome: string;
    dataEntrega: string;
    logoBase64: string;
    signatureDataUrl?: string | null;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

export const generateComprovantePDF = async ({
    atendimento,
    recebedor,
    atendenteNome,
    dataEntrega,
    logoBase64,
    signatureDataUrl
}: GeneratePdfParams): Promise<string> => {
    const doc = new jsPDF();
    const now = new Date();

    // ===== CABEÇALHO INSTITUCIONAL =====
    // Brasão/Logo à esquerda
    doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);

    // Informações institucionais
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('ASSEMBLEIA LEGISLATIVA DO ESTADO DO CEARÁ', 105, 15, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text('Sala Sensorial - Atendimento Especializado', 105, 21, { align: 'center' });

    // Linha divisória superior
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.5);
    doc.line(15, 40, 195, 40);

    // TÍTULO DO DOCUMENTO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('COMPROVANTE DE ENTREGA', 105, 50, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text('Carteira de Identidade Nacional - CIN', 105, 57, { align: 'center' });

    // ===== INFORMAÇÕES DO DOCUMENTO =====
    // Box com bordas para protocolo e data
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.3);
    doc.rect(15, 65, 85, 18);
    doc.rect(110, 65, 85, 18);

    // Protocolo
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont('helvetica', 'normal');
    doc.text('PROTOCOLO Nº', 18, 70);

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont('helvetica', 'bold');
    doc.text(atendimento.protocolo || 'N/A', 18, 78);

    // Data e Hora de Emissão
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont('helvetica', 'normal');
    doc.text('DATA E HORA DA ENTREGA', 113, 70);

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatDate(dataEntrega)} - ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 113, 78);

    // ===== SEÇÃO 1: DADOS DO TITULAR =====
    const secaoY = 93;

    // Título da seção
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont('helvetica', 'bold');
    doc.text('I. DADOS DO TITULAR DO DOCUMENTO', 15, secaoY);

    // Linha divisória
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.3);
    doc.line(15, secaoY + 2, 195, secaoY + 2);

    // Box de dados
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(15, secaoY + 5, 180, 38, 'FD');

    // Estilo para labels e valores
    const labelStyle = () => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate-500
    };
    const valueStyle = () => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42); // Slate-900
    };

    // Dados do titular
    let yData = secaoY + 12;
    labelStyle();
    doc.text('Nome Completo:', 18, yData);
    valueStyle();
    doc.text(atendimento.nome, 18, yData + 5);

    yData += 13;
    labelStyle();
    doc.text('CPF:', 18, yData);
    valueStyle();
    doc.text(atendimento.cpf, 18, yData + 5);

    labelStyle();
    doc.text('Data do Atendimento:', 110, yData);
    valueStyle();
    doc.text(formatDate(atendimento.dia_atual), 110, yData + 5);

    // ===== SEÇÃO 2: DADOS DO RECEBEDOR =====
    const recebedorY = secaoY + 50;

    // Título da seção
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont('helvetica', 'bold');
    doc.text('II. IDENTIFICAÇÃO DO RECEBEDOR', 15, recebedorY);

    // Linha divisória
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.3);
    doc.line(15, recebedorY + 2, 195, recebedorY + 2);

    // Box de dados
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(15, recebedorY + 5, 180, 38, 'FD');

    // Dados do recebedor
    yData = recebedorY + 12;
    labelStyle();
    doc.text('Nome Completo:', 18, yData);
    valueStyle();
    doc.text(recebedor.nome, 18, yData + 5);

    yData += 13;
    labelStyle();
    doc.text('CPF:', 18, yData);
    valueStyle();
    doc.text(recebedor.cpf, 18, yData + 5);

    labelStyle();
    doc.text('Vínculo com o Titular:', 110, yData);
    valueStyle();
    doc.text(recebedor.vinculo, 110, yData + 5);

    // ===== DECLARAÇÃO =====
    const infoY = recebedorY + 50;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.setFont('helvetica', 'normal');

    const declaracao = [
        'Declaro que recebi nesta data a Carteira de Identidade Nacional (CIN) acima identificada,',
        'estando o documento em perfeitas condições. Confirmo a veracidade das informações prestadas',
        'e assumo total responsabilidade pela guarda e uso do documento.'
    ];

    declaracao.forEach((linha, index) => {
        doc.text(linha, 105, infoY + (index * 5), { align: 'center' });
    });

    // ===== SEÇÃO 3: ASSINATURA =====
    const assinaturaY = 210;

    // Título da seção
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont('helvetica', 'bold');
    doc.text('III. ASSINATURA E CONFIRMAÇÃO DE RECEBIMENTO', 15, assinaturaY);

    // Linha divisória
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.3);
    doc.line(15, assinaturaY + 2, 195, assinaturaY + 2);

    // Box para assinatura
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setFillColor(255, 255, 255); // Branco
    doc.rect(15, assinaturaY + 8, 180, 45, 'FD');

    // Cidade e data
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.setFont('helvetica', 'normal');
    doc.text(`Fortaleza/CE, ${formatDate(dataEntrega)}`, 105, assinaturaY + 16, { align: 'center' });

    if (signatureDataUrl) {
        // INSERIR ASSINATURA DIGITAL
        doc.addImage(signatureDataUrl, 'PNG', 60, assinaturaY + 20, 90, 22);
    } else {
        // Linha para assinatura manual
        doc.setDrawColor(100, 116, 139); // Slate-500
        doc.setLineWidth(0.4);
        doc.line(45, assinaturaY + 35, 165, assinaturaY + 35);
    }

    // Nome e CPF do recebedor
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.setFont('helvetica', 'normal');
    doc.text(recebedor.nome, 105, assinaturaY + 42, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`CPF: ${recebedor.cpf}`, 105, assinaturaY + 47, { align: 'center' });

    // ===== RODAPÉ INSTITUCIONAL =====
    const rodapeY = 270;

    // Linha divisória superior
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.5);
    doc.line(15, rodapeY, 195, rodapeY);

    // Informações de controle
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont('helvetica', 'normal');

    // Lado esquerdo - Emissor
    doc.text('Documento emitido por:', 15, rodapeY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(atendenteNome, 15, rodapeY + 9);

    // Centro - Data/Hora
    doc.setFont('helvetica', 'normal');
    doc.text('Data e hora de emissão:', 105, rodapeY + 5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatDate(dataEntrega)} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 105, rodapeY + 9, { align: 'center' });

    // Lado direito - Página
    doc.setFont('helvetica', 'normal');
    doc.text('Página:', 195, rodapeY + 5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text('1 de 1', 195, rodapeY + 9, { align: 'right' });

    // Linha final
    doc.setLineWidth(0.3);
    doc.line(15, rodapeY + 12, 195, rodapeY + 12);

    // Aviso final
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Este documento possui validade legal como comprovante de entrega.', 105, rodapeY + 17, { align: 'center' });
    doc.text('Assembleia Legislativa do Estado do Ceará - Sala Sensorial', 105, rodapeY + 21, { align: 'center' });

    // Gerar URL do PDF
    const pdfBlob = doc.output('blob');
    return URL.createObjectURL(pdfBlob);
};

// ===== ENTREGA EM LOTE =====

export interface LotePdfItem {
    atendimento: { protocolo: string; nome: string; cpf: string; dia_atual: string; };
    recebedor: { nome: string; cpf: string; vinculo: string; };
}

const fmt = (d: string) => {
    if (!d) return '';
    const [y, m, dd] = d.split('-');
    return `${dd}/${m}/${y}`;
};

const drawPage = (
    doc: jsPDF,
    { atendimento, recebedor }: LotePdfItem,
    atendenteNome: string,
    dataEntrega: string,
    logoBase64: string,
    now: Date,
    pageNum: number,
    totalPages: number
) => {
    const lbl = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139); };
    const val = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(15, 23, 42); };

    doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(30, 41, 59);
    doc.text('ASSEMBLEIA LEGISLATIVA DO ESTADO DO CEARÁ', 105, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(71, 85, 105);
    doc.text('Sala Sensorial - Atendimento Especializado', 105, 21, { align: 'center' });
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.5); doc.line(15, 40, 195, 40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text('COMPROVANTE DE ENTREGA', 105, 50, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(71, 85, 105);
    doc.text('Carteira de Identidade Nacional - CIN', 105, 57, { align: 'center' });

    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3);
    doc.rect(15, 65, 85, 18); doc.rect(110, 65, 85, 18);
    lbl(); doc.text('PROTOCOLO Nº', 18, 70);
    doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold');
    doc.text(atendimento.protocolo || 'N/A', 18, 78);
    lbl(); doc.text('DATA E HORA DA ENTREGA', 113, 70);
    doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold');
    doc.text(`${fmt(dataEntrega)} - ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 113, 78);

    const s1Y = 93;
    doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold');
    doc.text('I. DADOS DO TITULAR DO DOCUMENTO', 15, s1Y);
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3); doc.line(15, s1Y + 2, 195, s1Y + 2);
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(15, s1Y + 5, 180, 38, 'FD');
    let y = s1Y + 12; lbl(); doc.text('Nome Completo:', 18, y); val(); doc.text(atendimento.nome, 18, y + 5);
    y += 13; lbl(); doc.text('CPF:', 18, y); val(); doc.text(atendimento.cpf, 18, y + 5);
    lbl(); doc.text('Data do Atendimento:', 110, y); val(); doc.text(fmt(atendimento.dia_atual), 110, y + 5);

    const s2Y = s1Y + 50;
    doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold');
    doc.text('II. IDENTIFICAÇÃO DO RECEBEDOR', 15, s2Y);
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3); doc.line(15, s2Y + 2, 195, s2Y + 2);
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(15, s2Y + 5, 180, 38, 'FD');
    y = s2Y + 12; lbl(); doc.text('Nome Completo:', 18, y); val(); doc.text(recebedor.nome, 18, y + 5);
    y += 13; lbl(); doc.text('CPF:', 18, y); val(); doc.text(recebedor.cpf, 18, y + 5);
    lbl(); doc.text('Vínculo com o Titular:', 110, y); val(); doc.text(recebedor.vinculo, 110, y + 5);

    const infoY = s2Y + 50;
    doc.setFontSize(9); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
    ['Declaro que recebi nesta data a Carteira de Identidade Nacional (CIN) acima identificada,',
        'estando o documento em perfeitas condições. Confirmo a veracidade das informações prestadas',
        'e assumo total responsabilidade pela guarda e uso do documento.'
    ].forEach((l, i) => doc.text(l, 105, infoY + i * 5, { align: 'center' }));

    const asY = 210;
    doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold');
    doc.text('III. ASSINATURA E CONFIRMAÇÃO DE RECEBIMENTO', 15, asY);
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3); doc.line(15, asY + 2, 195, asY + 2);
    doc.setDrawColor(226, 232, 240); doc.setFillColor(255, 255, 255); doc.rect(15, asY + 8, 180, 45, 'FD');
    doc.setFontSize(9); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
    doc.text(`Fortaleza/CE, ${fmt(dataEntrega)}`, 105, asY + 16, { align: 'center' });
    doc.setDrawColor(100, 116, 139); doc.setLineWidth(0.4); doc.line(45, asY + 35, 165, asY + 35);
    doc.setFontSize(9); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
    doc.text(recebedor.nome, 105, asY + 42, { align: 'center' });
    doc.setFontSize(8); doc.text(`CPF: ${recebedor.cpf}`, 105, asY + 47, { align: 'center' });

    const rodY = 270;
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.5); doc.line(15, rodY, 195, rodY);
    doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
    doc.text('Documento emitido por:', 15, rodY + 5);
    doc.setFont('helvetica', 'bold'); doc.text(atendenteNome, 15, rodY + 9);
    doc.setFont('helvetica', 'normal'); doc.text('Data e hora de emissão:', 105, rodY + 5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${fmt(dataEntrega)} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 105, rodY + 9, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.text('Página:', 195, rodY + 5, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.text(`${pageNum} de ${totalPages}`, 195, rodY + 9, { align: 'right' });
    doc.setLineWidth(0.3); doc.line(15, rodY + 12, 195, rodY + 12);
    doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 116, 139);
    doc.text('Este documento possui validade legal como comprovante de entrega.', 105, rodY + 17, { align: 'center' });
    doc.text('Assembleia Legislativa do Estado do Ceará - Sala Sensorial', 105, rodY + 21, { align: 'center' });
};

export const generateLotePDF = async ({
    items,
    atendenteNome,
    dataEntrega,
    logoBase64,
}: {
    items: LotePdfItem[];
    atendenteNome: string;
    dataEntrega: string;
    logoBase64: string;
}): Promise<string> => {
    const doc = new jsPDF();
    const now = new Date();
    const pageW = doc.internal.pageSize.getWidth();

    // ===== PÁGINA DE RESUMO (CAPA) =====
    const drawResumoPage = (startIndex: number, endIndex: number, pageNum: number, totalResumoPages: number) => {
        // Cabeçalho institucional
        doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(30, 41, 59);
        doc.text('ASSEMBLEIA LEGISLATIVA DO ESTADO DO CEARÁ', 105, 15, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(71, 85, 105);
        doc.text('Centro Inclusivo para Atendimento e Desenvolvimento Infantil - CIADI', 105, 21, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
        doc.text('Sala Sensorial — Atendimento Especializado', 105, 27, { align: 'center' });

        // Linha divisória
        doc.setDrawColor(5, 95, 60); doc.setLineWidth(0.8); doc.line(15, 38, pageW - 15, 38);
        doc.setLineWidth(0.3); doc.line(15, 39.5, pageW - 15, 39.5);

        // Título
        doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(5, 95, 60);
        doc.text('RESUMO DE ENTREGA EM LOTE', 105, 50, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(71, 85, 105);
        doc.text('Carteira de Identidade Nacional — CIN', 105, 57, { align: 'center' });

        // Info boxes
        doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.setLineWidth(0.3);
        doc.rect(15, 63, 55, 18, 'FD');
        doc.rect(75, 63, 55, 18, 'FD');
        doc.rect(135, 63, 60, 18, 'FD');

        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
        doc.text('QUANTIDADE DE CINs', 18, 68);
        doc.text('DATA DA ENTREGA', 78, 68);
        doc.text('SERVIDOR RESPONSÁVEL', 138, 68);

        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(5, 95, 60);
        doc.text(`${items.length}`, 18, 77);
        doc.setFontSize(10); doc.setTextColor(15, 23, 42);
        doc.text(fmt(dataEntrega), 78, 77);
        doc.setFontSize(8);
        doc.text(atendenteNome, 138, 77);

        // Recebedor info
        const recebedor = items[0]?.recebedor;
        if (recebedor) {
            doc.setFillColor(5, 95, 60); doc.rect(15, 87, pageW - 30, 7, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
            doc.text('DADOS DO RECEBEDOR', 18, 92);

            doc.setDrawColor(203, 213, 225); doc.setFillColor(252, 253, 254);
            doc.rect(15, 94, pageW - 30, 16, 'FD');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
            doc.text('Nome:', 18, 100);
            doc.text('CPF:', 110, 100);
            doc.text('Vínculo:', 18, 107);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
            doc.text(recebedor.nome, 35, 100);
            doc.text(recebedor.cpf, 122, 100);
            doc.text(recebedor.vinculo, 40, 107);
        }

        // Título da tabela
        const tableStartY = recebedor ? 117 : 87;
        doc.setFillColor(5, 95, 60); doc.rect(15, tableStartY, pageW - 30, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
        doc.text('RELAÇÃO DAS CINs ENTREGUES', 18, tableStartY + 5);

        // Cabeçalho da tabela
        const headerY = tableStartY + 7;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, headerY, pageW - 30, 8, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
        doc.text('Nº', 20, headerY + 5.5);
        doc.text('NOME COMPLETO', 32, headerY + 5.5);
        doc.text('CPF', 140, headerY + 5.5);

        // Linhas verticais da tabela
        doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2);
        doc.line(28, headerY, 28, headerY + 8);
        doc.line(136, headerY, 136, headerY + 8);

        // Itens da tabela
        let y = headerY + 8;
        for (let i = startIndex; i < endIndex; i++) {
            const item = items[i];
            const isEven = (i - startIndex) % 2 === 0;

            if (isEven) {
                doc.setFillColor(252, 253, 254);
            } else {
                doc.setFillColor(248, 250, 252);
            }
            doc.rect(15, y, pageW - 30, 8, 'F');

            // Linhas verticais
            doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.15);
            doc.line(28, y, 28, y + 8);
            doc.line(136, y, 136, y + 8);

            // Dados
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(5, 95, 60);
            doc.text(`${i + 1}`, 20, y + 5.5);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(15, 23, 42);
            doc.text(item.atendimento.nome, 32, y + 5.5);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
            doc.text(item.atendimento.cpf, 140, y + 5.5);

            // Borda inferior
            doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.1);
            doc.line(15, y + 8, pageW - 15, y + 8);

            y += 8;
        }

        // Borda da tabela completa
        doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3);
        doc.rect(15, headerY, pageW - 30, y - headerY);

        // Total
        doc.setFillColor(5, 95, 60); doc.rect(15, y, pageW - 30, 8, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
        doc.text(`TOTAL: ${items.length} CIN(s)`, 20, y + 5.5);

        // Rodapé
        const rodY = 272;
        doc.setDrawColor(5, 95, 60); doc.setLineWidth(0.5); doc.line(15, rodY, pageW - 15, rodY);
        doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'italic');
        doc.text('Documento de controle interno — Entrega em lote de CINs', 105, rodY + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
        doc.text(
            `Emitido em: ${fmt(dataEntrega)} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}  |  Servidor: ${atendenteNome}  |  Resumo ${pageNum} de ${totalResumoPages}`,
            105, rodY + 10, { align: 'center' }
        );
    };

    // Calcular quantas páginas de resumo são necessárias (máx ~18 itens por página)
    const maxItemsPerPage = 18;
    const totalResumoPages = Math.ceil(items.length / maxItemsPerPage);

    for (let p = 0; p < totalResumoPages; p++) {
        if (p > 0) doc.addPage();
        const startIdx = p * maxItemsPerPage;
        const endIdx = Math.min(startIdx + maxItemsPerPage, items.length);
        drawResumoPage(startIdx, endIdx, p + 1, totalResumoPages);
    }

    // ===== PÁGINAS INDIVIDUAIS DE COMPROVANTE =====
    items.forEach((item, i) => {
        doc.addPage();
        drawPage(doc, item, atendenteNome, dataEntrega, logoBase64, now, i + 1, items.length);
    });

    return URL.createObjectURL(doc.output('blob'));
};
