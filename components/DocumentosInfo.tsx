'use client';

import { useState } from 'react';
import { FiAlertCircle, FiInfo, FiFileText, FiDollarSign } from 'react-icons/fi';

export default function DocumentosInfo() {
  const [activeTab, setActiveTab] = useState('obrigatorios');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
        <FiFileText className="mr-2" />
        Documentos e Informações
      </h2>

      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('obrigatorios')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'obrigatorios'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Documentos Obrigatórios
          </button>
          <button
            onClick={() => setActiveTab('opcionais')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'opcionais'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Documentos Opcionais
          </button>
          <button
            onClick={() => setActiveTab('gratuidade')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'gratuidade'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sobre a Gratuidade
          </button>
          <button
            onClick={() => setActiveTab('importantes')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'importantes'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Informações Importantes
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {activeTab === 'obrigatorios' && (
          <div>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Documentos Obrigatórios (apenas originais) legíveis e sem rasura
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm font-medium">
                  1
                </span>
                <span className="ml-3">CPF</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm font-medium">
                  2
                </span>
                <span className="ml-3">Endereço com CEP válido</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm font-medium">
                  3
                </span>
                <span className="ml-3">Número de telefone</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm font-medium">
                  4
                </span>
                <span className="ml-3">
                  Certidão conforme o estado civil:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• Se Solteiro(a), certidão de nascimento</li>
                    <li>• Se casado(a), certidão de casamento</li>
                    <li>• Divorciado(a): certidão de casamento com averbação de divórcio</li>
                    <li>• Viúvo(a): certidão de casamento com averbação de óbito</li>
                  </ul>
                </span>
              </li>
            </ul>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Casos Especiais</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                    A
                  </span>
                  <span className="ml-3">
                    Menores de 16 anos: devem estar acompanhados por responsável legal (pais, avós, tios de 1º grau, irmãos maiores de 18 anos), com documentação que comprove o vínculo e documento de identificação com foto.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                    B
                  </span>
                  <span className="ml-3">
                    Maiores de 16 anos que não podem responder por si: devem estar acompanhados por responsável legal ou curador, com documento oficial com foto e CPF.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                    C
                  </span>
                  <span className="ml-3">
                    Assistidos pelo Conselho Tutelar: é obrigatória a apresentação da declaração do Conselho, assinada e carimbada, com o nome do menor, do responsável e o serviço solicitado.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'opcionais' && (
          <div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiInfo className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Documentos Opcionais (versão digital gov.br)
                  </p>
                </div>
              </div>
            </div>

            <p className="mb-4 text-gray-600">
              Apresente os documentos físicos, originais, legíveis, sem rasuras e sem divergências para inclusão na versão digital da Carteira de Identidade Nacional (CIN):
            </p>

            <ul className="space-y-2">
              <li>• Título de Eleitor</li>
              <li>• Cartão Nacional de Saúde (CNS)</li>
              <li>• Cartão NIS, PIS ou PASEP</li>
              <li>• Carteira Nacional de Habilitação (CNH)</li>
              <li>• Certificado de Reservista</li>
              <li>• Tipo sanguíneo (cartão do HEMOCE ou exame laboratorial)</li>
              <li>• Atestado médico ou documento oficial com CID, CRM e assinatura</li>
              <li>• Nome social (pode ser solicitado e preenchido no momento do atendimento)</li>
            </ul>
          </div>
        )}

        {activeTab === 'gratuidade' && (
          <div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiDollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Sobre a Gratuidade
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-4">
              <li>
                <p className="font-medium">1ª via da Carteira de Identidade Nacional (CIN)</p>
                <p className="text-gray-600">É gratuita.</p>
              </li>
              <li>
                <p className="font-medium">2ª via</p>
                <p className="text-gray-600">
                  É necessário pagar uma taxa. Consulte o valor do boleto em:{' '}
                  <a 
                    href="https://pagamento-cin-ceara.services-valid.com.br/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 underline"
                  >
                    https://pagamento-cin-ceara.services-valid.com.br/
                  </a>
                </p>
                <p className="text-gray-600 mt-2">
                  Atenção: a taxa deve ser paga com pelo menos 3 dias de antecedência da data agendada.
                </p>
              </li>
              <li>
                <p className="font-medium">Reembolso</p>
                <p className="text-gray-600">
                  Para solicitar reembolso da taxa, acesse:{' '}
                  <a 
                    href="https://www.pefoce.ce.gov.br/formularios/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 underline"
                  >
                    https://www.pefoce.ce.gov.br/formularios/
                  </a>
                </p>
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'importantes' && (
          <div>
            <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-purple-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-purple-700">
                    Informações importantes
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 text-sm font-medium">
                  !
                </span>
                <span className="ml-3">O agendamento é gratuito, pessoal e intransferível</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 text-sm font-medium">
                  !
                </span>
                <span className="ml-3">A apresentação da documentação completa é obrigatória</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 text-sm font-medium">
                  !
                </span>
                <span className="ml-3">Documentos rasurados, danificados ou ilegíveis não serão aceitos</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 text-sm font-medium">
                  !
                </span>
                <span className="ml-3">O comprovante de agendamento deve ser apresentado impresso ou no celular</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 text-sm font-medium">
                  !
                </span>
                <span className="ml-3">A tolerância máxima para ativação da senha é de 15 minutos</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 