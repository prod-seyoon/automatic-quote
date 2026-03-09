import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, X, Edit2, Building2 } from 'lucide-react';

interface Client {
    id: number;
    company_name: string;
    customer_name: string;
    email: string;
    phone: string;
    business_registration_number?: string;
    created_at: string;
}

export default function ClientList() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const initialForm = {
        company_name: '',
        customer_name: '',
        email: '',
        phone: '',
        business_registration_number: ''
    };
    const [formData, setFormData] = useState(initialForm);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`https://automatic-quote.onrender.com/api/v1/clients?search_term=${searchTerm}`);
            setClients(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await axios.put(`https://automatic-quote.onrender.com/api/v1/clients/${editingClient.id}`, formData);
                alert("수정되었습니다.");
            } else {
                await axios.post('https://automatic-quote.onrender.com/api/v1/clients', {
                    ...formData,
                    is_new: true
                });
                alert("등록되었습니다.");
            }
            setShowModal(false);
            fetchClients();
        } catch (e) {
            console.error(e);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const openModal = (client?: Client) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                company_name: client.company_name,
                customer_name: client.customer_name,
                email: client.email,
                phone: client.phone,
                business_registration_number: client.business_registration_number || ''
            });
        } else {
            setEditingClient(null);
            setFormData(initialForm);
        }
        setShowModal(true);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">기업 및 고객사 관리</h2>
                <div className="flex gap-3">
                    <div className="relative w-64">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchClients()}
                            placeholder="기업명, 담당자명 검색"
                            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                    <button onClick={fetchClients} className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700">검색</button>
                    <button onClick={() => openModal()} className="flex items-center gap-2 bg-primary text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-700">
                        <Plus className="w-4 h-4" /> 신규 등록
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-slate-500 bg-white sticky top-0 uppercase font-medium z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 font-bold border-b border-slate-200 w-16">NO</th>
                            <th className="px-6 py-4 font-bold border-b border-slate-200">고객사명</th>
                            <th className="px-6 py-4 font-bold border-b border-slate-200">기본 담당자</th>
                            <th className="px-6 py-4 font-bold border-b border-slate-200">연락처</th>
                            <th className="px-6 py-4 font-bold border-b border-slate-200">이메일</th>
                            <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-12 text-slate-500 bg-white">불러오는 중...</td></tr>
                        ) : clients.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-12 text-slate-500 bg-white">등록된 기업(고객사)이 없습니다.</td></tr>
                        ) : (
                            clients.map(c => (
                                <tr key={c.id} className="border-b border-slate-200 bg-white hover:bg-slate-50 transition drop-shadow-sm">
                                    <td className="px-6 py-4 text-slate-400 font-medium">{c.id}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800 text-base">{c.company_name}</td>
                                    <td className="px-6 py-4 font-medium text-slate-700">{c.customer_name}</td>
                                    <td className="px-6 py-4 text-slate-600 font-medium">{c.phone}</td>
                                    <td className="px-6 py-4 text-slate-600">{c.email}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openModal(c)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-primary hover:bg-blue-50 border border-slate-200 rounded-lg transition inline-flex items-center justify-center gap-1.5 bg-white shadow-sm">
                                            <Edit2 className="w-3.5 h-3.5" /> 수정
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" /> {editingClient ? '기업 정보 수정' : '신규 기업 등록'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <form id="client-form" onSubmit={handleSave} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">고객사명 <span className="text-red-500">*</span></label>
                                    <input type="text" required value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">담당자명 <span className="text-red-500">*</span></label>
                                    <input type="text" required value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">연락처 <span className="text-red-500">*</span></label>
                                    <input type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">이메일 <span className="text-red-500">*</span></label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">사업자등록번호 (선택)</label>
                                    <input type="text" value={formData.business_registration_number} onChange={e => setFormData({ ...formData, business_registration_number: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" placeholder="000-00-00000" />
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">취소</button>
                            <button form="client-form" type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition">저장하기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
