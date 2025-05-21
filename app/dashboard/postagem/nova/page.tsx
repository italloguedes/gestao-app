"use client";

export default function NovaPostagemPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Criar Nova Postagem</h1>
        <p className="text-gray-600 mt-2">Crie uma nova postagem para o blog</p>
      </div>

      <div className="card p-6">
        <form className="space-y-4">
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700">
              Título
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              className="input mt-1"
              placeholder="Digite o título da postagem"
            />
          </div>

          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
              Categoria
            </label>
            <select
              id="categoria"
              name="categoria"
              className="input mt-1"
            >
              <option value="">Selecione uma categoria</option>
              <option value="noticias">Notícias</option>
              <option value="artigos">Artigos</option>
              <option value="eventos">Eventos</option>
              <option value="dicas">Dicas e Orientações</option>
            </select>
          </div>

          <div>
            <label htmlFor="resumo" className="block text-sm font-medium text-gray-700">
              Resumo
            </label>
            <textarea
              id="resumo"
              name="resumo"
              rows={2}
              className="input mt-1"
              placeholder="Digite um breve resumo da postagem"
            />
          </div>

          <div>
            <label htmlFor="conteudo" className="block text-sm font-medium text-gray-700">
              Conteúdo
            </label>
            <div className="mt-1 border border-gray-300 rounded-md">
              <div className="px-3 py-2 border-b border-gray-300 flex gap-2">
                <button type="button" className="p-1 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </button>
                <button type="button" className="p-1 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
                <button type="button" className="p-1 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <textarea
                id="conteudo"
                name="conteudo"
                rows={12}
                className="block w-full px-3 py-2 border-0 focus:ring-0 sm:text-sm"
                placeholder="Escreva o conteúdo da sua postagem aqui..."
              />
            </div>
          </div>

          <div>
            <label htmlFor="imagem" className="block text-sm font-medium text-gray-700">
              Imagem de Capa
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
                    <span>Fazer upload de imagem</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" />
                  </label>
                  <p className="pl-1">ou arraste e solte</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG até 5MB
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="publicar"
              name="publicar"
              type="checkbox"
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label htmlFor="publicar" className="ml-2 block text-sm text-gray-900">
              Publicar imediatamente
            </label>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Salvar como rascunho
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Publicar postagem
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
