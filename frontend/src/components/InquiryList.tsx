import { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Search, Eye, Clock, CheckCircle2, Plus, X, CreditCard, Calculator, Edit2, Building2 } from 'lucide-react';

interface Inquiry {
    id: number;
    client_id: number;
    receiver_name: string;
    service_type: string;
    item_name: string;
    consultation_details: string;
    status: string;
    created_at: string;
    client_name?: string;
    customer_name?: string;
    email?: string;
    phone?: string;
    client_type?: string;
    calculated_amount?: number;
    latest_estimate_id?: number;
}

interface Client {
    id: number;
    company_name: string;
    customer_name: string;
    email: string;
    phone: string;
}

interface InquiryListProps {
    onLinkEstimate?: (id: number) => void;
}

export default function InquiryList({ onLinkEstimate }: InquiryListProps) {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<Inquiry | null>(null);
    const [showDetailModal, setShowDetailModal] = useState<Inquiry | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Auto-complete clients
    const [clients, setClients] = useState<Client[]>([]);
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    // Form State for Create/Edit
    const initialForm = {
        company_name: '',
        customer_name: '',
        email: '',
        phone: '',
        service_type: '3D프린팅',
        item_name: '',
        consultation_details: '',
        status: '접수대기',
        client_id: null as number | null
    };
    const [formData, setFormData] = useState(initialForm);

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search_term', searchTerm);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const res = await axios.get(`https://automatic-quote.onrender.com/api/v1/inquiries?${params.toString()}`);
            setInquiries(res.data);
        } catch (err) {
            console.error("Failed to fetch inquiries:", err);
        } finally {
            setLoading(false);
        }
    };

    const searchClients = async (term: string) => {
        setFormData({ ...formData, company_name: term, client_id: null }); // allow typing
        if (!term) {
            setClients([]);
            setShowClientDropdown(false);
            return;
        }
        try {
            const res = await axios.get(`https://automatic-quote.onrender.com/api/v1/clients?search_term=${term}`);
            setClients(res.data);
            setShowClientDropdown(true);
        } catch (e) {
            console.error(e);
        }
    };

    const selectClient = (client: Client) => {
        setFormData({
            ...formData,
            company_name: client.company_name,
            customer_name: client.customer_name,
            email: client.email,
            phone: client.phone,
            client_id: client.id
        });
        setShowClientDropdown(false);
    };

    const handleCreateOrder = async (estimateId: number) => {
        if (!window.confirm("이 문의의 견적을 발주로 전환하시겠습니까? (임시 카드결제 생성됨)")) return;
        try {
            await axios.post('https://automatic-quote.onrender.com/api/v1/orders', {
                estimate_id: estimateId,
                payment_method: '카드'
            });
            alert("발주(결제대기) 상태로 전환되었습니다!");
            fetchInquiries();
        } catch (err) {
            console.error("Failed to convert to order:", err);
            alert("발주 전환 중 오류가 발생했습니다.");
        }
    };

    const handleCreateInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let cid = formData.client_id;
            if (!cid) {
                const clientRes = await axios.post('https://automatic-quote.onrender.com/api/v1/clients', {
                    company_name: formData.company_name,
                    customer_name: formData.customer_name,
                    email: formData.email,
                    phone: formData.phone,
                    is_new: true
                });
                cid = clientRes.data.id;
            }

            await axios.post('https://automatic-quote.onrender.com/api/v1/inquiries', {
                client_id: cid,
                receiver_name: '관리자',
                service_type: formData.service_type,
                item_name: formData.item_name,
                consultation_details: formData.consultation_details
            });

            setShowCreateModal(false);
            setFormData(initialForm);
            fetchInquiries();
            alert("신규 문의가 정상적으로 등록되었습니다.");
        } catch (err) {
            console.error(err);
            alert("문의 등록에 실패했습니다.");
        }
    };

    const handleUpdateInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showEditModal) return;
        try {
            await axios.put(`https://automatic-quote.onrender.com/api/v1/inquiries/${showEditModal.id}`, {
                service_type: formData.service_type,
                item_name: formData.item_name,
                consultation_details: formData.consultation_details,
                status: formData.status
            });
            setShowEditModal(null);
            setFormData(initialForm);
            fetchInquiries();
            alert("성공적으로 수정되었습니다.");
        } catch (err) {
            console.error(err);
            alert("수정에 실패했습니다.");
        }
    };

    const openEditModal = (inq: Inquiry) => {
        setFormData({
            ...initialForm,
            service_type: inq.service_type,
            item_name: inq.item_name,
            consultation_details: inq.consultation_details,
            status: inq.status
        });
        setShowEditModal(inq);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case '접수대기':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> 접수대기</span>;
            case '견적완료':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> 견적완료</span>;
            case '진행중':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 flex items-center gap-1 w-max">진행중</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
        }
    };

    const ClientTypeBadge = ({ type }: { type?: string }) => {
        if (type === '기존') return <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">기존</span>;
        if (type === '신규') return <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">신규</span>;
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Header / Actions & Filters */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50 shrink-0">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">문의 관리</h2>
                    <button
                        onClick={() => { setFormData(initialForm); setShowCreateModal(true); }}
                        className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition"
                    >
                        <Plus className="w-4 h-4" /> 문의 접수
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-lg shrink-0">
                        <span className="text-xs text-slate-500 font-medium">기간검색</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm outline-none text-slate-700 bg-transparent" />
                        <span className="text-slate-300">~</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm outline-none text-slate-700 bg-transparent" />
                    </div>
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchInquiries()}
                            placeholder="고객명, 연락처, 항목명 검섹..."
                            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                    <button onClick={fetchInquiries} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition shrink-0">
                        검색
                    </button>
                    {(searchTerm || startDate || endDate) && (
                        <button onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); setTimeout(fetchInquiries, 100); }} className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 shrink-0">
                            초기화
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0 uppercase font-medium z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium">NO</th>
                            <th className="px-6 py-3 font-medium">접수일시</th>
                            <th className="px-6 py-3 font-medium">고객사 (ID)</th>
                            <th className="px-6 py-3 font-medium">제작항목</th>
                            <th className="px-6 py-3 font-medium">분류</th>
                            <th className="px-6 py-3 font-medium">상태</th>
                            <th className="px-6 py-3 text-right font-medium">액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-slate-500 w-full">데이터를 불러오는 중...</td>
                            </tr>
                        ) : inquiries.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-slate-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <Mail className="w-12 h-12 text-slate-300 mb-3 mx-auto" />
                                        <p>검색 조건에 일치하는 문의 내역이 없습니다.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            inquiries.map((inq) => (
                                <tr key={inq.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition group cursor-pointer">
                                    <td className="px-6 py-4 text-slate-400">{inq.id}</td>
                                    <td className="px-6 py-4">{new Date(inq.created_at).toLocaleDateString('ko-KR')}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center font-medium text-slate-700">
                                            {inq.client_name || `고객 ${inq.client_id} `}
                                            <ClientTypeBadge type={inq.client_type} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {inq.item_name}
                                        {inq.calculated_amount && (
                                            <span className="ml-2 text-xs text-indigo-500 font-semibold border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                {inq.calculated_amount.toLocaleString()}원
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{inq.service_type}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={inq.status || '접수대기'} />
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-1">
                                        {inq.status === '견적완료' && inq.latest_estimate_id && (
                                            <button onClick={(e) => { e.stopPropagation(); handleCreateOrder(inq.latest_estimate_id!); }} className="p-2 w-8 h-8 flex justify-center items-center text-indigo-500 hover:text-white hover:bg-indigo-500 rounded-lg transition" title="발주 전환">
                                                <CreditCard className="w-4 h-4" />
                                            </button>
                                        )}
                                        {!inq.latest_estimate_id && (
                                            <button onClick={(e) => { e.stopPropagation(); if (onLinkEstimate) onLinkEstimate(inq.id); }} className="p-2 w-8 h-8 flex justify-center items-center text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-lg transition" title="견적 산출하기">
                                                <Calculator className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); setShowDetailModal(inq); }} className="p-2 w-8 h-8 flex justify-center items-center text-slate-400 hover:text-primary hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); openEditModal(inq); }} className="p-2 w-8 h-8 flex justify-center items-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Inquiry Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">신규 문의 등록</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="new-inquiry-form" onSubmit={handleCreateInquiry} className="space-y-6">
                                {/* Client Info */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                        고객 정보 {formData.client_id && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 ml-2">기존 고객 선택됨</span>}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">고객사 / 단체명</label>
                                            <input type="text" required value={formData.company_name} onChange={e => searchClients(e.target.value)} onFocus={() => formData.company_name && setShowClientDropdown(true)} onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="업체명 검색 또는 직접입력" />
                                            {/* Autocomplete Dropdown */}
                                            {showClientDropdown && clients.length > 0 && (
                                                <div className="absolute top-16 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                                                    {clients.map(c => (
                                                        <div key={c.id} onMouseDown={(e) => { e.preventDefault(); selectClient(c); }} className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                                                            <div className="font-medium text-sm text-slate-800">{c.company_name}</div>
                                                            <div className="text-xs text-slate-500">{c.customer_name} · {c.phone}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">고객명 (담당자)</label>
                                            <input type="text" required value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50" placeholder="예) 홍길동 대리" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">연락처</label>
                                            <input type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50" placeholder="예) 010-1234-5678" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">이메일</label>
                                            <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50" placeholder="예) test@example.com" />
                                        </div>
                                    </div>
                                </div>
                                <div className="h-px w-full bg-slate-100"></div>
                                {/* Inquiry Info */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        문의 내용
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">서비스 분류</label>
                                            <select value={formData.service_type} onChange={e => setFormData({ ...formData, service_type: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                                                <option value="3D프린팅">3D 프린팅</option>
                                                <option value="CNC">CNC 가공</option>
                                                <option value="역설계">역설계 / 모델링</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">제작 항목 (프로젝트명)</label>
                                            <input type="text" required value={formData.item_name} onChange={e => setFormData({ ...formData, item_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="예) 로봇 외형 케이스 목업" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">상담 내용 및 요청사항</label>
                                        <textarea required value={formData.consultation_details} onChange={e => setFormData({ ...formData, consultation_details: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary h-28 resize-none" placeholder="고객의 주요 요청사항, 납기일자, 특이사항 등을 기록하세요."></textarea>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">취소</button>
                            <button form="new-inquiry-form" type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition">문의 저장하기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Inquiry Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">문의 내역 수정</h2>
                            <button onClick={() => setShowEditModal(null)} className="text-slate-400 hover:text-slate-600 transition p-1"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="edit-inquiry-form" onSubmit={handleUpdateInquiry} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">진행 상태</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                                        <option value="접수대기">접수대기</option>
                                        <option value="상담중">상담중</option>
                                        <option value="견적완료">견적완료</option>
                                        <option value="발주확정">발주확정</option>
                                        <option value="취소">취소</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">서비스 분류</label>
                                        <select value={formData.service_type} onChange={e => setFormData({ ...formData, service_type: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                                            <option value="3D프린팅">3D 프린팅</option>
                                            <option value="CNC">CNC 가공</option>
                                            <option value="역설계">역설계 / 모델링</option>
                                            <option value="기타">기타</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">제작 항목명</label>
                                        <input type="text" required value={formData.item_name} onChange={e => setFormData({ ...formData, item_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">상담 내용 및 메모</label>
                                    <textarea required value={formData.consultation_details} onChange={e => setFormData({ ...formData, consultation_details: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-32 resize-none"></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setShowEditModal(null)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">취소</button>
                            <button form="edit-inquiry-form" type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition">수정 저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail View Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> 상세 정보</h2>
                            <button onClick={() => setShowDetailModal(null)} className="text-slate-400 hover:text-slate-600 transition p-1"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">고객 정보</h3>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                                    <div><span className="text-slate-500 block mb-0.5 text-xs">업체명</span><span className="font-medium text-slate-800">{showDetailModal.client_name || '-'}</span></div>
                                    <div><span className="text-slate-500 block mb-0.5 text-xs">고객명</span><span className="font-medium text-slate-800">{showDetailModal.customer_name || '-'}</span></div>
                                    <div><span className="text-slate-500 block mb-0.5 text-xs">연락처</span><span className="font-medium text-slate-800">{showDetailModal.phone || '-'}</span></div>
                                    <div><span className="text-slate-500 block mb-0.5 text-xs">이메일</span><span className="font-medium text-slate-800">{showDetailModal.email || '-'}</span></div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">제작 및 문의 정보</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div className="text-sm"><span className="text-slate-500 mr-2">제작 항목:</span><span className="font-medium">{showDetailModal.item_name}</span></div>
                                        <div className="text-sm"><span className="text-slate-500 mr-2">서비스:</span><span className="font-medium">{showDetailModal.service_type}</span></div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block mb-1">상담 내용</span>
                                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap min-h-[80px]">
                                            {showDetailModal.consultation_details}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button onClick={() => setShowDetailModal(null)} className="px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition font-medium text-sm">닫기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
