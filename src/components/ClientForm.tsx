import React, { useState, useRef, useEffect } from 'react';
import { Trip, Registration, InstallmentPayment, AsaasConfig, getActiveClausesList } from '../types';
import { ShieldCheck, Calendar, Clock, AlertTriangle, ChevronRight, ArrowLeft, RefreshCw, Download, CreditCard, CheckCircle, AlertCircle, ExternalLink, MessageCircle } from 'lucide-react';

interface ClientFormProps {
  trip: Trip;
  onComplete: (registration: Registration) => void;
  onSaveRegistration?: (registration: Registration) => Promise<void>;
  asaasConfig: AsaasConfig;
}

export default function ClientForm({ trip, onComplete, onSaveRegistration, asaasConfig }: ClientFormProps) {
  const [step, setStep] = useState<'intro' | 'student' | 'medical' | 'parent' | 'review' | 'signature' | 'payment_choice' | 'success'>('intro');
  const stepChangeTimeRef = useRef<number>(Date.now());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [asaasError, setAsaasError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  const changeStep = (newStep: 'intro' | 'student' | 'medical' | 'parent' | 'review' | 'signature' | 'payment_choice' | 'success') => {
    setStep(newStep);
    setErrorMessage(null); // Clear errors when step changes
    setInvalidFields([]); // Clear input highlights
    stepChangeTimeRef.current = Date.now();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerError = (msg: string, fields: string[] = []) => {
    setErrorMessage(msg);
    setInvalidFields(fields);
    setTimeout(() => {
      const banner = document.getElementById('error-banner');
      if (banner) {
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
    }, 100);
  };

  const inputClass = (fieldName: string, isMono = false) => {
    return `w-full bg-gray-50 border rounded-2xl px-4 py-3 text-sm font-semibold text-natural-dark placeholder-gray-300 focus:outline-natural-brand transition-all ${
      invalidFields.includes(fieldName) 
        ? 'border-red-400 focus:outline-red-500 bg-red-50/10 shadow-sm shadow-red-100' 
        : 'border-gray-100'
    } ${isMono ? 'font-mono' : ''}`;
  };
  
  // 1. Student States
  const [studentName, setStudentName] = useState('');
  const [studentCpf, setStudentCpf] = useState('');
  const [studentRg, setStudentRg] = useState('');
  const [studentBirthDate, setStudentBirthDate] = useState('');
  const [studentGender, setStudentGender] = useState<'MASCULINO' | 'FEMININO' | undefined>(undefined);
  const [studentClass, setStudentClass] = useState('');

  // 2. Medical States
  const [medPreExisting, setMedPreExisting] = useState<boolean | null>(null);
  const [medPreExistingDetails, setMedPreExistingDetails] = useState('');
  const [medAllergies, setMedAllergies] = useState<boolean | null>(null);
  const [medAllergiesDetails, setMedAllergiesDetails] = useState('');
  const [medDiet, setMedDiet] = useState<boolean | null>(null);
  const [medDietDetails, setMedDietDetails] = useState('');
  const [medPcd, setMedPcd] = useState<boolean | null>(null);
  const [medPcdDetails, setMedPcdDetails] = useState('');
  const [medBehavioral, setMedBehavioral] = useState('');

  // 3. Parent / Payer States
  const [parentName, setParentName] = useState('');
  const [parentCpf, setParentCpf] = useState('');
  const [parentRg, setParentRg] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  
  const [payerDifferent, setPayerDifferent] = useState<boolean>(true);
  const [payerName, setPayerName] = useState('');
  const [payerCpf, setPayerCpf] = useState('');
  const [payerNameEdited, setPayerNameEdited] = useState(false);
  const [payerCpfEdited, setPayerCpfEdited] = useState(false);

  // 4. Clauses check states (mandatory acceptance)
  const [acceptedClauses, setAcceptedClauses] = useState<string[]>([]);

  // 5. Signature State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');

  // 6. Checkout Payment State
  const [selectedInstallments, setSelectedInstallments] = useState<number>(1);
  const [checkoutStep, setCheckoutStep] = useState<'options' | 'pix' | 'boleto' | 'paid' | 'redirect'>('pix');
  const [paymentDone, setPaymentDone] = useState(false);
  const [createdReg, setCreatedReg] = useState<Registration | null>(null);

  // Synchronize client screen in real-time with Firestore updates to be in sync with webhook payments
  useEffect(() => {
    if (!createdReg?.id) return;

    let unsubFn: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { db } = await import('../firebase');
        const { doc, onSnapshot } = await import('firebase/firestore');
        
        unsubFn = onSnapshot(doc(db, 'registrations', createdReg.id), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Registration;
            // Check if status or payments have changed before updating state to avoid infinite render loops
            const currentPaymentsStr = JSON.stringify(createdReg.payments);
            const newPaymentsStr = JSON.stringify(data.payments);
            if (currentPaymentsStr !== newPaymentsStr || createdReg.status !== data.status) {
              console.log("Real-time sync: registration payment status updated from Firestore!");
              setCreatedReg(data);
            }
          }
        });
      } catch (err) {
        console.error("Error setting up real-time sync for client form success state:", err);
      }
    };

    setupListener();

    return () => {
      if (unsubFn) unsubFn();
    };
  }, [createdReg?.id, createdReg?.payments, createdReg?.status]);

  // Setup canvas for electronic drawing and lock mobile touch scrolling inside canvas
  useEffect(() => {
    if (step !== 'signature' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#3E3A34';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    const preventTouchScroll = (ev: TouchEvent) => {
      if (ev.cancelable) {
        ev.preventDefault();
      }
      ev.stopPropagation();
    };

    canvas.addEventListener('touchstart', preventTouchScroll, { passive: false });
    canvas.addEventListener('touchmove', preventTouchScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventTouchScroll);
      canvas.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [step]);

  const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Handlers for drawing signature using Pointer Events (unified mouse + touch + stylus)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture unsupported
    }

    ctx.strokeStyle = '#3E3A34';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const point = getCanvasPoint(canvas, e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x + 0.01, point.y + 0.01);
    ctx.stroke();

    lastPointRef.current = point;
    isDrawingRef.current = true;
    setIsDrawing(true);
    setHasSignature(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(canvas, e.clientX, e.clientY);
    const prev = lastPointRef.current || point;

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
    setHasSignature(true);
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    setIsDrawing(false);
    if (e && canvasRef.current) {
      try {
        if (canvasRef.current.hasPointerCapture(e.pointerId)) {
          canvasRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isDrawingRef.current = false;
    lastPointRef.current = null;
    setIsDrawing(false);
    setHasSignature(false);
  };

  // Validation Helpers
  const cleanTextInput = (text: string, allowSpecialChars: boolean = false): string => {
    // Normalize to strip accents: NFD splits characters into base + accent, then we strip the accent category
    let clean = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (allowSpecialChars) {
      // Allow letters, numbers, spaces and standard address/email punctuation like @ . , - / ( ) _
      return clean.replace(/[^a-zA-Z0-9\s@.,\-\/\(\)_]/g, "");
    } else {
      // Allow only letters, numbers, and spaces (no symbols, no punctuation)
      return clean.replace(/[^a-zA-Z0-9\s]/g, "");
    }
  };

  const isValidCPF = (cpfStr: string): boolean => {
    const cleanCPF = cpfStr.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cleanCPF.charAt(9), 10)) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cleanCPF.charAt(10), 10)) return false;
    
    return true;
  };

  const isValidEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const isValidBirthDate = (dateStr: string): boolean => {
    if (!dateStr || dateStr.length !== 10) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    return true;
  };

  const handleNextStep = () => {
    if (Date.now() - stepChangeTimeRef.current < 500) {
      return;
    }

    if (step === 'intro') {
      changeStep('student');
    } else if (step === 'student') {
      if (!studentName.trim()) {
        triggerError(trip.tripType === 'adulto' ? 'Nome completo do passageiro é obrigatório.' : 'Nome completo do aluno é obrigatório.', ['studentName']);
        return;
      }
      if (trip.requiredFields.studentCpf) {
        if (!studentCpf.trim()) {
          triggerError(trip.tripType === 'adulto' ? 'CPF do passageiro é obrigatório.' : 'CPF do aluno é obrigatório.', ['studentCpf']);
          return;
        }
        if (!isValidCPF(studentCpf)) {
          triggerError('Por favor, informe um CPF válido.', ['studentCpf']);
          return;
        }
      } else if (studentCpf.trim() && !isValidCPF(studentCpf)) {
        triggerError('O CPF informado possui formato inválido.', ['studentCpf']);
        return;
      }

      if (trip.requiredFields.studentBirthDate) {
        if (!studentBirthDate.trim()) {
          triggerError('Data de nascimento é obrigatória.', ['studentBirthDate']);
          return;
        }
        if (!isValidBirthDate(studentBirthDate)) {
          triggerError('Por favor, informe uma data de nascimento válida no formato DD/MM/AAAA.', ['studentBirthDate']);
          return;
        }
      }

      if (trip.requiredFields.studentRg && !studentRg.trim()) {
        triggerError(trip.tripType === 'adulto' ? 'RG do passageiro é obrigatório.' : 'RG do aluno é obrigatório.', ['studentRg']);
        return;
      }

      if (trip.requiredFields.studentGender && !studentGender) {
        triggerError(trip.tripType === 'adulto' ? 'Sexo do passageiro é obrigatório.' : 'Sexo do aluno é obrigatório.', ['studentGender']);
        return;
      }

      if (trip.tripType !== 'adulto' && trip.requiredFields.studentClass && !studentClass) {
        triggerError('Selecione uma turma.', ['studentClass']);
        return;
      }

      // If adult trip, contact details are also filled on student step and must be validated here
      if (trip.tripType === 'adulto') {
        if (!parentPhone.trim()) {
          triggerError('WhatsApp / Celular do passageiro é obrigatório.', ['parentPhone']);
          return;
        }
        if (!parentEmail.trim()) {
          triggerError('E-mail do passageiro é obrigatório.', ['parentEmail']);
          return;
        }
        if (!isValidEmail(parentEmail)) {
          triggerError('Por favor, insira um e-mail válido.', ['parentEmail']);
          return;
        }
        if (!parentAddress.trim()) {
          triggerError('Endereço completo do passageiro é obrigatório.', ['parentAddress']);
          return;
        }
      }

      // Validate always-visible Payer fields for bank emission and conciliation (for adult trip types)
      if (trip.tripType === 'adulto') {
        if (!payerName.trim()) {
          triggerError('Nome completo do pagador é obrigatório para emissão bancária.', ['payerName']);
          return;
        }

        if (!payerCpf.trim()) {
          triggerError('CPF do pagador é obrigatório para emissão bancária.', ['payerCpf']);
          return;
        }

        if (!isValidCPF(payerCpf)) {
          triggerError('Por favor, informe um CPF de pagador válido.', ['payerCpf']);
          return;
        }
      }

      // Skip medical if no fields configured
      const hasMedical = Object.keys(trip.requiredFields).some(k => k.startsWith('medical') && trip.requiredFields[k as keyof typeof trip.requiredFields]);
      if (trip.tripType === 'adulto') {
        changeStep(hasMedical ? 'medical' : 'review');
      } else {
        changeStep(hasMedical ? 'medical' : 'parent');
      }
    } else if (step === 'medical') {
      if (trip.requiredFields.medicalPreExisting && medPreExisting === null) {
        triggerError('Por favor, responda se possui doença pré-existente (Sim ou Não).', ['medPreExisting']);
        return;
      }
      if (trip.requiredFields.medicalPreExisting && medPreExisting === true && !medPreExistingDetails.trim()) {
        triggerError('Por favor, especifique a doença pré-existente.', ['medPreExistingDetails']);
        return;
      }
      if (trip.requiredFields.medicalAllergies && medAllergies === null) {
        triggerError('Por favor, responda se possui alguma alergia (Sim ou Não).', ['medAllergies']);
        return;
      }
      if (trip.requiredFields.medicalAllergies && medAllergies === true && !medAllergiesDetails.trim()) {
        triggerError('Por favor, especifique a alergia.', ['medAllergiesDetails']);
        return;
      }
      if (trip.requiredFields.medicalDietary && medDiet === null) {
        triggerError('Por favor, responda se possui restrição alimentar (Sim ou Não).', ['medDiet']);
        return;
      }
      if (trip.requiredFields.medicalDietary && medDiet === true && !medDietDetails.trim()) {
        triggerError('Por favor, especifique a restrição alimentar.', ['medDietDetails']);
        return;
      }
      if (trip.requiredFields.medicalPcd && medPcd === null) {
        triggerError('Por favor, responda se possui alguma deficiência (PCD) (Sim ou Não).', ['medPcd']);
        return;
      }
      if (trip.requiredFields.medicalPcd && medPcd === true && !medPcdDetails.trim()) {
        triggerError('Por favor, especifique a deficiência (PCD).', ['medPcdDetails']);
        return;
      }

      if (trip.tripType === 'adulto') {
        changeStep('review');
      } else {
        changeStep('parent');
      }
    } else if (step === 'parent') {
      if (!parentName.trim()) {
        triggerError('Nome completo do responsável pagador é obrigatório.', ['parentName']);
        return;
      }
      if (!parentCpf.trim()) {
        triggerError('CPF do responsável pagador é obrigatório.', ['parentCpf']);
        return;
      }
      if (!isValidCPF(parentCpf)) {
        triggerError('Por favor, informe um CPF de responsável pagador válido.', ['parentCpf']);
        return;
      }

      if (trip.requiredFields.parentRg && !parentRg.trim()) {
        triggerError('RG do responsável pagador é obrigatório.', ['parentRg']);
        return;
      }

      if (trip.requiredFields.parentPhone && !parentPhone.trim()) {
        triggerError('WhatsApp do responsável pagador é obrigatório.', ['parentPhone']);
        return;
      }

      if (trip.requiredFields.parentEmail) {
        if (!parentEmail.trim()) {
          triggerError('E-mail do responsável pagador é obrigatório.', ['parentEmail']);
          return;
        }
        if (!isValidEmail(parentEmail)) {
          triggerError('Por favor, insira um e-mail de responsável pagador válido.', ['parentEmail']);
          return;
        }
      } else if (parentEmail.trim() && !isValidEmail(parentEmail)) {
        triggerError('O e-mail do responsável pagador informado possui formato inválido.', ['parentEmail']);
        return;
      }

      if (trip.requiredFields.parentAddress && !parentAddress.trim()) {
        triggerError('Endereço completo do responsável pagador é obrigatório.', ['parentAddress']);
        return;
      }

      // Validate always-visible Payer fields for bank emission and conciliation
      if (!payerName.trim()) {
        triggerError('Nome completo do pagador é obrigatório para emissão bancária.', ['payerName']);
        return;
      }

      if (!payerCpf.trim()) {
        triggerError('CPF do pagador é obrigatório para emissão bancária.', ['payerCpf']);
        return;
      }

      if (!isValidCPF(payerCpf)) {
        triggerError('Por favor, informe um CPF de pagador válido.', ['payerCpf']);
        return;
      }

      changeStep('review');
    } else if (step === 'review') {
      changeStep('signature');
    }
  };

  const handleSignAndSubmit = () => {
    if (Date.now() - stepChangeTimeRef.current < 500) {
      return;
    }

    if (!hasSignature) {
      triggerError('Por favor, assine no campo indicado antes de prosseguir.');
      return;
    }

    const activeClausesList = getActiveClausesList(trip);
    const unacceptedClauses = activeClausesList.filter(c => !acceptedClauses.includes(c.id));

    if (unacceptedClauses.length > 0) {
      triggerError('Você deve aceitar todas as cláusulas contratuais para assinar.');
      return;
    }

    // Save signature data
    let base64Sig = '';
    if (canvasRef.current) {
      base64Sig = canvasRef.current.toDataURL();
      setSignatureDataUrl(base64Sig);
    }

    // Create preliminary installment list (default 1 installment)
    const total = trip.price;
    const initialPayments: InstallmentPayment[] = [
      {
        id: `pay-init-${Date.now()}`,
        installmentNumber: 1,
        amount: total,
        dueDate: trip.customDueDates[0]?.date || new Date().toISOString().split('T')[0],
        status: 'PENDENTE'
      }
    ];

    const registration: Registration = {
      id: `reg-${Date.now()}`,
      tripId: trip.id,
      signedAt: new Date().toISOString(),
      status: 'PENDENTE',
      student: {
        name: studentName,
        cpf: studentCpf || undefined,
        rg: studentRg || undefined,
        birthDate: studentBirthDate || undefined,
        gender: studentGender || undefined,
        classGroup: studentClass || undefined
      },
      medical: {
        preExisting: !!medPreExisting,
        preExistingDetails: medPreExistingDetails || undefined,
        allergies: !!medAllergies,
        allergiesDetails: medAllergiesDetails || undefined,
        dietary: !!medDiet,
        dietaryDetails: medDietDetails || undefined,
        pcd: !!medPcd,
        pcdDetails: medPcdDetails || undefined,
        behavioral: medBehavioral || undefined
      },
      parent: {
        name: trip.tripType === 'adulto' ? studentName : parentName,
        cpf: trip.tripType === 'adulto' ? studentCpf : parentCpf,
        rg: trip.tripType === 'adulto' ? studentRg : parentRg,
        phone: parentPhone,
        email: parentEmail,
        address: parentAddress
      },
      payer: {
        different: payerName !== (trip.tripType === 'adulto' ? studentName : parentName) || payerCpf !== (trip.tripType === 'adulto' ? studentCpf : parentCpf),
        name: payerName,
        cpf: payerCpf
      },
      signature: base64Sig,
      payments: initialPayments
    };

    setCreatedReg(registration);
    
    // IMMEDIATELY SAVE TO FIREBASE DATABASE!
    if (onSaveRegistration) {
      onSaveRegistration(registration).catch(err => {
        console.error("Error saving registration to database immediately", err);
      });
    }

    changeStep('payment_choice');
  };

  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);

  const handleGenerateAsaasPayment = async () => {
    if (!createdReg) return;
    setIsGeneratingPayment(true);
    setErrorMessage(null);
    setAsaasError(null);

    // Build the exact payments array based on selectedInstallments
    const total = trip.price;
    const parcelAmount = Number((total / selectedInstallments).toFixed(2));
    const finalPayments: InstallmentPayment[] = [];
    
    for (let i = 1; i <= selectedInstallments; i++) {
      let dueDate = '';
      let amount = parcelAmount;
      
      if (trip.customDueDates[i - 1]) {
        dueDate = trip.customDueDates[i - 1].date;
        if (selectedInstallments === trip.customDueDates.length) {
          amount = trip.customDueDates[i - 1].amount;
        }
      } else {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        dueDate = d.toISOString().split('T')[0];
      }
      
      if (i === selectedInstallments && selectedInstallments !== trip.customDueDates.length) {
        amount = Number((total - (parcelAmount * (selectedInstallments - 1))).toFixed(2));
      }
      
      finalPayments.push({
        id: `pay-gen-${i}-${Date.now()}`,
        installmentNumber: i,
        amount,
        dueDate,
        status: 'PENDENTE'
      });
    }

    const regWithChosenInstallments: Registration = {
      ...createdReg,
      payments: finalPayments
    };

    setCreatedReg(regWithChosenInstallments);

    // Save preliminary registration with selected installments to Firebase first
    if (onSaveRegistration) {
      try {
        await onSaveRegistration(regWithChosenInstallments);
        console.log("Registration pre-saved with chosen installment plan!");
      } catch (saveErr) {
        console.error("Failed to pre-save chosen installments to database", saveErr);
      }
    }

    // Call server to generate real Asaas customer and payment link
    try {
      const response = await fetch('/api/asaas/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: asaasConfig.apiKey,
          environment: asaasConfig.environment,
          registrationId: createdReg.id,
          payer: {
            name: payerName,
            cpf: payerCpf.replace(/\D/g, ''),
            email: parentEmail,
            phone: parentPhone.replace(/\D/g, ''),
            address: parentAddress
          },
          studentName: studentName,
          trip: {
            title: trip.title,
            price: trip.price,
            school: trip.school,
            destination: trip.destination,
            date: trip.date
          },
          payments: finalPayments
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao integrar com o gateway do Asaas.');
      }

      const resData = await response.json();

      // Update registration payments with Asaas real invoice URLs
      const updatedReg: Registration = {
        ...regWithChosenInstallments,
        asaasCustomerId: resData.customerId,
        payments: resData.payments
      };

      setCreatedReg(updatedReg);

      // Save updated registration to Firebase
      if (onSaveRegistration) {
        await onSaveRegistration(updatedReg);
      }

      // Redirect immediately to the invoice URL (Pix/Boleto, and NO credit card!)
      if (resData.redirectUrl) {
        window.location.href = resData.redirectUrl;
      } else {
        changeStep('success');
      }

    } catch (err: any) {
      console.error("Asaas Payment Generation failed:", err);
      // We do not throw a blocker error! We tell them their registration was saved and let them proceed.
      setAsaasError(err.message || 'Não conseguimos conectar com o Asaas no momento.');
      changeStep('success');
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const handleSimulatePayment = () => {
    if (!createdReg) return;
    
    // Simulate payment in frontend
    const paidPayments = createdReg.payments.map(p => ({
      ...p,
      status: 'PAGO' as const,
      paymentDate: new Date().toISOString().split('T')[0]
    }));

    const paidReg = {
      ...createdReg,
      status: 'PAGO' as const,
      payments: paidPayments
    };

    setCreatedReg(paidReg);
    setCheckoutStep('paid');
    setPaymentDone(true);
    
    // Notify general state
    onComplete(paidReg);
  };

  const handleFinalizeAndClose = () => {
    if (createdReg) {
      onComplete(createdReg);
    }
  };

  const handleDownloadPDF = () => {
    const printContent = document.getElementById('printed-contract-doc-parent')?.innerHTML;
    if (!printContent) {
      alert('PDF do contrato assinado gerado com sucesso! Cópia baixada com assinatura e carimbo digital Patitour.');
      return;
    }
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

  if (!trip.active && step !== 'success') {
    const exactLink = window.location.href;
    const tripYear = (() => {
      if (!trip.date) return '';
      if (trip.date.includes('-')) {
        return trip.date.split('-')[0];
      }
      if (trip.date.includes('/')) {
        return trip.date.split('/').pop() || '';
      }
      return trip.date;
    })();

    const messageText = `Oi Pati, tentei acessar o link ${exactLink} e está inativo.
Escola: ${trip.school || ''}
Ano: ${tripYear || ''}
Destino: ${trip.destination || ''}`;

    const whatsappUrl = `https://wa.me/5519997474575?text=${encodeURIComponent(messageText)}`;

    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-red-100 shadow-xl text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">LINK INDISPONÍVEL</h2>
        <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
          Este link de contrato não está mais aceitando preenchimentos ou foi temporariamente pausado pela agência Patitour. Por favor entre em contato com a Patitour clicando no botão abaixo
        </p>
        <div className="pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all text-xs uppercase tracking-wider shadow-md shadow-emerald-100"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com a Patitour
          </a>
        </div>
        <div className="pt-4 border-t border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
            CONTRATOS PATITOUR
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16 animate-fadeIn font-sans text-natural-text">
      
      {/* BRAND TOP HEADER */}
      <div className="bg-natural-dark text-white pt-10 pb-16 px-4">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center space-y-4">
          <img 
            src="https://raw.githubusercontent.com/easybyzcreator/imagens/c364de998313d54887e1ca668bbf2997f0e6e903/logo%20patitour%20-%20fundo%20transp.png" 
            alt="Logo Patitour" 
            referrerPolicy="no-referrer"
            className="h-[125px] w-auto object-contain drop-shadow-md"
          />
          
          <div className="bg-white px-6 py-8 rounded-[2rem] shadow-xl w-full max-w-2xl relative -bottom-6 text-natural-dark border border-gray-100">
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase text-natural-brand leading-tight font-display">{trip.title}</h1>
            <p className="text-[10px] md:text-xs text-gray-400 mt-1.5 uppercase tracking-wider font-extrabold">{trip.school} • {trip.destination}</p>
            
            <div className="grid grid-cols-3 gap-2 mt-6 border-t border-gray-100 pt-4 text-center font-sans">
              <div>
                <span className="block text-[9px] font-black uppercase text-gray-400">Data</span>
                <span className="text-sm font-extrabold flex items-center justify-center gap-1 mt-1 font-mono text-natural-brand">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {trip.date.includes('-') 
                    ? new Date(trip.date + 'T00:00:00').toLocaleDateString('pt-BR') 
                    : trip.date}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-black uppercase text-gray-400">Saída</span>
                <span className="text-sm font-extrabold flex items-center justify-center gap-1 mt-1 font-mono text-natural-brand">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {trip.departureTime}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-black uppercase text-gray-400">Retorno</span>
                <span className="text-sm font-extrabold flex items-center justify-center gap-1 mt-1 font-mono text-natural-brand">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {trip.returnTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FORM BODY CONTAINER */}
      <div className="max-w-3xl mx-auto px-4 mt-12 space-y-6">
        
        {/* WARNING ALERT BANNER */}
        {step === 'intro' && trip.tripType !== 'adulto' && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed font-bold uppercase">
              Atenção: Não preencha mais de uma vez este contrato, exceto se você tiver mais de um filho. 
              Ao finalizar este cadastro, você poderá realizar o pagamento e baixar sua cópia do contrato.
            </p>
          </div>
        )}

        {/* STEP INTRO: TRIP DETAILS & WHY CHOOSE PATITOUR */}
        {step === 'intro' && (
          <div className="space-y-6">
            
            {/* ITENS INCLUSOS CARD */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                <div className="w-1.5 h-5 bg-natural-brand rounded-full"></div>
                <h3 className="text-sm font-black text-natural-dark uppercase font-display">Itens Inclusos</h3>
              </div>
              <div className="text-xs text-natural-text whitespace-pre-line leading-relaxed font-sans pl-1.5">
                {trip.includedItems}
              </div>

              {trip.foodText && (
                <div className="space-y-2 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 pb-1">
                    <div className="w-1.5 h-5 bg-natural-brand rounded-full"></div>
                    <h3 className="text-sm font-black text-natural-dark uppercase font-display">Alimentação inclusa</h3>
                  </div>
                  <p className="text-xs text-natural-text leading-relaxed pl-1.5 whitespace-pre-line">{trip.foodText}</p>
                </div>
              )}

              {trip.activitiesText && (
                <div className="space-y-2 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 pb-1">
                    <div className="w-1.5 h-5 bg-natural-brand rounded-full"></div>
                    <h3 className="text-sm font-black text-natural-dark uppercase font-display">Atividades Inclusas</h3>
                  </div>
                  <p className="text-xs text-natural-text leading-relaxed pl-1.5 whitespace-pre-line">{trip.activitiesText}</p>
                </div>
              )}
            </div>

            {/* CRONOGRAMA DE PAGAMENTO CARD */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                <div className="w-1.5 h-5 bg-natural-brand rounded-full"></div>
                <h3 className="text-sm font-black text-natural-dark uppercase font-display">Cronograma de Pagamento</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {trip.customDueDates.map((p, i) => (
                  <div key={i} className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 flex justify-between items-center">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase">PARCELA {i + 1}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Venc: {new Date(p.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span className="font-black text-natural-dark text-sm font-mono">R$ {p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/50 flex items-center justify-between">
                <span className="text-xs font-bold text-natural-brand uppercase font-display">Total do Investimento</span>
                <span className="text-lg font-black text-natural-brand font-mono">R$ {trip.price.toFixed(2)}</span>
              </div>
            </div>

            {/* WHY CHOOSE PATITOUR (GRID FROM SCREENSHOT 8) */}
            <div className="text-center space-y-6 pt-6">
              <h3 className="text-base font-black text-natural-dark uppercase tracking-tight font-display">Por que escolher a Patitour?</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                {trip.tripType === 'adulto' ? (
                  <>
                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">🏆</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">+ 20 Anos de Mercado</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Especialistas em logística e turismo com mais de 20 anos de experiência.</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">🛡️</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Segurança Total</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Coordenadores treinados, seguro viagem individual e assistência completa.</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">🗺️</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Roteiros Exclusivos</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Experiências sob medida desenhadas para o máximo aproveitamento do grupo.</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">🚌</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Frota Qualificada</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Transporte executivo de alto padrão com ar-condicionado e total conforto.</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">✨</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Zero Trabalho p/ Você</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Cuidamos de toda a burocracia, ingressos, agendamentos e logística.</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">💬</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Suporte Dedicado</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Canal de atendimento direto para tirar dúvidas de forma rápida e humanizada.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">🏆</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">+ 20 Anos de Mercado</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Especialistas em turismo pedagógico com mais de 20 anos de experiência.</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">🛡️</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Segurança Total</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Monitores treinados, primeiros socorros e seguro viagem individual.</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">🎓</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Pedagógico Real</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Roteiros desenhados como extensão da sala de aula (BNCC).</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">🚌</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Frota Qualificada</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Transporte executivo com ar-condicionado e alto conforto.</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">✨</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Zero Trabalho p/ Escola</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Cuidamos dos agendamentos, financeiro, segurança e burocracia.</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-natural-border-light text-center space-y-2 shadow-sm">
                      <span className="text-2xl">💬</span>
                      <h4 className="text-xs font-black text-natural-dark uppercase font-display">Suporte às Famílias</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Canal de atendimento direto para tirar dúvidas de forma rápida.</p>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-4 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-2xl transition shadow-xl shadow-natural-brand/10 uppercase tracking-wide text-sm flex items-center justify-center gap-1.5"
              >
                Iniciar Cadastro <ChevronRight className="w-5 h-5" />
              </button>
            </div>

          </div>
        )}

        {/* STEP 1: DADOS DO ALUNO / PASSAGEIRO */}
        {step === 'student' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-black text-natural-dark uppercase font-display">
                {trip.tripType === 'adulto' ? 'Passo 1: Dados do Passageiro' : 'Passo 1: Dados do Aluno'}
              </h3>
              <span className="text-xs font-bold text-gray-400">
                {trip.tripType === 'adulto' ? '1 de 3' : '1 de 4'}
              </span>
            </div>

            {errorMessage && (
              <div id="error-banner" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">Atenção: Preenchimento Necessário</h4>
                  <p className="text-xs mt-0.5 font-medium leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {trip.tripType === 'adulto' ? 'Nome Completo do Passageiro' : 'Nome Completo do Aluno'}
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: ARTHUR SILVA COSTA"
                  value={studentName}
                  onChange={(e) => setStudentName(cleanTextInput(e.target.value, false))}
                  className={inputClass('studentName')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trip.requiredFields.studentCpf && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      {trip.tripType === 'adulto' ? 'CPF do Passageiro' : 'CPF do Aluno'}
                    </label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      value={studentCpf}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 11) val = val.slice(0, 11);
                        let formatted = val;
                        if (val.length > 3) formatted = `${val.slice(0, 3)}.${val.slice(3)}`;
                        if (val.length > 6) formatted = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`;
                        if (val.length > 9) formatted = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`;
                        setStudentCpf(formatted);
                      }}
                      className={inputClass('studentCpf', true)}
                    />
                  </div>
                )}

                {trip.requiredFields.studentBirthDate && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data de Nascimento</label>
                    <input 
                      type="text" 
                      placeholder="DD/MM/AAAA"
                      value={studentBirthDate}
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
                        setStudentBirthDate(formatted);
                      }}
                      className={inputClass('studentBirthDate', true)}
                    />
                  </div>
                )}

                {trip.requiredFields.studentRg && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      {trip.tripType === 'adulto' ? 'RG do Passageiro' : 'RG do Aluno'}
                    </label>
                    <input 
                      type="text" 
                      placeholder="00.000.000-0"
                      value={studentRg}
                      onChange={(e) => setStudentRg(cleanTextInput(e.target.value, false))}
                      className={inputClass('studentRg', true)}
                    />
                  </div>
                )}

                {trip.requiredFields.studentGender && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      {trip.tripType === 'adulto' ? 'Sexo do Passageiro' : 'Sexo do Aluno (Feminino / Masculino)'}
                    </label>
                    <div className={`grid grid-cols-2 gap-2 mt-1 p-1 rounded-2xl border transition-all ${
                      invalidFields.includes('studentGender') ? 'border-red-400 bg-red-50/10 shadow-sm shadow-red-100' : 'border-transparent'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setStudentGender('FEMININO')}
                        className={`py-2.5 rounded-2xl font-bold text-xs transition border ${
                          studentGender === 'FEMININO' 
                            ? 'bg-natural-brand border-natural-brand text-white' 
                            : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentGender('MASCULINO')}
                        className={`py-2.5 rounded-2xl font-bold text-xs transition border ${
                          studentGender === 'MASCULINO' 
                            ? 'bg-natural-brand border-natural-brand text-white' 
                            : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        Masculino
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {trip.tripType !== 'adulto' && trip.requiredFields.studentClass && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Selecione a Turma
                  </span>
                  <div className={`flex flex-wrap gap-2 p-1.5 rounded-2xl border transition-all ${
                    invalidFields.includes('studentClass') ? 'border-red-400 bg-red-50/10 shadow-sm shadow-red-100' : 'border-transparent'
                  }`}>
                    {trip.allowedClasses.map((cl) => (
                      <button
                        type="button"
                        key={cl}
                        onClick={() => setStudentClass(cl)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition border ${
                          studentClass === cl 
                            ? 'bg-natural-brand border-natural-brand text-white' 
                            : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {cl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DADOS ADICIONAIS DE CONTATO PARA VIAGENS DE ADULTO */}
              {trip.tripType === 'adulto' && (
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <span className="block text-xs font-black text-natural-brand uppercase tracking-wider font-display">Informações de Contato do Passageiro</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">WhatsApp / Celular</label>
                      <input 
                        type="text" 
                        placeholder="(00) 00000-0000"
                        value={parentPhone}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 11) val = val.slice(0, 11);
                          let formatted = val;
                          if (val.length > 2) {
                            formatted = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                          }
                          if (val.length > 7) {
                            formatted = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                          }
                          setParentPhone(formatted);
                        }}
                        className={inputClass('parentPhone', true)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail</label>
                      <input 
                        type="email" 
                        placeholder="Ex: passageiro@email.com"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(cleanTextInput(e.target.value, true))}
                        className={inputClass('parentEmail')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endereço Completo</label>
                    <input 
                      type="text" 
                      placeholder="Rua, Nº, Bairro, Cidade - UF"
                      value={parentAddress}
                      onChange={(e) => setParentAddress(cleanTextInput(e.target.value, true))}
                      className={inputClass('parentAddress')}
                    />
                  </div>
                </div>
              )}

              {/* DADOS DO PAGADOR PARA EMISSÃO BANCÁRIA / CONCILIAÇÃO (FOR ADULTO) */}
              {trip.tripType === 'adulto' && (
                <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-3 mt-4">
                  <div>
                    <div className="text-[10px] text-natural-brand font-black uppercase tracking-wider font-display">
                      Dados do Pagador para Emissão Bancária / Conciliação
                    </div>
                    <p className="text-[10px] text-amber-800/80 mt-1 leading-relaxed">
                      ⚠️ <strong>Atenção:</strong> Os dados abaixo devem ser obrigatoriamente do responsável que realizará o pagamento para conciliação bancária.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome Completo do Pagador</label>
                      <input 
                        type="text" 
                        placeholder="Nome completo do pagador"
                        value={payerName}
                        onChange={(e) => {
                          setPayerName(cleanTextInput(e.target.value, false));
                          setPayerNameEdited(true);
                        }}
                        className={inputClass('payerName')}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CPF do Pagador</label>
                      <input 
                        type="text" 
                        placeholder="000.000.000-00"
                        value={payerCpf}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 11) val = val.slice(0, 11);
                          let formatted = val;
                          if (val.length > 3) formatted = `${val.slice(0, 3)}.${val.slice(3)}`;
                          if (val.length > 6) formatted = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`;
                          if (val.length > 9) formatted = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`;
                          setPayerCpf(formatted);
                          setPayerCpfEdited(true);
                        }}
                        className={inputClass('payerCpf', true)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION FOOTER */}
            <div className="flex gap-3 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => changeStep('intro')}
                className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl transition text-xs uppercase"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 py-3 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-2xl transition text-xs uppercase shadow-md shadow-natural-brand/10"
              >
                Próximo: Saúde →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: FICHA MÉDICA */}
        {step === 'medical' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-black text-natural-dark uppercase font-display">Passo 2: Ficha Médica</h3>
              <span className="text-xs font-bold text-gray-400">2 of 4</span>
            </div>

            {errorMessage && (
              <div id="error-banner" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">Atenção: Resposta Necessária</h4>
                  <p className="text-xs mt-0.5 font-medium leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              
              {/* Q1: Doença */}
              {trip.requiredFields.medicalPreExisting && (
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-gray-700">Possui doença pré-existente?</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="medPre" 
                        checked={medPreExisting === true} 
                        onChange={() => setMedPreExisting(true)}
                        className="text-natural-brand focus:ring-natural-brand"
                      /> Sim
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="medPre" 
                        checked={medPreExisting === false} 
                        onChange={() => { setMedPreExisting(false); setMedPreExistingDetails(''); }}
                        className="text-natural-brand focus:ring-natural-brand"
                      /> Não
                    </label>
                  </div>
                  {medPreExisting === true && (
                    <input 
                      type="text" 
                      placeholder="Especifique qual e cuidados necessários..."
                      value={medPreExistingDetails}
                      onChange={(e) => setMedPreExistingDetails(cleanTextInput(e.target.value, true))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-semibold text-natural-dark placeholder-gray-300 focus:outline-natural-brand animate-fadeIn"
                    />
                  )}
                </div>
              )}

              {/* Q2: Alergia */}
              {trip.requiredFields.medicalAllergies && (
                <div className="space-y-2 pt-2 border-t border-gray-50">
                  <span className="block text-xs font-bold text-gray-700">Possui alguma alergia?</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="medAll" 
                        checked={medAllergies === true} 
                        onChange={() => setMedAllergies(true)}
                        className="text-natural-brand focus:ring-natural-brand"
                      /> Sim
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="medAll" 
                        checked={medAllergies === false} 
                        onChange={() => { setMedAllergies(false); setMedAllergiesDetails(''); }}
                        className="text-natural-brand focus:ring-natural-brand"
                      /> Não
                    </label>
                  </div>
                  {medAllergies === true && (
                    <input 
                      type="text" 
                      placeholder="Alergia a medicamentos, picada de insetos, alimentos..."
                      value={medAllergiesDetails}
                      onChange={(e) => setMedAllergiesDetails(cleanTextInput(e.target.value, true))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-semibold text-natural-dark placeholder-gray-300 focus:outline-natural-brand animate-fadeIn"
                    />
                  )}
                </div>
              )}

              {/* Q3: Restrição Alimentar */}
              {trip.requiredFields.medicalDietary && (
                <div className="space-y-2 pt-2 border-t border-gray-50">
                  <span className="block text-xs font-bold text-gray-700">Possui restrição alimentar?</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="medDiet" 
                        checked={medDiet === true} 
                        onChange={() => setMedDiet(true)}
                        className="text-natural-brand focus:ring-natural-brand"
                      /> Sim
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="medDiet" 
                        checked={medDiet === false} 
                        onChange={() => { setMedDiet(false); setMedDietDetails(''); }}
                        className="text-natural-brand focus:ring-natural-brand"
                      /> Não
                    </label>
                  </div>
                  {medDiet === true && (
                    <input 
                      type="text" 
                      placeholder="Intolerante a lactose, vegetariano, vegano, intolerante a glúten..."
                      value={medDietDetails}
                      onChange={(e) => setMedDietDetails(cleanTextInput(e.target.value, true))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-semibold text-natural-dark placeholder-gray-300 focus:outline-natural-brand animate-fadeIn"
                    />
                  )}
                </div>
              )}

              {/* Q4: PCD */}
              {trip.requiredFields.medicalPcd && (
                <div className="space-y-2 pt-2 border-t border-gray-50">
                  <span className="block text-xs font-bold text-gray-700">Possui alguma deficiência (PCD)?</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="medPcd" 
                        checked={medPcd === true} 
                        onChange={() => setMedPcd(true)}
                        className="text-natural-brand focus:ring-natural-brand"
                      /> Sim
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="medPcd" 
                        checked={medPcd === false} 
                        onChange={() => { setMedPcd(false); setMedPcdDetails(''); }}
                        className="text-natural-brand focus:ring-natural-brand"
                      /> Não
                    </label>
                  </div>
                  {medPcd === true && (
                    <input 
                      type="text" 
                      placeholder="Especifique a deficiência para que possamos adaptar a monitoria..."
                      value={medPcdDetails}
                      onChange={(e) => setMedPcdDetails(cleanTextInput(e.target.value, true))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-semibold text-natural-dark placeholder-gray-300 focus:outline-natural-brand animate-fadeIn"
                    />
                  )}
                </div>
              )}

              {/* Behavioral notes */}
              {trip.requiredFields.medicalBehavioral && (
                <div className="space-y-2 pt-2 border-t border-gray-50">
                  <span className="block text-xs font-bold text-gray-700">Informações Comportamentais Relevantes (Opcional)</span>
                  <textarea 
                    rows={3}
                    placeholder="Escreva aqui se houver algo relevante para os monitores..."
                    value={medBehavioral}
                    onChange={(e) => setMedBehavioral(cleanTextInput(e.target.value, true))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs text-gray-700 focus:outline-natural-brand"
                  />
                </div>
              )}
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => changeStep('student')}
                className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl transition text-xs uppercase"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 py-3 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-2xl transition text-xs uppercase shadow-md shadow-natural-brand/10"
              >
                {trip.tripType === 'adulto' ? 'Revisar →' : 'Responsável →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RESPONSÁVEIS */}
        {step === 'parent' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-black text-natural-dark uppercase font-display">Responsável (Pai/Mãe)</h3>
              <span className="text-xs font-bold text-gray-400">3 of 4</span>
            </div>

            {errorMessage && (
              <div id="error-banner" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">Atenção: Preenchimento Necessário</h4>
                  <p className="text-xs mt-0.5 font-medium leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/50 text-natural-brand font-bold text-[11px] uppercase tracking-wider font-display">
                Responsável Pai/Mãe
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome Completo do Responsável (Pai/Mãe)</label>
                <input 
                  type="text" 
                  placeholder="Nome completo do responsável (Pai/Mãe)"
                  value={parentName}
                  onChange={(e) => setParentName(cleanTextInput(e.target.value, false))}
                  className={inputClass('parentName')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CPF do Responsável</label>
                  <input 
                    type="text" 
                    placeholder="000.000.000-00"
                    value={parentCpf}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 11) val = val.slice(0, 11);
                      let formatted = val;
                      if (val.length > 3) formatted = `${val.slice(0, 3)}.${val.slice(3)}`;
                      if (val.length > 6) formatted = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`;
                      if (val.length > 9) formatted = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`;
                      setParentCpf(formatted);
                    }}
                    className={inputClass('parentCpf', true)}
                  />
                </div>

                {trip.requiredFields.parentRg && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">RG do Responsável</label>
                    <input 
                      type="text" 
                      placeholder="00.000.000-0"
                      value={parentRg}
                      onChange={(e) => setParentRg(cleanTextInput(e.target.value, false))}
                      className={inputClass('parentRg', true)}
                    />
                  </div>
                )}

                {trip.requiredFields.parentPhone && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefone (WhatsApp)</label>
                    <input 
                      type="text" 
                      placeholder="(00) 00000-0000"
                      value={parentPhone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 11) val = val.slice(0, 11);
                        let formatted = val;
                        if (val.length > 2) {
                          formatted = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                        }
                        if (val.length > 7) {
                          formatted = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                        }
                        setParentPhone(formatted);
                      }}
                      className={inputClass('parentPhone', true)}
                    />
                  </div>
                )}

                {trip.requiredFields.parentEmail && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">E-mail</label>
                    <input 
                      type="email" 
                      placeholder="seu@email.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(cleanTextInput(e.target.value, true))}
                      className={inputClass('parentEmail')}
                    />
                  </div>
                )}
              </div>

              {trip.requiredFields.parentAddress && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    placeholder="Rua/Avenida, Número, Bairro, Cidade, Estado"
                    value={parentAddress}
                    onChange={(e) => setParentAddress(cleanTextInput(e.target.value, true))}
                    className={inputClass('parentAddress')}
                  />
                </div>
              )}

              {/* DADOS DO PAGADOR PARA EMISSÃO BANCÁRIA / CONCILIAÇÃO */}
              <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-3">
                <div>
                  <div className="text-[10px] text-natural-brand font-black uppercase tracking-wider font-display">
                    Dados do Pagador para Emissão Bancária / Conciliação
                  </div>
                  <p className="text-[10px] text-amber-800/80 mt-1 leading-relaxed">
                    ⚠️ <strong>Atenção:</strong> Os dados abaixo devem ser obrigatoriamente do responsável que realizará o pagamento para conciliação bancária.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome Completo do Pagador</label>
                    <input 
                      type="text" 
                      placeholder="Nome completo do pagador"
                      value={payerName}
                      onChange={(e) => {
                        setPayerName(cleanTextInput(e.target.value, false));
                        setPayerNameEdited(true);
                      }}
                      className={inputClass('payerName')}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CPF do Pagador</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      value={payerCpf}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 11) val = val.slice(0, 11);
                        let formatted = val;
                        if (val.length > 3) formatted = `${val.slice(0, 3)}.${val.slice(3)}`;
                        if (val.length > 6) formatted = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`;
                        if (val.length > 9) formatted = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`;
                        setPayerCpf(formatted);
                        setPayerCpfEdited(true);
                      }}
                      className={inputClass('payerCpf', true)}
                    />
                  </div>
                </div>
              </div>


            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => {
                  const hasMedical = Object.keys(trip.requiredFields).some(k => k.startsWith('medical') && trip.requiredFields[k as keyof typeof trip.requiredFields]);
                  changeStep(hasMedical ? 'medical' : 'student');
                }}
                className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl transition text-xs uppercase"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 py-3 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-2xl transition text-xs uppercase shadow-md shadow-natural-brand/10"
              >
                Revisar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 & 5 & 6: REVISÃO, CLÁUSULAS E ASSINATURA */}
        {/* STEP 4 & 5 & 6: REVISÃO, CLÁUSULAS E ASSINATURA */}
        {step === 'review' && (() => {
          const activeClausesList = getActiveClausesList(trip);
          const isAllAccepted = activeClausesList.every(c => acceptedClauses.includes(c.id));

          const hasMedical = Object.keys(trip.requiredFields).some(k => k.startsWith('medical') && trip.requiredFields[k as keyof typeof trip.requiredFields]);

          return (
            <div className="space-y-6">
              
              {/* 1. REVIEW TICKET SUMMARY */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light space-y-5">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="w-1.5 h-5 bg-natural-brand rounded-full"></div>
                  <h3 className="text-base font-black text-natural-dark uppercase tracking-tight font-display">Resumo Completo para Conferência</h3>
                </div>
                
                {/* DETALHES DA VIAGEM E ITENS INCLUSOS */}
                <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/50 space-y-3 text-xs text-natural-dark">
                  <div className="flex items-center gap-2 border-b border-amber-200/45 pb-1">
                    <span className="text-base">🎒</span>
                    <span className="font-extrabold uppercase tracking-wider font-display text-natural-brand text-[10px]">O que está incluso na sua viagem</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Itens inclusos</span>
                      <p className="font-semibold text-gray-700 whitespace-pre-line pl-1">{trip.includedItems}</p>
                    </div>

                    {trip.foodText && (
                      <div className="pt-2 border-t border-amber-200/30">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alimentação inclusa</span>
                        <p className="font-semibold text-gray-700 whitespace-pre-line pl-1">{trip.foodText}</p>
                      </div>
                    )}

                    {trip.activitiesText && (
                      <div className="pt-2 border-t border-amber-200/30">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Atividades Inclusas</span>
                        <p className="font-semibold text-gray-700 whitespace-pre-line pl-1">{trip.activitiesText}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* SEÇÃO 1: PASSAGEIRO / ALUNO */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                    <span className="block text-[10px] font-bold text-natural-brand uppercase tracking-wider">
                      {trip.tripType === 'adulto' ? '👤 Dados do Passageiro' : '👤 Dados do Aluno'}
                    </span>
                    <div className="space-y-1 text-natural-dark font-semibold">
                      <p><span className="text-gray-400">Nome:</span> {studentName}</p>
                      {studentCpf && <p><span className="text-gray-400">CPF:</span> <span className="font-mono">{studentCpf}</span></p>}
                      {studentRg && <p><span className="text-gray-400">RG:</span> <span className="font-mono">{studentRg}</span></p>}
                      {studentBirthDate && <p><span className="text-gray-400">Nascimento:</span> {studentBirthDate}</p>}
                      {studentGender && <p><span className="text-gray-400">Sexo:</span> {studentGender}</p>}
                      {trip.tripType !== 'adulto' && studentClass && <p><span className="text-gray-400">Turma:</span> {studentClass}</p>}
                    </div>
                  </div>

                  {/* SEÇÃO 2: CONTATO / RESPONSÁVEL / PAGADOR */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                    <span className="block text-[10px] font-bold text-natural-brand uppercase tracking-wider">
                      {trip.tripType === 'adulto' ? '📞 Informações de Contato' : '👥 Responsável & Financeiro'}
                    </span>
                    <div className="space-y-1 text-natural-dark font-semibold">
                      {trip.tripType === 'adulto' ? (
                        <>
                          <p><span className="text-gray-400">WhatsApp:</span> <span className="font-mono">{parentPhone}</span></p>
                          <p><span className="text-gray-400">E-mail:</span> {parentEmail}</p>
                          <p><span className="text-gray-400">Endereço:</span> {parentAddress}</p>
                        </>
                      ) : (
                        <>
                          <p><span className="text-gray-400">Responsável:</span> {parentName}</p>
                          {parentCpf && <p><span className="text-gray-400">CPF Resp.:</span> <span className="font-mono">{parentCpf}</span></p>}
                          {parentRg && <p><span className="text-gray-400">RG Resp.:</span> <span className="font-mono">{parentRg}</span></p>}
                          <p><span className="text-gray-400">WhatsApp:</span> <span className="font-mono">{parentPhone}</span></p>
                          {parentEmail && <p><span className="text-gray-400">E-mail:</span> {parentEmail}</p>}
                          {parentAddress && <p><span className="text-gray-400">Endereço:</span> {parentAddress}</p>}
                        </>
                      )}
                      {(payerName !== (trip.tripType === 'adulto' ? studentName : parentName) || payerCpf !== (trip.tripType === 'adulto' ? studentCpf : parentCpf)) && (
                        <div className="mt-2 pt-2 border-t border-gray-200/60 text-amber-800">
                          <p className="font-bold text-[9px] uppercase">💳 Responsável Financeiro Diferente</p>
                          <p><span className="text-amber-700/60">Pagador:</span> {payerName}</p>
                          <p><span className="text-amber-700/60">CPF Pagador:</span> <span className="font-mono">{payerCpf}</span></p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SEÇÃO 3: FICHA MÉDICA (SE PREENCHIDA) */}
                  {hasMedical && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 md:col-span-2">
                      <span className="block text-[10px] font-bold text-natural-brand uppercase tracking-wider">
                        🏥 Ficha de Saúde / Informações Médicas
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-natural-dark font-semibold">
                        {trip.requiredFields.medicalPreExisting && (
                          <p><span className="text-gray-400">Doença Pré-existente:</span> {medPreExisting ? `Sim (${medPreExistingDetails})` : 'Não'}</p>
                        )}
                        {trip.requiredFields.medicalAllergies && (
                          <p><span className="text-gray-400">Alergias:</span> {medAllergies ? `Sim (${medAllergiesDetails})` : 'Não'}</p>
                        )}
                        {trip.requiredFields.medicalDietary && (
                          <p><span className="text-gray-400">Restrição Alimentar:</span> {medDiet ? `Sim (${medDietDetails})` : 'Não'}</p>
                        )}
                        {trip.requiredFields.medicalPcd && (
                          <p><span className="text-gray-400">PCD:</span> {medPcd ? `Sim (${medPcdDetails})` : 'Não'}</p>
                        )}
                        {trip.requiredFields.medicalBehavioral && medBehavioral.trim() && (
                          <p className="md:col-span-2"><span className="text-gray-400">Obs. Comportamentais:</span> {medBehavioral}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO 4: CONTRATO & CRONOGRAMA */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 md:col-span-2">
                    <span className="block text-[10px] font-bold text-natural-brand uppercase tracking-wider">
                      💼 Pacote de Viagem & Cronograma de Vencimentos
                    </span>
                    <div className="space-y-1.5 text-natural-dark">
                      <p className="font-extrabold text-sm text-natural-dark">{trip.title}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {trip.customDueDates.map((p, i) => (
                          <div key={i} className="bg-white p-2.5 rounded-xl border border-gray-100 flex justify-between items-center">
                            <div>
                              <span className="block text-[8px] font-extrabold text-gray-400 uppercase">PARCELA {i + 1}</span>
                              <span className="text-[9px] text-gray-500 font-mono">Venc: {new Date(p.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                            <span className="font-extrabold text-natural-dark font-mono text-xs">R$ {p.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center bg-natural-brand/5 p-3 rounded-xl border border-natural-brand/10 mt-2">
                        <span className="text-xs font-bold text-natural-brand uppercase">VALOR TOTAL DO INVESTIMENTO</span>
                        <span className="text-sm font-black text-natural-brand font-mono">R$ {trip.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1.5 INFORMATIONAL WARNING CARDS */}
              {((trip.showPaymentAlert1 !== false && (trip.showPaymentAlert1 !== undefined || trip.showPaymentAlerts !== false)) ||
                (trip.showPaymentAlert2 !== false && (trip.showPaymentAlert2 !== undefined || trip.showPaymentAlerts !== false)) ||
                (trip.showPaymentAlert3 !== false && (trip.showPaymentAlert3 !== undefined || trip.showPaymentAlerts !== false))) && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Card 1: Vaga e Compromisso */}
                  {(trip.showPaymentAlert1 !== false && (trip.showPaymentAlert1 !== undefined || trip.showPaymentAlerts !== false)) && (
                    <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-3xl p-5 flex items-center gap-4 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center shrink-0 text-white">
                        <svg className="w-5 h-5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-xs md:text-[13px] font-semibold text-[#155724] leading-relaxed">
                        O compromisso com a vaga se confirma com o pagamento da primeira parcela até o vencimento. Após esse prazo, a vaga fica sujeita à disponibilidade, mesmo para quem deseja pagar à vista.
                      </p>
                    </div>
                  )}

                  {/* Card 2: Pagamento à Vista */}
                  {(trip.showPaymentAlert2 !== false && (trip.showPaymentAlert2 !== undefined || trip.showPaymentAlerts !== false)) && (
                    <div className="bg-[#f0f9ff] border border-[#e0f2fe] rounded-3xl p-5 flex items-center gap-4 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center shrink-0 text-white text-lg font-black font-sans">
                        !
                      </div>
                      <p className="text-xs md:text-[13px] font-semibold text-[#004085] leading-relaxed">
                        Caso opte por pagamento A VISTA (valor integral) o mesmo deve ser efetuado na data de vencimento da primeira parcela.
                      </p>
                    </div>
                  )}

                  {/* Card 3: Aviso de Próximas Parcelas */}
                  {(trip.showPaymentAlert3 !== false && (trip.showPaymentAlert3 !== undefined || trip.showPaymentAlerts !== false)) && (
                    <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-3xl p-5 flex items-start gap-4 shadow-sm">
                      <AlertTriangle className="w-7 h-7 text-[#d97706] shrink-0 mt-0.5" />
                      <div className="text-xs md:text-[13px] leading-relaxed text-[#856404]">
                        <strong className="block text-[#664d03] font-bold mb-1">Aviso sobre as próximas parcelas:</strong>
                        O pagamento da primeira parcela estará disponível para realização imediatamente após a conclusão da assinatura deste contrato. Para a sua comodidade, os lembretes e links das parcelas restantes serão enviados automaticamente para o seu e-mail e via SMS 10 dias antes do vencimento de cada boleto/parcela.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. DIGITAL CLAUSES TO ACCEPT (INDIVIDUALLY) */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <ShieldCheck className="w-5 h-5 text-natural-brand" />
                  <h3 className="text-sm font-black text-natural-dark uppercase font-display">Cláusulas Contratuais</h3>
                </div>

                {activeClausesList.length === 0 && (
                  <p className="text-xs text-gray-500 py-4 text-center">Nenhuma cláusula especial exigida para este contrato.</p>
                )}

                {activeClausesList.map((clause, idx) => (
                  <div key={clause.id} className={`space-y-2 ${idx > 0 ? 'pt-4 border-t border-gray-50' : ''}`}>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {String(idx + 1).padStart(2, '0')}. {clause.title}
                    </span>
                    <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-line font-medium">
                      {clause.text}
                    </div>
                    <label className="flex items-center gap-2 text-xs font-extrabold text-natural-brand cursor-pointer pt-1 pl-1">
                      <input 
                        type="checkbox" 
                        checked={acceptedClauses.includes(clause.id)}
                        onChange={() => {
                          setAcceptedClauses(prev => 
                            prev.includes(clause.id) 
                              ? prev.filter(k => k !== clause.id) 
                              : [...prev, clause.id]
                          );
                        }}
                        className="rounded text-natural-brand focus:ring-natural-brand"
                      /> LI, COMPREENDO E ACEITO INTEGRALMENTE ESTA CLÁUSULA
                    </label>
                  </div>
                ))}

              </div>

              {/* CONTROL BAR */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => changeStep(trip.tripType === 'adulto' ? (hasMedical ? 'medical' : 'student') : 'parent')}
                  className="flex-1 py-3.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-2xl transition text-xs uppercase"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={!isAllAccepted}
                  onClick={handleNextStep}
                  className={`flex-1 py-3.5 font-extrabold rounded-2xl transition text-xs uppercase shadow-md ${
                    isAllAccepted
                      ? 'bg-natural-brand hover:bg-natural-brand-hover text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Prosseguir para Assinatura →
                </button>
              </div>
            </div>
          );
        })()}

        {/* STEP 5: INTERACTIVE CANVAS SIGNATURE */}
        {step === 'signature' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light space-y-6">
            <div className="text-center space-y-2 border-b pb-4">
              <h3 className="text-base font-black text-natural-dark uppercase font-display">Assinatura Eletrônica</h3>
              <p className="text-xs text-gray-400">Use seu dedo na tela ou o mouse no quadrado abaixo para desenhar sua assinatura digital.</p>
            </div>

            {errorMessage && (
              <div id="error-banner" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">Atenção: Assinatura Necessária</h4>
                  <p className="text-xs mt-0.5 font-medium leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="relative select-none">
              <button 
                type="button" 
                onClick={clearCanvas}
                className="absolute right-3 top-3 z-10 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold uppercase transition"
              >
                Limpar
              </button>

              <canvas
                ref={canvasRef}
                width={650}
                height={200}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onContextMenu={(e) => e.preventDefault()}
                className="w-full bg-[#fcfbf9] border-2 border-dashed border-amber-200 rounded-2xl cursor-crosshair h-[200px] touch-none select-none block"
              />
              <span className="block text-center text-[10px] text-gray-400 font-mono mt-2">Área segura criptografada Contratos Patitour</span>
            </div>

            {/* SUBMIT */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => changeStep('review')}
                className="flex-1 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl transition text-xs uppercase"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSignAndSubmit}
                className="flex-1 py-3.5 bg-natural-brand hover:bg-natural-brand-hover text-white font-black rounded-2xl transition text-xs uppercase shadow-xl shadow-natural-brand/10 flex items-center justify-center gap-1"
              >
                Assinar e Avançar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* NEW STEP: CHOOSE INSTALLMENTS & REDIRECT TO ASAAS */}
        {step === 'payment_choice' && createdReg && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light space-y-6 animate-fadeIn">
            <div className="text-center space-y-2 border-b pb-4">
              <h3 className="text-base font-black text-natural-dark uppercase font-display">Escolha de Parcelamento</h3>
              <p className="text-xs text-gray-400">Selecione o plano de parcelamento ideal para o pagamento do passeio.</p>
            </div>

            {errorMessage && (
              <div id="error-banner" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">Erro na Integração</h4>
                  <p className="text-xs mt-0.5 font-medium leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* SELEÇÃO DO PARCELAMENTO */}
            <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/50 space-y-4">
              <span className="block text-xs font-black text-natural-brand uppercase font-display">Plano de Pagamento (Boleto Bancário ou Pix)</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Selecione o número de parcelas</label>
                  <select
                    value={selectedInstallments}
                    onChange={(e) => setSelectedInstallments(parseInt(e.target.value) || 1)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-natural-brand focus:outline-natural-brand"
                  >
                    {Array.from({ length: trip.maxInstallments }).map((_, i) => {
                      const total = trip.price;
                      const parcelAmount = Number((total / (i + 1)).toFixed(2));
                      return (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}x de R$ {parcelAmount.toFixed(2)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] font-bold text-gray-400 uppercase">Valor Total do Contrato</span>
                    <span className="text-[10px] text-natural-brand/80 font-bold">Sem juros</span>
                  </div>
                  <span className="text-sm font-black text-natural-brand font-mono">R$ {trip.price.toFixed(2)}</span>
                </div>
              </div>

              {/* LISTA DAS PARCELAS DETALHADAS */}
              <div className="bg-white p-4 rounded-xl border border-amber-100/50 space-y-2.5">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cronograma de Vencimentos</span>
                
                <div className="space-y-2 text-xs divide-y divide-gray-50 max-h-48 overflow-y-auto">
                  {Array.from({ length: selectedInstallments }).map((_, i) => {
                    const total = trip.price;
                    const parcelAmount = Number((total / selectedInstallments).toFixed(2));
                    let amount = parcelAmount;
                    let dueDate = '';

                    if (trip.customDueDates[i]) {
                      dueDate = trip.customDueDates[i].date;
                      if (selectedInstallments === trip.customDueDates.length) {
                        amount = trip.customDueDates[i].amount;
                      }
                    } else {
                      const d = new Date();
                      d.setMonth(d.getMonth() + (i + 1));
                      dueDate = d.toISOString().split('T')[0];
                    }

                    if (i === selectedInstallments - 1 && selectedInstallments !== trip.customDueDates.length) {
                      amount = Number((total - (parcelAmount * (selectedInstallments - 1))).toFixed(2));
                    }

                    return (
                      <div key={i} className="flex justify-between items-center pt-2 first:pt-0">
                        <span className="font-semibold text-gray-500">Parcela {i + 1} de {selectedInstallments}</span>
                        <div className="text-right">
                          <span className="block font-mono font-bold text-natural-dark">R$ {amount.toFixed(2)}</span>
                          <span className="text-[9px] text-gray-400 font-mono">Vence em: {dueDate.split('-').reverse().join('/')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AVISO IMPORTANTE */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-gray-500 font-medium">
                <strong className="text-natural-dark block mb-0.5">Segurança Asaas Integrada</strong>
                Ao clicar em finalizar, o sistema da Patitour gerará as cobranças correspondentes no gateway seguro do Asaas. 
                Você será redirecionado para a página oficial para efetuar o pagamento via **Pix** ou **Boleto Bancário**. 
                Não aceitamos Cartões de Crédito.
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isGeneratingPayment}
                onClick={() => changeStep('signature')}
                className="flex-1 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl transition text-xs uppercase disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isGeneratingPayment}
                onClick={handleGenerateAsaasPayment}
                className="flex-1 py-3.5 bg-natural-brand hover:bg-natural-brand-hover text-white font-black rounded-2xl transition text-xs uppercase shadow-xl shadow-natural-brand/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Gerando cobranças...
                  </>
                ) : (
                  <>
                    Gerar Cobranças & Pagar <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: SUCCESS RECEPTION & ASAAS PAYMENT CHEKOUT */}
        {step === 'success' && createdReg && (
          <>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-natural-border-light text-center space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-amber-50 text-natural-brand rounded-full flex items-center justify-center mx-auto shadow-inner border border-amber-200/40">
                <CheckCircle className="w-10 h-10 text-natural-brand" />
              </div>
              <h2 className="text-xl font-black text-natural-dark uppercase tracking-tight font-display">CONTRATO RECEBIDO!</h2>
              <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto font-sans">
                Os dados do aluno <strong className="text-natural-brand font-extrabold">{createdReg.student.name}</strong> foram registrados com sucesso no sistema. 
                Sua vaga está pré-garantida até a compensação da primeira parcela.
              </p>
            </div>

            {/* SECURE CHECKOUT INFO */}
            <div className="bg-amber-50/20 p-5 rounded-2xl border border-amber-200/40 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-amber-200/30 pb-2">
                <span className="text-xs font-black text-natural-brand uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <ShieldCheck className="text-natural-brand w-4.5 h-4.5" /> Fatura & Pagamento Seguro (Asaas Gateway)
                </span>
              </div>

              {asaasError ? (
                <div className="space-y-4 text-center animate-fadeIn font-sans py-3">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200/50 shadow-inner">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-natural-dark uppercase tracking-wider font-display">Inscrição Pré-Garantida</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-sm mx-auto">
                      Seus dados e o plano de parcelamento escolhido (<strong className="font-bold text-natural-brand">{createdReg.payments.length}x</strong>) foram salvos com sucesso e enviados ao organizador.
                    </p>
                  </div>
                  
                  <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/30 text-[10px] text-amber-900 leading-relaxed max-w-sm mx-auto font-semibold">
                    <p className="text-left font-black uppercase text-[9px] text-amber-800 mb-1">Aviso sobre Pagamento:</p>
                    Não foi possível conectar com o gateway do Asaas automaticamente no momento (Motivo: {asaasError}). 
                    <span className="block mt-1 font-medium">Fique tranquilo(a)! O organizador da viagem já recebeu a sua ficha assinada e enviará o link correto das parcelas diretamente no seu e-mail ou WhatsApp.</span>
                  </div>
                </div>
              ) : createdReg.payments && createdReg.payments.some(p => p.invoiceUrl) ? (
                <div className="space-y-4 animate-fadeIn font-sans">
                  <div className="text-center py-2">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200/50 shadow-inner mb-2">
                      <ExternalLink className="w-6 h-6 animate-pulse" />
                    </div>
                    <h4 className="font-extrabold text-xs text-natural-dark uppercase tracking-wider font-display">Acesse seus Links de Pagamento</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-sm mx-auto mt-1">
                      As cobranças para esta inscrição foram geradas com sucesso. Clique em qualquer uma das parcelas abaixo para pagar por Pix ou Boleto no Asaas.
                    </p>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {createdReg.payments.map((p, idx) => (
                      <div key={idx} className="bg-white p-3.5 rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <div className="text-left">
                          <span className="block text-xs font-black text-natural-dark">Parcela {p.installmentNumber} de {createdReg.payments.length}</span>
                          <span className="text-[10px] text-gray-400 font-mono">Vence em: {p.dueDate.split('-').reverse().join('/')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-black text-natural-brand">R$ {p.amount.toFixed(2)}</span>
                          {p.status === 'PAGO' ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              ✓ Pago
                            </span>
                          ) : p.invoiceUrl ? (
                            <a 
                              href={p.invoiceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] uppercase transition flex items-center gap-1"
                            >
                              Pagar <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Processando...</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {createdReg.payments[0]?.invoiceUrl && (
                    <div className="pt-2 text-center">
                      <a 
                        href={createdReg.payments[0].invoiceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-natural-brand hover:bg-natural-brand-hover text-white font-black rounded-xl transition text-xs uppercase shadow-md shadow-natural-brand/10"
                      >
                        Abrir Fatura da 1ª Parcela <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  <p className="text-[9.5px] text-gray-400 text-center leading-relaxed">
                    Você pode salvar o link desta página ou baixar a cópia do seu contrato em PDF abaixo. Seus links de pagamento permanecem ativos e podem ser quitados individualmente a qualquer momento.
                  </p>
                </div>
              ) : trip.asaasLink ? (
                <div className="space-y-4 text-center animate-fadeIn font-sans py-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200/50 shadow-inner">
                    <ExternalLink className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-natural-dark uppercase tracking-wider font-display">Acesse o Pagamento Asaas</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-sm mx-auto">
                      Clique no botão abaixo para abrir a página oficial e segura do Asaas para finalizar o pagamento de sua inscrição.
                    </p>
                  </div>
                  
                  <div className="pt-2">
                    <a 
                      href={trip.asaasLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition text-xs uppercase shadow-md shadow-emerald-600/15"
                    >
                      Ir para o Pagamento do Asaas <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  
                  <p className="text-[9px] text-gray-400">
                    Seus dados de cadastro já foram salvos com sucesso no sistema da Patitour. Você pode realizar o pagamento agora ou posteriormente através deste mesmo link.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-center animate-fadeIn font-sans py-3">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200/50 shadow-inner">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-natural-dark uppercase tracking-wider font-display">Cadastro Confirmado com Sucesso!</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-sm mx-auto">
                      Sua ficha de inscrição e contrato assinado estão salvos com total segurança. No momento, o link automático do Asaas não está ativo para esta viagem.
                    </p>
                  </div>
                  
                  <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/30 text-[10px] text-amber-900 leading-relaxed max-w-sm mx-auto font-semibold">
                    Por favor, entre em contato diretamente com a equipe financeira da **Patitour** ou consulte o grupo de recados escolares para receber as orientações e instruções para o pagamento (PIX ou Boleto Bancário).
                  </div>
                </div>
              )}
            </div>

            {/* LOWER ACTIONS */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className={trip.tripType === 'pedagogico' ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-2xl transition flex items-center justify-center gap-2 text-xs shadow-sm font-sans"
                >
                  <Download className="w-4 h-4 text-natural-brand" /> Baixar Cópia do Contrato (PDF)
                </button>
                {trip.tripType === 'pedagogico' && (
                  <button
                    type="button"
                    onClick={() => {
                      const formattedDate = trip.date.includes('-') 
                        ? new Date(trip.date + 'T00:00:00').toLocaleDateString('pt-BR') 
                        : trip.date;
                      const whatsappMessage = `Olá, já preenchi um formulário, mas tenho mais um filho. Viagem: ${trip.title}, Turma/Sala: ${studentClass || 'N/A'}, Data: ${formattedDate}, Escola: ${trip.school}`;
                      const encodedMessage = encodeURIComponent(whatsappMessage);
                      window.open(`https://wa.me/5519997474575?text=${encodedMessage}`, '_blank');
                    }}
                    className="py-3 bg-natural-brand hover:bg-natural-brand-hover text-white font-extrabold rounded-2xl transition text-xs shadow-md shadow-natural-brand/10 uppercase font-sans"
                  >
                    Tenho mais um filho
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleFinalizeAndClose}
                className="w-full py-3 bg-natural-dark hover:bg-natural-brand text-amber-200 hover:text-white font-extrabold rounded-2xl transition text-xs uppercase font-sans"
              >
                Concluir
              </button>
            </div>
          </div>
          
          {/* HIDDEN PRINTABLE CONTRACT VIEW FOR PARENTS */}
          <div className="hidden">
            <div 
              id="printed-contract-doc-parent" 
              className="bg-white p-8 border border-gray-200 text-gray-800 text-[11px] leading-relaxed font-sans space-y-5"
            >
              {/* LOGO & TITLE */}
              <div className="text-center space-y-1.5 border-b pb-4">
                <h1 className="text-sm font-black tracking-tight text-[#072d17] uppercase">PATITOUR TURISMO PEDAGÓGICO E EXPERIÊNCIAS</h1>
                <p className="text-[9px] text-gray-400 font-bold">CNPJ: 41.836.139/0001-57 • Americana - SP</p>
                <p className="text-[11px] font-black uppercase text-[#072d17] tracking-wider mt-1">
                  CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TURISMO Nº {createdReg.id.substring(0, 8).toUpperCase()}
                </p>
              </div>

              {/* CONTRATANTES */}
              <div className="space-y-1.5">
                <h2 className="text-[10px] font-black uppercase text-[#072d17] border-b pb-0.5">1. PARTES CONTRATANTES</h2>
                <p><strong>CONTRATADA:</strong> PATITOUR TURISMO PEDAGÓGICO E EXPERIÊNCIAS, com sede na cidade de Americana/SP, inscrita no CNPJ sob o nº 41.836.139/0001-57.</p>
                <p>
                  <strong>CONTRATANTE:</strong> {createdReg.parent.name || 'N/A'}, 
                  CPF nº {createdReg.parent.cpf || 'N/A'}, 
                  RG nº {createdReg.parent.rg || 'N/A'}, 
                  residente e domiciliado(a) em: {createdReg.parent.address || 'N/A'}, 
                  WhatsApp: {createdReg.parent.phone || 'N/A'}, 
                  E-mail: {createdReg.parent.email || 'N/A'}.
                </p>
                <p>
                  <strong>PASSAGEIRO/BENEFICIÁRIO:</strong> {createdReg.student.name || 'N/A'}, 
                  {createdReg.student.birthDate ? ` Nascimento: ${createdReg.student.birthDate}, ` : ''}
                  {createdReg.student.cpf ? ` CPF: ${createdReg.student.cpf}, ` : ''}
                  {createdReg.student.rg ? ` RG: ${createdReg.student.rg}, ` : ''}
                  Turma/Setor: {createdReg.student.classGroup || 'N/A'}.
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
                <p>O pagamento foi acordado no plano de <strong>{createdReg.payments.length} parcela(s)</strong> conforme o cronograma de vencimentos abaixo:</p>
                
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
                      {createdReg.payments.map((p) => (
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
                      {createdReg.signature && createdReg.signature.startsWith('data:image') ? (
                        <img 
                          src={createdReg.signature} 
                          alt="Assinatura" 
                          className="max-h-10 object-contain" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <span className="text-gray-400 font-mono italic text-[9px]">Assinado Eletronicamente</span>
                      )}
                      <span className="text-[7px] font-mono text-gray-400 mt-1">IP do Signatário • {new Date(createdReg.signedAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span className="block font-bold text-gray-700 text-[10px]">{createdReg.parent.name}</span>
                    <span className="block text-[8px] text-gray-400 font-mono">CPF: {createdReg.parent.cpf}</span>
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
          </>
        )}

      </div>

    </div>
  );
}
