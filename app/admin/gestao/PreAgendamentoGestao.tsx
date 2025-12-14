import { getLinks, getPendingRequests } from './actions_pre_agendamento';
import LinkManager from './components/LinkManager';
import RequestList from './components/RequestList';
import { FiInbox } from 'react-icons/fi';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export async function PreAgendamentoGestao() {
  // Parallel fetching
  const [linksRes, requestsRes] = await Promise.all([
    getLinks(),
    getPendingRequests()
  ]);

  const links = (linksRes.success && linksRes.data) ? linksRes.data : [];
  const requests = (requestsRes.success && requestsRes.data) ? requestsRes.data : [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Gestão de Pré-Agendamentos</h1>
        <p className="text-gray-500">Gerencie links públicos e valide solicitações de agendamento.</p>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Link Management (1/3) */}
        <div className="lg:col-span-1">
          <LinkManager initialLinks={links} />
        </div>

        {/* Right Column: Pending Requests (2/3) */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FiInbox className="text-blue-500" /> Solicitações Pendentes
                <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">
                  {requests.length}
                </span>
              </h2>
            </div>

            <RequestList initialRequests={requests} />
          </div>
        </div>
      </div>
    </div>
  );
}