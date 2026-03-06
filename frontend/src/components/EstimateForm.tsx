import React, { useState, useRef } from 'react';
import { UploadCloud, FileBox, Trash2, Settings, Loader2, Save, X } from 'lucide-react';
import ThreeViewer from './ThreeViewer';
import axios from 'axios';
import { useEffect } from 'react';

interface FileUpload {
    id: string;
    file: File;
    previewUrl?: string;
    name: string;
    size: string;
    quantity: number;
}

interface EstimateFormProps {
    existingInquiryId?: number | null;
}

export default function EstimateForm({ existingInquiryId = null }: EstimateFormProps) {
    const [files, setFiles] = useState<FileUpload[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [totalCost, setTotalCost] = useState<number | null>(null);
    const [calculationDetails, setCalculationDetails] = useState<any>(null);
    const [savedEstimateId, setSavedEstimateId] = useState<number | null>(null);

    // Settings
    const [method, setMethod] = useState('SLA');
    const [material, setMaterial] = useState('abs-like');
    const [isHollow, setIsHollow] = useState(false);
    const [shellThickness, setShellThickness] = useState(2.0);

    // Save Inquiry Modal Variables
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveFormData, setSaveFormData] = useState({
        company_name: '',
        customer_name: '',
        phone: '',
        email: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Dynamic Config State
    const [config, setConfig] = useState<any | null>(null);

    useEffect(() => {
        // Fetch quoting config
        axios.get('http://127.0.0.1:8000/api/v1/settings/quoting')
            .then(res => {
                setConfig(res.data);
                if (res.data && res.data['SLA'] && res.data['SLA'].materials.length > 0) {
                    setMaterial(res.data['SLA'].materials[0].name);
                }
            })
            .catch(err => console.error("Failed to load config:", err));
    }, []);

    // Change material when method changes
    useEffect(() => {
        if (config && config[method] && config[method].materials.length > 0) {
            setMaterial(config[method].materials[0].name);
        }
    }, [method, config]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(f => ({
                id: Math.random().toString(36).substring(7),
                file: f,
                name: f.name,
                size: formatFileSize(f.size),
                quantity: 1
            }));
            setFiles(prev => [...prev, ...newFiles]);
            if (!activeFileId && newFiles.length > 0) {
                setActiveFileId(newFiles[0].id);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            const newFiles = Array.from(e.dataTransfer.files).map(f => ({
                id: Math.random().toString(36).substring(7),
                file: f,
                name: f.name,
                size: formatFileSize(f.size),
                quantity: 1
            }));
            setFiles(prev => [...prev, ...newFiles]);
            if (!activeFileId && newFiles.length > 0) {
                setActiveFileId(newFiles[0].id);
            }
        }
    };

    const removeFile = (id: string) => {
        setFiles(files.filter(f => f.id !== id));
        if (activeFileId === id) {
            setActiveFileId(null);
        }
    };

    const updateQuantity = (id: string, qty: number) => {
        setFiles(files.map(f => f.id === id ? { ...f, quantity: Math.max(1, qty) } : f));
    };

    const handleCalculate = async () => {
        if (files.length === 0) return;
        setIsCalculating(true);
        setTotalCost(0);
        setCalculationDetails(null);
        setSavedEstimateId(null);

        let sumCost = 0;
        let detailsList = [];

        try {
            for (const f of files) {
                const formData = new FormData();
                formData.append('file', f.file);
                formData.append('method', method);
                formData.append('material', material);
                formData.append('quantity', f.quantity.toString());
                formData.append('is_hollow', isHollow ? 'true' : 'false');
                formData.append('shell_thickness', shellThickness.toString());

                const res = await axios.post('http://127.0.0.1:8000/api/v1/estimate/calculate', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (res.data.error) {
                    alert(`Error calculating ${f.name}: ` + res.data.error);
                } else {
                    sumCost += res.data.estimated_cost;
                    detailsList.push(res.data);
                }
            }

            setTotalCost(sumCost);
            setCalculationDetails(detailsList);

        } catch (err) {
            console.error(err);
            alert("견적 산출 중 서버 통신 오류가 발생했습니다.");
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSaveToInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalCost === null || !calculationDetails) return;
        setIsSaving(true);
        try {
            let inquiryId = existingInquiryId;

            if (!inquiryId) {
                // 1. Create or Find Client
                const clientRes = await axios.post('http://127.0.0.1:8000/api/v1/clients', {
                    company_name: saveFormData.company_name,
                    customer_name: saveFormData.customer_name,
                    email: saveFormData.email,
                    phone: saveFormData.phone,
                    is_new: true
                });
                const clientId = clientRes.data.id;

                // 2. Create Inquiry
                const inqRes = await axios.post('http://127.0.0.1:8000/api/v1/inquiries', {
                    client_id: clientId,
                    receiver_name: '관리자',
                    service_type: '3D프린팅',
                    item_name: files.map(f => f.name).join(', '),
                    consultation_details: `총 ${files.length}종 파트, 방법: ${method}, 소재: ${material} `
                });
                inquiryId = inqRes.data.id;
            }

            // 3. Create Estimate
            const filePaths = files.map(f => f.name);
            const estRes = await axios.post('http://127.0.0.1:8000/api/v1/estimates', {
                inquiry_id: inquiryId,
                file_paths: filePaths,
                production_method: method,
                material: material,
                quantity: 1, // Global quantity multiplier is complex, relying on individual details
                is_hollow: isHollow,
                shell_thickness: shellThickness,
                calculated_amount: totalCost,
                bin_packing_data: calculationDetails
            });

            alert("견적 내역이 성공적으로 문의에 저장되었습니다!");
            setSavedEstimateId(estRes.data.id);
            setShowSaveModal(false);
            setSaveFormData({ company_name: '', customer_name: '', phone: '', email: '' });
        } catch (err) {
            console.error(err);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    const activeFile = files.find(f => f.id === activeFileId)?.file || null;

    return (
        <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">
            {/* Left Column: List and Configuration */}
            <div className="col-span-5 flex flex-col gap-6">

                {/* Upload Zone */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center bg-blue-50/50 hover:bg-blue-50 transition cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                    <input
                        type="file"
                        multiple
                        accept=".stl,.obj,.step,.stp"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <UploadCloud className="w-10 h-10 text-primary mb-2" />
                    <p className="text-slate-700 font-semibold text-lg">3D 파일 업로드 (Drag & Drop)</p>
                    <p className="text-sm text-slate-500">STL, OBJ, STEP, STP 지원</p>
                </div>

                {/* File List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <FileBox className="w-4 h-4 text-primary" />
                            업로드된 파일 ({files.length})
                        </h3>
                    </div>
                    <div className="overflow-y-auto flex-1 p-3">
                        {files.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                파일을 추가해주세요
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {files.map((f) => (
                                    <div
                                        key={f.id}
                                        className={`flex items - center gap - 3 p - 3 rounded - lg border transition ${activeFileId === f.id ? 'border-primary bg-blue-50/30' : 'border-slate-100 hover:border-slate-200'} `}
                                        onClick={() => setActiveFileId(f.id)}
                                    >
                                        <div className="flex-1 min-w-0 cursor-pointer">
                                            <p className="text-sm font-medium text-slate-700 truncate" title={f.name}>{f.name}</p>
                                            <p className="text-xs text-slate-400">{f.size}</p>
                                        </div>

                                        {/* Quantity Control */}
                                        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => updateQuantity(f.id, f.quantity - 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded text-slate-600 hover:text-primary transition shadow-sm">-</button>
                                            <span className="w-6 text-center text-sm font-medium">{f.quantity}</span>
                                            <button onClick={() => updateQuantity(f.id, f.quantity + 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded text-slate-600 hover:text-primary transition shadow-sm">+</button>
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: 3D Viewer & Quote Generate */}
            <div className="col-span-7 flex flex-col gap-6">
                {/* 3D Viewer */}
                <div
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative"
                    style={{ height: '450px', minHeight: '450px', maxHeight: '450px', flexShrink: 0 }}
                >
                    <ThreeViewer file={activeFile || null} />
                </div>

                {/* Global Configuration & Calculate */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-secondary" />
                            출력 설정
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">제작 방식</label>
                            <select
                                value={method}
                                onChange={e => setMethod(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                            >
                                <option value="SLA">SLA</option>
                                <option value="SLS">SLS (빈패킹 적용)</option>
                                <option value="FDM">FDM</option>
                                <option value="CNC">CNC</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">출력 소재</label>
                            <select
                                value={material}
                                onChange={e => setMaterial(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                disabled={!config}
                            >
                                {config && config[method] && config[method].materials.map((mat: any, idx: number) => (
                                    <option key={idx} value={mat.name}>{mat.name} ({method})</option>
                                ))}
                                {(!config || !config[method] || config[method].materials.length === 0) && (
                                    <option value="">소재 없음</option>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 mb-6">
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={isHollow} onChange={(e) => setIsHollow(e.target.checked)} />
                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700">Shell (속비우기) 적용</span>
                            </label>
                        </div>
                        {isHollow && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={shellThickness}
                                    onChange={e => setShellThickness(parseFloat(e.target.value))}
                                    step="0.1"
                                    className="w-20 bg-white border border-slate-200 text-center rounded-md px-2 py-1.5 text-sm"
                                />
                                <span className="text-sm text-slate-500">mm 두께</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        {totalCost !== null && !isCalculating ? (
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-500">예상 견적 금액 (부가세 별도)</span>
                                <span className="text-3xl font-bold text-slate-800">{totalCost.toLocaleString()} <span className="text-xl">원</span></span>
                            </div>
                        ) : (
                            <div></div>
                        )}

                        <div className="flex gap-3">
                            {totalCost !== null && !isCalculating && !savedEstimateId && (
                                <button
                                    onClick={() => setShowSaveModal(true)}
                                    className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-medium py-3 px-6 rounded-xl transition flex items-center gap-2"
                                >
                                    문의 접수로 저장
                                </button>
                            )}
                            {savedEstimateId && (
                                <a
                                    href={`http://127.0.0.1:8000/api/v1/estimates/${savedEstimateId}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-medium py-3 px-6 rounded-xl transition flex items-center gap-2"
                                >
                                    견적서 PDF 다운로드
                                </a>
                            )}
                            <button
                                disabled={files.length === 0 || isCalculating}
                                onClick={handleCalculate}
                                className="bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCalculating ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> 산출 중...</>
                                ) : (
                                    '견적 검토 및 산출'
                                )}
                            </button>
                        </div>
                    </div>

                    {calculationDetails && calculationDetails.length > 0 && (
                        <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600 max-h-40 overflow-y-auto">
                            <p className="font-semibold mb-2">산출 세부 내역:</p>
                            {calculationDetails.map((det: any, idx: number) => (
                                <div key={idx} className="mb-2 pb-2 border-b border-slate-200 last:border-0 text-xs">
                                    <span className="font-medium text-slate-800">{det.filename} ({det.quantity}EA)</span>:
                                    체적 {det.volume_mm3.toFixed(2)} mm³, 예상금액: {det.estimated_cost.toLocaleString()}원
                                    {det.details?.height_cm && ` (최대 높이: ${det.details.height_cm.toFixed(1)} cm)`}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Save to Inquiry Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Save className="w-5 h-5 text-indigo-500" />
                                산출된 견적 저장하기
                            </h2>
                            <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-600 transition p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            <div className="mb-6 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm">
                                <p className="text-slate-600 mb-1">총 예상 금액 (부가세 별도)</p>
                                <p className="text-2xl font-bold text-indigo-700">{totalCost?.toLocaleString()} 원</p>
                            </div>

                            <form id="save-inquiry-form" onSubmit={handleSaveToInquiry} className="space-y-4">
                                {existingInquiryId ? (
                                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg text-sm text-indigo-800 text-center font-medium">
                                        기존 접수된 문의(ID: {existingInquiryId})에 현재 견적서를 연결하여 저장합니다.
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">고객사 / 단체명</label>
                                            <input type="text" required={!existingInquiryId} value={saveFormData.company_name} onChange={e => setSaveFormData({ ...saveFormData, company_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="예) 삼성전자" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">고객명 (담당자)</label>
                                            <input type="text" required={!existingInquiryId} value={saveFormData.customer_name} onChange={e => setSaveFormData({ ...saveFormData, customer_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="예) 홍길동 대리" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">연락처</label>
                                                <input type="text" required={!existingInquiryId} value={saveFormData.phone} onChange={e => setSaveFormData({ ...saveFormData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="예) 010-1234-5678" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">이메일</label>
                                                <input type="email" required={!existingInquiryId} value={saveFormData.email} onChange={e => setSaveFormData({ ...saveFormData, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="test@example.com" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowSaveModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition">
                                취소
                            </button>
                            <button
                                form="save-inquiry-form"
                                type="submit"
                                disabled={isSaving}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> 저장 중...</> : '견적 저장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
