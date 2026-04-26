"use client";

import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Activity, FlaskConical, Sun, Droplets, User, Upload, LayoutDashboard, 
  FileText, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, 
  ChevronRight, Brain, Sparkles, X, Save, MessageCircle, Send
} from 'lucide-react';
import axios from 'axios';

// Mock Data
interface DataPoint {
    date: string;
    value: number;
}

interface Biomarker {
    name: string;
    unit: string;
    data: DataPoint[];
    ref: string;
    trend: string;
}

const MOCK_BIOMARKERS: Record<string, Biomarker[]> = {
    hormonal: [
        { name: 'Testosterona Total', unit: 'ng/dL', data: [
            { date: '2024-01-15', value: 520 }, { date: '2024-02-20', value: 580 },
            { date: '2024-03-18', value: 650 }, { date: '2024-04-25', value: 720 }
        ], ref: '249-836', trend: 'up' },
        { name: 'TSH', unit: 'μUI/mL', data: [
            { date: '2024-01-15', value: 2.8 }, { date: '2024-02-20', value: 2.4 },
            { date: '2024-03-18', value: 2.1 }, { date: '2024-04-25', value: 1.9 }
        ], ref: '0.4-4.0', trend: 'down' },
    ],
    bioquimica: [
        { name: 'Creatinina', unit: 'mg/dL', data: [
            { date: '2024-01-15', value: 1.1 }, { date: '2024-02-20', value: 1.15 },
            { date: '2024-03-18', value: 1.12 }, { date: '2024-04-25', value: 1.08 }
        ], ref: '0.7-1.3', trend: 'stable' }
    ],
    vitaminas: [],
    hemograma: []
};

const CATEGORIES = {
    hormonal: { label: 'Hormonal', color: '#0d9488', icon: Activity },
    bioquimica: { label: 'Bioquímica', color: '#3b82f6', icon: FlaskConical },
    vitaminas: { label: 'Vitaminas', color: '#f59e0b', icon: Sun },
    hemograma: { label: 'Hemograma', color: '#ef4444', icon: Droplets }
};

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    
    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-10">
                <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-500 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-800 text-sm tracking-tight">MedSport AI</h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Módulo Médico</p>
                    </div>
                </div>
                
                <nav className="flex-1 p-4 space-y-1">
                    {[
                        { id: 'profile', label: 'Meu Perfil', icon: User },
                        { id: 'upload', label: 'Importar Exame', icon: Upload },
                        { id: 'dashboard', label: 'Histórico Geral', icon: LayoutDashboard }
                    ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button key={item.id} onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    isActive ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                                }`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                                {item.label}
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-teal-600" />}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-8">
                {activeTab === 'profile' && <ProfileView />}
                {activeTab === 'upload' && <UploadView />}
                {activeTab === 'dashboard' && <DashboardView />}
            </div>
            
            {/* Native Chat Component */}
            {activeTab === 'dashboard' && <ChatAgent />}
        </div>
    );
}

function ProfileView() {
    return <div className="max-w-4xl mx-auto space-y-6"><h2 className="text-2xl font-bold">Meu Perfil</h2></div>;
}

function UploadView() {
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<{time:string, msg:string}[]>([]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setProcessing(true);
            setProgress(10);
            setLogs([{ time: new Date().toLocaleTimeString(), msg: 'Arquivo selecionado: ' + selectedFile.name }]);
            
            const formData = new FormData();
            formData.append('file', selectedFile);

            // Simulating steps
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev < 90) return prev + Math.random() * 5;
                    return prev;
                });
            }, 500);

            try {
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Enviando para o servidor e processando com Gemini 2.5 Flash...' }]);
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await axios.post(`${apiUrl}/upload`, formData);
                
                clearInterval(interval);
                setProgress(100);
                const isWarning = res.data.status === 'warning';
                setLogs(prev => [...prev, { 
                    time: new Date().toLocaleTimeString(), 
                    msg: (isWarning ? '⚠️ ' : '✅ ') + res.data.message 
                }]);
                
                setProcessing(false);
                setTimeout(() => setProgress(0), 1000);
            } catch (err) {
                clearInterval(interval);
                console.error(err);
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Erro durante o processamento do exame.' }]);
                setProcessing(false);
                setProgress(0);
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Importar Exame</h2>
                    <p className="text-slate-500 mt-1">O Gemini 2.5 Flash irá extrair automaticamente os biomarcadores e gerar o conhecimento para o chat.</p>
                </div>
            </div>

            <div className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 ${
                processing ? 'border-teal-500 bg-teal-50/30' : 'border-slate-200 hover:border-teal-400 bg-white shadow-sm'
            }`}>
                {!processing ? (
                    <>
                        <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Upload className="w-10 h-10 text-teal-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">Selecione seu Laudo Médico</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">Arraste ou clique para selecionar o arquivo PDF. Garantimos o processamento seguro dos seus dados.</p>
                        <input type="file" accept=".pdf" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <button className="px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all">
                            Selecionar PDF
                        </button>
                    </>
                ) : (
                    <div className="space-y-8">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-teal-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                            <Brain className="absolute inset-0 m-auto w-10 h-10 text-teal-600 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-teal-800 mb-2">Processando com IA...</h3>
                            <div className="max-w-md mx-auto w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-4">
                                <div 
                                    className="bg-teal-500 h-full transition-all duration-500 ease-out" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-slate-500 text-sm mt-3 font-medium">{Math.round(progress)}% Concluído</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">Logs de Processamento</span>
                </div>
                <div className="space-y-2 font-mono text-[11px] max-h-48 overflow-y-auto custom-scrollbar">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-4 items-start border-l border-slate-800 pl-4">
                            <span className="text-slate-500 shrink-0">{log.time}</span>
                            <span className={log.msg.includes('Sucesso') ? 'text-teal-400' : 'text-slate-300'}>
                                {log.msg}
                            </span>
                        </div>
                    ))}
                    {processing && (
                        <div className="flex gap-2 items-center text-teal-500 animate-pulse pl-4 border-l border-teal-500">
                            <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                            <span>Aguardando resposta do Gemini 2.5 Flash...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DashboardView() {
    const [activeCategory, setActiveCategory] = useState<keyof typeof CATEGORIES | 'outros'>('hormonal');
    const [realData, setRealData] = useState<Record<string, Biomarker[]>>({
        hormonal: [], bioquimica: [], vitaminas: [], hemograma: [], outros: []
    });
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await axios.get(`${apiUrl}/biomarkers`);
                
                const rawData = res.data.data || [];
                const grouped: Record<string, Biomarker[]> = {
                    hormonal: [], bioquimica: [], vitaminas: [], hemograma: [], outros: []
                };

                const markerMap: Record<string, Biomarker> = {};

                rawData.forEach((row: any) => {
                    const catStr = row.category ? row.category.toLowerCase() : 'outros';
                    let cat = 'outros';
                    if (catStr.includes('hormon')) cat = 'hormonal';
                    else if (catStr.includes('bioquim') || catStr.includes('lipid')) cat = 'bioquimica';
                    else if (catStr.includes('vitam')) cat = 'vitaminas';
                    else if (catStr.includes('hemo')) cat = 'hemograma';
                    
                    const key = `${cat}_${row.name}`;
                    
                    if (!markerMap[key]) {
                        markerMap[key] = {
                            name: row.name,
                            unit: row.unit || '',
                            data: [],
                            ref: row.reference_range || '-',
                            trend: 'stable'
                        };
                        grouped[cat].push(markerMap[key]);
                    }
                    
                    markerMap[key].data.push({
                        date: row.collection_date || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                        value: row.value
                    });
                });

                // Sort dates and calculate trends
                Object.values(markerMap).forEach(m => {
                    m.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    if (m.data.length > 1) {
                        const last = m.data[m.data.length - 1].value;
                        const prev = m.data[m.data.length - 2].value;
                        if (last > prev) m.trend = 'up';
                        else if (last < prev) m.trend = 'down';
                    }
                });

                setRealData(grouped);
            } catch (e) {
                console.error("Erro ao buscar biomarcadores", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const currentData = realData[activeCategory] || [];
    const catInfo = CATEGORIES[activeCategory as keyof typeof CATEGORIES] || { label: 'Outros', color: '#64748b', icon: Activity };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 gap-4">
                <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
                <p className="text-slate-500 text-sm animate-pulse">Carregando histórico de exames...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Histórico Geral</h2>
                <p className="text-slate-500 text-sm mt-1">Evolução dos biomarcadores ao longo do tempo</p>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
                {[...Object.keys(CATEGORIES), 'outros'].map((k) => {
                    const info = CATEGORIES[k as keyof typeof CATEGORIES] || { label: 'Outros', color: '#64748b', icon: Activity };
                    const Icon = info.icon;
                    const count = realData[k]?.length ?? 0;
                    if (k === 'outros' && count === 0) return null;
                    
                    return (
                        <button key={k} onClick={() => setActiveCategory(k as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                activeCategory === k ? 'text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                            style={activeCategory === k ? { backgroundColor: info.color } : {}}>
                            <Icon className="w-4 h-4" />
                            {info.label}
                            {count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                                    activeCategory === k ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {currentData.length === 0 ? (
                <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">Nenhum exame encontrado nesta categoria</p>
                    <p className="text-slate-400 text-sm mt-1">Importe um laudo PDF para começar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {currentData.map((marker: Biomarker, i: number) => (
                        <BiomarkerCard key={i} marker={marker} color={catInfo.color} />
                    ))}
                </div>
            )}
        </div>
    );
}

function formatDate(dateStr: string): string {
    try {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    } catch {
        return dateStr;
    }
}

function BiomarkerCard({ marker, color }: { marker: Biomarker; color: string }) {
    const lastValue = marker.data.length > 0 ? marker.data[marker.data.length - 1] : null;
    const TrendIcon = marker.trend === 'up' ? TrendingUp : marker.trend === 'down' ? TrendingDown : Minus;
    const trendColor = marker.trend === 'up' ? '#10b981' : marker.trend === 'down' ? '#ef4444' : '#64748b';

    // Custom dot renderer for LineChart
    const CustomDot = (props: any) => {
        const { cx, cy } = props;
        return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: '#1e293b',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.18)'
                }}>
                    <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>{formatDate(label)}</p>
                    <p style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700 }}>
                        {payload[0].value} <span style={{ color: '#64748b', fontWeight: 400, fontSize: 12 }}>{marker.unit}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
            {/* Card Header */}
            <div className="px-6 pt-5 pb-2 flex items-start justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 text-base">{marker.name}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Unidade: {marker.unit || '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {lastValue && (
                        <span className="text-2xl font-bold" style={{ color }}>
                            {lastValue.value}
                            <span className="text-sm font-normal text-slate-400 ml-1">{marker.unit}</span>
                        </span>
                    )}
                    <div className="flex items-center gap-1">
                        <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
                        <span className="text-xs font-medium" style={{ color: trendColor }}>
                            {marker.trend === 'up' ? 'Subindo' : marker.trend === 'down' ? 'Descendo' : 'Estável'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Line Chart */}
            <div className="px-2 pb-2" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={marker.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            width={45}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2.5}
                            dot={<CustomDot />}
                            activeDot={{ r: 7, strokeWidth: 0, fill: color }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-slate-100" />

            {/* Data Table */}
            <div className="px-6 py-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Histórico de Resultados
                </p>
                <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/2">Data</th>
                                <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/2">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...marker.data].reverse().map((point, j) => {
                                const isLast = j === 0;
                                return (
                                    <tr key={j} className={`border-t border-slate-100 transition-colors ${isLast ? 'bg-teal-50/60' : 'hover:bg-slate-50'}`}>
                                        <td className="px-4 py-2.5 text-slate-600 font-medium tabular-nums">{formatDate(point.date)}</td>
                                        <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: isLast ? color : '#334155' }}>
                                            {point.value} <span className="text-slate-400 font-normal text-xs">{marker.unit}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ChatAgent() {
    const [open, setOpen] = useState(false);
    const [msg, setMsg] = useState("");
    const [history, setHistory] = useState<{role: 'user'|'ai', content: string}[]>([]);
    const [loading, setLoading] = useState(false);

    const sendMsg = async () => {
        if (!msg.trim()) return;
        setHistory(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);
        const query = msg;
        setMsg("");
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await axios.post(`${apiUrl}/chat`, { message: query });
            setHistory(prev => [...prev, { role: 'ai', content: res.data.response }]);
        } catch (e) {
            setHistory(prev => [...prev, { role: 'ai', content: "Erro ao conectar com FastAPI." }]);
        }
        setLoading(false);
    };

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 p-4 bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700">
                <MessageCircle className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden" style={{height: '500px'}}>
            <div className="bg-teal-600 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    <span className="font-medium">Agente Médico IA (Gemini 2.5)</span>
                </div>
                <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                <div className="bg-white border border-slate-100 p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-slate-700">
                    Olá! Sou o Assistente IA conectado aos laudos do paciente. O que você gostaria de analisar?
                </div>
                {history.map((h: {role: string, content: string}, i: number) => (
                    <div key={i} className={`flex ${h.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-xl max-w-[85%] text-sm shadow-sm ${
                            h.role === 'user' ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                        }`}>
                            {h.content}
                        </div>
                    </div>
                ))}
                {loading && <div className="text-xs text-slate-400 animate-pulse">Digitando...</div>}
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                <input 
                    type="text" 
                    value={msg} 
                    onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMsg()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" 
                    placeholder="Pergunte sobre os biomarcadores..."
                />
                <button onClick={sendMsg} disabled={loading} className="p-2 bg-teal-600 text-white rounded-lg disabled:opacity-50">
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
