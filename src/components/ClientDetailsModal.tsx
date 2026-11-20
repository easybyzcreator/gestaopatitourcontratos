import React, { useState } from 'react';
import { Registration, Trip, getActiveClausesList } from '../types';
import { X, Copy, Check, MessageSquare, Plus, FileText, Trash2, Edit2, Printer, Download } from 'lucide-react';

interface ClientDetailsModalProps {
  registration: Registration;
  trip: Trip;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdateRegistration: (updated: Registration) => void;
}

export default function ClientDetailsModal({
  registration,
  trip,
  onClose,
  onDelete,
  onUpdateRegistration
}: ClientDetailsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isViewingContract, setIsViewingContract] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Local edit states - Student
  const [editName, setEditName] = useState(registration.student.name);
  const [editStudentCpf, setEditStudentCpf] = useState(registration.student.cpf || '');
  const [editStudentRg, setEditStudentRg] = useState(registration.student.rg || '');
  const [editBirthDate, setEditBirthDate] = useState(registration.student.birthDate || '');
  const [editGender, setEditGender] = useState<'MASCULINO' | 'FEMININO' | ''>(registration.student.gender || '');
  const [editClass, setEditClass] = useState(registration.student.classGroup || '');

  // Local edit states - Parent & Payer
  const [editParentName, setEditParentName] = useState(registration.parent.name);
  const [editParentCpf, setEditParentCpf] = useState(registration.parent.cpf);
  const [editParentRg, setEditParentRg] = useState(registration.parent.rg || '');
  const [editPhone, setEditPhone] = useState(registration.parent.phone);
  const [editEmail, setEditEmail] = useState(registration.parent.email);
  const [editAddress, setEditAddress] = useState(registration.parent.address);
  const [editPayerDifferent, setEditPayerDifferent] = useState(registration.payer?.different || false);
  const [editPayerName, setEditPayerName] = useState(registration.payer?.name || '');
  const [editPayerCpf, setEditPayerCpf] = useState(registration.payer?.cpf || '');

  // Local edit states - Medical
  const [editPreExisting, setEditPreExisting] = useState(registration.medical.preExisting);
  const [editPreExistingDetails, setEditPreExistingDetails] = useState(registration.medical.preExistingDetails || '');
  const [editAllergies, setEditAllergies] = useState(registration.medical.allergies);
  const [editAllergiesDetails, setEditAllergiesDetails] = useState(registration.medical.allergiesDetails || '');
  const [editDietary, setEditDietary] = useState(registration.medical.dietary);
  const [editDietaryDetails, setEditDietaryDetails] = useState(registration.medical.dietaryDetails || '');
  const [editPcd, setEditPcd] = useState(registration.medical.pcd);
  const [editPcdDetails, setEditPcdDetails] = useState(registration.medical.pcdDetails || '');
  const [editBehavioral, setEditBehavioral] = useState(registration.medical.behavioral || '');

  // Local edit states - Payments
  const [editPayments, setEditPayments] = useState(registration.payments);

  const normalizeDateForInput = (raw?: string) => {
    if (!raw) return '';
    if (raw.includes('/')) {
      const parts = raw.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return raw;
  };

  const handleOpenEdit = () => {
    setEditName(registration.student.name);
    setEditStudentCpf(registration.student.cpf || '');
    setEditStudentRg(registration.student.rg || '');
    setEditBirthDate(normalizeDateForInput(registration.student.birthDate));
    setEditGender(registration.student.gender || '');
    setEditClass(registration.student.classGroup || '');

    setEditParentName(registration.parent.name);
    setEditParentCpf(registration.parent.cpf);
    setEditParentRg(registration.parent.rg || '');
    setEditPhone(registration.parent.phone);
    setEditEmail(registration.parent.email);
    setEditAddress(registration.parent.address);
    setEditPayerDifferent(registration.payer?.different || false);
    setEditPayerName(registration.payer?.name || '');
    setEditPayerCpf(registration.payer?.cpf || '');

    setEditPreExisting(registration.medical.preExisting);
    setEditPreExistingDetails(registration.medical.preExistingDetails || '');
    setEditAllergies(registration.medical.allergies);
    setEditAllergiesDetails(registration.medical.allergiesDetails || '');
    setEditDietary(registration.medical.dietary);
    setEditDietaryDetails(registration.medical.dietaryDetails || '');
    setEditPcd(registration.medical.pcd);
    setEditPcdDetails(registration.medical.pcdDetails || '');
    setEditBehavioral(registration.medical.behavioral || '');

    setEditPayments(registration.payments.map(p => ({ ...p })));
    setIsEditing(true);
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printed-contract-doc')?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '', 'height=700,width=900');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Contrato Assinado - Patitour</title>');
      printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
      printWindow.document.write('<style>');
      printWindow.document.write('  body { padding: 40px !important; font-family: system-ui, -apple-system, sans-serif !important; color: #1e293b !important; background: #ffffff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }');
      printWindow.document.write('  div, p, td, th { font-size: 9.5pt !important; line-height: 1.5 !important; }');
      printWindow.document.write('  #printed-contract-doc, #printed-contract-doc-parent { border: none !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; max-width: 100% !important; }');
      printWindow.document.write('  .space-y-5 > * + * { margin-top: 18px !important; }');
      printWindow.document.write('  .space-y-3 > * + * { margin-top: 12px !important; }');
      printWindow.document.write('  .space-y-1\\.5 > * + * { margin-top: 6px !important; }');
      printWindow.document.write('  h1 { font-size: 15pt !important; font-weight: 900 !important; color: #072d17 !important; margin-bottom: 4px !important; }');
      printWindow.document.write('  h2 { font-size: 11pt !important; font-weight: bold !important; color: #072d17 !important; border-bottom: 2px solid #072d17 !important; padding-bottom: 3px !important; margin-top: 20px !important; margin-bottom: 10px !important; page-break-after: avoid !important; break-after: avoid !important; }');
      printWindow.document.write('  table { width: 100% !important; border-collapse: collapse !important; margin: 12px 0 !important; page-break-inside: avoid !important; break-inside: avoid !important; }');
      printWindow.document.write('  th, td { border: 1px solid #e2e8f0 !important; padding: 6px 10px !important; text-align: left !important; font-size: 9pt !important; }');
      printWindow.document.write('  th { background-color: #f8fafc !important; color: #0f172a !important; font-weight: bold !important; }');
      printWindow.document.write('  .grid-cols-2 { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 30px !important; margin-top: 25px !important; page-break-inside: avoid !important; break-inside: avoid !important; }');
      printWindow.document.write('  .grid-cols-2 > div { page-break-inside: avoid !important; break-inside: avoid !important; }');
      printWindow.document.write('  .clause-block { page-break-inside: avoid !important; break-inside: avoid !important; margin-top: 10px !important; }');
      printWindow.document.write('  .whitespace-pre-line { font-size: 8.5pt !important; line-height: 1.45 !important; margin-left: 10px !important; border-left: 2px solid #072d17 !important; padding-left: 10px !important; color: #475569 !important; }');
      printWindow.document.write('  @media print { body { padding: 0 !important; margin: 1.2cm !important; } }');
      printWindow.document.write('</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(printContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    // Find first pending or delayed installment to pay
    let remainingAmount = amount;
    const updatedPayments = registration.payments.map(pay => {
      if (remainingAmount > 0 && pay.status !== 'PAGO') {
        if (remainingAmount >= pay.amount) {
          remainingAmount -= pay.amount;
          return { ...pay, status: 'PAGO' as const, paymentDate: new Date().toISOString().split('T')[0] };
        } else {
          // Partial payment
          remainingAmount = 0;
          return { ...pay, status: 'PAGO' as const, paymentDate: new Date().toISOString().split('T')[0] };
        }
      }
      return pay;
    });

    // Recalculate global status
    const allPaid = updatedPayments.every(p => p.status === 'PAGO');
    const hasOverdue = updatedPayments.some(p => p.status === 'ATRASADO');
    const newStatus = allPaid ? 'PAGO' : hasOverdue ? 'ATRASADO' : 'PENDENTE';

    onUpdateRegistration({
      ...registration,
      status: newStatus,
      payments: updatedPayments
    });

    setPaymentAmount('');
  };

  const handleSaveChanges = () => {
    const normalizedPayments = editPayments.map(p => ({
      ...p,
      amount: isNaN(Number(p.amount)) ? 0 : Number(p.amount),
      paidAmount:
        p.status === 'PAGO' && typeof p.paidAmount === 'number' && !isNaN(Number(p.paidAmount))
          ? Number(p.paidAmount)
          : undefined,
      paymentDate:
        p.status === 'PAGO'
          ? p.paymentDate || new Date().toISOString().split('T')[0]
          : undefined
    }));

    const allPaid = normalizedPayments.length > 0 && normalizedPayments.every(p => p.status === 'PAGO');
    const hasOverdue = normalizedPayments.some(p => p.status === 'ATRASADO');
    const newStatus = allPaid ? 'PAGO' : hasOverdue ? 'ATRASADO' : 'PENDENTE';

    onUpdateRegistration({
      ...registration,
      status: newStatus,
      student: {
        ...registration.student,
        name: editName.trim(),
        cpf: editStudentCpf.trim() || undefined,
        rg: editStudentRg.trim() || undefined,
        birthDate: editBirthDate || undefined,
        gender: editGender ? (editGender as 'MASCULINO' | 'FEMININO') : undefined,
        classGroup: editClass.trim() || undefined
      },
      parent: {
        ...registration.parent,
        name: editParentName.trim(),
        cpf: editParentCpf.trim(),
        rg: editParentRg.trim() || undefined,
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim()
      },
      payer: {
        different: editPayerDifferent,
        name: editPayerDifferent ? editPayerName.trim() : undefined,
        cpf: editPayerDifferent ? editPayerCpf.trim() : undefined
      },
      medical: {
        preExisting: editPreExisting,
        preExistingDetails: editPreExisting ? editPreExistingDetails.trim() : '',
        allergies: editAllergies,
        allergiesDetails: editAllergies ? editAllergiesDetails.trim() : '',
        dietary: editDietary,
        dietaryDetails: editDietary ? editDietaryDetails.trim() : '',
        pcd: editPcd,
        pcdDetails: editPcd ? editPcdDetails.trim() : '',
        behavioral: editBehavioral.trim()
      },
      payments: normalizedPayments
    });
    setIsEditing(false);
  };

  // Finance summaries
  const getPaidValue = (p: Registration['payments'][number]) =>
    typeof p.paidAmount === 'number' && !isNaN(p.paidAmount) ? p.paidAmount : p.amount;
  const totalValue = registration.payments.reduce((acc, p) => acc + p.amount, 0);
  const totalPaid = registration.payments.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + getPaidValue(p), 0);
  const totalRemaining = registration.payments.filter(p => p.status !== 'PAGO').reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#FAF9F6] rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-natural-border">
        
        {/* MODAL HEADER */}
        <div className="bg-natural-dark px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl border border-white/10">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight uppercase font-display">Ficha de Gestão do Aluno</h2>
              <p className="text-xs text-natural-border">{trip.title} • {trip.school}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onDelete(registration.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/90 hover:bg-red-700 transition rounded-xl text-xs font-semibold uppercase"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir Aluno
            </button>
            
            {isEditing ? (
              <button 
                onClick={handleSaveChanges}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-natural-brand hover:bg-natural-brand-hover transition rounded-xl text-xs font-semibold uppercase"
              >
                Salvar
              </button>
            ) : (
              <button 
                onClick={handleOpenEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-natural-dark hover:bg-natural-dark-light transition rounded-xl text-xs font-semibold uppercase border border-white/10"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar Ficha
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 transition rounded-xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {isEditing ? (
            <div className="bg-white p-6 rounded-2xl border border-natural-border space-y-6">
              <h3 className="font-bold text-natural-text border-b pb-2 font-display">Editando Informações do Contrato</h3>
              
              {/* SEÇÃO 1: ALUNO */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-natural-brand uppercase tracking-wider font-display">01. Dados do Aluno / Passageiro</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nome Completo do Aluno</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-natural-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Turma do Aluno</label>
                    <input 
                      type="text" 
                      value={editClass}
                      onChange={(e) => setEditClass(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-natural-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">CPF do Aluno</label>
                    <input 
                      type="text" 
                      value={editStudentCpf}
                      onChange={(e) => setEditStudentCpf(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-natural-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">RG do Aluno</label>
                    <input 
                      type="text" 
                      value={editStudentRg}
                      onChange={(e) => setEditStudentRg(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-natural-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Data de Nascimento</label>
                    <input 
                      type="date" 
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-natural-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sexo / Gênero</label>
                    <select 
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value as 'MASCULINO' | 'FEMININO' | '')}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-natural-brand"
                    >
                      <option value="">Não informado</option>
                      <option value="MASCULINO">MASCULINO</option>
                      <option value="FEMININO">FEMININO</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: RESPONSÁVEIS E PAGADOR */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black text-natural-brand uppercase tracking-wider font-display">02. Responsáveis e Pagador</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Responsável Legal</label>
                    <input 
                      type="text" 
                      value={editParentName}
                      onChange={(e) => setEditParentName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-natural-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">CPF do Responsável</label>
                    <input 
                      type="text" 
                      value={editParentCpf}
                      onChange={(e) => setEditParentCpf(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-natural-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">RG do Responsável</label>
                    <input 
                      type="text" 
                      value={editParentRg}
                      onChange={(e) => setEditParentRg(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-natural-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Telefone (WhatsApp)</label>
                    <input 
                      type="text" 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-natural-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
                    <input 
                      type="email" 
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-natural-brand"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Endereço Completo</label>
                    <input 
                      type="text" 
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-natural-brand"
                    />
                  </div>
                </div>

                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={editPayerDifferent}
                      onChange={(e) => setEditPayerDifferent(e.target.checked)}
                      className="rounded text-natural-brand focus:ring-natural-brand"
                    />
                    Pagador diferente do responsável legal
                  </label>
                  {editPayerDifferent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Pagador</label>
                        <input 
                          type="text" 
                          value={editPayerName}
                          onChange={(e) => setEditPayerName(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-natural-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">CPF do Pagador</label>
                        <input 
                          type="text" 
                          value={editPayerCpf}
                          onChange={(e) => setEditPayerCpf(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-natural-brand"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SEÇÃO 3: FICHA MÉDICA */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black text-natural-brand uppercase tracking-wider font-display">03. Ficha Médica</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Doença Pré-existente</span>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={editPreExisting} onChange={() => setEditPreExisting(true)} /> Sim
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={!editPreExisting} onChange={() => setEditPreExisting(false)} /> Não
                        </label>
                      </div>
                    </div>
                    {editPreExisting && (
                      <input 
                        type="text"
                        placeholder="Descreva a doença pré-existente..."
                        value={editPreExistingDetails}
                        onChange={(e) => setEditPreExistingDetails(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-natural-brand"
                      />
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Alergias</span>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={editAllergies} onChange={() => setEditAllergies(true)} /> Sim
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={!editAllergies} onChange={() => setEditAllergies(false)} /> Não
                        </label>
                      </div>
                    </div>
                    {editAllergies && (
                      <input 
                        type="text"
                        placeholder="Descreva as alergias..."
                        value={editAllergiesDetails}
                        onChange={(e) => setEditAllergiesDetails(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-natural-brand"
                      />
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Restrição Alimentar</span>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={editDietary} onChange={() => setEditDietary(true)} /> Sim
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={!editDietary} onChange={() => setEditDietary(false)} /> Não
                        </label>
                      </div>
                    </div>
                    {editDietary && (
                      <input 
                        type="text"
                        placeholder="Descreva a restrição alimentar..."
                        value={editDietaryDetails}
                        onChange={(e) => setEditDietaryDetails(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-natural-brand"
                      />
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">PCD (Deficiência)</span>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={editPcd} onChange={() => setEditPcd(true)} /> Sim
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={!editPcd} onChange={() => setEditPcd(false)} /> Não
                        </label>
                      </div>
                    </div>
                    {editPcd && (
                      <input 
                        type="text"
                        placeholder="Descreva detalhes PCD..."
                        value={editPcdDetails}
                        onChange={(e) => setEditPcdDetails(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-natural-brand"
                      />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Observações Comportamentais / Ficha Médica</label>
                    <textarea 
                      value={editBehavioral}
                      onChange={(e) => setEditBehavioral(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-natural-brand h-20"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4: CONTROLE FINANCEIRO (PARCELAS) */}
              {editPayments.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-black text-natural-brand uppercase tracking-wider font-display">04. Controle Financeiro (Parcelas)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {editPayments.map((pay, idx) => (
                      <div key={pay.id || idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 space-y-2">
                        <span className="block text-[10px] font-black text-natural-brand uppercase">{idx + 1}ª Parcela</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Valor (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pay.amount}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setEditPayments(prev =>
                                  prev.map((item, i) => (i === idx ? { ...item, amount: isNaN(val) ? 0 : val } : item))
                                );
                              }}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-natural-brand"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Vencimento</label>
                            <input
                              type="date"
                              value={normalizeDateForInput(pay.dueDate)}
                              onChange={(e) => {
                                setEditPayments(prev =>
                                  prev.map((item, i) => (i === idx ? { ...item, dueDate: e.target.value } : item))
                                );
                              }}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-natural-brand"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Status</label>
                            <select
                              value={pay.status}
                              onChange={(e) => {
                                const nextStatus = e.target.value as 'PENDENTE' | 'PAGO' | 'ATRASADO';
                                setEditPayments(prev =>
                                  prev.map((item, i) => (i === idx ? { ...item, status: nextStatus } : item))
                                );
                              }}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-natural-brand"
                            >
                              <option value="PENDENTE">PENDENTE</option>
                              <option value="PAGO">PAGO</option>
                              <option value="ATRASADO">ATRASADO</option>
                            </select>
                          </div>
                          {pay.status === 'PAGO' && (
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Valor Pago (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={typeof pay.paidAmount === 'number' ? pay.paidAmount : pay.amount}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setEditPayments(prev =>
                                    prev.map((item, i) => (i === idx ? { ...item, paidAmount: isNaN(val) ? 0 : val } : item))
                                  );
                                }}
                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-natural-brand"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveChanges}
                  className="px-4 py-2 text-xs font-semibold text-white bg-natural-brand hover:bg-natural-brand-hover rounded-xl transition"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* COLUMN 1: DADOS DO ALUNO */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-natural-border flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-natural-brand text-xs font-bold flex items-center justify-center">01</div>
                  <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase font-display">Dados do Aluno</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Nome Completo</span>
                    <span className="text-sm font-bold text-natural-text">{registration.student.name}</span>
                  </div>

                  {registration.student.cpf && (
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">CPF do Aluno</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-gray-700 font-mono">{registration.student.cpf}</span>
                        <button 
                          onClick={() => copyToClipboard(registration.student.cpf || '', 'stdCpf')}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-natural-brand transition"
                        >
                          {copiedField === 'stdCpf' ? <Check className="w-3.5 h-3.5 text-natural-brand" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {registration.student.rg && (
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">RG</span>
                      <span className="text-xs font-semibold text-gray-700 font-mono">{registration.student.rg}</span>
                    </div>
                  )}

                  {registration.student.classGroup && (
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">Turma</span>
                      <span className="inline-block px-2.5 py-0.5 bg-amber-50 text-natural-brand rounded-lg text-xs font-bold">
                        {registration.student.classGroup}
                      </span>
                    </div>
                  )}

                  {registration.student.birthDate && (
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">Nascimento</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {registration.student.birthDate.includes('-')
                          ? new Date(registration.student.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')
                          : registration.student.birthDate}
                      </span>
                    </div>
                  )}

                  {registration.student.gender && (
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">Sexo</span>
                      <span className="text-xs font-semibold text-gray-700">{registration.student.gender}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 mt-4">
                <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Status Financeiro</span>
                {(() => {
                  const allPaid = registration.payments?.length > 0 && registration.payments.every(p => p.status === 'PAGO');
                  
                  let label = "PENDENTE";
                  let badgeClass = "bg-gray-100 text-gray-600";
                  
                  if (allPaid) {
                    label = "CONFIRMADO";
                    badgeClass = "bg-green-100 text-green-800";
                  } else if (totalPaid > 0) {
                    label = "PAGO PARCIAL";
                    badgeClass = "bg-amber-100 text-amber-800";
                  } else if (registration.status === 'ATRASADO') {
                    label = "ATRASADO";
                    badgeClass = "bg-red-100 text-red-800";
                  }
                  
                  return (
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-center w-full ${badgeClass}`}>
                      {label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* COLUMN 2: RESPONSÁVEIS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-natural-border flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-natural-brand text-xs font-bold flex items-center justify-center">02</div>
                  <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase font-display">Responsáveis</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Responsável Legal</span>
                    <span className="text-sm font-bold text-natural-text">{registration.parent.name}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">CPF do Responsável</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-gray-700 font-mono">{registration.parent.cpf}</span>
                      <button 
                        onClick={() => copyToClipboard(registration.parent.cpf, 'parCpf')}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-natural-brand transition"
                      >
                        {copiedField === 'parCpf' ? <Check className="w-3.5 h-3.5 text-natural-brand" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {registration.parent.rg && (
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">RG do Responsável</span>
                      <span className="text-xs font-semibold text-gray-700 font-mono">{registration.parent.rg}</span>
                    </div>
                  )}

                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Contatos</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-gray-800">{registration.parent.phone}</span>
                      <a 
                        href={`https://wa.me/55${registration.parent.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition"
                        title="Abrir WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">E-mail</span>
                    <span className="text-xs font-semibold text-gray-700 block truncate" title={registration.parent.email}>
                      {registration.parent.email}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Endereço</span>
                    <span className="text-xs text-gray-600 leading-tight block">{registration.parent.address}</span>
                  </div>
                </div>
              </div>

              {/* Pagador Conciliação */}
              <div className="mt-4 pt-4 border-t border-gray-100 bg-amber-50/30 p-3 rounded-xl">
                <span className="block text-[9px] font-bold text-natural-brand uppercase tracking-wider">Pagador (Conciliação)</span>
                {registration.payer.different ? (
                  <div className="mt-1">
                    <span className="text-xs font-bold text-gray-800 block">{registration.payer.name}</span>
                    <span className="text-[11px] font-mono text-gray-500 block">CPF: {registration.payer.cpf}</span>
                  </div>
                ) : (
                  <div className="mt-1">
                    <span className="text-xs font-bold text-natural-text block">{registration.parent.name}</span>
                    <span className="text-[11px] font-mono text-gray-600 block">CPF: {registration.parent.cpf}</span>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: FICHA MÉDICA */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-natural-border flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-natural-brand text-xs font-bold flex items-center justify-center">03</div>
                <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase font-display">Ficha Médica</h3>
              </div>

              <div className="space-y-4 flex-1">
                {/* DOENÇA */}
                <div className="bg-gray-50/50 p-2.5 rounded-xl flex items-center justify-between border border-gray-100">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Doença Pré-existente</div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    registration.medical.preExisting ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {registration.medical.preExisting ? 'SIM' : 'NÃO'}
                  </span>
                </div>
                {registration.medical.preExisting && (
                  <div className="text-[11px] bg-red-50 text-red-900 p-2 rounded-lg border border-red-100 -mt-2">
                    {registration.medical.preExistingDetails}
                  </div>
                )}

                {/* ALERGIA */}
                <div className="bg-gray-50/50 p-2.5 rounded-xl flex items-center justify-between border border-gray-100">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Alergias</div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    registration.medical.allergies ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {registration.medical.allergies ? 'SIM' : 'NÃO'}
                  </span>
                </div>
                {registration.medical.allergies && (
                  <div className="text-[11px] bg-red-50 text-red-900 p-2 rounded-lg border border-red-100 -mt-2">
                    {registration.medical.allergiesDetails}
                  </div>
                )}

                {/* ALIMENTAR */}
                <div className="bg-gray-50/50 p-2.5 rounded-xl flex items-center justify-between border border-gray-100">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Restrição Alimentar</div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    registration.medical.dietary ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {registration.medical.dietary ? 'SIM' : 'NÃO'}
                  </span>
                </div>
                {registration.medical.dietary && (
                  <div className="text-[11px] bg-amber-50 text-amber-900 p-2 rounded-lg border border-amber-100 -mt-2">
                    {registration.medical.dietaryDetails}
                  </div>
                )}

                {/* PCD */}
                <div className="bg-gray-50/50 p-2.5 rounded-xl flex items-center justify-between border border-gray-100">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">PCD (Deficiência)</div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    registration.medical.pcd ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {registration.medical.pcd ? 'SIM' : 'NÃO'}
                  </span>
                </div>
                {registration.medical.pcd && (
                  <div className="text-[11px] bg-blue-50 text-blue-900 p-2 rounded-lg border border-blue-100 -mt-2">
                    {registration.medical.pcdDetails}
                  </div>
                )}

                {/* COMPORTAMENTO */}
                <div className="mt-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Comportamento / Observações</span>
                  <div className="text-xs text-gray-700 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50 min-h-[50px]">
                    {registration.medical.behavioral || <span className="text-gray-400 italic">Nenhuma observação informada.</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 4: CONTROLE FINANCEIRO */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-natural-border flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-natural-brand text-xs font-bold flex items-center justify-center">04</div>
                  <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase font-display">Controle Financeiro</h3>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <span className="block text-[8px] font-bold text-gray-400 uppercase">Total</span>
                    <span className="text-xs font-bold text-gray-800 font-mono">R$ {totalValue.toFixed(2)}</span>
                  </div>
                  <div className="bg-green-50 p-2 rounded-xl">
                    <span className="block text-[8px] font-bold text-green-800 uppercase">Pago</span>
                    <span className="text-xs font-bold text-green-700 font-mono">R$ {totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="bg-red-50 p-2 rounded-xl">
                    <span className="block text-[8px] font-bold text-red-800 uppercase">Saldo</span>
                    <span className="text-xs font-bold text-red-700 font-mono">R$ {totalRemaining.toFixed(2)}</span>
                  </div>
                </div>

                {/* Installment lists */}
                <div className="space-y-2 mb-4 max-h-[160px] overflow-y-auto pr-1">
                  {registration.payments.map((p, index) => {
                    const effectiveAmount = p.status === 'PAGO' ? getPaidValue(p) : p.amount;
                    const hasExtraFees = p.status === 'PAGO' && typeof p.paidAmount === 'number' && p.paidAmount > p.amount + 0.009;
                    const hasDiffAmount = p.status === 'PAGO' && typeof p.paidAmount === 'number' && Math.abs(p.paidAmount - p.amount) > 0.009;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl text-xs">
                        <div>
                          <span className="font-bold text-gray-700">{index + 1}ª Parc.</span>
                          <span className="block text-[9px] text-gray-400 font-mono">{new Date(p.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="font-bold text-gray-700 font-mono block">R$ {effectiveAmount.toFixed(2)}</span>
                            {hasDiffAmount && (
                              <span className="block text-[9px] text-amber-700 font-medium">
                                Orig. R$ {p.amount.toFixed(2)}{hasExtraFees ? ' (+ juros/multa)' : ''}
                              </span>
                            )}
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            p.status === 'PAGO' ? 'bg-green-100 text-green-800' : p.status === 'ATRASADO' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Registrar Pagamento */}
              <form onSubmit={handleRegisterPayment} className="pt-3 border-t border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Registrar Recebimento</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2.5 text-xs text-gray-400 font-bold">R$</span>
                    <input 
                      type="text" 
                      placeholder="0,00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8 pr-2.5 py-2 text-xs font-bold text-natural-brand focus:outline-natural-brand font-mono"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="p-2.5 bg-natural-brand hover:bg-natural-brand-hover text-white rounded-xl transition flex items-center justify-center shadow-md shadow-natural-brand/10"
                    title="Adicionar pagamento manual"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* VIEW SIGNED CONTRACT SECTION */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex gap-2">
              <button 
                onClick={() => setIsViewingContract(!isViewingContract)}
                className="flex-1 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                <FileText className="w-4 h-4 text-natural-brand" />
                {isViewingContract ? "Ocultar Contrato Assinado" : "Ver Contrato Assinado Completo"}
              </button>
              {isViewingContract && (
                <button 
                  onClick={handlePrint}
                  className="py-3 px-5 bg-natural-brand hover:bg-natural-brand-hover text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm shadow-sm"
                  title="Imprimir contrato ou salvar em PDF"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / PDF
                </button>
              )}
            </div>
 
            {isViewingContract && (
              <div className="mt-4 space-y-4 animate-fadeIn">
                <div className="text-xs text-amber-800 bg-amber-50/65 border border-amber-100 rounded-xl p-3 flex items-center gap-2 font-medium">
                  <span>ℹ</span>
                  <span>O documento abaixo é o contrato oficial assinado eletronicamente pelo cliente. Você pode imprimi-lo ou salvá-lo em PDF clicando no botão acima.</span>
                </div>

                {/* THE BEAUTIFUL DOCUMENT CANVAS */}
                <div 
                  id="printed-contract-doc" 
                  className="bg-white p-8 border border-gray-200 shadow-md rounded-2xl text-gray-800 text-[11px] leading-relaxed font-sans space-y-5"
                >
                  {/* LOGO & TITLE */}
                  <div className="text-center space-y-1.5 border-b pb-4">
                    <h1 className="text-sm font-black tracking-tight text-[#072d17] uppercase">PATITOUR TURISMO PEDAGÓGICO E EXPERIÊNCIAS</h1>
                    <p className="text-[9px] text-gray-400 font-bold">CNPJ: 41.836.139/0001-57 • Americana - SP</p>
                    <p className="text-[11px] font-black uppercase text-[#072d17] tracking-wider mt-1">
                      CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TURISMO Nº {registration.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>

                  {/* CONTRATANTES */}
                  <div className="space-y-1.5">
                    <h2 className="text-[10px] font-black uppercase text-[#072d17] border-b pb-0.5">1. PARTES CONTRATANTES</h2>
                    <p><strong>CONTRATADA:</strong> PATITOUR TURISMO PEDAGÓGICO E EXPERIÊNCIAS, com sede na cidade de Americana/SP, inscrita no CNPJ sob o nº 41.836.139/0001-57.</p>
                    <p>
                      <strong>CONTRATANTE:</strong> {registration.parent.name || 'N/A'}, 
                      CPF nº {registration.parent.cpf || 'N/A'}, 
                      RG nº {registration.parent.rg || 'N/A'}, 
                      residente e domiciliado(a) em: {registration.parent.address || 'N/A'}, 
                      WhatsApp: {registration.parent.phone || 'N/A'}, 
                      E-mail: {registration.parent.email || 'N/A'}.
                    </p>
                    <p>
                      <strong>PASSAGEIRO/BENEFICIÁRIO:</strong> {registration.student.name || 'N/A'}, 
                      {registration.student.birthDate ? ` Nascimento: ${registration.student.birthDate}, ` : ''}
                      {registration.student.cpf ? ` CPF: ${registration.student.cpf}, ` : ''}
                      {registration.student.rg ? ` RG: ${registration.student.rg}, ` : ''}
                      Turma/Setor: {registration.student.classGroup || 'N/A'}.
                    </p>
                  </div>

                  {/* OBJETO */}
                  <div className="space-y-1.5">
                    <h2 className="text-[10px] font-black uppercase text-[#072d17] border-b pb-0.5">2. OBJETO DO CONTRATO</h2>
                    <p>O presente contrato tem por objeto a prestação de serviços de viagem de turismo para o roteiro <strong>{trip.title}</strong>, com destino a: <strong>{trip.destination}</strong>.</p>
                    <p><strong>DATA DA VIAGEM:</strong> {trip.date} • <strong>EMBARQUE:</strong> {trip.departureTime} • <strong>RETORNO PREVISTO:</strong> {trip.returnTime}</p>
                    <p><strong>RECURSOS E ATIVIDADES INCLUÍDAS:</strong> {trip.includedItems || 'N/A'}</p>
                  </div>

                  {/* VALORES E FORMA DE PAGAMENTO */}
                  <div className="space-y-1.5">
                    <h2 className="text-[10px] font-black uppercase text-[#072d17] border-b pb-0.5">3. PREÇO E FORMA DE PAGAMENTO</h2>
                    <p>Pela prestação dos serviços acima descritos, o CONTRATANTE pagará à CONTRATADA o valor total de <strong>R$ {trip.price.toFixed(2)}</strong>.</p>
                    <p>O pagamento foi acordado no plano de <strong>{registration.payments.length} parcela(s)</strong> conforme o cronograma de vencimentos abaixo:</p>
                    
                    <div className="border border-gray-100 rounded-xl overflow-hidden mt-1">
                      <table className="w-full text-[10px] text-left">
                        <thead>
                          <tr className="bg-gray-50 font-bold border-b border-gray-100 text-gray-500">
                            <th className="p-2">Parcela</th>
                            <th className="p-2">Valor</th>
                            <th className="p-2">Vencimento</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registration.payments.map((p) => (
                            <tr key={p.id} className="border-b border-gray-100 last:border-0 text-gray-600">
                              <td className="p-2">{p.installmentNumber}ª Parcela</td>
                              <td className="p-2 font-bold text-natural-brand">R$ {p.amount.toFixed(2)}</td>
                              <td className="p-2 font-mono">{p.dueDate}</td>
                              <td className="p-2 font-bold">
                                <span className={`px-2 py-0.5 rounded text-[9px] ${
                                  p.status === 'PAGO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {p.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CLAUSULAS CONTRATUAIS */}
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-black uppercase text-[#072d17] border-b pb-0.5">4. CLÁUSULAS CONTRATUAIS</h2>
                    
                    {getActiveClausesList(trip).map((clause, idx) => (
                      <div key={clause.id} className="clause-block space-y-0.5">
                        <h3 className="font-bold uppercase text-[9px] text-gray-700">Cláusula {idx + 1}ª - {clause.title}</h3>
                        <p className="whitespace-pre-line text-gray-500 text-[10px] leading-relaxed pl-2 border-l-2 border-[#072d17]/25">{clause.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* ASSINATURAS */}
                  <div className="pt-6 border-t border-gray-100 space-y-3">
                    <p className="text-center text-gray-400 text-[9px]">
                      E, por estarem as partes justas e contratadas, assinam eletronicamente o presente instrumento de forma digital e incontestável.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-6 text-center pt-2">
                      <div className="space-y-1.5 flex flex-col items-center">
                        <span className="block text-[8px] uppercase font-bold text-gray-400">Pelo Contratante</span>
                        <div className="border border-dashed border-gray-200 rounded-xl p-2 bg-gray-50/50 flex flex-col items-center justify-center min-h-[70px] w-full">
                          {registration.signature && registration.signature.startsWith('data:image') ? (
                            <img 
                              src={registration.signature} 
                              alt="Assinatura" 
                              className="max-h-10 object-contain" 
                              referrerPolicy="no-referrer" 
                            />
                          ) : (
                            <span className="text-gray-400 font-mono italic text-[9px]">Assinado Eletronicamente</span>
                          )}
                          <span className="text-[7px] font-mono text-gray-400 mt-1">IP do Signatário • {new Date(registration.signedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <span className="block font-bold text-gray-700 text-[10px]">{registration.parent.name}</span>
                        <span className="block text-[8px] text-gray-400 font-mono">CPF: {registration.parent.cpf}</span>
                      </div>

                      <div className="space-y-1.5 flex flex-col items-center">
                        <span className="block text-[8px] uppercase font-bold text-gray-400">Pela Contratada</span>
                        <div className="border border-dashed border-gray-200 rounded-xl p-2 bg-[#072d17]/5 flex flex-col items-center justify-center min-h-[70px] w-full relative overflow-hidden">
                          <div className="text-[#072d17] border border-[#072d17] rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider absolute rotate-12 bg-white/90 shadow-sm">
                            PATITOUR ✓
                          </div>
                        </div>
                        <span className="block font-bold text-[#072d17] text-[10px]">PATITOUR TURISMO PEDAGÓGICO E EXPERIÊNCIAS</span>
                        <span className="block text-[8px] text-gray-400 font-mono">CNPJ: 41.836.139/0001-57</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
