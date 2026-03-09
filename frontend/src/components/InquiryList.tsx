import { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Search, Eye, Clock, CheckCircle2, Plus, X, CreditCard, Calculator } from 'lucide-react';

interface Inquiry {
    id: number;
    client_id: number;
    receiver_name: string;
    service_type: string;
    item_name: string;
    consultation_details: string;
    status: string;
    created_at: string;
    client_name?: string; // Added for display
    calculated_amount?: number; // Added for display
    latest_estimate_id?: number; // Added for order creation
}

interface InquiryListProps {
    onLinkEstimate?: (id: number) => void;
}

export default function InquiryList({ onLinkEstimate }: InquiryListProps) {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New Inquiry Form State
    const [formData, setFormData] = useState({
        company_name: '',
        customer_name: '',
        email: '',
        phone: '',
        service_type: '3D프린팅',
        item_name: '',
        consultation_details: ''
    });

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        try {
            const res = await axios.get('https://automatic-quote.onrender.com/api/v1/inquiries');
            // Sort by latest
            setInquiries(res.data.sort((a: Inquiry, b: Inquiry) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (err) {
            console.error("Failed to fetch inquiries:", err);
        } finally {
            setLoading(false);
        }
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
            // 1. Create Client
            const clientRes = await axios.post('https://automatic-quote.onrender.com/api/v1/clients', {
                company_name: formData.company_name,
                customer_name: formData.customer_name,
                email: formData.email,
                phone: formData.phone,
                is_new: true
            });
            const clientId = clientRes.data.id;

            // 2. Create Inquiry
            await axios.post('https://automatic-quote.onrender.com/api/v1/inquiries', {
                client_id: clientId,
                receiver_name: '관리자', // Default logged-in user theoretically
                service_type: formData.service_type,
                item_name: formData.item_name,
                consultation_details: formData.consultation_details
            });

            // Refresh & Close
            setShowModal(false);
            setFormData({ company_name: '', customer_name: '', email: '', phone: '', service_type: '3D프린팅', item_name: '', consultation_details: '' });
            fetchInquiries();
            alert("신규 문의가 정상적으로 등록되었습니다.");
        } catch (err) {
            console.error(err);
            alert("문의 등록에 실패했습니다.");
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case '접수':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> 접수 대기</span>;
            case '견적완료':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> 견적 완료</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Header / Actions */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div className="relative w-64">
                    <input
                        type="text"
                        placeholder="고객명, 항목명 검색..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition"
                >
                    <Plus className="w-4 h-4" />
                    문의 접수
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-3 font-medium">NO</th>
                            <th className="px-6 py-3 font-medium">접수일시</th>
                            <th className="px-6 py-3 font-medium">고객사 (ID)</th>
                            <th className="px-6 py-3 font-medium">제작항목</th>
                            <th className="px-6 py-3 font-medium">서비스 분류</th>
                            <th className="px-6 py-3 font-medium">상태</th>
                            <th className="px-6 py-3 text-right font-medium">액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-slate-500">데이터를 불러오는 중...</td>
                            </tr>
                        ) : inquiries.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-slate-500 flex flex-col items-center justify-center">
                                    <Mail className="w-12 h-12 text-slate-300 mb-3" />
                                    <p>아직 접수된 문의 내역이 없습니다.</p>
                                </td>
                            </tr>
                        ) : (
                            inquiries.map((inq, idx) => (
                                <tr key={inq.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition group cursor-pointer">
                                    <td className="px-6 py-4 text-slate-400">{inquiries.length - idx}</td>
                                    <td className="px-6 py-4">{new Date(inq.created_at).toLocaleDateString('ko-KR')}</td>
                                    <td className="px-6 py-4 font-medium text-slate-700">{inq.client_name || `고객 ${inq.client_id} `}</td>
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
                                        <StatusBadge status={inq.status || '접수'} />
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        {inq.status === '견적완료' && inq.latest_estimate_id && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (inq.latest_estimate_id) handleCreateOrder(inq.latest_estimate_id); }}
                                                className="p-2 text-indigo-500 hover:text-white hover:bg-indigo-500 rounded-lg transition"
                                                title="발주 전환"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                            </button>
                                        )}
                                        {!inq.latest_estimate_id && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (onLinkEstimate) onLinkEstimate(inq.id); }}
                                                className="p-2 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-lg transition"
                                                title="견적 산출하기"
                                            >
                                                <Calculator className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button className="p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Inquiry Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">신규 문의 등록</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="new-inquiry-form" onSubmit={handleCreateInquiry} className="space-y-6">
                                {/* Client Info */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                        고객 정보
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">고객사 / 단체명</label>
                                            <input type="text" required value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="예) 삼성전자" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">고객명 (담당자)</label>
                                            <input type="text" required value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="예) 홍길동 대리" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">연락처</label>
                                            <input type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="예) 010-1234-5678" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">이메일</label>
                                            <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="예) test@example.com" />
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
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition">
                                취소
                            </button>
                            <button form="new-inquiry-form" type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition">
                                문의 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
