import { useState } from 'react';
import EstimateForm from './components/EstimateForm';
import InquiryList from './components/InquiryList';
import PaymentList from './components/PaymentList';
import PartnerList from './components/PartnerList';
import Settings from './components/Settings';
import ClientList from './components/ClientList';

function App() {
  const [activeTab, setActiveTab] = useState('inquiries');
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b border-gray-100">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          HY3D Admin Portal
        </h1>
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('estimates')}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition"
          >
            New Quotation (3D)
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 bg-white border-r border-slate-200 p-4 shrink-0">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('clients')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === 'clients' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                🏢 기업(고객사) 관리
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('inquiries')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === 'inquiries' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                📥 문의 관리
              </button>
            </li>
            <li>
              <button
                onClick={() => { setActiveTab('estimates'); setSelectedInquiryId(null); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === 'estimates' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                📄 견적서 산출
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === 'orders' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                💳 발주 및 결제
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('partners')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === 'partners' ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                🏭 외주비 정산
              </button>
            </li>
            <li className="pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                ⚙️ 환경 설정 (견적 로직)
              </button>
            </li>
          </ul>
        </nav>

        <main className="flex-1 p-8 overflow-y-auto w-full">
          {activeTab === 'clients' && (
            <div className="h-full">
              <ClientList />
            </div>
          )}
          {activeTab === 'inquiries' && (
            <div className="h-full">
              <h2 className="text-xl font-bold mb-6 text-slate-800">문의 관리</h2>
              <InquiryList onLinkEstimate={(id) => { setSelectedInquiryId(id); setActiveTab('estimates'); }} />
            </div>
          )}
          {activeTab === 'estimates' && (
            <div className="h-full">
              <h2 className="text-xl font-bold mb-6 text-slate-800">3D 자동 견적 산출기</h2>
              <EstimateForm existingInquiryId={selectedInquiryId} />
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="h-full">
              <h2 className="text-xl font-bold mb-6 text-slate-800">결제 및 발주 관리</h2>
              <PaymentList />
            </div>
          )}
          {activeTab === 'partners' && (
            <div className="h-full">
              <h2 className="text-xl font-bold mb-6 text-slate-800">외주 및 출고 관리</h2>
              <PartnerList />
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="h-full flex items-center justify-center">
              <Settings />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
