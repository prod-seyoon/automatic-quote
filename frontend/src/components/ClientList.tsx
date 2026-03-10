import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, X, Edit2, Building2, UserCircle, Briefcase, Mail, Phone, Trash2, Save, UploadCloud, CheckCircle2 } from 'lucide-react';

interface ContactInfo {
    name: string;
    phone: string;
    email: string;
    notes?: string;
}

interface Client {
    id: number;
    company_name: string;
    representative_name?: string;
    customer_name: string;
    email: string;
    phone: string;
    contacts: ContactInfo[];
    business_registration_number?: string;
    business_registration_file?: string;
    address?: string;
    business_type?: string;
    business_item?: string;
    created_at: string;
}

export default function ClientList() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Modal state for adding/editing a Client (Company)
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Client | null>(null);

    const initialCompanyForm = {
        company_name: '',
        representative_name: '',
        customer_name: '',
        email: '',
        phone: '',
        business_registration_number: ''
    };
    const [companyForm, setCompanyForm] = useState(initialCompanyForm);

    // Editing contacts state
    const [editingContacts, setEditingContacts] = useState<ContactInfo[]>([]);
    const [isSavingContacts, setIsSavingContacts] = useState(false);
    const [hasUnsavedContacts, setHasUnsavedContacts] = useState(false);

    // OCR Upload State
    const [isUploadingOCR, setIsUploadingOCR] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`https://automatic-quote.onrender.com/api/v1/clients?search_term=${searchTerm}`);
            setClients(res.data);
            // Update selected client if it was selected
            if (selectedClient) {
                const updated = res.data.find((c: Client) => c.id === selectedClient.id);
                if (updated) {
                    setSelectedClient(updated);
                    setEditingContacts(updated.contacts || []);
                    setHasUnsavedContacts(false);
                } else {
                    setSelectedClient(null);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCompanyClick = (client: Client) => {
        if (hasUnsavedContacts) {
            if (!window.confirm('저장하지 않은 담당자 정보가 있습니다. 무시하고 다른 거래처를 선택하시겠습니까?')) {
                return;
            }
        }
        setSelectedClient(client);
        setEditingContacts(client.contacts || []);
        setHasUnsavedContacts(false);
    };

    const handleSaveCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCompany) {
                await axios.put(`https://automatic-quote.onrender.com/api/v1/clients/${editingCompany.id}`, companyForm);
                alert("거래처 정보가 수정되었습니다.");
            } else {
                await axios.post('https://automatic-quote.onrender.com/api/v1/clients', {
                    ...companyForm,
                    is_new: true,
                    contacts: []
                });
                alert("신규 거래처가 등록되었습니다.");
            }
            setShowCompanyModal(false);
            fetchClients();
        } catch (e) {
            console.error(e);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const openCompanyModal = (client?: Client) => {
        if (client) {
            setEditingCompany(client);
            setCompanyForm({
                company_name: client.company_name,
                representative_name: client.representative_name || '',
                customer_name: client.customer_name,
                email: client.email,
                phone: client.phone,
                business_registration_number: client.business_registration_number || ''
            });
        } else {
            setEditingCompany(null);
            setCompanyForm(initialCompanyForm);
        }
        setShowCompanyModal(true);
    };

    const handleAddContact = () => {
        setEditingContacts([...(editingContacts || []), { name: '', phone: '', email: '', notes: '' }]);
        setHasUnsavedContacts(true);
    };

    const handleContactChange = (index: number, field: keyof ContactInfo, value: string) => {
        const newContacts = [...editingContacts];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setEditingContacts(newContacts);
        setHasUnsavedContacts(true);
    };

    const handleRemoveContact = (index: number) => {
        const newContacts = [...editingContacts];
        newContacts.splice(index, 1);
        setEditingContacts(newContacts);
        setHasUnsavedContacts(true);
    };

    const handleSaveContacts = async () => {
        if (!selectedClient) return;

        // Validation
        const validContacts = editingContacts.filter(c => c.name.trim() !== '');

        setIsSavingContacts(true);
        try {
            await axios.put(`https://automatic-quote.onrender.com/api/v1/clients/${selectedClient.id}`, {
                contacts: validContacts
            });
            alert('담당자 정보가 저장되었습니다.');
            setHasUnsavedContacts(false);
            fetchClients();
        } catch (e) {
            console.error(e);
            alert('담당자 추가/수정 저장에 실패했습니다.');
        } finally {
            setIsSavingContacts(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedClient) return;
        const file = e.target.files[0];

        setIsUploadingOCR(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`https://automatic-quote.onrender.com/api/v1/clients/${selectedClient.id}/upload-business-registration`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('사업자등록증 파싱 완료!');

            // Update Selected Client locally to show new fields without refetching immediately
            setSelectedClient(res.data.client);
            fetchClients(); // Refetch to update the list 
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || '업로드 및 파싱에 실패했습니다.';
            alert(msg);
        } finally {
            setIsUploadingOCR(false);
        }
    };

    return (
        <div className="flex gap-6 h-full">
            {/* Left Pane: Company List */}
            <div className="w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" /> 거래처 목록
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => openCompanyModal()} className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm bg-gradient-to-r from-primary to-blue-600">
                            <Plus className="w-3.5 h-3.5" /> 신규 등록
                        </button>
                    </div>
                </div>
                <div className="p-3 bg-white border-b border-slate-100">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchClients()}
                            placeholder="기업명, 담당자명 검색"
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs text-slate-500 bg-white sticky top-0 uppercase font-medium z-10 shadow-sm">
                            <tr>
                                <th className="px-5 py-3 border-b border-slate-200 w-12 text-center">NO</th>
                                <th className="px-5 py-3 border-b border-slate-200">거래처명</th>
                                <th className="px-5 py-3 border-b border-slate-200">등록번호</th>
                                <th className="px-5 py-3 border-b border-slate-200">대표자명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-12 text-slate-500 bg-white">불러오는 중...</td></tr>
                            ) : clients.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-12 text-slate-500 bg-white">검색된 거래처가 없습니다.</td></tr>
                            ) : (
                                clients.map(c => (
                                    <tr
                                        key={c.id}
                                        onClick={() => handleCompanyClick(c)}
                                        className={`border-b border-slate-200 cursor-pointer transition ${selectedClient?.id === c.id ? 'bg-blue-50/80 border-l-4 border-l-primary' : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                                    >
                                        <td className="px-5 py-3.5 text-slate-400 font-medium text-center">{c.id}</td>
                                        <td className="px-5 py-3.5 font-bold text-slate-800 flex items-center gap-2">
                                            <Building2 className={`w-4 h-4 ${selectedClient?.id === c.id ? 'text-primary' : 'text-slate-300'}`} />
                                            {c.company_name}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">{c.business_registration_number || '-'}</td>
                                        <td className="px-5 py-3.5 font-medium text-slate-700">{c.representative_name || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right Pane: Company Details & Contacts */}
            <div className="w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
                {!selectedClient ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                        <Briefcase className="w-16 h-16 mb-4 text-slate-200 opacity-50" />
                        <p className="font-medium text-slate-500">좌측 목록에서 거래처를 선택해주세요</p>
                    </div>
                ) : (
                    <>
                        {/* Company Header */}
                        <div className="p-8 border-b border-slate-200 bg-white">
                            <div className="flex justify-between items-start mb-6">
                                <h1 className="text-2xl font-bold text-slate-800">{selectedClient.company_name}</h1>
                                <button onClick={() => openCompanyModal(selectedClient)} className="p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-lg transition" title="거래처 정보 수정">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex gap-8 text-sm">
                                <div>
                                    <span className="text-slate-500 font-medium mr-3">사업자번호</span>
                                    <span className="font-bold text-slate-800 font-mono tracking-tight">{selectedClient.business_registration_number || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-medium mr-1">대표자</span>
                                    <span className="font-bold text-slate-800">{selectedClient.representative_name || '-'}</span>
                                </div>
                            </div>

                            {(selectedClient.address || selectedClient.business_type || selectedClient.business_item) && (
                                <div className="mt-4 pt-4 border-t border-slate-100/60 grid grid-cols-1 gap-2 text-sm bg-slate-50/50 p-4 rounded-xl">
                                    {selectedClient.address && <div className="flex items-start gap-2"><span className="text-slate-500 font-medium min-w-16">사업장</span><span className="text-slate-800">{selectedClient.address}</span></div>}
                                    <div className="flex gap-6">
                                        {selectedClient.business_type && <div className="flex items-center gap-2"><span className="text-slate-500 font-medium min-w-16">업태</span><span className="text-slate-800">{selectedClient.business_type}</span></div>}
                                        {selectedClient.business_item && <div className="flex items-center gap-2"><span className="text-slate-500 font-medium min-w-16">종목</span><span className="text-slate-800">{selectedClient.business_item}</span></div>}
                                    </div>
                                </div>
                            )}

                            <div className="mt-5 pt-5 border-t border-slate-200">
                                <label className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 cursor-pointer transition shadow-sm relative overflow-hidden group">
                                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} disabled={isUploadingOCR} />
                                    {isUploadingOCR ? (
                                        <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> 파싱중...</div>
                                    ) : (
                                        <>
                                            {selectedClient.business_registration_file ? <CheckCircle2 className="w-4 h-4 text-indigo-600" /> : <UploadCloud className="w-4 h-4 text-indigo-600 group-hover:-translate-y-0.5 transition" />}
                                            {selectedClient.business_registration_file ? '사업자등록증 재업로드 (OCR)' : '사업자등록증 업로드 및 파싱 (OCR)'}
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Contacts Section */}
                        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
                                    <UserCircle className="w-5 h-5 text-slate-500" /> 담당자 정보 목록
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddContact}
                                        className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> 담당자 위 아래 추가
                                    </button>
                                    {hasUnsavedContacts && (
                                        <button
                                            onClick={handleSaveContacts}
                                            disabled={isSavingContacts}
                                            className="text-xs font-bold text-white bg-green-600 px-4 py-1.5 rounded-lg hover:bg-green-700 transition flex items-center gap-1.5 shadow-sm shadow-green-500/20"
                                        >
                                            <Save className="w-3.5 h-3.5" /> {isSavingContacts ? '저장 중...' : '담당자 변경사항 저장'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {editingContacts && editingContacts.map((contact, idx) => (
                                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-200 transition group relative">
                                        <div className="grid grid-cols-[80px_1fr] gap-4">
                                            <div className="font-medium text-sm text-slate-700 flex items-center">
                                                <input
                                                    type="text"
                                                    value={contact.name}
                                                    onChange={e => handleContactChange(idx, 'name', e.target.value)}
                                                    placeholder="담당자명"
                                                    className="w-full font-bold text-slate-800 border-b border-transparent hover:border-slate-200 focus:border-primary focus:ring-0 bg-transparent p-1 transition placeholder-slate-300"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={contact.phone}
                                                        onChange={e => handleContactChange(idx, 'phone', e.target.value)}
                                                        placeholder="연락처 입력"
                                                        className="w-full border-b border-transparent hover:border-slate-200 focus:border-primary focus:ring-0 bg-transparent p-1 transition"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <input
                                                        type="email"
                                                        value={contact.email}
                                                        onChange={e => handleContactChange(idx, 'email', e.target.value)}
                                                        placeholder="이메일 입력"
                                                        className="w-full border-b border-transparent hover:border-slate-200 focus:border-primary focus:ring-0 bg-transparent p-1 transition"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveContact(idx)}
                                            className="absolute top-1/2 -translate-y-1/2 -right-3 w-7 h-7 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition shadow-sm hover:bg-red-200 hover:scale-110"
                                            title="담당자 삭제"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {(!editingContacts || editingContacts.length === 0) && (
                                    <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                                        등록된 담당자가 없습니다.<br />[새 담당자 추가] 버튼을 눌러 연락처를 등록해주세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Company Form Modal */}
            {showCompanyModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-[60] backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" /> {editingCompany ? '거래처 기본정보 수정' : '신규 거래처 등록'}
                            </h2>
                            <button onClick={() => setShowCompanyModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <form id="company-form" onSubmit={handleSaveCompany} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">거래처명 (회사명) <span className="text-red-500">*</span></label>
                                    <input type="text" required value={companyForm.company_name} onChange={e => setCompanyForm({ ...companyForm, company_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5">사업자등록번호</label>
                                        <input type="text" value={companyForm.business_registration_number} onChange={e => setCompanyForm({ ...companyForm, business_registration_number: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition" placeholder="000-00-00000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5">대표자명</label>
                                        <input type="text" value={companyForm.representative_name} onChange={e => setCompanyForm({ ...companyForm, representative_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition" />
                                    </div>
                                </div>

                                {!editingCompany && (
                                    <div className="pt-4 mt-2 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 mb-3 bg-blue-50 text-blue-800 p-2 rounded px-3">신규 거래처 등록 시 아래 연락처가 <b>기본 담당자</b>로 자동 생성됩니다.</p>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1.5">담당자 성함 (선택)</label>
                                            <input type="text" value={companyForm.customer_name} onChange={e => setCompanyForm({ ...companyForm, customer_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1.5">연락처</label>
                                                <input type="text" value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1.5">이메일</label>
                                                <input type="email" value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setShowCompanyModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">취소</button>
                            <button form="company-form" type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition">저장하기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
