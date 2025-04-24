"use client";

export default function NovoCINPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Cadastrar Novo CIN</h1>
        <p className="text-gray-600 mt-2">Preencha os dados do CIN</p>
      </div>

      <div className="card p-6">
        <form className="space-y-4">
          <div>
            <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
              Número do CIN
            </label>
            <input
              type="text"
              id="numero"
              name="numero"
              className="input mt-1"
              placeholder="Digite o número do CIN"
            />
          </div>

          <div>
            <label htmlFor="paciente" className="block text-sm font-medium text-gray-700">
              Paciente
            </label>
            <input
              type="text"
              id="paciente"
              name="paciente"
              className="input mt-1"
              placeholder="Nome do paciente"
            />
          </div>

          <div>
            <label htmlFor="data" className="block text-sm font-medium text-gray-700">
              Data de Emissão
            </label>
            <input
              type="date"
              id="data"
              name="data"
              className="input mt-1"
            />
          </div>

          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">
              Tipo de CIN
            </label>
            <select
              id="tipo"
              name="tipo"
              className="input mt-1"
            >
              <option value="">Selecione o tipo</option>
              <option value="avaliacao">Avaliação</option>
              <option value="acompanhamento">Acompanhamento</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <textarea
              id="descricao"
              name="descricao"
              rows={4}
              className="input mt-1"
              placeholder="Descreva os detalhes do CIN"
            />
          </div>

          <div>
            <label htmlFor="anexos" className="block text-sm font-medium text-gray-700">
              Anexos
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500"
                  >
                    <span>Fazer upload de arquivo</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                  </label>
                  <p className="pl-1">ou arraste e solte</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, PDF até 10MB
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Cadastrar CIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 