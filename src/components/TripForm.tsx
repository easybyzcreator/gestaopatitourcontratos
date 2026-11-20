import React, { useState, useEffect, useRef } from 'react';
import { Trip, TripDefaults, SYSTEM_DEFAULT_TRIP_DEFAULTS } from '../types';
import { ArrowLeft, Plus, Trash2, RotateCcw, Save, ShieldAlert, Check, Eye, Pencil, X } from 'lucide-react';

interface TripFormProps {
  trip?: Trip; // If present, we are editing, otherwise creating
  tripDefaults?: TripDefaults;
  onSave: (trip: Trip) => void;
  onCancel: () => void;
}

const formatDateForInput = (rawDate: string) => {
  if (!rawDate) return '';
  if (rawDate.includes('-')) {
    const parts = rawDate.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return rawDate;
};

const formatCurrency = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  if (!clean) return '';
  const numberValue = parseFloat(clean) / 100;
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const parseCurrencyToFloat = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const ddmmyyyyToYyyymmdd = (val: string): string => {
  const parts = val.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    if (year.length === 4) {
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${year}-${month}-${day}`;
      }
    }
  }
  return '';
};

const sanitizeNoAccentsNoSymbols = (val: string): string => {
  const normalized = val.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Keep: alphanumeric, space, comma, dot, slash, hyphen, colon, parenthesis
  return normalized.replace(/[^A-Za-z0-9\s,\.\-\/\:\(\)]/g, "");
};

const formatTimeInput = (value: string): string => {
  let val = value.replace(/\D/g, ''); // Keep only digits
  if (val.length > 4) val = val.slice(0, 4); // Limit to 4 digits
  
  if (val.length > 2) {
    return `${val.slice(0, 2)}:${val.slice(2)}`;
  }
  return val;
};

function AutoResizeTextarea({
  minRows = 4,
  value,
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const adjustHeight = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };

    adjustHeight();

    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        adjustHeight();
      }
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      className={`${className} overflow-hidden resize-none`}
      {...props}
    />
  );
}

export default function TripForm({ trip, tripDefaults, onSave, onCancel }: TripFormProps) {
  const defaults = tripDefaults || SYSTEM_DEFAULT_TRIP_DEFAULTS;
  // Section 1: Roteiro
  const [active, setActive] = useState<boolean>(trip ? trip.active : true);
  const [tripType, setTripType] = useState<'pedagogico' | 'adulto'>(trip && trip.tripType ? trip.tripType : 'pedagogico');
  const [title, setTitle] = useState<string>(trip ? trip.title : '');
  const [school, setSchool] = useState<string>(trip ? trip.school : '');
  const [destination, setDestination] = useState<string>(trip ? trip.destination : '');
  const [date, setDate] = useState<string>(trip ? formatDateForInput(trip.date) : '');
  const [departureTime, setDepartureTime] = useState<string>(trip ? trip.departureTime : '');
  const [returnTime, setReturnTime] = useState<string>(trip ? trip.returnTime : '');

  // Section 2: Valores e Turmas
  const [price, setPrice] = useState<string>(
    trip 
      ? trip.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : '0,00'
  );
  const [maxInstallments, setMaxInstallments] = useState<number>(trip ? trip.maxInstallments : 1);
  const [asaasLink, setAsaasLink] = useState<string>(trip ? trip.asaasLink || '' : '');
  
  // Custom due dates
  const [customDueDates, setCustomDueDates] = useState<Array<{ date: string; amount: number }>>(
    trip ? trip.customDueDates : []
  );
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [newDueAmount, setNewDueAmount] = useState<string>('');
  const [editingDueIndex, setEditingDueIndex] = useState<number | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<string>('');
  const [editingDueAmount, setEditingDueAmount] = useState<string>('');

  // Turmas
  const [allowedClasses, setAllowedClasses] = useState<string[]>(trip ? trip.allowedClasses : []);
  const [newClass, setNewClass] = useState<string>('');

  // Section 3: Roteiro e Atividades
  const [includedItems, setIncludedItems] = useState<string>(trip ? trip.includedItems : defaults.includedItems);
  const [foodText, setFoodText] = useState<string>(trip ? trip.foodText || '' : defaults.foodText);
  const [activitiesText, setActivitiesText] = useState<string>(trip ? trip.activitiesText || '' : defaults.activitiesText);

  // Section 4: Cláusulas
  const [clausePaymentPedagogico, setClausePaymentPedagogico] = useState<string>(
    trip ? (trip.clauses.paymentPedagogico || (trip.activeClauses === undefined ? trip.clauses.payment : '')) : defaults.clauses.paymentPedagogico
  );
  const [clausePayment, setClausePayment] = useState<string>(
    trip ? trip.clauses.payment : defaults.clauses.payment
  );
  const [clauseCancelationPedagogico, setClauseCancelationPedagogico] = useState<string>(
    trip ? (trip.clauses.cancelationPedagogico || (trip.activeClauses === undefined ? trip.clauses.cancelation : '')) : defaults.clauses.cancelationPedagogico
  );
  const [clauseCancelation, setClauseCancelation] = useState<string>(
    trip ? trip.clauses.cancelation : defaults.clauses.cancelation
  );
  const [clausePcdPedagogico, setClausePcdPedagogico] = useState<string>(
    trip ? (trip.clauses.pcdPedagogico || (trip.activeClauses === undefined ? trip.clauses.pcd : '')) : defaults.clauses.pcdPedagogico
  );
  const [clausePcd, setClausePcd] = useState<string>(
    trip ? trip.clauses.pcd : defaults.clauses.pcd
  );
  const [clauseRegrasPedagogico, setClauseRegrasPedagogico] = useState<string>(
    trip ? (trip.clauses.regrasPedagogico || (trip.activeClauses === undefined ? trip.clauses.regras : '')) : defaults.clauses.regrasPedagogico
  );
  const [clauseRegras, setClauseRegras] = useState<string>(
    trip ? (trip.clauses.regras || '') : defaults.clauses.regras
  );
  const [clauseRegrasTv, setClauseRegrasTv] = useState<string>(
    trip ? (trip.clauses.regrasTv || '') : defaults.clauses.regrasTv
  );
  const [clauseDocumentacaoPedagogico, setClauseDocumentacaoPedagogico] = useState<string>(
    trip ? (trip.clauses.documentacaoPedagogico || (trip.activeClauses === undefined ? trip.clauses.documentacao : '')) : defaults.clauses.documentacaoPedagogico
  );
  const [clauseDocumentacao, setClauseDocumentacao] = useState<string>(
    trip ? (trip.clauses.documentacao !== defaults.clauses.documentacaoPedagogico ? trip.clauses.documentacao : defaults.clauses.documentacao) : defaults.clauses.documentacao
  );

  const [activeClauses, setActiveClauses] = useState<string[]>(
    trip ? trip.activeClauses || ['paymentPedagogico', 'cancelationPedagogico', 'pcdPedagogico', 'regrasPedagogico', 'documentacaoPedagogico'] : [...defaults.activeClauses]
  );

  const [showPaymentAlert1, setShowPaymentAlert1] = useState<boolean>(
    trip ? (trip.showPaymentAlert1 !== undefined ? trip.showPaymentAlert1 : trip.showPaymentAlerts !== false) : defaults.showPaymentAlert1
  );
  const [showPaymentAlert2, setShowPaymentAlert2] = useState<boolean>(
    trip ? (trip.showPaymentAlert2 !== undefined ? trip.showPaymentAlert2 : trip.showPaymentAlerts !== false) : defaults.showPaymentAlert2
  );
  const [showPaymentAlert3, setShowPaymentAlert3] = useState<boolean>(
    trip ? (trip.showPaymentAlert3 !== undefined ? trip.showPaymentAlert3 : trip.showPaymentAlerts !== false) : defaults.showPaymentAlert3
  );

  // Section 5: Custom Dynamic Fields (EXCLUSIVO REQUISITO CLIENTE)
  const [requiredFields, setRequiredFields] = useState(
    trip 
      ? trip.requiredFields 
      : { ...defaults.requiredFields }
  );

  const handleAddDueDate = () => {
    if (!newDueDate) {
      alert('Por favor, digite a data de vencimento da parcela.');
      return;
    }
    const parsedDate = ddmmyyyyToYyyymmdd(newDueDate);
    if (!parsedDate) {
      alert('Por favor, digite uma data de vencimento válida no formato DD/MM/AAAA (ex: 15/08/2026).');
      return;
    }
    const amount = parseCurrencyToFloat(newDueAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, digite um valor de parcela válido maior que zero.');
      return;
    }

    setCustomDueDates([...customDueDates, { date: parsedDate, amount }]);
    setNewDueDate('');
    setNewDueAmount('');
  };

  const handleRemoveDueDate = (index: number) => {
    setCustomDueDates(customDueDates.filter((_, i) => i !== index));
    if (editingDueIndex === index) {
      setEditingDueIndex(null);
      setEditingDueDate('');
      setEditingDueAmount('');
    } else if (editingDueIndex !== null && editingDueIndex > index) {
      setEditingDueIndex(editingDueIndex - 1);
    }
  };

  const handleStartEditDueDate = (index: number) => {
    const target = customDueDates[index];
    setEditingDueIndex(index);
    setEditingDueDate(formatDateForInput(target.date));
    setEditingDueAmount(
      target.amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  };

  const handleSaveEditDueDate = (index: number) => {
    const parsedDate = ddmmyyyyToYyyymmdd(editingDueDate);
    if (!parsedDate) {
      alert('Por favor, digite uma data de vencimento válida no formato DD/MM/AAAA (ex: 15/08/2026).');
      return;
    }
    const amount = parseCurrencyToFloat(editingDueAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, digite um valor de parcela válido maior que zero.');
      return;
    }
    setCustomDueDates(
      customDueDates.map((item, idx) =>
        idx === index ? { date: parsedDate, amount } : item
      )
    );
    setEditingDueIndex(null);
    setEditingDueDate('');
    setEditingDueAmount('');
  };

  const handleCancelEditDueDate = () => {
    setEditingDueIndex(null);
    setEditingDueDate('');
    setEditingDueAmount('');
  };

  const handleAddClass = () => {
    if (!newClass.trim()) return;
    if (!allowedClasses.includes(newClass.trim().toUpperCase())) {
      setAllowedClasses([...allowedClasses, newClass.trim().toUpperCase()]);
    }
    setNewClass('');
  };

  const handleRemoveClass = (index: number) => {
    setAllowedClasses(allowedClasses.filter((_, i) => i !== index));
  };

  const handleFieldToggle = (field: keyof typeof requiredFields) => {
    setRequiredFields({
      ...requiredFields,
      [field]: !requiredFields[field]
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !school || !destination || !date) {
      alert('Por favor, preencha o Título, Escola, Destino e Data da Viagem.');
      return;
    }

    const calculatedPrice = customDueDates.reduce((acc, curr) => acc + curr.amount, 0);

    onSave({
      id: trip ? trip.id : `trip-${Date.now()}`,
      active,
      tripType,
      title: title.toUpperCase(),
      school: school.toUpperCase(),
      destination: destination.toUpperCase(),
      date,
      departureTime,
      returnTime,
      price: calculatedPrice > 0 ? calculatedPrice : parseCurrencyToFloat(price) || 0,
      maxInstallments,
      asaasLink,
      customDueDates,
      allowedClasses: tripType === 'adulto' ? [] : allowedClasses, // Clean classes if adult trip!
      includedItems,
      foodText,
      activitiesText,
      clauses: {
        paymentPedagogico: clausePaymentPedagogico,
        payment: clausePayment,
        cancelationPedagogico: clauseCancelationPedagogico,
        cancelation: clauseCancelation,
        pcdPedagogico: clausePcdPedagogico,
        pcd: clausePcd,
        regrasPedagogico: clauseRegrasPedagogico,
        regras: clauseRegras,
        regrasTv: clauseRegrasTv,
        documentacaoPedagogico: clauseDocumentacaoPedagogico,
        documentacao: clauseDocumentacao
      },
      activeClauses,
      showPaymentAlerts: showPaymentAlert1 || showPaymentAlert2 || showPaymentAlert3,
      showPaymentAlert1,
      showPaymentAlert2,
      showPaymentAlert3,
      requiredFields: tripType === 'adulto' 
        ? {
            ...requiredFields,
            parentCpf: false,
            parentRg: false,
            parentPhone: false,
            parentEmail: false,
            parentAddress: false,
            payerDifferent: requiredFields.payerDifferent
          }
        : requiredFields
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-16 animate-fadeIn">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <button 
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-gray-500 hover:text-natural-brand transition font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5" /> VOLTAR
        </button>
        <div className="flex items-center gap-2">
          <img 
            src="https://raw.githubusercontent.com/easybyzcreator/imagens/c364de998313d54887e1ca668bbf2997f0e6e903/logo%20patitour%20-%20fundo%20transp.png" 
            alt="Pati Tour Logo" 
            referrerPolicy="no-referrer"
            className="h-[52px] w-auto object-contain"
          />
          <h1 className="text-xl font-black text-natural-text uppercase font-display">{trip ? 'Editar Viagem' : 'Nova Viagem'}</h1>
        </div>
        <button 
          type="submit"
          className="px-6 py-2.5 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-full transition shadow-lg shadow-natural-brand/10 text-sm uppercase flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" /> {trip ? 'Salvar Alterações' : 'Criar Viagem'}
        </button>
      </div>

      {/* STATUS DO LINK ACCORDION */}
      <div className="bg-white rounded-3xl p-6 border-2 border-dashed border-amber-200/50 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-natural-brand font-display">STATUS DO LINK DO CONTRATO</h3>
          <p className="text-xs text-gray-400">Se desativado, os pais receberão uma mensagem de indisponibilidade ao clicar no link.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold ${active ? 'text-natural-brand' : 'text-gray-400'}`}>
            {active ? 'LINK ATIVO' : 'LINK DESATIVADO'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={active} 
              onChange={() => setActive(!active)}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-natural-brand"></div>
          </label>
        </div>
      </div>

      {/* 01. INFORMAÇÕES DO ROTEIRO */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
          <div className="w-7 h-7 bg-natural-brand text-white rounded-full flex items-center justify-center font-bold text-sm">01</div>
          <h2 className="text-base font-black text-natural-text uppercase tracking-tight font-display">Informações do Roteiro</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo de Viagem / Contrato</label>
            <select
              value={tripType}
              onChange={(e) => setTripType(e.target.value as 'pedagogico' | 'adulto')}
              className="w-full bg-amber-50/50 border border-amber-200/40 rounded-2xl px-4 py-3 text-sm font-black text-natural-brand focus:outline-natural-brand uppercase"
            >
              <option value="pedagogico">🎒 Infantil / Escolar (Alunos e Responsáveis)</option>
              <option value="adulto">🧑‍💼 Adulto / Corporativo (Apenas Passageiros Maiores de Idade)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Título da Viagem</label>
            <input 
              type="text" 
              placeholder="Ex: ESTUDO DO MEIO - 2 ANOS"
              value={title}
              onChange={(e) => setTitle(sanitizeNoAccentsNoSymbols(e.target.value))}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-natural-text placeholder-gray-300 focus:outline-natural-brand"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Escola / Instituição</label>
            <input 
              type="text" 
              placeholder="Ex: SESI 085"
              value={school}
              onChange={(e) => setSchool(sanitizeNoAccentsNoSymbols(e.target.value))}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-natural-text placeholder-gray-300 focus:outline-natural-brand"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Destino / Cidade</label>
            <input 
              type="text" 
              placeholder="Ex: TERRA DE GIGANTES"
              value={destination}
              onChange={(e) => setDestination(sanitizeNoAccentsNoSymbols(e.target.value))}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-natural-text placeholder-gray-300 focus:outline-natural-brand"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data da Viagem (Manual)</label>
            <input 
              type="text" 
              placeholder="Ex: 12/11/2026"
              value={date}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val.length > 8) val = val.slice(0, 8);
                let formatted = val;
                if (val.length > 2) {
                  formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                }
                if (val.length > 4) {
                  formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                }
                setDate(formatted);
              }}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-natural-text focus:outline-natural-brand font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Horário Saída (24h)</label>
            <input 
              type="text" 
              placeholder="Ex: 07:00"
              value={departureTime}
              onChange={(e) => setDepartureTime(formatTimeInput(e.target.value))}
              maxLength={5}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-natural-text focus:outline-natural-brand font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Horário Retorno (24h)</label>
            <input 
              type="text" 
              placeholder="Ex: 18:30"
              value={returnTime}
              onChange={(e) => setReturnTime(formatTimeInput(e.target.value))}
              maxLength={5}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-natural-text focus:outline-natural-brand font-mono"
            />
          </div>
        </div>
      </div>

      {/* 02. VALORES E TURMAS */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
          <div className="w-7 h-7 bg-natural-brand text-white rounded-full flex items-center justify-center font-bold text-sm">02</div>
          <h2 className="text-base font-black text-natural-text uppercase tracking-tight font-display">Valores e Turmas</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preço Total da Viagem</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-xs text-gray-400 font-bold">R$</span>
              <input 
                type="text" 
                placeholder="0,00"
                value={price}
                onChange={(e) => setPrice(formatCurrency(e.target.value))}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-natural-text focus:outline-natural-brand font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Máx. Parcelas Permitidas</label>
            <input 
              type="number" 
              min="1" 
              max="12"
              value={maxInstallments}
              onChange={(e) => setMaxInstallments(parseInt(e.target.value) || 1)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-natural-text focus:outline-natural-brand"
            />
          </div>

          <div className="bg-green-50/50 border border-green-100 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[10px] font-black text-green-800 uppercase tracking-wider mb-1 flex items-center gap-1">
              🔌 Conexão Direta Asaas Ativa
            </span>
            <p className="text-[9px] text-gray-500 leading-normal">
              O app conecta-se à sua conta Asaas via API. O status de pagamento é atualizado automaticamente pelo webhook em tempo real.
            </p>
          </div>
        </div>

        {/* Link de Pagamento Asaas (Opcional) */}
        <div className="bg-amber-50/10 border border-amber-100 rounded-2xl p-5 space-y-2">
          <label className="block text-[10px] font-black text-natural-brand uppercase tracking-wider">
            Link de Pagamento Direto do Asaas (Opcional)
          </label>
          <input 
            type="text" 
            placeholder="Ex: https://www.asaas.com/c/vaga-estudo-meio-12345"
            value={asaasLink}
            onChange={(e) => setAsaasLink(e.target.value.trim())}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-natural-text focus:outline-natural-brand"
          />
          <p className="text-[10px] text-gray-400">
            💡 <strong>Se preenchido:</strong> O cliente será redirecionado para este link oficial do Asaas para efetuar o pagamento seguro após a assinatura eletrônica do contrato.
          </p>
        </div>

        {/* DATAS DE VENCIMENTO FIXAS */}
        <div className="bg-amber-50/20 rounded-2xl p-5 border border-amber-200/50 space-y-4">
          <div>
            <h4 className="text-xs font-black text-natural-text uppercase tracking-wider font-display">Datas de Vencimento Fixas</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Defina os vencimentos de cada parcela. Se não preenchidos, o sistema calculará datas automáticas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Vencimento da Parcela</label>
              <input 
                type="text" 
                placeholder="DD/MM/AAAA"
                value={newDueDate}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 8) val = val.slice(0, 8);
                  let formatted = val;
                  if (val.length > 2) {
                    formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                  }
                  if (val.length > 4) {
                    formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                  }
                  setNewDueDate(formatted);
                }}
                className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-semibold text-natural-text focus:outline-natural-brand font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor da Parcela</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">R$</span>
                <input 
                  type="text" 
                  placeholder="0,00"
                  value={newDueAmount}
                  onChange={(e) => setNewDueAmount(formatCurrency(e.target.value))}
                  className="w-full bg-white border border-gray-100 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-natural-text focus:outline-natural-brand font-mono"
                />
              </div>
            </div>
            <button 
              type="button"
              onClick={handleAddDueDate}
              className="w-full bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-xl py-2.5 text-xs transition uppercase flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Adicionar Parcela
            </button>
          </div>

          {/* LIST OF PARCEL DUE DATES */}
          {customDueDates.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="block text-[9px] font-bold text-gray-400 uppercase">Lista de Parcelas Configuradas:</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {customDueDates.map((p, index) => (
                  <div key={index} className="bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                    {editingDueIndex === index ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-natural-brand uppercase">{index + 1}ª Parcela</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEditDueDate(index)}
                              title="Salvar alteração"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditDueDate}
                              title="Cancelar edição"
                              className="p-1 text-gray-400 hover:bg-gray-100 rounded transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-[10px] text-gray-400 font-bold">R$</span>
                          <input
                            type="text"
                            value={editingDueAmount}
                            onChange={(e) => setEditingDueAmount(formatCurrency(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEditDueDate(index);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancelEditDueDate();
                              }
                            }}
                            autoFocus
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-2 py-1 text-xs font-bold text-gray-800 font-mono focus:outline-natural-brand"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="DD/MM/AAAA"
                          value={editingDueDate}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 8) val = val.slice(0, 8);
                            let formatted = val;
                            if (val.length > 2) {
                              formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                            }
                            if (val.length > 4) {
                              formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                            }
                            setEditingDueDate(formatted);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditDueDate(index);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelEditDueDate();
                            }
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-gray-600 font-mono focus:outline-natural-brand"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block text-[8px] font-bold text-natural-brand uppercase">{index + 1}ª Parcela</span>
                          <span className="text-xs font-bold text-gray-800 font-mono">R$ {p.amount.toFixed(2)}</span>
                          <span className="block text-[9px] text-gray-400 font-mono">{new Date(p.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button 
                            type="button" 
                            onClick={() => handleStartEditDueDate(index)}
                            title="Editar valor/vencimento"
                            className="p-1 text-natural-brand hover:bg-amber-50 rounded transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveDueDate(index)}
                            title="Excluir parcela"
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-natural-brand font-bold bg-white px-3 py-2 rounded-xl border border-amber-200/50 flex items-center gap-1.5 w-fit">
                Total acumulado das parcelas: <span className="font-mono">R$ {customDueDates.reduce((acc, c) => acc + c.amount, 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* TURMAS AUTORIZADAS */}
        {tripType !== 'adulto' && (
          <div className="bg-amber-50/20 rounded-2xl p-5 border border-amber-200/50 space-y-4">
            <div>
              <h4 className="text-xs font-black text-natural-text uppercase tracking-wider font-display">Turmas Autorizadas</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">* É obrigatório incluir as turmas para que o pai possa selecionar no formulário do link.</p>
            </div>

            <div className="flex gap-2 max-w-md">
              <input 
                type="text" 
                placeholder="Ex: 5º ANO A"
                value={newClass}
                onChange={(e) => setNewClass(sanitizeNoAccentsNoSymbols(e.target.value))}
                className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-semibold uppercase text-natural-text focus:outline-natural-brand"
              />
              <button 
                type="button"
                onClick={handleAddClass}
                className="px-4 py-2 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-xl text-xs transition uppercase"
              >
                Incluir
              </button>
            </div>

            {allowedClasses.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {allowedClasses.map((cl, i) => (
                  <div key={i} className="bg-white border border-amber-200/50 text-natural-text px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm">
                    <span>{cl}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveClass(i)}
                      className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 03. ROTEIRO E ATIVIDADES */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
          <div className="w-7 h-7 bg-natural-brand text-white rounded-full flex items-center justify-center font-bold text-sm">03</div>
          <h2 className="text-base font-black text-natural-text uppercase tracking-tight font-display">Roteiro e Atividades</h2>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Itens Inclusos no Contrato</label>
              <button 
                type="button" 
                onClick={() => setIncludedItems(defaults.includedItems)}
                className="text-natural-brand text-[10px] font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Restaurar Padrão
              </button>
            </div>
            <AutoResizeTextarea 
              minRows={6}
              value={includedItems}
              onChange={(e) => setIncludedItems(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs text-gray-700 leading-relaxed font-mono focus:outline-natural-brand"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alimentação (Opcional)</label>
                <button 
                  type="button" 
                  onClick={() => setFoodText('')}
                  className="text-gray-400 text-[10px] font-bold hover:underline"
                >
                  Limpar
                </button>
              </div>
              <AutoResizeTextarea 
                minRows={4}
                placeholder="Vazio por padrão (não aparecerá se não preenchido)"
                value={foodText}
                onChange={(e) => setFoodText(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs text-gray-700 leading-relaxed focus:outline-natural-brand"
              />
              <p className="text-[10px] text-amber-800 font-bold mt-1">💡 Se vazio, não vai para o contrato do cliente.</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Atividades Principais (Opcional)</label>
                <button 
                  type="button" 
                  onClick={() => setActivitiesText('')}
                  className="text-gray-400 text-[10px] font-bold hover:underline"
                >
                  Limpar
                </button>
              </div>
              <AutoResizeTextarea 
                minRows={4}
                placeholder="Vazio por padrão (não aparecerá se não preenchido)"
                value={activitiesText}
                onChange={(e) => setActivitiesText(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs text-gray-700 leading-relaxed focus:outline-natural-brand"
              />
              <p className="text-[10px] text-amber-800 font-bold mt-1">💡 Se vazio, não vai para o contrato do cliente.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 04. CLÁUSULAS CONTRATUAIS */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
          <div className="w-7 h-7 bg-natural-brand text-white rounded-full flex items-center justify-center font-bold text-sm">04</div>
          <h2 className="text-base font-black text-natural-text uppercase tracking-tight font-display">Cláusulas Contratuais</h2>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/40 text-xs text-amber-950 font-semibold mb-4 leading-relaxed">
          ℹ️ <strong>Seleção e Edição de Cláusulas:</strong> Marque a caixa de seleção de cada cláusula para ativá-la nesta viagem. Você pode editar os textos conforme necessário. Cláusulas desmarcadas <strong>não aparecerão no contrato</strong> e o cliente não precisará dar o aceite.
        </div>

        <div className="space-y-8">
          {/* CLAUSE 1: PAGAMENTO & VAGAS */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">1. Cláusula de Pagamento & Vagas</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pedagogico */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('paymentPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('paymentPedagogico')}
                      onChange={() => {
                        const next = activeClauses.includes('paymentPedagogico') 
                          ? activeClauses.filter(k => k !== 'paymentPedagogico') 
                          : [...activeClauses, 'paymentPedagogico'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Pagamento & Vagas -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClausePaymentPedagogico('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClausePaymentPedagogico(defaults.clauses.paymentPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={4}
                  value={clausePaymentPedagogico}
                  onChange={(e) => setClausePaymentPedagogico(e.target.value)}
                  disabled={!activeClauses.includes('paymentPedagogico')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>

              {/* Standard */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('payment') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('payment')}
                      onChange={() => {
                        const next = activeClauses.includes('payment') 
                          ? activeClauses.filter(k => k !== 'payment') 
                          : [...activeClauses, 'payment'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Pagamento & Vagas</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClausePayment('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClausePayment(defaults.clauses.payment)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={4}
                  value={clausePayment}
                  onChange={(e) => setClausePayment(e.target.value)}
                  disabled={!activeClauses.includes('payment')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>
            </div>
          </div>

          {/* CLAUSE 2: CANCELAMENTO */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">2. Cláusula de Cancelamento</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pedagogico */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('cancelationPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('cancelationPedagogico')}
                      onChange={() => {
                        const next = activeClauses.includes('cancelationPedagogico') 
                          ? activeClauses.filter(k => k !== 'cancelationPedagogico') 
                          : [...activeClauses, 'cancelationPedagogico'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Cancelamento -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClauseCancelationPedagogico('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClauseCancelationPedagogico(defaults.clauses.cancelationPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={5}
                  value={clauseCancelationPedagogico}
                  onChange={(e) => setClauseCancelationPedagogico(e.target.value)}
                  disabled={!activeClauses.includes('cancelationPedagogico')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>

              {/* Standard */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('cancelation') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('cancelation')}
                      onChange={() => {
                        const next = activeClauses.includes('cancelation') 
                          ? activeClauses.filter(k => k !== 'cancelation') 
                          : [...activeClauses, 'cancelation'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Cancelamento</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClauseCancelation('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClauseCancelation(defaults.clauses.cancelation)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={5}
                  value={clauseCancelation}
                  onChange={(e) => setClauseCancelation(e.target.value)}
                  disabled={!activeClauses.includes('cancelation')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>
            </div>
          </div>

          {/* CLAUSE 3: POLITICA PCD */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">3. Cláusula de Regulamento PCD</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pedagogico */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('pcdPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('pcdPedagogico')}
                      onChange={() => {
                        const next = activeClauses.includes('pcdPedagogico') 
                          ? activeClauses.filter(k => k !== 'pcdPedagogico') 
                          : [...activeClauses, 'pcdPedagogico'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Regulamento PCD -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClausePcdPedagogico('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClausePcdPedagogico(defaults.clauses.pcdPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={4}
                  value={clausePcdPedagogico}
                  onChange={(e) => setClausePcdPedagogico(e.target.value)}
                  disabled={!activeClauses.includes('pcdPedagogico')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>

              {/* Standard */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('pcd') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('pcd')}
                      onChange={() => {
                        const next = activeClauses.includes('pcd') 
                          ? activeClauses.filter(k => k !== 'pcd') 
                          : [...activeClauses, 'pcd'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Regulamento PCD</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClausePcd('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClausePcd(defaults.clauses.pcd)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={4}
                  value={clausePcd}
                  onChange={(e) => setClausePcd(e.target.value)}
                  disabled={!activeClauses.includes('pcd')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>
            </div>
          </div>

          {/* CLAUSE 4: REGRAS GERAIS */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">4. Cláusula de Regras Gerais</span>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pedagogico */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('regrasPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('regrasPedagogico')}
                      onChange={() => {
                        const next = activeClauses.includes('regrasPedagogico') 
                          ? activeClauses.filter(k => k !== 'regrasPedagogico') 
                          : [...activeClauses, 'regrasPedagogico'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Regras Gerais -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClauseRegrasPedagogico('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClauseRegrasPedagogico(defaults.clauses.regrasPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={5}
                  value={clauseRegrasPedagogico}
                  onChange={(e) => setClauseRegrasPedagogico(e.target.value)}
                  disabled={!activeClauses.includes('regrasPedagogico')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>

              {/* Standard */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('regras') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('regras')}
                      onChange={() => {
                        const next = activeClauses.includes('regras') 
                          ? activeClauses.filter(k => k !== 'regras') 
                          : [...activeClauses, 'regras'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Regras Gerais (Em Branco)</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClauseRegras('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClauseRegras(defaults.clauses.regras)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={5}
                  value={clauseRegras}
                  onChange={(e) => setClauseRegras(e.target.value)}
                  disabled={!activeClauses.includes('regras')}
                  placeholder="Texto em branco..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>

              {/* Programas de TV */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('regrasTv') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('regrasTv')}
                      onChange={() => {
                        const next = activeClauses.includes('regrasTv') 
                          ? activeClauses.filter(k => k !== 'regrasTv') 
                          : [...activeClauses, 'regrasTv'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Programas de TV</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClauseRegrasTv('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClauseRegrasTv(defaults.clauses.regrasTv)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={5}
                  value={clauseRegrasTv}
                  onChange={(e) => setClauseRegrasTv(e.target.value)}
                  disabled={!activeClauses.includes('regrasTv')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>
            </div>
          </div>

          {/* CLAUSE 5: DOCUMENTACAO */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">5. Cláusula de Documentação</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pedagogico */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('documentacaoPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('documentacaoPedagogico')}
                      onChange={() => {
                        const next = activeClauses.includes('documentacaoPedagogico') 
                          ? activeClauses.filter(k => k !== 'documentacaoPedagogico') 
                          : [...activeClauses, 'documentacaoPedagogico'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Documentação -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClauseDocumentacaoPedagogico('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClauseDocumentacaoPedagogico(defaults.clauses.documentacaoPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={4}
                  value={clauseDocumentacaoPedagogico}
                  onChange={(e) => setClauseDocumentacaoPedagogico(e.target.value)}
                  disabled={!activeClauses.includes('documentacaoPedagogico')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>

              {/* Standard */}
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('documentacao') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeClauses.includes('documentacao')}
                      onChange={() => {
                        const next = activeClauses.includes('documentacao') 
                          ? activeClauses.filter(k => k !== 'documentacao') 
                          : [...activeClauses, 'documentacao'];
                        setActiveClauses(next);
                      }}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Documentação para Embarque</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setClauseDocumentacao('')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => setClauseDocumentacao(defaults.clauses.documentacao)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar</button>
                  </div>
                </div>
                <AutoResizeTextarea 
                  minRows={4}
                  value={clauseDocumentacao}
                  onChange={(e) => setClauseDocumentacao(e.target.value)}
                  disabled={!activeClauses.includes('documentacao')}
                  placeholder="Texto da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 05. CONFIGURAÇÃO DE CAMPOS DO CLIENTE (MANDATÓRIO!) */}
      <div className="bg-amber-50/40 rounded-3xl p-6 shadow-sm border border-amber-200/50 space-y-6">
        <div className="flex items-center gap-3 border-b border-amber-200/50 pb-3">
          <div className="w-7 h-7 bg-amber-800 text-white rounded-full flex items-center justify-center font-bold text-sm">05</div>
          <h2 className="text-base font-black text-amber-950 uppercase tracking-tight">Campos Obrigatórios / Solicitados ao Cliente</h2>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/60 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black text-amber-950 uppercase">CONTROLE DE VISIBILIDADE DO FORMULÁRIO DO PACOTE</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Marque os campos abaixo que serão **solicitados** para preenchimento do cliente final ao abrir o link do contrato. 
              Campos desmarcados **não serão exibidos** na tela do cliente, agilizando o fechamento e garantindo que você colete apenas as informações necessárias para cada viagem específica.
            </p>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${tripType === 'adulto' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
          
          {/* COLUNA ALUNO / PASSAGEIRO */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
            <span className="block text-xs font-black text-natural-brand border-b pb-1 font-display">
              {tripType === 'adulto' ? 'DADOS DO PASSAGEIRO (ADULTO)' : 'DADOS DO ALUNO'}
            </span>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.studentCpf}
                  onChange={() => handleFieldToggle('studentCpf')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                {tripType === 'adulto' ? 'Solicitar CPF do Passageiro' : 'Solicitar CPF do Aluno'}
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.studentRg}
                  onChange={() => handleFieldToggle('studentRg')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                {tripType === 'adulto' ? 'Solicitar RG do Passageiro' : 'Solicitar RG do Aluno'}
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.studentBirthDate}
                  onChange={() => handleFieldToggle('studentBirthDate')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                Solicitar Data de Nascimento
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.studentGender}
                  onChange={() => handleFieldToggle('studentGender')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                Solicitar Sexo/Gênero
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.studentClass}
                  onChange={() => handleFieldToggle('studentClass')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                {tripType === 'adulto' ? 'Permitir Escolha de Turma / Setor' : 'Permitir Escolha de Turma'}
              </label>
            </div>
          </div>

          {/* COLUNA MEDICAL */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
            <span className="block text-xs font-black text-natural-brand border-b pb-1 font-display">FICHA MÉDICA</span>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.medicalPreExisting}
                  onChange={() => handleFieldToggle('medicalPreExisting')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                Questionar Doença Pré-existente
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.medicalAllergies}
                  onChange={() => handleFieldToggle('medicalAllergies')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                Questionar Alergias
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.medicalDietary}
                  onChange={() => handleFieldToggle('medicalDietary')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                Questionar Restrição Alimentar
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.medicalPcd}
                  onChange={() => handleFieldToggle('medicalPcd')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                Questionar se é PCD
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={requiredFields.medicalBehavioral}
                  onChange={() => handleFieldToggle('medicalBehavioral')}
                  className="rounded text-natural-brand focus:ring-natural-brand"
                />
                {tripType === 'adulto' ? 'Observações Gerais / Restrições' : 'Campo de Informações Comportamentais'}
              </label>
            </div>
          </div>

          {/* COLUNA RESPONSÁVEIS */}
          {tripType !== 'adulto' && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
              <span className="block text-xs font-black text-natural-brand border-b pb-1 font-display">DADOS DOS RESPONSÁVEIS</span>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={requiredFields.parentCpf}
                    onChange={() => handleFieldToggle('parentCpf')}
                    className="rounded text-natural-brand focus:ring-natural-brand"
                  />
                  CPF do Responsável Obrigatório
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={requiredFields.parentRg}
                    onChange={() => handleFieldToggle('parentRg')}
                    className="rounded text-natural-brand focus:ring-natural-brand"
                  />
                  RG do Responsável Obrigatório
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={requiredFields.parentPhone}
                    onChange={() => handleFieldToggle('parentPhone')}
                    className="rounded text-natural-brand focus:ring-natural-brand"
                  />
                  Telefone/WhatsApp Obrigatório
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={requiredFields.parentEmail}
                    onChange={() => handleFieldToggle('parentEmail')}
                    className="rounded text-natural-brand focus:ring-natural-brand"
                  />
                  Email Obrigatório
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={requiredFields.parentAddress}
                    onChange={() => handleFieldToggle('parentAddress')}
                    className="rounded text-natural-brand focus:ring-natural-brand"
                  />
                  Endereço Completo Obrigatório
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer font-bold text-amber-900">
                  <input 
                    type="checkbox" 
                    checked={requiredFields.payerDifferent}
                    onChange={() => handleFieldToggle('payerDifferent')}
                    className="rounded text-amber-800 focus:ring-amber-700"
                  />
                  Permitir "Dados do Pagador (se diferente)"
                </label>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* SEÇÃO ADICIONAL: CONFIGURAÇÕES DE EXIBIÇÃO DO CONTRATO */}
      <div className="bg-natural-bg-light rounded-3xl p-6 border border-natural-border-light/65 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <Eye className="w-5 h-5 text-natural-brand" />
          <div>
            <h3 className="text-sm font-black text-natural-dark uppercase font-display">Configurações de Exibição do Contrato</h3>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Configure o que aparece na visualização do cliente</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showPaymentAlert1}
              onChange={(e) => setShowPaymentAlert1(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-natural-brand focus:ring-natural-brand"
            />
            <div>
              <span className="block text-xs font-bold text-gray-700">1. Exibir Aviso de Confirmação de Vaga (Card de Compromisso)</span>
              <span className="block text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Exibe o aviso: "O compromisso com a vaga se confirma com o pagamento da primeira parcela até o vencimento. Após esse prazo, a vaga fica sujeita à disponibilidade..."
              </span>
            </div>
          </label>

          <div className="border-t border-gray-100 my-2"></div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showPaymentAlert2}
              onChange={(e) => setShowPaymentAlert2(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-natural-brand focus:ring-natural-brand"
            />
            <div>
              <span className="block text-xs font-bold text-gray-700">2. Exibir Aviso de Pagamento À Vista</span>
              <span className="block text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Exibe o aviso: "Caso opte por pagamento A VISTA (valor integral) o mesmo deve ser efetuado na data de vencimento da primeira parcela."
              </span>
            </div>
          </label>

          <div className="border-t border-gray-100 my-2"></div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showPaymentAlert3}
              onChange={(e) => setShowPaymentAlert3(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-natural-brand focus:ring-natural-brand"
            />
            <div>
              <span className="block text-xs font-bold text-gray-700">3. Exibir Aviso de Próximas Parcelas</span>
              <span className="block text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Exibe o aviso: "As demais parcelas deverão ser quitadas até a data do passeio."
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* FLOATING ACTION BOTTOM BAR */}
      <div className="bg-natural-text text-white p-5 rounded-3xl flex items-center justify-between shadow-xl">
        <div className="text-xs">
          <p className="font-bold uppercase text-amber-200/80 font-display">Resumo de Configuração</p>
          <p className="text-white mt-0.5 font-bold">
            {allowedClasses.length} Turmas • R$ {price} • {active ? 'Link Ativo' : 'Link Desativado'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full hover:bg-white/10 transition text-sm font-bold border border-white/20"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-7 py-2.5 rounded-full bg-natural-brand hover:bg-natural-brand-hover text-white font-black text-sm uppercase transition flex items-center gap-1 shadow-lg shadow-natural-brand/20"
          >
            <Check className="w-4 h-4" /> Gravar e Publicar
          </button>
        </div>
      </div>

    </form>
  );
}
