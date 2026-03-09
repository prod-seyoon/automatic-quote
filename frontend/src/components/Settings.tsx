import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Save, Loader2, Plus, Trash2 } from 'lucide-react';

interface Material {
    name: string;
    price_per_gram: number;
    min_cost: number;
}

interface MethodConfig {
    equipment_fee: number;
    materials: Material[];
}

interface QuotingConfig {
    [method: string]: MethodConfig;
}

export default function Settings() {
    const [config, setConfig] = useState<QuotingConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await axios.get('https://automatic-quote.onrender.com/api/v1/settings/quoting');
            setConfig(res.data);
        } catch (err) {
            console.error("Failed to fetch settings:", err);
            alert("설정을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await axios.put('https://automatic-quote.onrender.com/api/v1/settings/quoting', { config });
            alert("설정이 성공적으로 저장되었습니다.");
        } catch (err) {
            console.error("Failed to save settings:", err);
            alert("저장에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleEquipmentFeeChange = (method: string, val: string) => {
        if (!config) return;
        setConfig({
            ...config,
            [method]: { ...config[method], equipment_fee: parseInt(val) || 0 }
        });
    };

    const handleMaterialChange = (method: string, idx: number, field: keyof Material, val: string) => {
        if (!config) return;
        const newMaterials = [...config[method].materials];
        newMaterials[idx] = {
            ...newMaterials[idx],
            [field]: field === 'name' ? val : (parseInt(val) || 0)
        };
        setConfig({
            ...config,
            [method]: { ...config[method], materials: newMaterials }
        });
    };

    const addMaterial = (method: string) => {
        if (!config) return;
        const newMaterials = [...config[method].materials, { name: "신규 소재", price_per_gram: 0, min_cost: 0 }];
        setConfig({
            ...config,
            [method]: { ...config[method], materials: newMaterials }
        });
    };

    const removeMaterial = (method: string, idx: number) => {
        if (!config) return;
        const newMaterials = config[method].materials.filter((_, i) => i !== idx);
        setConfig({
            ...config,
            [method]: { ...config[method], materials: newMaterials }
        });
    };

    if (loading) return <div className="p-8 flex items-center justify-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> 로딩 중...</div>;
    if (!config) return <div className="p-8 text-center text-red-500">설정 데이터를 불러올 수 없습니다.</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden max-w-5xl">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-indigo-500" />
                    자동 견적 산출 로직 관리
                </h3>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    저장하기
                </button>
            </div>

            <div className="p-6 overflow-y-auto w-full space-y-8">
                {['SLA', 'SLS', 'FDM', 'CNC'].map((method) => (
                    config[method] && (
                        <div key={method} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 text-lg">{method} 기본 설정</h4>
                                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                    <label className="text-sm font-medium text-slate-600">장비 준비/사용료 (기본료):</label>
                                    <input
                                        type="number"
                                        className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                                        value={config[method].equipment_fee}
                                        onChange={(e) => handleEquipmentFeeChange(method, e.target.value)}
                                    />
                                    <span className="text-sm text-slate-500">원</span>
                                </div>
                            </div>

                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="px-5 py-3 font-medium">소재명 (Material)</th>
                                        <th className="px-5 py-3 font-medium">단가 (원 / Gram)</th>
                                        <th className="px-5 py-3 font-medium">최소 비용 (Min Cost)</th>
                                        <th className="px-5 py-3 font-medium text-right">
                                            <button onClick={() => addMaterial(method)} className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded flex items-center gap-1 text-xs float-right transition">
                                                <Plus className="w-3 h-3" /> 항목 추가
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {config[method].materials.map((mat, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                                            <td className="px-5 py-3">
                                                <input
                                                    type="text"
                                                    value={mat.name}
                                                    onChange={e => handleMaterialChange(method, idx, 'name', e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={mat.price_per_gram}
                                                        onChange={e => handleMaterialChange(method, idx, 'price_per_gram', e.target.value)}
                                                        className="w-24 text-right bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                                    /> <span className="text-sm text-slate-500">원</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={mat.min_cost}
                                                        onChange={e => handleMaterialChange(method, idx, 'min_cost', e.target.value)}
                                                        className="w-32 text-right bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-medium text-indigo-700"
                                                    /> <span className="text-sm text-slate-500">원</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => removeMaterial(method, idx)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {config[method].materials.length === 0 && (
                                <div className="p-4 text-center text-sm text-slate-500 bg-slate-50">등록된 소재가 없습니다.</div>
                            )}
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}
