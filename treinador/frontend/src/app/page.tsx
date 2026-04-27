'use client';

import React, { useState } from 'react';
import { 
  Activity, User, LayoutDashboard, Dumbbell, Ruler, Upload, ChevronRight, 
  Plus, CheckCircle, TrendingUp, X, Save, Brain, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    
    return (
        <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen fixed left-0 top-0 flex flex-col z-10">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Dumbbell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white text-md tracking-tight">ProjetoFit</h1>
                        <p className="text-[10px] text-orange-400 uppercase tracking-wider font-bold">Portal Treinador</p>
                    </div>
                </div>
                
                <nav className="flex-1 p-4 space-y-1.5 mt-2">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'treinos', label: 'Programas de Treino', icon: Activity },
                        { id: 'medidas', label: 'Evolução & Medidas', icon: Ruler },
                        { id: 'upload', label: 'Importar InBody', icon: Upload }
                    ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button key={item.id} onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-inner' 
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'text-orange-500' : 'text-slate-500'}`} />
                                {item.label}
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-orange-500" />}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-medium text-slate-300">Treinador logado</p>
                            <p className="text-[10px] text-slate-500">daniel@projetofit</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-8">
                <div className="max-w-6xl mx-auto">
                    {activeTab === 'dashboard' && <DashboardView />}
                    {activeTab === 'treinos' && <TreinosView />}
                    {activeTab === 'medidas' && <MedidasView />}
                    {activeTab === 'upload' && <UploadInBodyView />}
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// PLACEHOLDERS PARA AS VIEWS QUE VAMOS IMPLEMENTAR
// ----------------------------------------------------------------------

function DashboardView() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Visão Geral</h2>
                <p className="text-slate-400 mt-1">Acompanhe a evolução e engajamento dos seus alunos.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                    <p className="text-sm font-medium text-slate-400 mb-1">Alunos Ativos</p>
                    <p className="text-3xl font-bold text-white">1</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                    <p className="text-sm font-medium text-slate-400 mb-1">Treinos Realizados (Mês)</p>
                    <p className="text-3xl font-bold text-white">0</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                    <p className="text-sm font-medium text-slate-400 mb-1">Avaliações Pendentes</p>
                    <p className="text-3xl font-bold text-white">1</p>
                </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-64 flex items-center justify-center text-slate-500">
                Gráfico de Engajamento Geral em Breve
            </div>
        </div>
    );
}

function TreinosView() {
    const [programs, setPrograms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [programName, setProgramName] = useState('');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const patientId = 'cc40ee24-41f4-48b1-a8fb-5a91188ff1a7';

    const fetchPrograms = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${apiUrl}/trainer/training-programs?patient_id=${patientId}`);
            setPrograms(res.data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { fetchPrograms(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${apiUrl}/trainer/training-programs`, {
                patient_id: patientId,
                name: programName,
                is_active: true
            });
            setShowForm(false);
            setProgramName('');
            fetchPrograms();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Programas de Treino</h2>
                    <p className="text-slate-400 mt-1">Gerencie as rotinas de musculação e cardio.</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-orange-500 text-white font-semibold text-sm rounded-xl hover:bg-orange-600 transition shadow-sm shadow-orange-500/20"
                >
                    {showForm ? 'Cancelar' : '+ Novo Programa'}
                </button>
            </div>
            
            {showForm && (
                <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Programa</label>
                        <input required value={programName} onChange={e => setProgramName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-orange-500 outline-none transition-colors" placeholder="Ex: Treino A - Hipertrofia" />
                    </div>
                    <button type="submit" className="px-6 py-2 bg-slate-800 text-white font-semibold text-sm rounded-lg hover:bg-slate-700 transition">
                        Salvar
                    </button>
                </form>
            )}

            {loading ? (
                <div className="animate-pulse space-y-4">
                    {[1,2].map(i => <div key={i} className="h-24 bg-slate-900 rounded-2xl w-full"></div>)}
                </div>
            ) : programs.length === 0 ? (
                <div className="text-center p-12 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
                    <Dumbbell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Nenhum treino cadastrado</h3>
                    <p className="text-sm text-slate-500 mt-2">Crie o primeiro programa de treinamento para o paciente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {programs.map(p => (
                        <div key={p.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-orange-500/50 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-white text-lg">{p.name}</h4>
                                    <p className="text-xs text-slate-500 mt-1">Criado em: {new Date(p.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold ${p.is_active ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-800 text-slate-500'}`}>
                                    {p.is_active ? 'ATIVO' : 'INATIVO'}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-sm">
                                <span className="text-slate-400 group-hover:text-orange-400 transition-colors flex items-center gap-2">
                                    Ver exercícios <ChevronRight className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MedidasView() {
    const [measurements, setMeasurements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const patientId = 'cc40ee24-41f4-48b1-a8fb-5a91188ff1a7';

    const fetchMeasurements = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${apiUrl}/trainer/body-measurements?patient_id=${patientId}`);
            setMeasurements(res.data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { fetchMeasurements(); }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Evolução Corporal</h2>
                    <p className="text-slate-400 mt-1">Acompanhe peso, percentual de gordura e medidas de fita.</p>
                </div>
                <button className="px-4 py-2 bg-slate-800 border border-slate-700 text-white font-semibold text-sm rounded-xl hover:bg-slate-700 transition">
                    + Registro Manual
                </button>
            </div>
            
            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-48 bg-slate-900 rounded-2xl w-full"></div>
                </div>
            ) : measurements.length === 0 ? (
                <div className="text-center p-12 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
                    <Ruler className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Sem histórico de medidas</h3>
                    <p className="text-sm text-slate-500 mt-2">Adicione manualmente ou importe um PDF do InBody.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Gráfico de Peso e Gordura */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-80">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Evolução de Peso e Massa Magra (kg)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[...measurements].reverse()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="measurement_date" stroke="#64748b" tick={{fontSize: 12}} tickFormatter={(val) => new Date(val).toLocaleDateString()} />
                                <YAxis yAxisId="left" stroke="#64748b" tick={{fontSize: 12}} />
                                <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Line yAxisId="left" type="monotone" dataKey="weight_kg" name="Peso Total" stroke="#f97316" strokeWidth={3} dot={{r: 4}} />
                                <Line yAxisId="left" type="monotone" dataKey="muscle_mass_kg" name="Massa Muscular" stroke="#14b8a6" strokeWidth={3} dot={{r: 4}} />
                                <Line yAxisId="right" type="monotone" dataKey="body_fat_pct" name="% Gordura" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={{r: 4}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Origem</th>
                                    <th className="px-6 py-4">Peso</th>
                                    <th className="px-6 py-4">% Gordura</th>
                                    <th className="px-6 py-4">M. Muscular</th>
                                    <th className="px-6 py-4">TMB (kcal)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {measurements.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-800/50 transition-colors text-slate-300 font-medium">
                                        <td className="px-6 py-4">{new Date(m.measurement_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px] uppercase">{m.source}</span>
                                        </td>
                                        <td className="px-6 py-4 text-orange-400">{m.weight_kg ? `${m.weight_kg} kg` : '-'}</td>
                                        <td className="px-6 py-4 text-red-400">{m.body_fat_pct ? `${m.body_fat_pct} %` : '-'}</td>
                                        <td className="px-6 py-4 text-teal-400">{m.muscle_mass_kg ? `${m.muscle_mass_kg} kg` : '-'}</td>
                                        <td className="px-6 py-4">{m.bmr_kcal ? m.bmr_kcal : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function UploadInBodyView() {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<{time: string, msg: string}[]>([]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append("file", file);
            
            setProcessing(true);
            setLogs([{ time: new Date().toLocaleTimeString(), msg: `Enviando ${file.name} para o servidor...` }]);
            
            let interval = setInterval(() => {
                setProgress(p => Math.min(p + 5, 90));
            }, 500);

            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                // Usando o paciente default de testes (mesmo usado no médico)
                const patientId = 'cc40ee24-41f4-48b1-a8fb-5a91188ff1a7';
                
                const res = await axios.post(`${apiUrl}/trainer/body-measurements/import-inbody?patient_id=${patientId}`, formData);
                
                clearInterval(interval);
                setProgress(100);
                setLogs(prev => [...prev, { 
                    time: new Date().toLocaleTimeString(), 
                    msg: `✅ Sucesso: ${res.data.message}` 
                }]);
                
                setTimeout(() => setProcessing(false), 2000);
                setTimeout(() => setProgress(0), 3000);
            } catch (err) {
                clearInterval(interval);
                console.error(err);
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: '❌ Erro durante o envio do arquivo InBody.' }]);
                setProcessing(false);
                setProgress(0);
            }
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Importar Bioimpedância</h2>
                    <p className="text-slate-400 mt-1">O Gemini 2.5 irá extrair peso, % de gordura, massa magra e água diretamente do PDF.</p>
                </div>
            </div>

            <div className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 ${
                processing ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 hover:border-orange-500 bg-slate-900 shadow-sm'
            }`}>
                {!processing ? (
                    <>
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Upload className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Selecione o Laudo InBody</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">Arraste ou clique para selecionar o arquivo PDF gerado pelo equipamento.</p>
                        <input type="file" accept=".pdf" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <button className="px-8 py-3 bg-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                            Selecionar PDF
                        </button>
                    </>
                ) : (
                    <div className="space-y-8">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                            <Brain className="absolute inset-0 m-auto w-10 h-10 text-orange-500 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-orange-400 mb-2">Processando com IA...</h3>
                            <div className="max-w-md mx-auto w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-4">
                                <div 
                                    className="bg-orange-500 h-full transition-all duration-500 ease-out" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-slate-500 text-sm mt-3 font-medium">{Math.round(progress)}% Enviado</p>
                        </div>
                    </div>
                )}
            </div>

            {logs.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Logs de Sincronização</span>
                    </div>
                    <div className="space-y-2 font-mono text-[11px] max-h-48 overflow-y-auto custom-scrollbar">
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-4 items-start border-l border-slate-800 pl-4">
                                <span className="text-slate-500 shrink-0">{log.time}</span>
                                <span className={log.msg.includes('Sucesso') ? 'text-orange-400' : 'text-slate-300'}>
                                    {log.msg}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
