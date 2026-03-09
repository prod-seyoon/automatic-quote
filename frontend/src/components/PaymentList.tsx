import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, FileText, CheckCircle, Clock, Link as LinkIcon, Edit } from 'lucide-react';

interface Order {
    id: number;
    estimate_id: number;
    payment_method: string;
    payment_status: string;
    payment_link?: string;
    tax_invoice_number?: string;
    tax_invoice_date?: string;
    is_deposit_confirmed: boolean;
    created_at: string;
    calculated_amount: number;
    company_name: string;
    customer_name: string;
    item_name: string;
}

export default function PaymentList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        payment_status: '',
        tax_invoice_number: '',
        is_deposit_confirmed: false
    });

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get('https://automatic-quote.onrender.com/api/v1/orders');
            setOrders(res.data);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("결제 링크가 클립보드에 복사되었습니다.");
    };

    const handleEditClick = (order: Order) => {
        setEditingOrderId(order.id);
        setEditForm({
            payment_status: order.payment_status,
            tax_invoice_number: order.tax_invoice_number || '',
            is_deposit_confirmed: order.is_deposit_confirmed
        });
    };

    const handleSaveEdit = async (orderId: number) => {
        try {
            await axios.put(`https://automatic-quote.onrender.com/api/v1/orders/${orderId}`, {
                payment_status: editForm.payment_status,
                tax_invoice_number: editForm.tax_invoice_number,
                is_deposit_confirmed: editForm.is_deposit_confirmed
            });
            setEditingOrderId(null);
            fetchOrders();
        } catch (err) {
            console.error(err);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const getStyle = () => {
            switch (status) {
                case '결제완료': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                case '결제대기': return 'bg-amber-100 text-amber-700 border-amber-200';
                default: return 'bg-slate-100 text-slate-700 border-slate-200';
            }
        };
        return (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStyle()}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-500" />
                    발주 및 결제 내역
                </h3>
            </div>

            <div className="overflow-auto flex-1 p-0">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium">No.</th>
                            <th className="px-6 py-3 font-medium">고객사 / 담당자</th>
                            <th className="px-6 py-3 font-medium">품목명</th>
                            <th className="px-6 py-3 font-medium text-right">결제 금액</th>
                            <th className="px-6 py-3 font-medium">결제 수단</th>
                            <th className="px-6 py-3 font-medium">상태 및 관리</th>
                            <th className="px-6 py-3 text-right font-medium">액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-slate-500">데이터를 불러오는 중...</td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-slate-500">
                                    발주 내역이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            orders.map((o, idx) => (
                                <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                                    <td className="px-6 py-4">{orders.length - idx}</td>
                                    <td className="px-6 py-4 font-medium text-slate-700">
                                        {o.company_name} <br /><span className="text-xs text-slate-400">{o.customer_name}</span>
                                    </td>
                                    <td className="px-6 py-4">{o.item_name}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-800">
                                        {o.calculated_amount.toLocaleString()}원
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {o.payment_method}
                                            {o.payment_method === '카드' && o.payment_link && (
                                                <button onClick={() => copyToClipboard(o.payment_link!)} className="text-primary hover:text-blue-700" title="결제 링크 복사">
                                                    <LinkIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingOrderId === o.id ? (
                                            <div className="flex flex-col gap-2">
                                                <select
                                                    value={editForm.payment_status}
                                                    onChange={e => setEditForm({ ...editForm, payment_status: e.target.value })}
                                                    className="text-xs border rounded p-1"
                                                >
                                                    <option value="결제대기">결제대기</option>
                                                    <option value="결제완료">결제완료</option>
                                                </select>
                                                {o.payment_method === '세금계산서' && (
                                                    <input
                                                        type="text"
                                                        placeholder="발행번호 입력"
                                                        value={editForm.tax_invoice_number}
                                                        onChange={e => setEditForm({ ...editForm, tax_invoice_number: e.target.value })}
                                                        className="text-xs border rounded p-1"
                                                    />
                                                )}
                                                {o.payment_method === '현금영수증' && (
                                                    <label className="text-xs flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.is_deposit_confirmed}
                                                            onChange={e => setEditForm({ ...editForm, is_deposit_confirmed: e.target.checked })}
                                                        /> 입금확인
                                                    </label>
                                                )}
                                                <button onClick={() => handleSaveEdit(o.id)} className="bg-primary text-white text-xs py-1 rounded">저장</button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-start gap-1">
                                                <StatusBadge status={o.payment_status} />
                                                {o.payment_method === '세금계산서' && o.tax_invoice_number && (
                                                    <span className="text-xs text-slate-400 flex items-center gap-1"><FileText className="w-3 h-3" /> No. {o.tax_invoice_number}</span>
                                                )}
                                                {o.payment_method === '현금영수증' && (
                                                    <span className={`text-xs flex items-center gap-1 ${o.is_deposit_confirmed ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                        {o.is_deposit_confirmed ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                        {o.is_deposit_confirmed ? '입금확인됨' : '입금대기'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEditClick(o)} className="p-2 text-slate-400 hover:text-indigo-500 bg-slate-100 hover:bg-indigo-50 rounded transition">
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
