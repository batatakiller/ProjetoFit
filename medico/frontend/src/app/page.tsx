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
                    // Find matching standard category or use 'outros'
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
                            ref: '-',
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
    
    // Fallback if category info doesn't exist
    const catInfo = CATEGORIES[activeCategory as keyof typeof CATEGORIES] || { label: 'Outros', color: '#64748b', icon: Activity };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Carregando seus gráficos...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24">
            <h2 className="text-2xl font-bold">Histórico Geral (Dados Reais)</h2>
            <div className="flex flex-wrap gap-2">
                {[...Object.keys(CATEGORIES), 'outros'].map((k) => {
                    const info = CATEGORIES[k as keyof typeof CATEGORIES] || { label: 'Outros', color: '#64748b', icon: Activity };
                    const Icon = info.icon;
                    // Only show tabs that have data, except for the primary ones if empty
                    if (k === 'outros' && (!realData.outros || realData.outros.length === 0)) return null;
                    
                    return (
                        <button key={k} onClick={() => setActiveCategory(k as any)}
                            className={`flex gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                                activeCategory === k ? 'text-white' : 'bg-white text-slate-600'
                            }`}
                            style={activeCategory === k ? { backgroundColor: info.color } : {}}>
                            <Icon className="w-4 h-4" /> {info.label}
                        </button>
                    )
                })}
            </div>

            {currentData.length === 0 ? (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                    Nenhum biomarcador desta categoria encontrado nos exames importados.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {currentData.map((marker: Biomarker, i: number) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-sm mb-4 text-slate-700">{marker.name} <span className="text-slate-400 font-normal">({marker.unit})</span></h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={marker.data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} />
                                        <YAxis tick={{fontSize: 12}} />
                                        <Tooltip 
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke={catInfo.color} 
                                            strokeWidth={3}
                                            fill={catInfo.color} 
                                            fillOpacity={0.15} 
                                            activeDot={{r: 6, strokeWidth: 0}}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
