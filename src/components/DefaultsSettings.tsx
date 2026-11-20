import React, { useState, useEffect, useRef } from 'react';
import { TripDefaults, SYSTEM_DEFAULT_TRIP_DEFAULTS, DEFAULT_CLAUSES, DEFAULT_INCLUDED_ITEMS } from '../types';
import { Save, RotateCcw, CheckCircle, FileText, Eye, ShieldAlert } from 'lucide-react';

interface DefaultsSettingsProps {
  tripDefaults: TripDefaults;
  onSaveDefaults: (defaults: TripDefaults) => Promise<void> | void;
}

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

export default function DefaultsSettings({ tripDefaults, onSaveDefaults }: DefaultsSettingsProps) {
  const [includedItems, setIncludedItems] = useState<string>(tripDefaults.includedItems);
  const [foodText, setFoodText] = useState<string>(tripDefaults.foodText);
  const [activitiesText, setActivitiesText] = useState<string>(tripDefaults.activitiesText);

  const [clauses, setClauses] = useState({ ...tripDefaults.clauses });
  const [activeClauses, setActiveClauses] = useState<string[]>([...tripDefaults.activeClauses]);

  const [showPaymentAlert1, setShowPaymentAlert1] = useState<boolean>(tripDefaults.showPaymentAlert1);
  const [showPaymentAlert2, setShowPaymentAlert2] = useState<boolean>(tripDefaults.showPaymentAlert2);
  const [showPaymentAlert3, setShowPaymentAlert3] = useState<boolean>(tripDefaults.showPaymentAlert3);

  const [requiredFields, setRequiredFields] = useState({ ...tripDefaults.requiredFields });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedTarget, setSavedTarget] = useState<string | null>(null);

  useEffect(() => {
    setIncludedItems(tripDefaults.includedItems);
    setFoodText(tripDefaults.foodText);
    setActivitiesText(tripDefaults.activitiesText);
    setClauses({ ...tripDefaults.clauses });
    setActiveClauses([...tripDefaults.activeClauses]);
    setShowPaymentAlert1(tripDefaults.showPaymentAlert1);
    setShowPaymentAlert2(tripDefaults.showPaymentAlert2);
    setShowPaymentAlert3(tripDefaults.showPaymentAlert3);
    setRequiredFields({ ...tripDefaults.requiredFields });
  }, [tripDefaults]);

  const toggleActiveClause = (key: string) => {
    setActiveClauses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const updateClauseText = (key: keyof TripDefaults['clauses'], value: string) => {
    setClauses((prev) => ({ ...prev, [key]: value }));
  };

  const handleFieldToggle = (field: keyof TripDefaults['requiredFields']) => {
    setRequiredFields((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const saveAllDefaults = async (targetId?: string) => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveDefaults({
        includedItems,
        foodText,
        activitiesText,
        clauses,
        activeClauses,
        showPaymentAlert1,
        showPaymentAlert2,
        showPaymentAlert3,
        requiredFields
      });
      setSavedSuccess(true);
      if (targetId) {
        setSavedTarget(targetId);
        setTimeout(() => setSavedTarget((curr) => (curr === targetId ? null : curr)), 3000);
      }
      setTimeout(() => setSavedSuccess(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await saveAllDefaults('top');
  };

  const renderBoxSaveButton = (targetId: string, compact = false) => {
    const isJustSaved = savedTarget === targetId;
    return (
      <button
        type="button"
        onClick={() => saveAllDefaults(targetId)}
        disabled={isSaving}
        className={`${
          compact ? 'px-3 py-1 text-[10px]' : 'px-4 py-2 text-xs'
        } font-black uppercase rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-60 ${
          isJustSaved
            ? 'bg-emerald-600 text-white'
            : 'bg-natural-brand hover:bg-natural-brand-hover text-white'
        }`}
      >
        {isJustSaved ? (
          <>
            <CheckCircle className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} /> Salvo!
          </>
        ) : (
          <>
            <Save className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} /> Salvar
          </>
        )}
      </button>
    );
  };

  const handleRestoreAllOriginal = () => {
    setIncludedItems(SYSTEM_DEFAULT_TRIP_DEFAULTS.includedItems);
    setFoodText(SYSTEM_DEFAULT_TRIP_DEFAULTS.foodText);
    setActivitiesText(SYSTEM_DEFAULT_TRIP_DEFAULTS.activitiesText);
    setClauses({ ...SYSTEM_DEFAULT_TRIP_DEFAULTS.clauses });
    setActiveClauses([...SYSTEM_DEFAULT_TRIP_DEFAULTS.activeClauses]);
    setShowPaymentAlert1(SYSTEM_DEFAULT_TRIP_DEFAULTS.showPaymentAlert1);
    setShowPaymentAlert2(SYSTEM_DEFAULT_TRIP_DEFAULTS.showPaymentAlert2);
    setShowPaymentAlert3(SYSTEM_DEFAULT_TRIP_DEFAULTS.showPaymentAlert3);
    setRequiredFields({ ...SYSTEM_DEFAULT_TRIP_DEFAULTS.requiredFields });
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-fadeIn">
      {/* HEADER BAR */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-natural-bg rounded-2xl text-natural-brand shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-natural-text uppercase tracking-tight font-display">
              Padrões de Novos Contratos e Viagens
            </h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Tudo o que você configurar e salvar aqui será usado automaticamente como padrão sempre que você criar uma <strong>nova viagem/contrato</strong>. Viagens já criadas anteriormente não são alteradas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRestoreAllOriginal}
            className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold rounded-2xl text-xs uppercase transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar Originais
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-natural-brand hover:bg-natural-brand-hover disabled:opacity-60 text-white font-black rounded-2xl text-xs uppercase transition flex items-center gap-1.5 shadow-md shadow-natural-brand/15"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Padrões'}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Padrões salvos com sucesso! Todas as novas viagens criadas a partir de agora já virão preenchidas com estes textos e configurações.</span>
        </div>
      )}

      {/* 01. ROTEIRO E ATIVIDADES PADRÃO */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border space-y-6">
        <div className="flex items-center justify-between gap-3 border-b border-gray-50 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-natural-brand text-white rounded-full flex items-center justify-center font-bold text-sm">01</div>
            <h3 className="text-base font-black text-natural-text uppercase tracking-tight font-display">Roteiro e Atividades Padrão</h3>
          </div>
          {renderBoxSaveButton('box-01')}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Itens Inclusos no Contrato (Padrão)</label>
              <button
                type="button"
                onClick={() => setIncludedItems(DEFAULT_INCLUDED_ITEMS)}
                className="text-natural-brand text-[10px] font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Restaurar Original
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
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alimentação Padrão (Opcional)</label>
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
                placeholder="Deixe vazio se não quiser um texto padrão de alimentação..."
                value={foodText}
                onChange={(e) => setFoodText(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs text-gray-700 leading-relaxed focus:outline-natural-brand"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Atividades Principais Padrão (Opcional)</label>
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
                placeholder="Deixe vazio se não quiser um texto padrão de atividades..."
                value={activitiesText}
                onChange={(e) => setActivitiesText(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs text-gray-700 leading-relaxed focus:outline-natural-brand"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 02. CLÁUSULAS CONTRATUAIS PADRÃO */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border space-y-6">
        <div className="flex items-center justify-between gap-3 border-b border-gray-50 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-natural-brand text-white rounded-full flex items-center justify-center font-bold text-sm">02</div>
            <h3 className="text-base font-black text-natural-text uppercase tracking-tight font-display">Cláusulas Contratuais Padrão</h3>
          </div>
          {renderBoxSaveButton('box-02')}
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/40 text-xs text-amber-950 font-semibold leading-relaxed">
          Edite os textos padrão de todas as cláusulas abaixo. As caixas de seleção marcadas também definem quais cláusulas já virão ativadas por padrão ao abrir uma nova viagem.
        </div>

        <div className="space-y-8">
          {/* CLAUSE 1: PAGAMENTO & VAGAS */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">1. Cláusula de Pagamento & Vagas</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('paymentPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('paymentPedagogico')}
                      onChange={() => toggleActiveClause('paymentPedagogico')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Pagamento & Vagas -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('paymentPedagogico', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('paymentPedagogico', DEFAULT_CLAUSES.paymentPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={4}
                  value={clauses.paymentPedagogico}
                  onChange={(e) => updateClauseText('paymentPedagogico', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-paymentPedagogico', true)}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('payment') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('payment')}
                      onChange={() => toggleActiveClause('payment')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Pagamento & Vagas</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('payment', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('payment', DEFAULT_CLAUSES.payment)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={4}
                  value={clauses.payment}
                  onChange={(e) => updateClauseText('payment', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-payment', true)}
                </div>
              </div>
            </div>
          </div>

          {/* CLAUSE 2: CANCELAMENTO */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">2. Cláusula de Cancelamento</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('cancelationPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('cancelationPedagogico')}
                      onChange={() => toggleActiveClause('cancelationPedagogico')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Cancelamento -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('cancelationPedagogico', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('cancelationPedagogico', DEFAULT_CLAUSES.cancelationPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={5}
                  value={clauses.cancelationPedagogico}
                  onChange={(e) => updateClauseText('cancelationPedagogico', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-cancelationPedagogico', true)}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('cancelation') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('cancelation')}
                      onChange={() => toggleActiveClause('cancelation')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Cancelamento</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('cancelation', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('cancelation', DEFAULT_CLAUSES.cancelation)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={5}
                  value={clauses.cancelation}
                  onChange={(e) => updateClauseText('cancelation', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-cancelation', true)}
                </div>
              </div>
            </div>
          </div>

          {/* CLAUSE 3: POLITICA PCD */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">3. Cláusula de Regulamento PCD</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('pcdPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('pcdPedagogico')}
                      onChange={() => toggleActiveClause('pcdPedagogico')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Regulamento PCD -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('pcdPedagogico', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('pcdPedagogico', DEFAULT_CLAUSES.pcdPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={4}
                  value={clauses.pcdPedagogico}
                  onChange={(e) => updateClauseText('pcdPedagogico', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-pcdPedagogico', true)}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('pcd') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('pcd')}
                      onChange={() => toggleActiveClause('pcd')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Regulamento PCD</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('pcd', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('pcd', DEFAULT_CLAUSES.pcd)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={4}
                  value={clauses.pcd}
                  onChange={(e) => updateClauseText('pcd', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-pcd', true)}
                </div>
              </div>
            </div>
          </div>

          {/* CLAUSE 4: REGRAS GERAIS */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">4. Cláusula de Regras Gerais</span>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('regrasPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('regrasPedagogico')}
                      onChange={() => toggleActiveClause('regrasPedagogico')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Regras Gerais -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('regrasPedagogico', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('regrasPedagogico', DEFAULT_CLAUSES.regrasPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={5}
                  value={clauses.regrasPedagogico}
                  onChange={(e) => updateClauseText('regrasPedagogico', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-regrasPedagogico', true)}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('regras') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('regras')}
                      onChange={() => toggleActiveClause('regras')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Regras Gerais (Em Branco)</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('regras', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('regras', DEFAULT_CLAUSES.regras)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={5}
                  value={clauses.regras}
                  onChange={(e) => updateClauseText('regras', e.target.value)}
                  placeholder="Texto em branco..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-regras', true)}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('regrasTv') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('regrasTv')}
                      onChange={() => toggleActiveClause('regrasTv')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Programas de TV</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('regrasTv', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('regrasTv', DEFAULT_CLAUSES.regrasTv)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={5}
                  value={clauses.regrasTv}
                  onChange={(e) => updateClauseText('regrasTv', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-regrasTv', true)}
                </div>
              </div>
            </div>
          </div>

          {/* CLAUSE 5: DOCUMENTACAO */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display border-b pb-1">5. Cláusula de Documentação</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('documentacaoPedagogico') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('documentacaoPedagogico')}
                      onChange={() => toggleActiveClause('documentacaoPedagogico')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Documentação -pedagogico</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('documentacaoPedagogico', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('documentacaoPedagogico', DEFAULT_CLAUSES.documentacaoPedagogico)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={4}
                  value={clauses.documentacaoPedagogico}
                  onChange={(e) => updateClauseText('documentacaoPedagogico', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-documentacaoPedagogico', true)}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${activeClauses.includes('documentacao') ? 'bg-white border-natural-brand/35 shadow-sm' : 'bg-gray-50/70 border-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeClauses.includes('documentacao')}
                      onChange={() => toggleActiveClause('documentacao')}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase">Documentação para Embarque</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateClauseText('documentacao', '')} className="text-red-500 text-[9px] font-bold hover:underline">Limpar</button>
                    <button type="button" onClick={() => updateClauseText('documentacao', DEFAULT_CLAUSES.documentacao)} className="text-natural-brand text-[9px] font-bold hover:underline">Restaurar Original</button>
                  </div>
                </div>
                <AutoResizeTextarea
                  minRows={4}
                  value={clauses.documentacao}
                  onChange={(e) => updateClauseText('documentacao', e.target.value)}
                  placeholder="Texto padrão da cláusula..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed focus:outline-natural-brand font-sans"
                />
                <div className="flex justify-end mt-2">
                  {renderBoxSaveButton('clause-documentacao', true)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 03. CAMPOS OBRIGATÓRIOS PADRÃO */}
      <div className="bg-amber-50/40 rounded-3xl p-6 shadow-sm border border-amber-200/50 space-y-6">
        <div className="flex items-center justify-between gap-3 border-b border-amber-200/50 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-amber-800 text-white rounded-full flex items-center justify-center font-bold text-sm">03</div>
            <h3 className="text-base font-black text-amber-950 uppercase tracking-tight">Campos Solicitados ao Cliente (Padrão)</h3>
          </div>
          {renderBoxSaveButton('box-03')}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/60 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Defina quais campos já começam marcados como solicitados quando você cria uma nova viagem. Você ainda poderá ajustar individualmente em cada viagem se precisar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
            <span className="block text-xs font-black text-natural-brand border-b pb-1 font-display">DADOS DO ALUNO / PASSAGEIRO</span>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.studentCpf} onChange={() => handleFieldToggle('studentCpf')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Solicitar CPF do Aluno
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.studentRg} onChange={() => handleFieldToggle('studentRg')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Solicitar RG do Aluno
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.studentBirthDate} onChange={() => handleFieldToggle('studentBirthDate')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Solicitar Data de Nascimento
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.studentGender} onChange={() => handleFieldToggle('studentGender')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Solicitar Sexo/Gênero
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.studentClass} onChange={() => handleFieldToggle('studentClass')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Permitir Escolha de Turma
            </label>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
            <span className="block text-xs font-black text-natural-brand border-b pb-1 font-display">FICHA MÉDICA</span>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.medicalPreExisting} onChange={() => handleFieldToggle('medicalPreExisting')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Questionar Doença Pré-existente
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.medicalAllergies} onChange={() => handleFieldToggle('medicalAllergies')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Questionar Alergias
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.medicalDietary} onChange={() => handleFieldToggle('medicalDietary')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Questionar Restrição Alimentar
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.medicalPcd} onChange={() => handleFieldToggle('medicalPcd')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Questionar se é PCD
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.medicalBehavioral} onChange={() => handleFieldToggle('medicalBehavioral')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Campo de Informações Comportamentais
            </label>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
            <span className="block text-xs font-black text-natural-brand border-b pb-1 font-display">DADOS DOS RESPONSÁVEIS</span>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.parentCpf} onChange={() => handleFieldToggle('parentCpf')} className="rounded text-natural-brand focus:ring-natural-brand" />
              CPF do Responsável Obrigatório
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.parentRg} onChange={() => handleFieldToggle('parentRg')} className="rounded text-natural-brand focus:ring-natural-brand" />
              RG do Responsável Obrigatório
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.parentPhone} onChange={() => handleFieldToggle('parentPhone')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Telefone/WhatsApp Obrigatório
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.parentEmail} onChange={() => handleFieldToggle('parentEmail')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Email Obrigatório
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={requiredFields.parentAddress} onChange={() => handleFieldToggle('parentAddress')} className="rounded text-natural-brand focus:ring-natural-brand" />
              Endereço Completo Obrigatório
            </label>
            <label className="flex items-center gap-2 text-xs text-amber-900 cursor-pointer font-bold">
              <input type="checkbox" checked={requiredFields.payerDifferent} onChange={() => handleFieldToggle('payerDifferent')} className="rounded text-amber-800 focus:ring-amber-700" />
              Permitir "Dados do Pagador (se diferente)"
            </label>
          </div>
        </div>
      </div>

      {/* 04. CONFIGURAÇÕES DE EXIBIÇÃO PADRÃO */}
      <div className="bg-white rounded-3xl p-6 border border-natural-border space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-natural-brand" />
            <div>
              <h3 className="text-sm font-black text-natural-dark uppercase font-display">04. Configurações de Exibição do Contrato (Padrão)</h3>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Avisos de pagamento exibidos por padrão em novas viagens</p>
            </div>
          </div>
          {renderBoxSaveButton('box-04')}
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={showPaymentAlert1} onChange={(e) => setShowPaymentAlert1(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-natural-brand focus:ring-natural-brand" />
            <div>
              <span className="block text-xs font-bold text-gray-700">1. Exibir Aviso de Confirmação de Vaga (Card de Compromisso)</span>
              <span className="block text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                "O compromisso com a vaga se confirma com o pagamento da primeira parcela até o vencimento. Após esse prazo, a vaga fica sujeita à disponibilidade..."
              </span>
            </div>
          </label>
          <div className="border-t border-gray-100"></div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={showPaymentAlert2} onChange={(e) => setShowPaymentAlert2(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-natural-brand focus:ring-natural-brand" />
            <div>
              <span className="block text-xs font-bold text-gray-700">2. Exibir Aviso de Pagamento À Vista</span>
              <span className="block text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                "Caso opte por pagamento A VISTA (valor integral) o mesmo deve ser efetuado na data de vencimento da primeira parcela."
              </span>
            </div>
          </label>
          <div className="border-t border-gray-100"></div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={showPaymentAlert3} onChange={(e) => setShowPaymentAlert3(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-natural-brand focus:ring-natural-brand" />
            <div>
              <span className="block text-xs font-bold text-gray-700">3. Exibir Aviso de Próximas Parcelas</span>
              <span className="block text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                "As demais parcelas deverão ser quitadas até a data do passeio."
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* BOTTOM SAVE BAR */}
      <div className="bg-natural-text text-white p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="text-xs">
          <p className="font-bold uppercase text-amber-200/80 font-display">Padrões Globais do Sistema</p>
          <p className="text-white mt-0.5 font-semibold">
            Clique em salvar para aplicar estes padrões em todas as novas viagens criadas no sistema.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="px-7 py-3 rounded-full bg-natural-brand hover:bg-natural-brand-hover disabled:opacity-60 text-white font-black text-sm uppercase transition flex items-center gap-1.5 shadow-lg shadow-natural-brand/20 shrink-0"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Padrões'}
        </button>
      </div>
    </form>
  );
}
