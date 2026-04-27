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
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Programas de Treino</h2>
                    <p className="text-slate-400 mt-1">Gerencie as rotinas de musculação e cardio.</p>
                </div>
                <button className="px-4 py-2 bg-orange-500 text-white font-semibold text-sm rounded-xl hover:bg-orange-600 transition shadow-sm shadow-orange-500/20">
                    + Novo Programa
                </button>
            </div>
            
            <div className="text-center p-12 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
                <Dumbbell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300">Nenhum treino cadastrado</h3>
                <p className="text-sm text-slate-500 mt-2">Crie o primeiro programa de treinamento para o paciente.</p>
            </div>
        </div>
    );
}

function MedidasView() {
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
            
            <div className="text-center p-12 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
                <Ruler className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300">Sem histórico de medidas</h3>
                <p className="text-sm text-slate-500 mt-2">Adicione manualmente ou importe um PDF do InBody.</p>
            </div>
        </div>
    );
}

function UploadInBodyView() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Importar Bioimpedância</h2>
                <p className="text-slate-400 mt-1">Faça o upload do PDF InBody. Nossa IA extrairá todos os dados corporais automaticamente.</p>
            </div>
            
            <div className="border-2 border-dashed border-slate-700 rounded-3xl p-16 text-center hover:border-orange-500 transition-all duration-300 bg-slate-900 shadow-sm cursor-pointer relative group">
                <div className="w-20 h-20 bg-slate-800 group-hover:bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
                    <Upload className="w-10 h-10 text-slate-400 group-hover:text-orange-500 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Selecione o Laudo InBody</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">Aceitamos arquivos PDF gerados por equipamentos de bioimpedância.</p>
                <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <button className="px-8 py-3 bg-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                    Procurar Arquivo
                </button>
            </div>
        </div>
    );
}
