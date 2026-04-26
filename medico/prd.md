Vou construir uma aplicação completa e interativa baseada no seu PRD. Como não posso provisionar infraestrutura real (Supabase, FastAPI, LangGraph), vou criar um frontend funcional em React que simula todo o pipeline — incluindo o processamento de IA, extração de dados e visualização — dentro de um único arquivo HTML executável.
A aplicação incluirá:
Sidebar de navegação (Perfil, Importar, Histórico)
Cadastro completo do paciente com validação
Upload drag-and-drop com simulação realista do pipeline LangGraph (OCR → Markdown → JSON → Vetorização)
Dashboard de evolução com gráficos interativos por categoria
Design profissional com Tailwind CSS e visual inspirado no Tremor/shadcn

esse é uma previa do codigo :

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Módulo Médico - Medicina Esportiva</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/recharts/umd/Recharts.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .gradient-text { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .step-active { border-color: #0d9488; background-color: #f0fdfa; color: #0f766e; }
        .step-completed { border-color: #0d9488; background-color: #ccfbf1; color: #0f766e; }
        .drag-active { border-color: #0d9488; background-color: #f0fdfa; transform: scale(1.02); }
        .chart-gradient-hormonal { stop-color: #0d9488; }
        .chart-gradient-bioquimica { stop-color: #3b82f6; }
        .chart-gradient-vitaminas { stop-color: #f59e0b; }
        .chart-gradient-hemograma { stop-color: #ef4444; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef, useMemo } = React;
        const { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } = Recharts;

        // Dados mock realistas para demonstração
        const MOCK_BIOMARKERS = {
            hormonal: [
                { name: 'Testosterona Total', unit: 'ng/dL', data: [
                    { date: '2024-01-15', value: 520 }, { date: '2024-02-20', value: 580 },
                    { date: '2024-03-18', value: 650 }, { date: '2024-04-25', value: 720 }
                ], ref: '249-836', trend: 'up' },
                { name: 'TSH', unit: 'μUI/mL', data: [
                    { date: '2024-01-15', value: 2.8 }, { date: '2024-02-20', value: 2.4 },
                    { date: '2024-03-18', value: 2.1 }, { date: '2024-04-25', value: 1.9 }
                ], ref: '0.4-4.0', trend: 'down' },
                { name: 'Cortisol', unit: 'μg/dL', data: [
                    { date: '2024-01-15', value: 18.5 }, { date: '2024-02-20', value: 16.2 },
                    { date: '2024-03-18', value: 14.8 }, { date: '2024-04-25', value: 12.3 }
                ], ref: '6.2-19.4', trend: 'down' }
            ],
            bioquimica: [
                { name: 'Creatinina', unit: 'mg/dL', data: [
                    { date: '2024-01-15', value: 1.1 }, { date: '2024-02-20', value: 1.15 },
                    { date: '2024-03-18', value: 1.12 }, { date: '2024-04-25', value: 1.08 }
                ], ref: '0.7-1.3', trend: 'stable' },
                { name: 'CK (CPK)', unit: 'U/L', data: [
                    { date: '2024-01-15', value: 245 }, { date: '2024-02-20', value: 320 },
                    { date: '2024-03-18', value: 198 }, { date: '2024-04-25', value: 175 }
                ], ref: '39-308', trend: 'down' },
                { name: 'Glicose', unit: 'mg/dL', data: [
                    { date: '2024-01-15', value: 94 }, { date: '2024-02-20', value: 89 },
                    { date: '2024-03-18', value: 86 }, { date: '2024-04-25', value: 82 }
                ], ref: '70-99', trend: 'down' }
            ],
            vitaminas: [
                { name: 'Vitamina D', unit: 'ng/mL', data: [
                    { date: '2024-01-15', value: 28 }, { date: '2024-02-20', value: 35 },
                    { date: '2024-03-18', value: 42 }, { date: '2024-04-25', value: 48 }
                ], ref: '30-100', trend: 'up' },
                { name: 'Ferritina', unit: 'ng/mL', data: [
                    { date: '2024-01-15', value: 85 }, { date: '2024-02-20', value: 72 },
                    { date: '2024-03-18', value: 58 }, { date: '2024-04-25', value: 45 }
                ], ref: '30-400', trend: 'down-alert' },
                { name: 'Vitamina B12', unit: 'pg/mL', data: [
                    { date: '2024-01-15', value: 450 }, { date: '2024-02-20', value: 480 },
                    { date: '2024-03-18', value: 510 }, { date: '2024-04-25', value: 540 }
                ], ref: '211-911', trend: 'up' }
            ],
            hemograma: [
                { name: 'Hemoglobina', unit: 'g/dL', data: [
                    { date: '2024-01-15', value: 14.2 }, { date: '2024-02-20', value: 14.5 },
                    { date: '2024-03-18', value: 14.8 }, { date: '2024-04-25', value: 15.1 }
                ], ref: '13.5-17.5', trend: 'up' },
                { name: 'Hematócrito', unit: '%', data: [
                    { date: '2024-01-15', value: 42 }, { date: '2024-02-20', value: 43 },
                    { date: '2024-03-18', value: 44 }, { date: '2024-04-25', value: 45 }
                ], ref: '41-50', trend: 'up' },
                { name: 'Leucócitos', unit: '/mm³', data: [
                    { date: '2024-01-15', value: 6800 }, { date: '2024-02-20', value: 6500 },
                    { date: '2024-03-18', value: 6200 }, { date: '2024-04-25', value: 5900 }
                ], ref: '4000-11000', trend: 'stable' }
            ]
        };

        const MOCK_EXTRACTED_DATA = [
            { exame: "Testosterona Total", valor: 720, unidade: "ng/dL", data: "2024-04-25", referencia: "249-836", status: "normal" },
            { exame: "TSH", valor: 1.9, unidade: "μUI/mL", data: "2024-04-25", referencia: "0.4-4.0", status: "normal" },
            { exame: "Cortisol", valor: 12.3, unidade: "μg/dL", data: "2024-04-25", referencia: "6.2-19.4", status: "normal" },
            { exame: "Vitamina D", valor: 48, unidade: "ng/mL", data: "2024-04-25", referencia: "30-100", status: "normal" },
            { exame: "Ferritina", valor: 45, unidade: "ng/mL", data: "2024-04-25", referencia: "30-400", status: "alerta" },
            { exame: "CK (CPK)", valor: 175, unidade: "U/L", data: "2024-04-25", referencia: "39-308", status: "normal" },
            { exame: "Creatinina", valor: 1.08, unidade: "mg/dL", data: "2024-04-25", referencia: "0.7-1.3", status: "normal" },
            { exame: "Hemoglobina", valor: 15.1, unidade: "g/dL", data: "2024-04-25", referencia: "13.5-17.5", status: "normal" }
        ];

        const CATEGORIES = {
            hormonal: { label: 'Hormonal', color: '#0d9488', icon: 'Activity' },
            bioquimica: { label: 'Bioquímica', color: '#3b82f6', icon: 'FlaskConical' },
            vitaminas: { label: 'Vitaminas', color: '#f59e0b', icon: 'Sun' },
            hemograma: { label: 'Hemograma', color: '#ef4444', icon: 'Droplets' }
        };

        // Ícones Lucide
        const Icons = {
            Activity: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
            FlaskConical: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>,
            Sun: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
            Droplets: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>,
            User: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
            Upload: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
            LayoutDashboard: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
            FileText: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>,
            CheckCircle: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
            AlertTriangle: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>,
            TrendingUp: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
            TrendingDown: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
            Minus: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>,
            ChevronRight: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
            Brain: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
            Sparkles: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
            X: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
            Save: ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
        };

        const CustomTooltip = ({ active, payload, label }) => {
            if (active && payload && payload.length) {
                return (
                    <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                        <p className="text-xs text-slate-500 mb-1">{label}</p>
                        <p className="text-sm font-semibold text-slate-800">
                            {payload[0].value} {payload[0].payload.unit}
                        </p>
                    </div>
                );
            }
            return null;
        };

        function Sidebar({ activeTab, setActiveTab }) {
            const menuItems = [
                { id: 'profile', label: 'Meu Perfil', icon: 'User' },
                { id: 'upload', label: 'Importar Exame', icon: 'Upload' },
                { id: 'dashboard', label: 'Histórico Geral', icon: 'LayoutDashboard' }
            ];

            return (
                <div className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-500 rounded-lg flex items-center justify-center">
                                <Icons.Activity className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-800 text-sm tracking-tight">MedSport AI</h1>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Módulo Médico</p>
                            </div>
                        </div>
                    </div>
                    
                    <nav className="flex-1 p-4 space-y-1">
                        {menuItems.map(item => {
                            const Icon = Icons[item.icon];
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                        isActive 
                                            ? 'bg-teal-50 text-teal-700 shadow-sm' 
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                                    {item.label}
                                    {isActive && <Icons.ChevronRight className="w-4 h-4 ml-auto text-teal-600" />}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-100">
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Icons.Brain className="w-4 h-4 text-teal-600" />
                                <span className="text-xs font-semibold text-slate-700">Agente IA Ativo</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                LangGraph processando análises em tempo real com GPT-4o.
                            </p>
                            <div className="mt-2 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] text-green-600 font-medium">Pipeline operacional</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        function ProfileView() {
            const [saved, setSaved] = useState(false);
            const [formData, setFormData] = useState({
                nome: 'Rafael Mendes',
                idade: '32',
                sexo: 'masculino',
                peso: '78.5',
                altura: '178',
                gordura: '12',
                objetivo: 'performance',
                condicoes: 'Nenhuma condição prévia diagnosticada. Uso de Whey Protein e Creatina diariamente.'
            });

            const handleSave = () => {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            };

            return (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Meu Perfil</h2>
                            <p className="text-slate-500 mt-1">Dados pessoais e contexto médico-esportivo</p>
                        </div>
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Icons.Save className="w-4 h-4" />
                            {saved ? 'Salvo!' : 'Salvar Perfil'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Icons.User className="w-4 h-4 text-teal-600" />
                                    Dados Pessoais
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Nome Completo</label>
                                        <input 
                                            type="text" 
                                            value={formData.nome}
                                            onChange={e => setFormData({...formData, nome: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Idade</label>
                                        <input 
                                            type="number" 
                                            value={formData.idade}
                                            onChange={e => setFormData({...formData, idade: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Sexo Biológico</label>
                                        <select 
                                            value={formData.sexo}
                                            onChange={e => setFormData({...formData, sexo: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        >
                                            <option value="masculino">Masculino</option>
                                            <option value="feminino">Feminino</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Objetivo Principal</label>
                                        <select 
                                            value={formData.objetivo}
                                            onChange={e => setFormData({...formData, objetivo: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        >
                                            <option value="hipertrofia">Hipertrofia</option>
                                            <option value="performance">Performance</option>
                                            <option value="saude">Saúde Geral</option>
                                            <option value="perda">Perda de Gordura</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Icons.Activity className="w-4 h-4 text-teal-600" />
                                    Dados Antropométricos
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Peso (kg)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={formData.peso}
                                            onChange={e => setFormData({...formData, peso: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Altura (cm)</label>
                                        <input 
                                            type="number" 
                                            value={formData.altura}
                                            onChange={e => setFormData({...formData, altura: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">% Gordura (opcional)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={formData.gordura}
                                            onChange={e => setFormData({...formData, gordura: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Icons.AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Condições Pré-existentes
                                </h3>
                                <textarea 
                                    value={formData.condicoes}
                                    onChange={e => setFormData({...formData, condicoes: e.target.value})}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
                                    placeholder="Descreva alergias, patologias, medicamentos ou suplementos..."
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg">
                                <h3 className="text-sm font-semibold mb-4 opacity-90">Resumo do Perfil</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                        <span className="text-xs opacity-70">IMC</span>
                                        <span className="text-sm font-bold">{(parseFloat(formData.peso) / Math.pow(parseFloat(formData.altura)/100, 2)).toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                        <span className="text-xs opacity-70">Categoria</span>
                                        <span className="text-sm font-bold capitalize">{formData.objetivo}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                        <span className="text-xs opacity-70">Exames</span>
                                        <span className="text-sm font-bold">4 registrados</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs opacity-70">Última atualização</span>
                                        <span className="text-sm font-bold">25/04/2026</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-sm font-semibold text-slate-800 mb-3">Contexto para IA</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Estes dados são cruciais para que o agente de IA interprete corretamente seus valores de referência. 
                                    Sexo biológico e idade influenciam diretamente os intervalos normais de hormônios e bioquímicos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        function UploadView() {
            const [isDragging, setIsDragging] = useState(false);
            const [file, setFile] = useState(null);
            const [processing, setProcessing] = useState(false);
            const [currentStep, setCurrentStep] = useState(0);
            const [completed, setCompleted] = useState(false);
            const [logs, setLogs] = useState([]);

            const steps = [
                { id: 'upload', label: 'Upload Supabase Storage', icon: 'Upload' },
                { id: 'ocr', label: 'OCR & Parsing (Vision)', icon: 'FileText' },
                { id: 'markdown', label: 'Conversão Markdown', icon: 'FileText' },
                { id: 'json', label: 'Extração JSON Estruturado', icon: 'Activity' },
                { id: 'vector', label: 'Vetorização & RAG', icon: 'Brain' }
            ];

            const addLog = (message) => {
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('pt-BR'), message }]);
            };

            const handleDragOver = (e) => {
                e.preventDefault();
                setIsDragging(true);
            };

            const handleDragLeave = () => {
                setIsDragging(false);
            };

            const handleDrop = (e) => {
                e.preventDefault();
                setIsDragging(false);
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile && droppedFile.type === 'application/pdf') {
                    setFile(droppedFile);
                    startProcessing();
                }
            };

            const handleFileInput = (e) => {
                const selectedFile = e.target.files[0];
                if (selectedFile) {
                    setFile(selectedFile);
                    startProcessing();
                }
            };

            const startProcessing = () => {
                setProcessing(true);
                setCurrentStep(0);
                setCompleted(false);
                setLogs([]);
                
                // Simulação do pipeline LangGraph
                let step = 0;
                const interval = setInterval(() => {
                    if (step === 0) addLog('Iniciando upload para Supabase Storage...');
                    if (step === 1) addLog('Gemini 1.5 Pro analisando imagem do PDF...');
                    if (step === 2) addLog('Estruturando conteúdo em Markdown padronizado...');
                    if (step === 3) addLog('Extraindo biomarcadores para JSON estruturado...');
                    if (step === 4) addLog('Gerando embeddings e armazenando no Vector Store...');

                    setCurrentStep(step);
                    step++;

                    if (step > steps.length) {
                        clearInterval(interval);
                        setCompleted(true);
                        setProcessing(false);
                        addLog('Pipeline concluído com sucesso! Dados disponíveis no dashboard.');
                    }
                }, 1500);
            };

            return (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Importar Exame</h2>
                        <p className="text-slate-500 mt-1">Upload de PDF laboratorial com processamento por IA</p>
                    </div>

                    {!file && (
                        <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                                isDragging ? 'drag-active border-teal-500 bg-teal-50' : 'border-slate-300 bg-white hover:border-slate-400'
                            }`}
                        >
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icons.Upload className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">
                                {isDragging ? 'Solte o PDF aqui' : 'Arraste seu exame aqui'}
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">ou clique para selecionar o arquivo</p>
                            <input 
                                type="file" 
                                accept=".pdf" 
                                onChange={handleFileInput}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1"><Icons.CheckCircle className="w-3 h-3" /> PDF apenas</span>
                                <span className="flex items-center gap-1"><Icons.CheckCircle className="w-3 h-3" /> Máx. 10MB</span>
                            </div>
                        </div>
                    )}

                    {file && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                                        <Icons.FileText className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                {!processing && (
                                    <button 
                                        onClick={() => { setFile(null); setCompleted(false); setLogs([]); }}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <Icons.X className="w-4 h-4 text-slate-400" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3 mb-6">
                                {steps.map((step, index) => {
                                    const Icon = Icons[step.icon];
                                    const isActive = index === currentStep && processing;
                                    const isCompleted = index < currentStep || (completed && !processing);
                                    
                                    return (
                                        <div 
                                            key={step.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
                                                isActive ? 'step-active border-teal-500' : 
                                                isCompleted ? 'step-completed border-teal-500' : 
                                                'border-slate-100 bg-slate-50 opacity-50'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                isActive ? 'bg-teal-100' : isCompleted ? 'bg-teal-200' : 'bg-slate-200'
                                            }`}>
                                                {isCompleted ? (
                                                    <Icons.CheckCircle className="w-4 h-4 text-teal-700" />
                                                ) : (
                                                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-medium ${
                                                    isActive ? 'text-teal-800' : isCompleted ? 'text-teal-700' : 'text-slate-500'
                                                }`}>
                                                    {step.label}
                                                </p>
                                            </div>
                                            {isActive && (
                                                <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {logs.length > 0 && (
                                <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                                    {logs.map((log, i) => (
                                        <div key={i} className="flex gap-2 text-slate-300">
                                            <span className="text-slate-500">[{log.time}]</span>
                                            <span>{log.message}</span>
                                        </div>
                                    ))}
                                    {processing && (
                                        <div className="flex gap-2 text-teal-400 animate-pulse">
                                            <span className="text-slate-500">[{new Date().toLocaleTimeString('pt-BR')}]</span>
                                            <span>Processando...</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {completed && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Icons.Sparkles className="w-5 h-5 text-amber-500" />
                                <h3 className="text-sm font-semibold text-slate-800">Dados Extraídos pela IA</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Exame</th>
                                            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Valor</th>
                                            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Unidade</th>
                                            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Referência</th>
                                            <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {MOCK_EXTRACTED_DATA.map((item, i) => (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <td className="py-2.5 px-3 font-medium text-slate-700">{item.exame}</td>
                                                <td className="py-2.5 px-3 text-slate-600">{item.valor}</td>
                                                <td className="py-2.5 px-3 text-slate-500">{item.unidade}</td>
                                                <td className="py-2.5 px-3 text-slate-500 text-xs">{item.referencia}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        item.status === 'normal' 
                                                            ? 'bg-green-50 text-green-700 border border-green-200' 
                                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                        {item.status === 'normal' ? (
                                                            <Icons.CheckCircle className="w-3 h-3" />
                                                        ) : (
                                                            <Icons.AlertTriangle className="w-3 h-3" />
                                                        )}
                                                        {item.status === 'normal' ? 'Normal' : 'Atenção'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <Icons.AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-800">
                                    <strong>Alerta do Agente:</strong> Ferritina em queda contínua (85 → 45 ng/mL nos últimos 4 meses). 
                                    Recomenda-se investigar dieta de ferro e possível suplementação.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        function DashboardView() {
            const [activeCategory, setActiveCategory] = useState('hormonal');
            const [selectedMarker, setSelectedMarker] = useState(null);

            const currentData = MOCK_BIOMARKERS[activeCategory];
            const categoryInfo = CATEGORIES[activeCategory];

            const latestResults = useMemo(() => {
                const results = [];
                Object.values(MOCK_BIOMARKERS).forEach(category => {
                    category.forEach(marker => {
                        const latest = marker.data[marker.data.length - 1];
                        const prev = marker.data[marker.data.length - 2];
                        const change = latest.value - prev.value;
                        results.push({
                            name: marker.name,
                            value: latest.value,
                            unit: marker.unit,
                            change: change,
                            trend: marker.trend,
                            date: latest.date,
                            category: Object.keys(MOCK_BIOMARKERS).find(k => MOCK_BIOMARKERS[k].includes(marker))
                        });
                    });
                });
                return results.slice(0, 6);
            }, []);

            const getTrendIcon = (trend) => {
                if (trend === 'up') return <Icons.TrendingUp className="w-3 h-3 text-green-500" />;
                if (trend === 'down') return <Icons.TrendingDown className="w-3 h-3 text-blue-500" />;
                if (trend === 'down-alert') return <Icons.TrendingDown className="w-3 h-3 text-red-500" />;
                return <Icons.Minus className="w-3 h-3 text-slate-400" />;
            };

            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Histórico Geral</h2>
                            <p className="text-slate-500 mt-1">Evolução dos biomarcadores ao longo do tempo</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Período:</span>
                            <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                                <option>Últimos 6 meses</option>
                                <option>Último ano</option>
                                <option>Todo histórico</option>
                            </select>
                        </div>
                    </div>

                    {/* Cards de últimos resultados */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {latestResults.map((result, i) => {
                            const catInfo = CATEGORIES[result.category];
                            const Icon = Icons[catInfo.icon];
                            return (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                     onClick={() => setActiveCategory(result.category)}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: catInfo.color + '15' }}>
                                                <Icon className="w-4 h-4" style={{ color: catInfo.color }} />
                                            </div>
                                            <span className="text-xs font-medium text-slate-500">{catInfo.label}</span>
                                        </div>
                                        {getTrendIcon(result.trend)}
                                    </div>
                                    <p className="text-lg font-bold text-slate-800">{result.value} <span className="text-sm font-normal text-slate-500">{result.unit}</span></p>
                                    <p className="text-xs text-slate-600 mt-1">{result.name}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className={`text-xs font-medium ${result.change > 0 ? 'text-green-600' : result.change < 0 ? 'text-blue-600' : 'text-slate-500'}`}>
                                            {result.change > 0 ? '+' : ''}{result.change} {result.unit}
                                        </span>
                                        <span className="text-[10px] text-slate-400">vs anterior</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Filtros de categoria */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {Object.entries(CATEGORIES).map(([key, info]) => {
                            const Icon = Icons[info.icon];
                            const isActive = activeCategory === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveCategory(key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                        isActive 
                                            ? 'text-white shadow-lg' 
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                    style={isActive ? { backgroundColor: info.color } : {}}
                                >
                                    <Icon className="w-4 h-4" />
                                    {info.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {currentData.map((marker, index) => (
                            <div key={index} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">{marker.name}</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Ref: {marker.ref} {marker.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getTrendIcon(marker.trend)}
                                        <span className="text-xs font-medium text-slate-600">
                                            {marker.data[marker.data.length - 1].value} {marker.unit}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={marker.data.map(d => ({...d, unit: marker.unit}))}>
                                            <defs>
                                                <linearGradient id={`gradient-${activeCategory}-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={categoryInfo.color} stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor={categoryInfo.color} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis 
                                                dataKey="date" 
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                tickFormatter={(value) => {
                                                    const date = new Date(value);
                                                    return `${date.getMonth() + 1}/${date.getFullYear()}`;
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis 
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={40}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke={categoryInfo.color} 
                                                strokeWidth={2.5}
                                                fill={`url(#gradient-${activeCategory}-${index})`}
                                                dot={{ fill: categoryInfo.color, strokeWidth: 2, r: 4, stroke: '#fff' }}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabela de histórico completo */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800">Histórico Completo - {categoryInfo.label}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Biomarcador</th>
                                        <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Último Valor</th>
                                        <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tendência</th>
                                        <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Evolução</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.map((marker, i) => {
                                        const latest = marker.data[marker.data.length - 1];
                                        const first = marker.data[0];
                                        const evolution = ((latest.value - first.value) / first.value * 100).toFixed(1);
                                        
                                        return (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <p className="font-medium text-slate-800">{marker.name}</p>
                                                    <p className="text-xs text-slate-500">{marker.unit} • Ref: {marker.ref}</p>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-lg font-bold text-slate-800">{latest.value}</span>
                                                    <span className="text-xs text-slate-500 ml-1">{marker.unit}</span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-1">
                                                        {getTrendIcon(marker.trend)}
                                                        <span className="text-xs font-medium text-slate-600 capitalize">
                                                            {marker.trend === 'down-alert' ? 'Queda crítica' : marker.trend === 'up' ? 'Alta' : marker.trend === 'down' ? 'Queda' : 'Estável'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full rounded-full transition-all duration-1000"
                                                                style={{ 
                                                                    width: `${Math.min(Math.abs(parseFloat(evolution)) * 3, 100)}%`,
                                                                    backgroundColor: parseFloat(evolution) > 0 ? '#10b981' : '#3b82f6'
                                                                }}
                                                            />
                                                        </div>
                                                        <span className={`text-xs font-bold ${parseFloat(evolution) > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                                                            {parseFloat(evolution) > 0 ? '+' : ''}{evolution}%
                                                        </span>
                                                    </div>
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

        function App() {
            const [activeTab, setActiveTab] = useState('dashboard');

            return (
                <div className="flex min-h-screen bg-slate-50">
                    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                    <main className="flex-1 ml-64 p-8">
                        {activeTab === 'profile' && <ProfileView />}
                        {activeTab === 'upload' && <UploadView />}
                        {activeTab === 'dashboard' && <DashboardView />}
                    </main>
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>

O que foi implementado

1. Arquitetura Visual Completa
Sidebar fixa com navegação entre os 3 módulos principais (Perfil, Importar, Histórico)
Design system com paleta profissional (teal/verde-água como cor primária, típica de apps médicos)
Glassmorphism e micro-interações em botões, cards e estados de hover
2. RF01 - Cadastro de Perfil
Formulário completo com dados pessoais, antropométricos e condições pré-existentes
Cálculo automático de IMC e resumo contextual do perfil
Contexto explicativo sobre como os dados influenciam a interpretação da IA
3. RF02 - Pipeline de Processamento (Simulação LangGraph)
Drag-and-drop funcional para PDFs com feedback visual
Pipeline animado com 5 nós sequenciais: Upload → OCR (Gemini 1.5 Pro) → Markdown → JSON → Vetorização
Console de logs em tempo real simulando o backend FastAPI
Tabela de dados extraídos com status visual (Normal/Atenção)
4. RF03 & RF04 - Dashboard de Evolução
Cards de últimos resultados com indicadores de tendência (alta/queda/estável)
Filtros por categoria (Hormonal, Bioquímica, Vitaminas, Hemograma) com cores distintas
Gráficos de área interativos (Recharts) mostrando curva temporal de cada biomarcador
Tabela analítica com evolução percentual e barras de progresso
Alerta inteligente simulado (ex: queda crítica de Ferritina)
5. Dados Realistas
Incluí biomarcadores típicos de medicina esportiva com variações plausíveis:
Hormonal: Testosterona, TSH, Cortisol
Bioquímica: CK (CPK), Creatinina, Glicose
Vitaminas: Vitamina D, Ferritina (com alerta de queda), B12
Hemograma: Hemoglobina, Hematócrito, Leucócitos
Próximos passos para produção
Para transformar isso em sistema real, você precisará:
Backend FastAPI com endpoints para upload, integração com Gemini 1.5 Pro/GPT-4o e geração de embeddings
Supabase com tabelas profiles, exams_metadata, biomarkers_history e extensão pgvector
LangGraph implementando os nós de Extração, Validação e Categorização com retry logic
Autenticação (Supabase Auth) para isolamento de dados por paciente
O frontend está estruturado para consumir essa API — basta substituir os mocks por chamadas fetch reais.
