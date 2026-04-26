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
    const [logs, setLogs] = useState<{time:string, msg:string}[]>([]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setProcessing(true);
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Iniciando upload para o Backend FastAPI...' }]);
            
            const formData = new FormData();
            formData.append('file', e.target.files[0]);

            try {
                // Call FastAPI backend
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await axios.post(`${apiUrl}/upload`, formData);
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Upload concluído. ' + res.data.message }]);
                // Simulating processing complete
                setTimeout(() => setProcessing(false), 2000);
            } catch (err) {
                console.error(err);
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Erro no processamento.' }]);
                setProcessing(false);
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">Importar Exame (Supabase + Gemini 2.5 Flash)</h2>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-teal-500 transition-all relative">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-4" />
                <h3 className="font-semibold text-slate-700">Selecione o PDF</h3>
                <input type="file" accept=".pdf" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            {logs.map((log, i) => <div key={i} className="text-xs text-slate-500">[{log.time}] {log.msg}</div>)}
        </div>
    );
}

function DashboardView() {
    const [activeCategory, setActiveCategory] = useState<keyof typeof CATEGORIES>('hormonal');
    const currentData = MOCK_BIOMARKERS[activeCategory] || [];
    const catInfo = CATEGORIES[activeCategory];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24">
            <h2 className="text-2xl font-bold">Histórico Geral</h2>
            <div className="flex gap-2">
                {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map(k => {
                    const info = CATEGORIES[k];
                    const Icon = info.icon;
                    return (
                        <button key={k} onClick={() => setActiveCategory(k)}
                            className={`flex gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                                activeCategory === k ? 'text-white' : 'bg-white text-slate-600'
                            }`}
                            style={activeCategory === k ? { backgroundColor: info.color } : {}}>
                            <Icon className="w-4 h-4" /> {info.label}
                        </button>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {currentData.map((marker: Biomarker, i: number) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-sm mb-4">{marker.name} ({marker.unit})</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={marker.data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="value" stroke={catInfo.color} fill={catInfo.color} fillOpacity={0.1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
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
