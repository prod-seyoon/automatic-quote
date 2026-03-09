import { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Search, Clock, CheckCircle2, Plus, X, CreditCard, Calculator, Edit2, Reply, Play, Building2, UserCircle } from 'lucide-react';

interface Inquiry {
    id: number;
    client_id: number;
    receiver_name: string;
    service_type: string;
    item_name: string;
    consultation_details: string;
    status: string;
    created_at: string;
    replied_at?: string;
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
    contacts?: { name: string, phone: string, email: string, notes?: string }[];
}

interface ClientOption {
    clientId: number;
    companyName: string;
    contactName: string;
    phone: string;
    email: string;
}

interface InquiryListProps {
    onLinkEstimate?: (id: number) => void;
}

const toLocalISOString = (dt?: string | null) => {
    if (!dt) return '';
    const date = new Date(dt);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function InquiryList({ onLinkEstimate }: InquiryListProps) {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<Inquiry | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Auto-complete clients
    const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
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
        client_id: null as number | null,
        created_at: toLocalISOString(new Date().toISOString()),
        replied_at: ''
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
            setClientOptions([]);
            setShowClientDropdown(false);
            return;
        }
        try {
            const res = await axios.get(`https://automatic-quote.onrender.com/api/v1/clients?search_term=${term}`);
            let options: ClientOption[] = [];
            res.data.forEach((c: Client) => {
                if (c.contacts && c.contacts.length > 0) {
                    c.contacts.forEach(contact => {
                        options.push({
                            clientId: c.id,
                            companyName: c.company_name,
                            contactName: contact.name,
                            phone: contact.phone,
                            email: contact.email
                        });
                    });
                } else {
                    options.push({
                        clientId: c.id,
                        companyName: c.company_name,
                        contactName: c.customer_name,
                        phone: c.phone,
                        email: c.email
                    });
                }
            });
            setClientOptions(options);
            setShowClientDropdown(true);
        } catch (e) {
            console.error(e);
        }
    };

    const selectClient = (opt: ClientOption) => {
        setFormData({
            ...formData,
            company_name: opt.companyName,
            customer_name: opt.contactName,
            email: opt.email,
            phone: opt.phone,
            client_id: opt.clientId
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
                customer_name: formData.customer_name,
                email: formData.email,
                phone: formData.phone,
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
                status: formData.status,
                customer_name: formData.customer_name,
                email: formData.email,
                phone: formData.phone,
                created_at: formData.created_at ? new Date(formData.created_at).toISOString() : undefined,
                replied_at: formData.replied_at ? new Date(formData.replied_at).toISOString() : null
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
            client_id: inq.client_id,
            company_name: inq.client_name || '',
            customer_name: inq.customer_name || '',
            email: inq.email || '',
            phone: inq.phone || '',
            service_type: inq.service_type,
            item_name: inq.item_name,
            consultation_details: inq.consultation_details,
            status: inq.status,
            created_at: toLocalISOString(inq.created_at),
            replied_at: toLocalISOString(inq.replied_at)
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
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 flex items-center gap-1 w-max"><Play className="w-3 h-3" /> 진행중</span>;
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
            <div className="flex-1 overflow-auto bg-slate-50">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-slate-500 bg-white sticky top-0 uppercase font-medium z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 font-bold border-b border-slate-200 w-16">NO</th>
                            <th className="px-6 py-4 font-bold border-b border-slate-200 w-72">고객 정보</th>
                            <th className="px-6 py-4 font-bold border-b border-slate-200">문의 상세 (아이템 / 내용)</th>
                            <th className="px-6 py-4 font-bold border-b border-slate-200 w-48">진행 상태</th>
                            <th className="px-6 py-4 text-right font-bold border-b border-slate-200 w-32">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-slate-500 w-full bg-white">데이터를 불러오는 중...</td>
                            </tr>
                        ) : inquiries.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-16 text-slate-500 bg-white">
                                    <div className="flex flex-col items-center justify-center">
                                        <Mail className="w-12 h-12 text-slate-300 mb-3 mx-auto" />
                                        <p>검색 조건에 일치하는 문의 내역이 없습니다.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            inquiries.map((inq) => (
                                <tr key={inq.id} className="border-b border-slate-200 hover:bg-white bg-white/50 transition group">
                                    <td className="px-6 py-5 text-slate-400 font-medium align-top">{inq.id}</td>
                                    <td className="px-6 py-5 align-top">
                                        <div className="font-bold text-slate-800 flex items-center gap-2 mb-1.5 text-base">
                                            {inq.client_name || `고객 ${inq.client_id} `}
                                            <ClientTypeBadge type={inq.client_type} />
                                        </div>
                                        <div className="text-sm text-slate-700 font-medium mb-1">{inq.customer_name} <span className="text-slate-300 mx-1">|</span> {inq.phone}</div>
                                        <div className="text-sm text-slate-500 mb-3">{inq.email}</div>
                                        <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 접수: {new Date(inq.created_at).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="px-6 py-5 align-top">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">{inq.service_type}</span>
                                            <span className="font-bold text-slate-800 text-base">{inq.item_name}</span>
                                            {inq.calculated_amount && (
                                                <span className="text-sm text-indigo-600 font-bold border border-indigo-200 bg-indigo-50 px-3 py-0.5 rounded-full ml-2">
                                                    {inq.calculated_amount.toLocaleString()}원
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 w-full max-w-2xl mt-3">
                                            {inq.consultation_details}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 align-top">
                                        <div className="mb-3"><StatusBadge status={inq.status || '접수대기'} /></div>
                                        {inq.replied_at ? (
                                            <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 w-max px-2.5 py-1.5 rounded-lg border border-emerald-100">
                                                <Reply className="w-3.5 h-3.5" />
                                                답변: {new Date(inq.replied_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 w-max px-2 py-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> 미답변 상태
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 align-top text-right">
                                        <div className="flex flex-col items-end gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); openEditModal(inq); }} className="w-full justify-center flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 rounded-lg transition bg-white shadow-sm">
                                                <Edit2 className="w-3.5 h-3.5" /> 내용 수정
                                            </button>

                                            {inq.status === '견적완료' && inq.latest_estimate_id && (
                                                <button onClick={(e) => { e.stopPropagation(); handleCreateOrder(inq.latest_estimate_id!); }} className="w-full justify-center flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm">
                                                    <CreditCard className="w-3.5 h-3.5" /> 발주 전환
                                                </button>
                                            )}
                                            {!inq.latest_estimate_id && (
                                                <button onClick={(e) => { e.stopPropagation(); if (onLinkEstimate) onLinkEstimate(inq.id); }} className="w-full justify-center flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm">
                                                    <Calculator className="w-3.5 h-3.5" /> 견적 산출
                                                </button>
                                            )}
                                        </div>
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
                                        고객 정보 {formData.client_id && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 ml-2">기존 고객사 선택됨 (담당자 변경 가능)</span>}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">고객사 / 단체명</label>
                                            <input type="text" required value={formData.company_name} onChange={e => searchClients(e.target.value)} onFocus={() => formData.company_name && setShowClientDropdown(true)} onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="업체명 검색 또는 직접입력" />
                                            {/* Autocomplete Dropdown */}
                                            {showClientDropdown && clientOptions.length > 0 && (
                                                <div className="absolute top-16 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                                                    {clientOptions.map((opt, idx) => (
                                                        <div key={`${opt.clientId}-${idx}`} onMouseDown={(e) => { e.preventDefault(); selectClient(opt); }} className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                                                            <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /> {opt.companyName}</div>
                                                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 ml-5">
                                                                <UserCircle className="w-3.5 h-3.5 text-slate-400" /> {opt.contactName} <span className="text-slate-300 mx-1">·</span> {opt.phone}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">담당자명</label>
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
                            <form id="edit-inquiry-form" onSubmit={handleUpdateInquiry} className="space-y-6">
                                {/* Status & Dates */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">진행 상태</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white shadow-sm font-medium">
                                            <option value="접수대기">접수대기</option>
                                            <option value="상담중">상담중</option>
                                            <option value="견적완료">견적완료</option>
                                            <option value="발주확정">발주확정</option>
                                            <option value="취소">취소</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">접수 일시 (수정)</label>
                                        <input type="datetime-local" value={formData.created_at} onChange={e => setFormData({ ...formData, created_at: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-600 mb-1.5 uppercase">답변 전송 일시</label>
                                        <input type="datetime-local" value={formData.replied_at} onChange={e => setFormData({ ...formData, replied_at: e.target.value })} className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 bg-emerald-50/30 shadow-sm text-emerald-800" />
                                    </div>
                                </div>

                                {/* Snapshot Contact Info */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        문의측 담당자 정보
                                        <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">해당 문의건에만 적용됩니다</span>
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">담당자명</label>
                                            <input type="text" required value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">연락처</label>
                                            <input type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">이메일</label>
                                            <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                                        </div>
                                    </div>
                                </div>

                                {/* Inquiry Details */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800 mb-3">제작 항목 및 상담내용</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
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
                                </div>

                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setShowEditModal(null)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">취소</button>
                            <button form="edit-inquiry-form" type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition shadow-md shadow-amber-500/20">수정 저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
