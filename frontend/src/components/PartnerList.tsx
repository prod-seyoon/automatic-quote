import { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Factory, Package, Edit, DollarSign } from 'lucide-react';



interface Outsourcing {
    id: number;
    order_id: number;
    partner_id: number;
    partner_name: string;
    outsourcing_cost: number;
    is_paid_to_partner: boolean;
    inspection_date?: string;
    shipping_date?: string;
    tracking_number?: string;
    created_at: string;
    item_name: string;
    client_name: string;
}

export default function PartnerList() {
    const [outsourcings, setOutsourcings] = useState<Outsourcing[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        is_paid_to_partner: false,
        tracking_number: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const oRes = await axios.get('http://127.0.0.1:8000/api/v1/outsourcings');
            setOutsourcings(oRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (out: Outsourcing) => {
        setEditingId(out.id);
        setEditForm({
            is_paid_to_partner: out.is_paid_to_partner,
            tracking_number: out.tracking_number || ''
        });
    };

    const handleSaveEdit = async (id: number) => {
        try {
            await axios.put(`http://127.0.0.1:8000/api/v1/outsourcings/${id}`, {
                is_paid_to_partner: editForm.is_paid_to_partner,
                tracking_number: editForm.tracking_number
            });
            setEditingId(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("저장 실패");
        }
    };

    const StatusBadge = ({ tracking, isPaid }: { tracking?: string, isPaid: boolean }) => {
        if (tracking) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1 w-max"><Truck className="w-3 h-3" /> 출고완료</span>;
        }
        if (isPaid) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full border bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1 w-max"><Factory className="w-3 h-3" /> 제작중</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1 w-max"><Package className="w-3 h-3" /> 발주대기</span>;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Factory className="w-5 h-5 text-orange-500" />
                    협력사 외주 현황
                </h3>
            </div>

            <div className="overflow-auto flex-1 p-0">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium">발주일자</th>
                            <th className="px-6 py-3 font-medium">품목 / 고객사</th>
                            <th className="px-6 py-3 font-medium">배정 협력사</th>
                            <th className="px-6 py-3 font-medium text-right">외주 비용</th>
                            <th className="px-6 py-3 font-medium">외주 상태</th>
                            <th className="px-6 py-3 text-right font-medium">액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8">데이터 로딩 중...</td></tr>
                        ) : outsourcings.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-12">외주 발주 내역이 없습니다.</td></tr>
                        ) : (
                            outsourcings.map(out => (
                                <tr key={out.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="px-6 py-4">{new Date(out.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {out.item_name} <br /><span className="text-xs text-slate-400 font-normal">{out.client_name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-orange-600 font-medium">{out.partner_name}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-700">
                                        {out.outsourcing_cost.toLocaleString()}원
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingId === out.id ? (
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs flex items-center gap-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.is_paid_to_partner}
                                                        onChange={e => setEditForm({ ...editForm, is_paid_to_partner: e.target.checked })}
                                                    /> 대금 지급완료
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="송장번호 입력"
                                                    value={editForm.tracking_number}
                                                    onChange={e => setEditForm({ ...editForm, tracking_number: e.target.value })}
                                                    className="text-xs border rounded p-1"
                                                />
                                                <button onClick={() => handleSaveEdit(out.id)} className="bg-primary text-white text-xs py-1 rounded">저장</button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <StatusBadge tracking={out.tracking_number} isPaid={out.is_paid_to_partner} />
                                                <span className={`text-xs flex items-center gap-1 ${out.is_paid_to_partner ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    <DollarSign className="w-3 h-3" /> 대금 {out.is_paid_to_partner ? '지급됨' : '미지급'}
                                                </span>
                                                {out.tracking_number && (
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Truck className="w-3 h-3" /> {out.tracking_number}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEditClick(out)} className="p-2 text-slate-400 hover:text-orange-500 bg-slate-100 hover:bg-orange-50 rounded transition">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
