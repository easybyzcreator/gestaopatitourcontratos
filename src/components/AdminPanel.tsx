import React, { useState } from 'react';
import { Trip, Registration, TripDefaults } from '../types';
import { 
  Plus, Search, School, Calendar, DollarSign, 
  ExternalLink, FileText, CheckCircle, Clock, AlertTriangle, 
  Settings, Users, Copy, Check, Eye, ArrowLeft, Download, Heart
} from 'lucide-react';
import DefaultsSettings from './DefaultsSettings';
import ClientDetailsModal from './ClientDetailsModal';

interface AdminPanelProps {
  trips: Trip[];
  registrations: Registration[];
  tripDefaults: TripDefaults;
  onSaveTripDefaults: (defaults: TripDefaults) => Promise<void> | void;
  onAddTrip: () => void;
  onEditTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onUpdateRegistration: (updated: Registration) => void;
  onDeleteRegistration: (id: string) => void;
  onOpenClientLink: (tripId: string) => void;
  onLogout: () => void;
}

export default function AdminPanel({
  trips,
  registrations,
  tripDefaults,
  onSaveTripDefaults,
  onAddTrip,
  onEditTrip,
  onDeleteTrip,
  onUpdateRegistration,
  onDeleteRegistration,
  onOpenClientLink,
  onLogout
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'trips' | 'registrations' | 'defaults'>('trips');
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState<Trip | null>(null);
  
  // Custom states for trip-specific student manager (Imagem 3) and QR Codes
  const [selectedTripForDetails, setSelectedTripForDetails] = useState<Trip | null>(null);
  const [showQrCodeModal, setShowQrCodeModal] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);
  const [tripSearchQuery, setTripSearchQuery] = useState('');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTripFilter, setSelectedTripFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  // Trip Cards Filter States (New)
  const [tripCardsSearchQuery, setTripCardsSearchQuery] = useState('');
  const [tripCardsYearFilter, setTripCardsYearFilter] = useState('2026');

  const parsedDate = (dStr: string): Date => {
    if (!dStr) return new Date(0);
    if (dStr.includes('-')) {
      return new Date(dStr + 'T00:00:00');
    }
    if (dStr.includes('/')) {
      const parts = dStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    return new Date(dStr);
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filteredAndSortedTrips = [...trips]
    .filter(trip => {
      // 1. Search filter: Title, school, or destination
      const searchLower = tripCardsSearchQuery.toLowerCase();
      const matchesSearch = !tripCardsSearchQuery || 
        trip.title.toLowerCase().includes(searchLower) ||
        trip.school.toLowerCase().includes(searchLower) ||
        trip.destination.toLowerCase().includes(searchLower);

      // 2. Year filter
      let matchesYear = true;
      if (tripCardsYearFilter) {
        const tripDateObj = parsedDate(trip.date);
        matchesYear = tripDateObj.getFullYear().toString() === tripCardsYearFilter;
      }

      return matchesSearch && matchesYear;
    })
    .sort((a, b) => {
      // 3. Chronological sorting with closest upcoming first, and past ones at the bottom
      const dateA = parsedDate(a.date);
      const dateB = parsedDate(b.date);
      
      const isPastA = dateA < now;
      const isPastB = dateB < now;
      
      if (isPastA && !isPastB) return 1; // past goes to the bottom
      if (!isPastA && isPastB) return -1; // upcoming goes to the top
      
      if (!isPastA && !isPastB) {
        // Both upcoming: sort ascending (closest first)
        return dateA.getTime() - dateB.getTime();
      } else {
        // Both past: sort descending (most recent past first)
        return dateB.getTime() - dateA.getTime();
      }
    });

  const copyTripLink = (tripId: string) => {
    const fakeLink = `${window.location.origin}?trip=${tripId}`;
    navigator.clipboard.writeText(fakeLink);
    setCopiedTripId(tripId);
    setTimeout(() => setCopiedTripId(null), 2000);
  };

  const downloadQrCodeImage = (trip: Trip) => {
    const fakeLink = `${window.location.origin}?trip=${trip.id}`;
    const canvas = document.createElement('canvas');
    canvas.width = 450;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer border
    ctx.strokeStyle = '#072D17';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // Load and draw QR code
    const qrImage = new Image();
    qrImage.crossOrigin = "anonymous";
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fakeLink)}`;
    
    qrImage.onload = () => {
      // Header
      ctx.fillStyle = '#072D17';
      ctx.font = '900 20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PATITOUR VIAGENS', canvas.width / 2, 60);

      // Subheader
      ctx.fillStyle = '#4B5563';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillText('CONTRATO & FICHA MÉDICA DIGITAL', canvas.width / 2, 85);

      // Trip Title
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(trip.title.toUpperCase(), canvas.width / 2, 125);

      // School
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(trip.school.toUpperCase(), canvas.width / 2, 150);

      // QR Image background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(canvas.width / 2 - 140, 180, 280, 280);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.strokeRect(canvas.width / 2 - 140, 180, 280, 280);

      // Draw QR Code
      ctx.drawImage(qrImage, canvas.width / 2 - 130, 190, 260, 260);

      // Footer Instruction
      ctx.fillStyle = '#072D17';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText('APONTE A CÂMERA DO CELULAR PARA ESCANEAR', canvas.width / 2, 510);

      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 10px Arial, sans-serif';
      ctx.fillText('Preenchimento de contrato de forma 100% online', canvas.width / 2, 540);

      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const cleanFileName = `QR_CODE_${trip.title.replace(/\s+/g, '_')}.png`;
        link.download = cleanFileName;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to export canvas to data url', err);
        const link = document.createElement('a');
        link.href = qrImage.src;
        link.download = `QR_CODE_${trip.title.replace(/\s+/g, '_')}.png`;
        link.target = '_blank';
        link.click();
      }
    };

    qrImage.onerror = () => {
      alert('Erro ao carregar imagem do QR Code. Verifique sua conexão.');
    };
  };

  // CSV Report Exports (Brazilian Excel Compatible using ; and UTF-8 BOM with ALL contract data)
  const generateCSVForRegistrations = (regs: Registration[]): string => {
    let csvContent = '\uFEFF'; // UTF-8 BOM
    
    // Headers with absolutely all fields filled in the contract
    const headers = [
      'Nome do Aluno',
      'Sexo',
      'Data de Nascimento',
      'CPF do Aluno',
      'RG do Aluno',
      'Turma/Série/Sala',
      'Nome do Responsável',
      'CPF do Responsável',
      'RG do Responsável',
      'Telefone',
      'E-mail',
      'Endereço',
      'Pagador Diferente?',
      'Nome do Pagador',
      'CPF do Pagador',
      'Doença Pré-Existente?',
      'Detalhes Doença Pré-Existente',
      'Alergias?',
      'Detalhes Alergias',
      'Restrição Alimentar?',
      'Detalhes Restrição Alimentar',
      'PCD?',
      'Detalhes PCD',
      'Obs Comportamentais',
      'Data de Inscrição',
      'Status Financeiro',
      'Valor Total',
      'Valor Pago',
      'Valor Pendente'
    ];
    
    csvContent += headers.join(';') + '\n';
    
    const escapeCSV = (val: any): string => {
      if (val === undefined || val === null) return '';
      // Remove line breaks and escape double quotes
      const str = String(val).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
      return str;
    };

    regs.forEach(reg => {
      const totalPaid = reg.payments?.filter(p => p.status === 'PAGO').reduce((sum, p) => sum + (typeof p.paidAmount === 'number' ? p.paidAmount : p.amount), 0) || 0;
      const totalDue = reg.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const pending = reg.payments?.filter(p => p.status !== 'PAGO').reduce((sum, p) => sum + p.amount, 0) || 0;
      const allPaid = reg.payments?.length > 0 && reg.payments.every(p => p.status === 'PAGO');
      
      let statusLabel = 'PENDENTE';
      if (allPaid) {
        statusLabel = 'CONFIRMADO';
      } else if (totalPaid > 0) {
        statusLabel = 'PAGO PARCIAL';
      }

      const genderChar = reg.student.gender === 'FEMININO' ? 'F' : reg.student.gender === 'MASCULINO' ? 'M' : '';

      const row = [
        reg.student.name || '',
        genderChar,
        reg.student.birthDate || '',
        reg.student.cpf || '',
        reg.student.rg || '',
        reg.student.classGroup || 'Adulto',
        reg.parent.name || '',
        reg.parent.cpf || '',
        reg.parent.rg || '',
        reg.parent.phone || '',
        reg.parent.email || '',
        reg.parent.address || '',
        reg.payer.different ? 'SIM' : 'NÃO',
        reg.payer.name || '',
        reg.payer.cpf || '',
        reg.medical.preExisting ? 'SIM' : 'NÃO',
        reg.medical.preExistingDetails || '',
        reg.medical.allergies ? 'SIM' : 'NÃO',
        reg.medical.allergiesDetails || '',
        reg.medical.dietary ? 'SIM' : 'NÃO',
        reg.medical.dietaryDetails || '',
        reg.medical.pcd ? 'SIM' : 'NÃO',
        reg.medical.pcdDetails || '',
        reg.medical.behavioral || '',
        reg.signedAt ? new Date(reg.signedAt).toLocaleDateString('pt-BR') : '',
        statusLabel,
        `R$ ${totalDue.toFixed(2).replace('.', ',')}`,
        `R$ ${totalPaid.toFixed(2).replace('.', ',')}`,
        `R$ ${pending.toFixed(2).replace('.', ',')}`
      ];

      csvContent += row.map(val => `"${escapeCSV(val)}"`).join(';') + '\n';
    });

    return csvContent;
  };

  const handleExportAllStudents = (trip: Trip, regs: Registration[]) => {
    const csvContent = generateCSVForRegistrations(regs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `todos_alunos_${trip.title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPaidStudents = (trip: Trip, regs: Registration[]) => {
    // SOMENTE OS ALUNOS Q PAGARAM PELO MENOS UMA PARCELA (totalPaid > 0)
    const paidRegs = regs.filter(r => {
      const totalPaid = r.payments?.filter(p => p.status === 'PAGO').reduce((sum, p) => sum + (typeof p.paidAmount === 'number' ? p.paidAmount : p.amount), 0) || 0;
      return totalPaid > 0;
    });
    
    const csvContent = generateCSVForRegistrations(paidRegs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `alunos_pagos_${trip.title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPayments = (trip: Trip, regs: Registration[]) => {
    // This is the RECEBIDOS export, we keep it just in case, though the button will be removed
    let csvContent = '\uFEFF';
    csvContent += 'Responsável;Aluno/Passageiro;CPF Responsável;Valor Total;Valor Pago;Valor Pendente;Status Geral\n';
    
    regs.forEach(reg => {
      const totalPaid = reg.payments.filter(p => p.status === 'PAGO').reduce((sum, p) => sum + (typeof p.paidAmount === 'number' ? p.paidAmount : p.amount), 0);
      const totalDue = reg.payments.reduce((sum, p) => sum + p.amount, 0);
      const pending = reg.payments.filter(p => p.status !== 'PAGO').reduce((sum, p) => sum + p.amount, 0);
      csvContent += `"${reg.parent.name || ''}";"${reg.student.name || ''}";"${reg.parent.cpf || ''}";"R$ ${totalDue.toFixed(2)}";"R$ ${totalPaid.toFixed(2)}";"R$ ${pending.toFixed(2)}";"${reg.status}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `financeiro_${trip.title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMedical = (trip: Trip, regs: Registration[]) => {
    // SOMENTE DOS ALUNOS Q TEM "SIM" EM ALGUM ITEM DA FICHA MEDICA
    const medicalRegs = regs.filter(r => {
      return (
        r.medical.preExisting === true || 
        r.medical.allergies === true || 
        r.medical.dietary === true || 
        r.medical.pcd === true ||
        (r.medical.behavioral && r.medical.behavioral.trim() !== '' && r.medical.behavioral.toUpperCase() !== 'NÃO' && r.medical.behavioral.toUpperCase() !== 'NAO')
      );
    });

    const csvContent = generateCSVForRegistrations(medicalRegs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `ficha_medica_${trip.title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs
  const totalSigned = registrations.length;
  
  // Faturamento previsto (Soma dos contratos)
  const totalPriceScheduled = registrations.reduce((sum, reg) => {
    return sum + reg.payments.reduce((pSum, p) => pSum + p.amount, 0);
  }, 0);

  // Faturamento recebido (Soma do que está pago, incluindo juros/multa se houver)
  const totalReceived = registrations.reduce((sum, reg) => {
    return sum + reg.payments.filter(p => p.status === 'PAGO').reduce((pSum, p) => pSum + (typeof p.paidAmount === 'number' ? p.paidAmount : p.amount), 0);
  }, 0);

  // Faturamento atrasado
  const totalOverdue = registrations.reduce((sum, reg) => {
    return sum + reg.payments.filter(p => p.status === 'ATRASADO').reduce((pSum, p) => pSum + p.amount, 0);
  }, 0);

  // Filtered registrations list
  const filteredRegistrations = registrations.filter(reg => {
    const studentMatch = reg.student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const parentMatch = reg.parent.name.toLowerCase().includes(searchQuery.toLowerCase());
    const queryMatch = studentMatch || parentMatch;
    
    const tripMatch = !selectedTripFilter || reg.tripId === selectedTripFilter;
    
    let statusMatch = true;
    if (selectedStatusFilter) {
      const isConfirmed = reg.payments?.length > 0 && reg.payments.every(p => p.status === 'PAGO');
      
      if (selectedStatusFilter === 'PAGO') {
        statusMatch = isConfirmed;
      } else if (selectedStatusFilter === 'PENDENTE') {
        statusMatch = !isConfirmed && reg.status !== 'ATRASADO';
      } else if (selectedStatusFilter === 'ATRASADO') {
        statusMatch = reg.status === 'ATRASADO';
      }
    }

    return queryMatch && tripMatch && statusMatch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-natural-bg animate-fadeIn pb-12 text-natural-text">
      
      {/* NAVBAR */}
      <div className="bg-natural-dark px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <img 
            src="https://raw.githubusercontent.com/easybyzcreator/imagens/c364de998313d54887e1ca668bbf2997f0e6e903/logo%20patitour%20-%20fundo%20transp.png" 
            alt="Patitour Logo" 
            referrerPolicy="no-referrer"
            className="h-[58px] w-auto object-contain"
          />
          <div>
            <h1 className="text-lg font-black tracking-wider uppercase font-display">CONTRATOS PATITOUR</h1>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 bg-natural-dark-light/40 p-1.5 rounded-full border border-natural-border/20">
            <button
              onClick={() => setActiveTab('trips')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase transition ${
                activeTab === 'trips' ? 'bg-natural-bg text-natural-text shadow-sm' : 'text-natural-border hover:text-white'
              }`}
            >
              Viagens (Roteiros)
            </button>
            <button
              onClick={() => setActiveTab('registrations')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase transition ${
                activeTab === 'registrations' ? 'bg-natural-bg text-natural-text shadow-sm' : 'text-natural-border hover:text-white'
              }`}
            >
              Clientes / Contratos ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab('defaults')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase transition flex items-center gap-1.5 ${
                activeTab === 'defaults' ? 'bg-natural-bg text-natural-text shadow-sm' : 'text-natural-border hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Padrões de Contrato
            </button>
          </div>

          <button
            onClick={onLogout}
            className="px-5 py-2 bg-red-600/10 hover:bg-red-600/25 text-red-200 border border-red-500/20 hover:border-red-500/40 rounded-full text-xs font-black uppercase tracking-wider transition"
            title="Sair do Painel Admin"
          >
            Sair
          </button>
        </div>
      </div>

      {/* KPI TOP COUNTERS BAR */}
      <div className="max-w-6xl mx-auto w-full px-4 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-natural-border flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Contratos</span>
              <span className="text-2xl font-black text-natural-brand mt-1 block">{totalSigned}</span>
              <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">Assinados digitalmente</span>
            </div>
            <div className="p-3 bg-natural-bg rounded-2xl text-natural-brand">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-natural-border flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Faturamento Previsto</span>
              <span className="text-2xl font-black text-natural-text mt-1 block font-mono">R$ {totalPriceScheduled.toFixed(2)}</span>
              <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">Previsão total de recebimento</span>
            </div>
            <div className="p-3 bg-natural-bg rounded-2xl text-natural-brand">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-natural-border flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor Recebido</span>
              <span className="text-2xl font-black text-natural-brand mt-1 block font-mono">R$ {totalReceived.toFixed(2)}</span>
              <span className="text-[10px] text-natural-brand font-bold bg-amber-50 px-2 py-0.5 rounded-lg text-[9px] mt-1.5 inline-block border border-amber-100">
                {totalPriceScheduled > 0 ? ((totalReceived / totalPriceScheduled) * 100).toFixed(0) : 0}% Liquidado
              </span>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl text-natural-brand">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-natural-border flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inadimplência</span>
              <span className="text-2xl font-black text-red-600 mt-1 block font-mono">R$ {totalOverdue.toFixed(2)}</span>
              <span className="text-[10px] text-red-500 font-semibold mt-0.5 block">Parcelas vencidas no Asaas</span>
            </div>
            <div className="p-3 bg-red-50 rounded-2xl text-red-700">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ACTIVE VIEW WRAPPER */}
      <div className="max-w-6xl mx-auto w-full px-4 mt-6 flex-1">
        
        {/* TAB 1: VIAGENS LIST OR TRIP DETAILS SUB-VIEW (Imagem 3) */}
        {activeTab === 'trips' && selectedTripForDetails ? (
          <div className="space-y-4 animate-fadeIn">
            
            {/* BACK TO ITINERARIES BUTTON - EXTRA PROMINENT */}
            <div className="flex items-center">
              <button
                onClick={() => setSelectedTripForDetails(null)}
                className="group flex items-center gap-2 px-5 py-2.5 bg-natural-brand/10 hover:bg-natural-brand text-natural-brand hover:text-white border border-natural-brand/15 text-xs font-black rounded-2xl transition-all duration-200 uppercase tracking-wider shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Lista de Roteiros
              </button>
            </div>
            
            {/* TRIP DETAIL HEADER */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-5 rounded-3xl border border-natural-border shadow-sm gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-black text-natural-text uppercase font-display tracking-tight">
                  {selectedTripForDetails.title}
                </h2>
                <p className="text-xs text-gray-400 flex items-center gap-1 uppercase font-bold tracking-wider">
                  <School className="w-3.5 h-3.5" /> {selectedTripForDetails.school}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <img 
                  src="https://raw.githubusercontent.com/easybyzcreator/imagens/c364de998313d54887e1ca668bbf2997f0e6e903/logo%20patitour%20-%20fundo%20transp.png" 
                  alt="Patitour" 
                  referrerPolicy="no-referrer"
                  className="h-[47px] w-auto object-contain opacity-80"
                />
              </div>
            </div>

            {/* TRIP DETAILS KPIs */}
            {(() => {
              const tripRegs = registrations.filter(r => r.tripId === selectedTripForDetails.id);
              const paidCount = tripRegs.filter(r => r.status === 'PAGO').length;
              const pendingCount = tripRegs.filter(r => r.status === 'PENDENTE').length;
              const overdueCount = tripRegs.filter(r => r.status === 'ATRASADO').length;

              return (
                <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  <div className="bg-white rounded-3xl p-5 border border-natural-border flex flex-col justify-between shadow-sm min-h-[110px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">TOTAL ALUNOS</span>
                    <span className="text-3xl font-black text-natural-brand mt-1 block">{tripRegs.length}</span>
                    <span className="text-[10px] text-gray-400 mt-1 block font-semibold">Inscritos confirmados</span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-natural-border flex flex-col justify-between shadow-sm min-h-[110px]">
                    <span className="text-[9px] font-black text-green-700 uppercase tracking-wider block">PAGOS</span>
                    <span className="text-3xl font-black text-green-700 mt-1 block">{paidCount}</span>
                    <span className="text-[10px] text-green-600 font-bold mt-1 block bg-green-50 px-2 py-0.5 rounded-lg text-center border border-green-100/50">
                      {tripRegs.length > 0 ? ((paidCount / tripRegs.length) * 100).toFixed(0) : 0}% Quitados
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-natural-border flex flex-col justify-between shadow-sm min-h-[110px]">
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider block">PENDENTES</span>
                    <span className="text-3xl font-black text-amber-700 mt-1 block">{pendingCount}</span>
                    <span className="text-[10px] text-amber-600 font-semibold mt-1 block bg-amber-50 px-2 py-0.5 rounded-lg text-center border border-amber-100/50">
                      Aguardando pagto
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-natural-border flex flex-col justify-between shadow-sm min-h-[110px]">
                    <span className="text-[9px] font-black text-red-700 uppercase tracking-wider block">ATRASADOS</span>
                    <span className="text-3xl font-black text-red-600 mt-1 block">{overdueCount}</span>
                    <span className="text-[10px] text-red-500 font-semibold mt-1 block bg-red-50 px-2 py-0.5 rounded-lg text-center border border-red-100/50">
                      Vencidos no Asaas
                    </span>
                  </div>

                </div>

                {/* RELATÓRIOS EXCEL DOWNLOAD BUTTONS */}
                <div className="bg-white p-5 rounded-3xl border border-natural-border shadow-sm space-y-3">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">GERAR EXCEL / PLANILHAS DO ROTEIRO</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => handleExportAllStudents(selectedTripForDetails, tripRegs)}
                      className="flex items-center justify-center gap-1.5 py-3 bg-natural-dark hover:bg-natural-dark/95 text-white font-extrabold rounded-2xl text-[10px] uppercase transition border border-natural-border shadow-sm"
                    >
                      TODOS ALUNOS
                    </button>
                    <button
                      onClick={() => handleExportPaidStudents(selectedTripForDetails, tripRegs)}
                      className="flex items-center justify-center gap-1.5 py-3 bg-green-700 hover:bg-green-800 text-white font-extrabold rounded-2xl text-[10px] uppercase transition shadow-sm"
                    >
                      ALUNOS PAGOS
                    </button>
                    <button
                      onClick={() => handleExportMedical(selectedTripForDetails, tripRegs)}
                      className="flex items-center justify-center gap-1.5 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-[10px] uppercase transition shadow-sm"
                    >
                      FICHA MÉDICA
                    </button>
                  </div>
                </div>

                {/* TRIP STUDENTS LIST SEARCH AND TABLE */}
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-3xl border border-natural-border shadow-sm">
                    <div className="relative w-full">
                      <span className="absolute left-3.5 top-3.5">
                        <Search className="w-4 h-4 text-gray-400" />
                      </span>
                      <input 
                        type="text"
                        placeholder="Buscar por nome do aluno, pai ou CPF..."
                        value={tripSearchQuery}
                        onChange={(e) => setTripSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-natural-text placeholder-gray-300 focus:outline-natural-brand"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-natural-border overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-natural-dark text-white text-[10px] font-black uppercase tracking-wider">
                            <th className="px-6 py-4 font-display">Aluno / Passageiro</th>
                            <th className="px-6 py-4 font-display">Turma</th>
                            <th className="px-6 py-4 text-center font-display">Status Financeiro</th>
                            <th className="px-6 py-4 text-center font-display">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-natural-border-light text-xs">
                          {(() => {
                            const filteredTripRegs = tripRegs.filter(reg => {
                              const searchLower = tripSearchQuery.toLowerCase();
                              return (
                                reg.student.name.toLowerCase().includes(searchLower) ||
                                reg.parent.name.toLowerCase().includes(searchLower) ||
                                (reg.student.cpf && reg.student.cpf.includes(searchLower)) ||
                                (reg.parent.cpf && reg.parent.cpf.includes(searchLower))
                              );
                            });

                            if (filteredTripRegs.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                    Nenhum aluno/passageiro inscrito encontrado para os termos pesquisados.
                                  </td>
                                </tr>
                              );
                            }

                            return filteredTripRegs.map(reg => {
                              // Calculate payment totals for progress bar
                              const totalPaid = reg.payments.filter(p => p.status === 'PAGO').reduce((sum, p) => sum + (typeof p.paidAmount === 'number' ? p.paidAmount : p.amount), 0);
                              const totalDue = reg.payments.reduce((sum, p) => sum + p.amount, 0);
                              const allPaid = reg.payments.length > 0 && reg.payments.every(p => p.status === 'PAGO');
                              const progressPercent = allPaid ? 100 : (totalDue > 0 ? Math.min(100, (totalPaid / totalDue) * 100) : 0);
                              const hasMedicalAlert = Boolean(
                                reg.medical?.preExisting ||
                                reg.medical?.allergies ||
                                reg.medical?.dietary ||
                                reg.medical?.pcd
                              );

                              return (
                                <tr key={reg.id} className="hover:bg-natural-border-light/40 transition-all">
                                  
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-natural-text text-sm">{reg.student.name}</span>
                                      {hasMedicalAlert && (
                                        <span title="Atenção Médica: possui item marcado como SIM na Ficha Médica" className="inline-flex items-center">
                                          <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-bold block mt-0.5 uppercase tracking-wider">
                                      RESPONSÁVEL: {reg.parent.name}
                                    </span>
                                  </td>

                                  <td className="px-6 py-4">
                                    <span className="px-2.5 py-1 bg-gray-50 text-gray-700 border border-gray-100 rounded-full text-[10px] font-bold uppercase">
                                      {reg.student.classGroup || 'Adulto'}
                                    </span>
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="flex flex-col max-w-[180px] w-full space-y-1.5 mx-auto text-left">
                                      <div className="flex items-center justify-between">
                                        {(() => {
                                          let label = "PENDENTE";
                                          let badgeClass = "bg-gray-50 text-gray-500 border border-gray-200/50";

                                          if (allPaid) {
                                            label = "CONFIRMADO";
                                            badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
                                          } else if (totalPaid > 0) {
                                            label = "PAGO PARCIAL";
                                            badgeClass = "bg-amber-50 text-amber-700 border border-amber-200/50";
                                          }

                                          return (
                                            <>
                                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${badgeClass}`}>
                                                {label}
                                              </span>
                                              <span className="text-gray-400 font-mono text-[10px] font-bold">
                                                {progressPercent.toFixed(0)}%
                                              </span>
                                            </>
                                          );
                                        })()}
                                      </div>

                                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-500 ${
                                            allPaid
                                              ? 'bg-emerald-600' 
                                              : totalPaid > 0 
                                              ? 'bg-amber-500' 
                                              : 'bg-gray-200'
                                          }`}
                                          style={{ width: `${progressPercent}%` }}
                                        />
                                      </div>

                                      <span className="font-mono text-[9px] text-gray-400 font-bold block mt-0.5">
                                        R$ {totalPaid.toFixed(2).replace('.', ',')} / R$ {totalDue.toFixed(2).replace('.', ',')}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-6 py-4 text-center">
                                    <button
                                      onClick={() => setSelectedRegistration(reg)}
                                      className="px-3.5 py-1.5 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-xl transition text-[10px] uppercase flex items-center gap-1 mx-auto shadow-sm"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Ver Detalhes
                                    </button>
                                  </td>

                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                </>
              );
            })()}

          </div>
        ) : activeTab === 'trips' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-natural-border shadow-sm">
              <div>
                <h2 className="text-sm font-black text-natural-text uppercase font-display">Roteiros e Viagens Ativas</h2>
                <p className="text-xs text-gray-400">Configure as opções para os alunos realizarem a assinatura.</p>
              </div>
              
              <button
                onClick={onAddTrip}
                className="px-5 py-2.5 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-full text-xs uppercase transition flex items-center gap-1.5 shadow-md shadow-natural-brand/10"
              >
                <Plus className="w-4 h-4" /> Nova Viagem
              </button>
            </div>

            {/* BARRA DE FILTROS DAS VIAGENS (BUSCA + ANO) */}
            <div className="bg-white p-4 rounded-3xl border border-natural-border shadow-sm flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <span className="absolute left-3.5 top-3.5">
                  <Search className="w-4 h-4 text-gray-400" />
                </span>
                <input 
                  type="text"
                  placeholder="Buscar por viagem, escola ou destino..."
                  value={tripCardsSearchQuery}
                  onChange={(e) => setTripCardsSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-natural-text placeholder-gray-300 focus:outline-natural-brand"
                />
              </div>

              <div className="relative w-full sm:w-auto min-w-[130px]">
                <select
                  value={tripCardsYearFilter}
                  onChange={(e) => setTripCardsYearFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-4 pr-10 py-3 text-xs font-black text-natural-brand focus:outline-natural-brand cursor-pointer appearance-none text-center shadow-sm"
                >
                  <option value="">TODAS</option>
                  {Array.from(new Set(trips.map(t => {
                    const d = parsedDate(t.date);
                    return d ? d.getFullYear().toString() : '';
                  }).filter(Boolean)))
                    .sort((a, b) => b.localeCompare(a))
                    .map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))
                  }
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-natural-brand">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* TRIPS GRID CARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedTrips.length === 0 ? (
                <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-natural-border">
                  <p className="text-sm text-gray-400 italic">Nenhuma viagem encontrada com os filtros selecionados.</p>
                </div>
              ) : (
                filteredAndSortedTrips.map(trip => {
                  const tripRegs = registrations.filter(r => r.tripId === trip.id);
                  return (
                    <div key={trip.id} className="bg-white rounded-3xl border border-natural-border p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
                      
                      <div className="space-y-2">
                        {/* Status bar */}
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            trip.active 
                              ? 'bg-amber-50 text-natural-brand border border-amber-100/60' 
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}>
                            {trip.active ? 'LINK ATIVO' : 'PAUSADO'}
                          </span>
                          
                          <span className="text-[11px] font-mono font-bold text-gray-400">
                            {tripRegs.length} Inscritos
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-black text-natural-text uppercase leading-tight line-clamp-2 font-display" title={trip.title}>
                            {trip.title}
                          </h3>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                            <School className="w-3 h-3" /> {trip.school}
                          </span>
                        </div>

                        {/* Info details */}
                        <div className="bg-natural-border-light/40 p-3 rounded-2xl space-y-1.5 text-xs border border-natural-border-light">
                          <p className="text-natural-text font-semibold flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-natural-brand" />
                            {trip.date.includes('-') 
                              ? new Date(trip.date + 'T00:00:00').toLocaleDateString('pt-BR') 
                              : trip.date}
                          </p>
                          <p className="text-gray-500 font-medium truncate">
                            Destino: <strong className="text-natural-text font-bold">{trip.destination}</strong>
                          </p>
                          <p className="text-gray-500 font-medium">
                            Valor: <strong className="text-natural-brand font-black">R$ {trip.price.toFixed(2)}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Action buttons with 'Gerenciar' and 'QR Code' as requested */}
                      <div className="pt-3 border-t border-natural-border-light space-y-2">
                        <button
                          onClick={() => setSelectedTripForDetails(trip)}
                          className="w-full py-2 bg-natural-dark hover:bg-natural-dark/95 text-white font-extrabold rounded-xl text-xs uppercase transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Users className="w-3.5 h-3.5 text-natural-brand" /> Gerenciar Alunos ({tripRegs.length})
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowLinkModal(trip)}
                            className="flex-1 py-2 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-xl text-[10px] uppercase transition flex items-center justify-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Link
                          </button>

                          <button
                            onClick={() => setShowQrCodeModal(trip)}
                            className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-natural-brand border border-amber-200/50 font-extrabold rounded-xl text-[10px] uppercase transition flex items-center justify-center gap-1"
                          >
                            {/* Inline SVG QR icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125v-3.75zM3.75 15.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125v-3.75zM15.375 3.75c-.621 0-1.125.504-1.125 1.125v3.75c0 .621.504 1.125 1.125 1.125h3.75c.621 0 1.125-.504 1.125-1.125v-3.75c0-.621-.504-1.125-1.125-1.125h-3.75z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 14h2v2h-2v-2zM14 18h2v2h-2v-2zM18 14h2v2h-2v-2zM18 18h2v2h-2v-2zM11 11h2v2h-2v-2zM11 15h2v2h-2v-2zM15 11h2v2h-2v-2z" />
                            </svg>
                            QR Code
                          </button>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => onEditTrip(trip)}
                            className="flex-1 py-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition text-center uppercase"
                          >
                            Editar
                          </button>
                          
                          <button
                            onClick={() => setTripToDelete(trip)}
                            className="px-2.5 py-1.5 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg transition"
                            title="Excluir Roteiro"
                          >
                            <Plus className="w-3.5 h-3.5 rotate-45" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLIENTES / CONTRATOS TABLE */}
        {activeTab === 'registrations' && (
          <div className="space-y-4">
            
            {/* SEARCH AND TRIP SELECT FILTER */}
            <div className="bg-white p-4 rounded-3xl border border-natural-border shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              
              <div className="relative flex-1 w-full">
                <span className="absolute left-3.5 top-3.5">
                  <Search className="w-4 h-4 text-gray-400" />
                </span>
                <input 
                  type="text"
                  placeholder="Pesquisar por aluno ou nome do pai/mãe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-natural-text placeholder-gray-300 focus:outline-natural-brand"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <select
                  value={selectedTripFilter}
                  onChange={(e) => setSelectedTripFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-3 py-3 text-xs font-bold text-gray-700 focus:outline-natural-brand flex-1 md:flex-none md:min-w-[180px]"
                >
                  <option value="">Todas as Viagens</option>
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-3 py-3 text-xs font-bold text-gray-700 focus:outline-natural-brand flex-1 md:flex-none"
                >
                  <option value="">Status Geral</option>
                  <option value="PAGO">PAGO</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="ATRASADO">ATRASADO</option>
                </select>
              </div>

            </div>

            {/* TABLE */}
            <div className="bg-white rounded-3xl border border-natural-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-natural-dark text-white text-[10px] font-black uppercase tracking-wider">
                      <th className="px-6 py-4 font-display">Aluno / Turma</th>
                      <th className="px-6 py-4 font-display">Responsável Legal</th>
                      <th className="px-6 py-4 font-display">Ficha Médica</th>
                      <th className="px-6 py-4 text-center font-display">Status Contrato</th>
                      <th className="px-6 py-4 font-display">Data Assinatura</th>
                      <th className="px-6 py-4 text-center font-display">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-natural-border-light text-xs">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                          Nenhum cliente assinado localizado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map(reg => {
                        const trip = trips.find(t => t.id === reg.tripId) || trips[0];
                        
                        // Medical risk level
                        const hasMedicalAttention = reg.medical.preExisting || reg.medical.allergies || reg.medical.dietary || reg.medical.pcd;
                        
                        return (
                          <tr key={reg.id} className="hover:bg-natural-border-light/40 transition-all">
                            
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-natural-text text-sm">{reg.student.name}</span>
                                {hasMedicalAttention && (
                                  <span title="Atenção Médica: possui item marcado como SIM na Ficha Médica" className="inline-flex items-center">
                                    <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold block mt-0.5 uppercase tracking-wider">{reg.student.classGroup || 'Sem turma configurada'}</span>
                            </td>

                            <td className="px-6 py-4">
                              <span className="font-semibold text-natural-text block">{reg.parent.name}</span>
                              <span className="text-[10px] text-gray-400 font-medium block mt-0.5">{reg.parent.phone}</span>
                            </td>

                            <td className="px-6 py-4">
                              {hasMedicalAttention ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/50 rounded-lg text-[10px] font-black uppercase">
                                  ⚠️ Atenção Médica
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50/40 text-natural-brand border border-amber-200/30 rounded-lg text-[10px] font-black uppercase">
                                  Tudo Ok
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-center">
                              {(() => {
                                const totalPaid = reg.payments?.filter(p => p.status === 'PAGO').reduce((sum, p) => sum + (typeof p.paidAmount === 'number' ? p.paidAmount : p.amount), 0) || 0;
                                const allPaid = reg.payments?.length > 0 && reg.payments.every(p => p.status === 'PAGO');
                                
                                let label = "PENDENTE";
                                let badgeClass = "bg-gray-50 text-gray-500 border border-gray-200/50";
                                
                                if (allPaid) {
                                  label = "CONFIRMADO";
                                  badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
                                } else if (totalPaid > 0) {
                                  label = "PAGO PARCIAL";
                                  badgeClass = "bg-amber-50 text-amber-700 border border-amber-200/50";
                                } else if (reg.status === 'ATRASADO') {
                                  label = "ATRASADO";
                                  badgeClass = "bg-red-50 text-red-700 border border-red-200/50";
                                }
                                
                                return (
                                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeClass}`}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>

                            <td className="px-6 py-4 font-mono text-gray-500">
                              {new Date(reg.signedAt).toLocaleString('pt-BR')}
                            </td>

                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setSelectedRegistration(reg)}
                                className="px-3.5 py-1.5 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-xl transition text-[10px] uppercase flex items-center gap-1 mx-auto shadow-sm"
                              >
                                <Eye className="w-3.5 h-3.5" /> Ver Ficha Completa
                              </button>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: PADRÕES DE NOVOS CONTRATOS */}
        {activeTab === 'defaults' && (
          <DefaultsSettings 
            tripDefaults={tripDefaults}
            onSaveDefaults={onSaveTripDefaults}
          />
        )}

      </div>

      {/* SINGLE CLIENT DETAIL POPUP (FICHA ALUNO) */}
      {selectedRegistration && (
        <ClientDetailsModal 
          registration={selectedRegistration}
          trip={trips.find(t => t.id === selectedRegistration.tripId) || trips[0]}
          onClose={() => setSelectedRegistration(null)}
          onDelete={(id) => {
            setRegistrationToDelete(selectedRegistration);
          }}
          onUpdateRegistration={(updated) => {
            onUpdateRegistration(updated);
            // Refresh local selection to display changes instantly
            setSelectedRegistration(updated);
          }}
        />
      )}

      {/* TRIP LINK DETAILS SHARING MODAL */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-natural-border animate-fadeIn">
            <div className="bg-natural-dark px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-natural-brand" />
                <h4 className="font-bold text-sm uppercase font-display">Link de Assinatura do Cliente</h4>
              </div>
              <button 
                onClick={() => setShowLinkModal(null)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 text-xs leading-relaxed text-natural-text">
                Compartilhe o endereço abaixo com os responsáveis através do WhatsApp do Colégio ou e-mail. 
                Ao clicar, eles visualizarão as informações e assinarão diretamente pelo smartphone.
              </div>

              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-gray-400 uppercase">Link de Acesso para os Pais</span>
                
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#FAF9F6] border border-natural-border px-3 py-2.5 rounded-xl font-mono text-[11px] text-natural-text truncate">
                    {window.location.origin}?trip={showLinkModal.id}
                  </div>
                  
                  <button
                    onClick={() => copyTripLink(showLinkModal.id)}
                    className="px-3.5 py-2.5 bg-natural-brand hover:bg-natural-brand-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 uppercase"
                  >
                    {copiedTripId === showLinkModal.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedTripId === showLinkModal.id ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-natural-border space-y-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase">Visualização Teste (In-App)</span>
                
                <button
                  onClick={() => {
                    onOpenClientLink(showLinkModal.id);
                    setShowLinkModal(null);
                  }}
                  className="w-full py-2.5 bg-natural-brand hover:bg-natural-brand-hover text-white rounded-xl text-xs font-bold transition uppercase flex items-center justify-center gap-1.5 shadow"
                >
                  <Eye className="w-4 h-4" /> Abrir Link do Contrato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRIP QR CODE MODAL */}
      {showQrCodeModal && (() => {
        const fakeLink = `${window.location.origin}?trip=${showQrCodeModal.id}`;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-natural-border animate-fadeIn">
              <div className="bg-natural-dark px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-natural-brand">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125v-3.75zM3.75 15.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125v-3.75zM15.375 3.75c-.621 0-1.125.504-1.125 1.125v3.75c0 .621.504 1.125 1.125 1.125h3.75c.621 0 1.125-.504 1.125-1.125v-3.75c0-.621-.504-1.125-1.125-1.125h-3.75z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 14h2v2h-2v-2zM14 18h2v2h-2v-2zM18 14h2v2h-2v-2zM18 18h2v2h-2v-2zM11 11h2v2h-2v-2zM11 15h2v2h-2v-2zM15 11h2v2h-2v-2z" />
                  </svg>
                  <h4 className="font-bold text-sm uppercase font-display">QR Code da Viagem</h4>
                </div>
                <button 
                  onClick={() => setShowQrCodeModal(null)}
                  className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 text-center">
                <div className="space-y-1">
                  <h5 className="font-black text-sm text-natural-text uppercase leading-tight">
                    {showQrCodeModal.title}
                  </h5>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                    {showQrCodeModal.school}
                  </p>
                </div>

                {/* QR CODE CONTAINER FOR EASY COPYING/PRINTING */}
                <div id="printable-qrcode-container" className="bg-[#FAF9F6] p-4 rounded-3xl border border-natural-border flex flex-col items-center justify-center space-y-3 max-w-[280px] mx-auto shadow-inner">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fakeLink)}`} 
                    alt="QR Code da Viagem"
                    className="w-48 h-48 rounded-xl bg-white p-2 shadow-sm border border-gray-100 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block font-mono">
                    PATITOUR DIGITAL
                  </span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Aponte a câmera do celular para o QR Code acima para acessar diretamente o preenchimento do contrato e ficha médica.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fakeLink);
                      alert('Link copiado com sucesso!');
                    }}
                    className="py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-extrabold rounded-xl text-xs transition uppercase"
                  >
                    Copiar Link
                  </button>

                  <button
                    onClick={() => downloadQrCodeImage(showQrCodeModal)}
                    className="py-2.5 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-xl text-xs transition uppercase flex items-center justify-center gap-1.5 shadow-md shadow-natural-brand/10"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar Imagem
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CUSTOM TRIP DELETE CONFIRMATION MODAL */}
      {tripToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-red-100 animate-fadeIn animate-duration-200">
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
                <h4 className="font-bold text-sm uppercase font-display">Confirmar Exclusão de Roteiro</h4>
              </div>
              <button 
                onClick={() => setTripToDelete(null)}
                className="text-white/85 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                Tem certeza de que deseja excluir o roteiro <strong className="text-gray-900">{tripToDelete.title}</strong> do colégio <strong className="text-gray-900">{tripToDelete.school}</strong>?
              </p>
              
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-[11px] leading-relaxed text-red-700 font-medium">
                Esta ação é definitiva e removerá permanentemente o roteiro e todas as fichas de alunos/contratos associados a ele.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTripToDelete(null)}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs transition uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTrip(tripToDelete.id);
                    setTripToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition uppercase shadow-md shadow-red-200"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM REGISTRATION DELETE CONFIRMATION MODAL */}
      {registrationToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-red-100 animate-fadeIn animate-duration-200">
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
                <h4 className="font-bold text-sm uppercase font-display">Confirmar Exclusão de Aluno</h4>
              </div>
              <button 
                onClick={() => setRegistrationToDelete(null)}
                className="text-white/85 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                Deseja realmente excluir permanentemente a ficha de inscrição do aluno <strong className="text-gray-900">{registrationToDelete.student.name}</strong>?
              </p>
              
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-[11px] leading-relaxed text-red-700 font-medium">
                Esta ação é irreversível e removerá todos os dados médicos, contratos assinados e informações financeiras associadas a este aluno.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRegistrationToDelete(null)}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs transition uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteRegistration(registrationToDelete.id);
                    setRegistrationToDelete(null);
                    setSelectedRegistration(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition uppercase shadow-md shadow-red-200"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple internal helper icon
function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
