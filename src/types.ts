export interface Trip {
  id: string;
  active: boolean; // STATUS DO LINK
  tripType?: 'pedagogico' | 'adulto'; // Tipo de viagem (pedagógico ou adulto)
  showPaymentAlerts?: boolean; // Opção de exibir ou não os cards de avisos de pagamento
  showPaymentAlert1?: boolean; // Card 1: Compromisso com a vaga...
  showPaymentAlert2?: boolean; // Card 2: Caso opte por pagamento A VISTA...
  showPaymentAlert3?: boolean; // Card 3: Aviso sobre as próximas parcelas...
  title: string; // Ex: ESTUDO DO MEIO - 2 ANOS
  school: string; // Ex: SESI 422 AMERICANA
  destination: string; // Ex: TERRA DE GIGANTES SALTO SP
  date: string; // DD/MM/AAAA or YYYY-MM-DD
  departureTime: string; // Saída (Ex: 07:00)
  returnTime: string; // Retorno (Ex: 18:00)
  
  // Financeiro
  price: number; // Preço Total (Ex: 396.21)
  maxInstallments: number; // Máx. Parcelas
  asaasLink?: string; // Link Asaas (opcional)
  customDueDates: Array<{
    date: string; // Vencimento
    amount: number; // Valor da parcela
  }>;
  allowedClasses: string[]; // Turmas autorizadas (Ex: ["5º ANO A", "5º ANO B"])
  
  // Atividades
  includedItems: string; // Itens inclusos no contrato
  foodText?: string; // Alimentação (opcional)
  activitiesText?: string; // Atividades (opcional)
  
  // Cláusulas
  clauses: {
    paymentPedagogico: string;
    payment: string;
    cancelationPedagogico: string;
    cancelation: string;
    pcdPedagogico: string;
    pcd: string;
    regrasPedagogico: string;
    regras: string;
    regrasTv: string;
    documentacaoPedagogico: string;
    documentacao: string;
  };
  activeClauses?: string[]; // Lista de IDs das cláusulas que serão usadas nesta viagem
  
  // DADOS REQUERIDOS DO CLIENTE (Custom Configuration per Trip!)
  // If true, the field is required/visible in the public contract form.
  requiredFields: {
    studentCpf: boolean;
    studentRg: boolean;
    studentBirthDate: boolean;
    studentGender: boolean;
    studentClass: boolean;
    
    medicalPreExisting: boolean;
    medicalAllergies: boolean;
    medicalDietary: boolean;
    medicalPcd: boolean;
    medicalBehavioral: boolean;
    
    parentCpf: boolean;
    parentRg: boolean;
    parentPhone: boolean;
    parentEmail: boolean;
    parentAddress: boolean;
    
    payerDifferent: boolean;
  };
}

export interface InstallmentPayment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
  paymentDate?: string;
  asaasId?: string;
}

export interface Registration {
  id: string;
  tripId: string;
  signedAt: string; // Data da assinatura
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
  
  student: {
    name: string;
    cpf?: string;
    rg?: string;
    birthDate?: string;
    gender?: 'MASCULINO' | 'FEMININO';
    classGroup?: string;
  };
  
  medical: {
    preExisting: boolean;
    preExistingDetails?: string;
    allergies: boolean;
    allergiesDetails?: string;
    dietary: boolean;
    dietaryDetails?: string;
    pcd: boolean;
    pcdDetails?: string;
    behavioral?: string;
  };
  
  parent: {
    name: string;
    cpf: string;
    rg?: string;
    phone: string;
    email: string;
    address: string;
  };
  
  payer: {
    different: boolean;
    name?: string;
    cpf?: string;
  };
  
  signature: string; // Base64 signature image
  payments: InstallmentPayment[];
  
  // Asaas simulation / link data
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
}

export interface AsaasConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  enabled: boolean;
  walletId?: string;
}

// Default Contract Clauses
export const DEFAULT_CLAUSES = {
  paymentPedagogico: `* O compromisso com a vaga se confirma com o pagamento da primeira parcela até o vencimento.
* Após esse prazo, a vaga fica sujeita à disponibilidade, mesmo para quem deseja pagar à vista.
* Caso opte por pagamento A VISTA (valor integral) o mesmo deve ser efetuado na data de vencimento da primeira parcela.
* A garantia da vaga está condicionada ao pagamento da primeira parcela no prazo estipulado. Caso o pagamento não seja identificado, a inscrição será cancelada, e qualquer nova contratação estará sujeita à disponibilidade e reajuste de preço.`,
  
  payment: `* O compromisso e a garantia da vaga se confirmam exclusivamente mediante a identificação do pagamento da primeira parcela (ou valor integral) até a data de vencimento.
* Caso o pagamento da primeira parcela não seja realizado até a data de vencimento, a vaga será cancelada automaticamente e liberada de imediato para o próximo participante da lista de espera.
* Caso opte pelo pagamento À VISTA, o valor integral deve ser efetuado impreterivelmente na data de vencimento da primeira parcela.`,
  
  cancelationPedagogico: `* Em caso de desistência do aluno antes de 20 dias da viagem: devolução de 80% (oitenta por cento) do valor pago até o momento.
* A dedução dos 20% do valor pago refere-se às taxas administrativas cobradas pelo sistema que gera as cobranças.
* Em caso de desistência do aluno 10 dias antes da viagem: devolução de 50% (cinquenta por cento) do valor pago, pois implicará no pagamento parcial dos serviços contratados.
* Em caso de desistência do aluno no prazo de 7 dias ou menos: não haverá devolução de valores, pois implicará no pagamento total dos serviços contratados.
* Caso a desistência seja em decorrência de problemas de saúde (comprovado com atestado médico vigente no dia da viagem): será realizada a devolução de 65% (sessenta e se cento) do valor pago, no prazo máximo de 15 dias.
* O ATESTADO MÉDICO DEVERÁ SER ENVIADO PARA O E-MAIL INFORMADO, NO PRAZO MÁXIMO DE 15 (QUINZE MINUTOS) APÓS O HORÁRIO DETERMINADO PARA A SAÍDA DO PASSEIO.
* O pedido de cancelamento somente será considerado se formalizado por escrito (e-mail) para: financeiro@patitour.com.br`,
  
  cancelation: `* Em caso de desistência formalizada pelo contratante em até 20 dias antes da data da viagem: haverá a devolução de 80% (oitenta por cento) do valor pago até o momento. A retenção de 20% refere-se às taxas administrativas e operacionais de cobrança.
* Em caso de desistência formalizada pelo contratante entre 19 e 10 dias antes da viagem: haverá a devolução de 50% (cinquenta por cento) do valor pago, tendo em vista os compromissos e pagamentos parciais já firmados com os fornecedores e prestadores de serviço.
* Em caso de desistência formalizada pelo contratante no prazo de 7 dias ou menos da data da viagem: não haverá devolução de valores, visto que a vaga e os serviços já estarão integralmente quitados junto aos parceiros logísticos.
* Desistência por Motivo de Saúde: Caso a desistência ocorra por razões médicas devidamente comprovadas por atestado médico, será realizada a devolução de 65% (sessenta e cinco por cento) do valor pago, em um prazo de até 15 dias úteis. 
* O atestado médico deverá ser enviado para o e-mail oficial da agência no prazo máximo de até 15 (quinze) minutos após o horário determinado para a saída da viagem.
* Todo e qualquer pedido de cancelamento ou reembolso só será considerado válido se formalizado por escrito através do e-mail: financeiro@patitour.com.br.`,
  
  pcdPedagogico: `Política de Descontos e Benefícios para Pessoas com Deficiência (PCD):
* A Agência informa que os valores praticados para excursões escolares já são reduzidos e exclusivos para grupos, visando possibilitar a participação do maior número de alunos.
* Nos casos em que os atrativos visitados ofereçam benefícios legais (como gratuidade ou meia-entrada para Pessoas com Deficiência - PCD - e/ou seus acompanhantes), tais condições serão respeitadas e repassadas diretamente ao responsável no valor do ingresso.
* Quando o atrativo não disponibilizar descontos específicos, prevalecerá a tarifa reduzida já aplicada ao grupo, não sendo possível conceder abatimentos adicionais por parte da Agência.`,
  
  pcd: `* A Agência informa que os valores praticados para esta excursão já são negociados em tarifas promocionais exclusivas para grupos.
* Nos casos em que os atrativos visitados ou eventos ofereçam benefícios legais de gratuidade ou meia-entrada para Pessoas com Deficiência (PCD) e/ou seus acompanhantes, tais condições serão estritamente respeitadas e o respectivo desconto será repassado diretamente no valor final do pacote.
* Caso o atrativo ou o evento de destino não disponibilize descontos específicos para o formato do grupo contratado, prevalecerá a tarifa regular aplicada à excursão, não sendo possível a concessão de abatimentos adicionais por parte da Agência.`,
  
  regrasPedagogico: `* ATENÇÃO!! A agência NÃO assume responsabilidade por quaisquer objetos perdidos durante a viagem.
* A autorização assinada deve ser enviada para o Colégio até a data estipulada em contrato juntamente com uma cópia autentica do documento do aluno (RG, ou Certidão de Nascimento).
* As imagens feitas durante a viagem serão utilizadas em redes sociais para registro das atividades, e não serão utilizadas para fins comerciais da agência.
* Autorização e preenchimento de cadastros, sem efetivação de pagamento dentro dos prazos estabelecidos não garantem vaga.
* Em caso de alteração de roteiro ou data por força maior, será feita a devolução integral se o aluno desistir em até 24h após a notificação.
* Não é permitido bebida alcoólica, ou energética.
* O uso do uniforme é obrigatório no dia da viagem.
* Tolerância de espera no embarque: 15 minutos após o horário marcado de saída.
* SOBRE A VALIDADE DO CONTRATO: A assinatura deste documento ou o preenchimento da pesquisa de interesse NÃO garantem a vaga do aluno. A confirmação da vaga só ocorre mediante o pagamento da primeira parcela dentro do prazo estipulado.
A ausência de pagamento da primeira parcela ou o atraso das parcelas subsequentes, sem comunicação prévia, resultará na extinção automática e imediata deste contrato, liberando a vaga para a lista de espera, não cabendo reembolso dos valores pagos até o momento.`,
  
  regras: ``,

  regrasTv: `REGRAS GERAIS E PARTICIPAÇÃO EM PROGRAMA DE TV
* Normas da Emissora de TV: O contratante declara estar ciente de que a participação na gravação do programa de televisão está sujeita às regras rígidas de segurança, comportamento e vestuário (dress code) determinadas pela própria emissora (ex: proibição de roupas com marcas expostas ou mensagens políticas/comerciais). O descumprimento dessas regras pode acarretar o veto da entrada do participante nos estúdios, sem direito a qualquer tipo de reembolso por parte da agência.
* Direito e Uso de Imagem: Ao participar desta viagem e ingressar nas dependências da emissora de televisão, o contratante autoriza de forma gratuita, irrevogável e por prazo indeterminado, a cessão dos direitos de uso de sua imagem e voz, que poderão ser captadas durante a gravação e exibidas no programa de TV, bem como utilizadas nas redes sociais da Agência para fins de registro e portfólio de atividades.
* Pontualidade e Embarque: O horário marcado para a saída é definitivo. Será tolerado um atraso máximo de 15 minutos no embarque. O não comparecimento dentro deste prazo será considerado "No Show" (desistência sem aviso), implicando na perda da viagem e do valor pago, sem direito a reembolso, visando não comprometer o horário de chegada exigido pela produção da TV.
* Bagagens e Pertences: A agência NÃO se responsabiliza por quaisquer objetos, eletroeletrônicos, documentos ou pertences pessoais esquecidos, perdidos ou extraviados durante o trajeto, nos veículos de transporte ou nas dependências da emissora de TV.
* Substâncias Proibidas: É expressamente proibido o consumo de bebidas alcoólicas, energéticos ou substâncias ilícitas no interior do veículo de transporte durante todo o percurso da viagem.
* Alterações por Força Maior: Em caso de alteração do roteiro, data ou cancelamento da gravação por parte da emissora de TV ou motivos de força maior (condições climáticas, segurança pública, etc.), o cliente poderá optar pela devolução integral dos valores se manifestar a desistência em até 24 horas após a notificação oficial enviada pela agência.`,
  
  documentacaoPedagogico: `* Documentação necessária para o embarque: Autorização enviada pela escola, preenchida e assinada juntamente com uma cópia autentica do documento RG ou certidão de nascimento do aluno.`,
  
  documentacao: `* É obrigatória a apresentação de documento de identidade oficial original com foto (RG, CNH ou Passaporte) em perfeito estado de conservação no momento do embarque.
* O passageiro que não apresentar a documentação regular exigida pelas autoridades de trânsito e pela segurança da emissora de TV será impedido de embarcar, eximindo a agência de qualquer responsabilidade ou obrigatoriedade de reembolso.`
};

// Default Included Items Text
export const DEFAULT_INCLUDED_ITEMS = `- Desenvolvimento das atividades conforme cronograma
- Monitores especializados da Patitour (2 por ônibus, com rádios comunicadores)
- Monitores com curso de Primeiros Socorros
- Kit de Primeiros socorros
- Seguro viagem
- Transporte (ônibus, 46 lugares, com ar condicionado)
- 2 professores acompanhantes por ônibus
- Atividades no local de visita, com monitoria local
- Ingressos para as atrações
- Agendamento para visita monitorada
- Alimentação`;

export interface TripDefaults {
  includedItems: string;
  foodText: string;
  activitiesText: string;
  clauses: {
    paymentPedagogico: string;
    payment: string;
    cancelationPedagogico: string;
    cancelation: string;
    pcdPedagogico: string;
    pcd: string;
    regrasPedagogico: string;
    regras: string;
    regrasTv: string;
    documentacaoPedagogico: string;
    documentacao: string;
  };
  activeClauses: string[];
  showPaymentAlert1: boolean;
  showPaymentAlert2: boolean;
  showPaymentAlert3: boolean;
  requiredFields: Trip['requiredFields'];
}

export const SYSTEM_DEFAULT_TRIP_DEFAULTS: TripDefaults = {
  includedItems: DEFAULT_INCLUDED_ITEMS,
  foodText: '',
  activitiesText: '',
  clauses: { ...DEFAULT_CLAUSES },
  activeClauses: [
    'paymentPedagogico',
    'cancelationPedagogico',
    'pcdPedagogico',
    'regrasPedagogico',
    'documentacaoPedagogico'
  ],
  showPaymentAlert1: true,
  showPaymentAlert2: true,
  showPaymentAlert3: true,
  requiredFields: {
    studentCpf: true,
    studentRg: true,
    studentBirthDate: true,
    studentGender: true,
    studentClass: true,
    medicalPreExisting: true,
    medicalAllergies: true,
    medicalDietary: true,
    medicalPcd: true,
    medicalBehavioral: true,
    parentCpf: true,
    parentRg: true,
    parentPhone: true,
    parentEmail: true,
    parentAddress: true,
    payerDifferent: true
  }
};

export const INITIAL_TRIPS: Trip[] = [
  {
    id: 'estudo-meio-1-anos',
    active: true,
    title: 'ESTUDO DO MEIO - 1 ANOS',
    school: 'SESI 422 AMERICANA',
    destination: 'TERRA DE GIGANTES SALTO SP',
    date: '2026-11-10',
    departureTime: '07:00',
    returnTime: '18:00',
    price: 396.21,
    maxInstallments: 3,
    customDueDates: [
      { date: '2026-07-20', amount: 132.07 },
      { date: '2026-08-20', amount: 132.07 },
      { date: '2026-09-20', amount: 132.07 },
    ],
    allowedClasses: ['1 ANO A', '1 ANO B', '1 ANO C', '1 ANO D'],
    includedItems: DEFAULT_INCLUDED_ITEMS,
    foodText: `* Café da manhã – leite, achocolatado, suco natural de laranja, bisnaga com peito de peru, queijo e requeijão, bolo de cenoura com cobertura de chocolate e frutas da época.
* Almoço – arroz, feijão, macarrão com molho à bolonhesa, carne de panela com legumes, arroz com brócolis, frango em cubos, purê de batatas, super salada com produtos colhidos da fazenda, suco natural de limão e de sobremesa um sorvete.
* Lanche da tarde – pão de queijo, bolo formigueiro, rosquinhas de coco, frutas da época e suco natural de limão.`,
    activitiesText: `- Chegada, apresentação do espaço e divisão dos grupos. - Roda do Conhecimento. - Visita na área de produção, onde irão semear, plantar e conhecer as características das plantas, visitando a área de produção. - Visita e alimentação dos animais da fazenda: vaca, coelho, peru, pavão, carneiro, gansos, marrecos, galinhas, codornas e pôneis. - Visita ao minhocário. - Atividade na "Cozinha da Turminha Saudável", onde os próprios alunos irão elaborar uma salada divertida. - Teatro do Professor Abobrinha. - Labirinto. - Passeio de trator. - Mini tirolesa - Painel de fotos. - Visita na lojinha "Salada e Cia.", com produtos e doces da fazenda e artesanato local.`,
    clauses: { ...DEFAULT_CLAUSES },
    requiredFields: {
      studentCpf: true,
      studentRg: true,
      studentBirthDate: true,
      studentGender: true,
      studentClass: true,
      medicalPreExisting: true,
      medicalAllergies: true,
      medicalDietary: true,
      medicalPcd: true,
      medicalBehavioral: true,
      parentCpf: true,
      parentRg: true,
      parentPhone: true,
      parentEmail: true,
      parentAddress: true,
      payerDifferent: true
    }
  },
  {
    id: 'estudo-meio-2-anos',
    active: true,
    title: 'ESTUDO DO MEIO - 2 ANOS',
    school: 'SESI 422 AMERICANA',
    destination: 'MARIA FUMAÇA CAMPINAS SP',
    date: '2026-10-20',
    departureTime: '07:30',
    returnTime: '17:30',
    price: 340.00,
    maxInstallments: 2,
    customDueDates: [
      { date: '2026-08-10', amount: 170.00 },
      { date: '2026-09-10', amount: 170.00 },
    ],
    allowedClasses: ['2 ANO A', '2 ANO B', '2 ANO C'],
    includedItems: DEFAULT_INCLUDED_ITEMS,
    foodText: `* Café da manhã e lanche da tarde inclusos. Almoço self-service na fazenda histórica do roteiro.`,
    activitiesText: `Passeio de Maria Fumaça histórica, explicações sobre a era do café e do império no Brasil, atividades pedagógicas ligadas à história regional.`,
    clauses: { ...DEFAULT_CLAUSES },
    requiredFields: {
      studentCpf: false, // APENAS NOME E TURMA CONFIGURADOS PARA ESSA VIAGEM!
      studentRg: false,
      studentBirthDate: true,
      studentGender: true,
      studentClass: true,
      medicalPreExisting: true,
      medicalAllergies: true,
      medicalDietary: false,
      medicalPcd: true,
      medicalBehavioral: false,
      parentCpf: true,
      parentRg: false,
      parentPhone: true,
      parentEmail: true,
      parentAddress: true,
      payerDifferent: false
    }
  },
  {
    id: 'estudo-meio-5-anos',
    active: false, // LINK DESATIVADO
    title: 'ESTUDO DO MEIO - 5º ANOS',
    school: 'SESI 422 AMERICANA',
    destination: 'ANIMALIA PARK COTIA SP',
    date: '2026-11-12',
    departureTime: '06:00',
    returnTime: '20:00',
    price: 450.00,
    maxInstallments: 4,
    customDueDates: [
      { date: '2026-07-15', amount: 112.50 },
      { date: '2026-08-15', amount: 112.50 },
      { date: '2026-09-15', amount: 112.50 },
      { date: '2026-10-15', amount: 112.50 },
    ],
    allowedClasses: ['5º ANO A', '5º ANO B', '5º ANO C'],
    includedItems: DEFAULT_INCLUDED_ITEMS,
    clauses: { ...DEFAULT_CLAUSES },
    requiredFields: {
      studentCpf: true,
      studentRg: true,
      studentBirthDate: true,
      studentGender: true,
      studentClass: true,
      medicalPreExisting: true,
      medicalAllergies: true,
      medicalDietary: true,
      medicalPcd: true,
      medicalBehavioral: true,
      parentCpf: true,
      parentRg: true,
      parentPhone: true,
      parentEmail: true,
      parentAddress: true,
      payerDifferent: true
    }
  }
];

export const INITIAL_REGISTRATIONS: Registration[] = [
  {
    id: 'reg-1',
    tripId: 'estudo-meio-1-anos',
    signedAt: '2026-06-20T14:30:00Z',
    status: 'PENDENTE',
    student: {
      name: 'GFDG',
      cpf: '286.202.078-81',
      rg: '489574935843',
      birthDate: '1980-10-26', // As in screen
      gender: 'FEMININO',
      classGroup: '1 ANO B'
    },
    medical: {
      preExisting: false,
      allergies: false,
      dietary: false,
      pcd: false,
      behavioral: 'Tudo ok'
    },
    parent: {
      name: 'Patricia Guimaraes',
      cpf: '286.202.078-81',
      rg: '489574935',
      phone: '(19) 99747-4575',
      email: 'pati.blog.br@gmail.com',
      address: 'Rua Bertioga 846'
    },
    payer: {
      different: false,
      name: 'Patricia Guimaraes',
      cpf: '286.202.078-81'
    },
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><path d="M 10 30 Q 30 10 50 30 T 90 30" stroke="green" stroke-width="2" fill="none"/></svg>',
    payments: [
      { id: 'pay-1-1', installmentNumber: 1, amount: 132.07, dueDate: '2026-07-20', status: 'PENDENTE' },
      { id: 'pay-1-2', installmentNumber: 2, amount: 132.07, dueDate: '2026-08-20', status: 'PENDENTE' },
      { id: 'pay-1-3', installmentNumber: 3, amount: 132.07, dueDate: '2026-09-20', status: 'PENDENTE' },
    ]
  },
  {
    id: 'reg-2',
    tripId: 'estudo-meio-1-anos',
    signedAt: '2026-06-22T09:15:00Z',
    status: 'PAGO',
    student: {
      name: 'Arthur Silva Costa',
      cpf: '456.789.012-34',
      rg: '39.845.122-X',
      birthDate: '2019-04-12',
      gender: 'MASCULINO',
      classGroup: '1 ANO A'
    },
    medical: {
      preExisting: true,
      preExistingDetails: 'Bronquite asmática (usa bombinha de resgate se necessário)',
      allergies: true,
      allergiesDetails: 'Alergia a picada de insetos',
      dietary: false,
      pcd: false,
    },
    parent: {
      name: 'Mariana Silva Costa',
      cpf: '123.456.789-00',
      rg: '12.345.678-9',
      phone: '(19) 98844-3321',
      email: 'mariana.costa@gmail.com',
      address: 'Av. Paulista 1000, Americana - SP'
    },
    payer: {
      different: true,
      name: 'Roberto Costa',
      cpf: '987.654.321-00'
    },
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><path d="M 5 25 Q 25 35 45 15 T 85 25" stroke="green" stroke-width="2" fill="none"/></svg>',
    payments: [
      { id: 'pay-2-1', installmentNumber: 1, amount: 132.07, dueDate: '2026-07-20', status: 'PAGO', paymentDate: '2026-06-22' },
      { id: 'pay-2-2', installmentNumber: 2, amount: 132.07, dueDate: '2026-08-20', status: 'PAGO', paymentDate: '2026-06-22' },
      { id: 'pay-2-3', installmentNumber: 3, amount: 132.07, dueDate: '2026-09-20', status: 'PAGO', paymentDate: '2026-06-22' },
    ]
  },
  {
    id: 'reg-3',
    tripId: 'estudo-meio-2-anos',
    signedAt: '2026-06-18T16:45:00Z',
    status: 'ATRASADO',
    student: {
      name: 'Beatriz Santos',
      birthDate: '2018-09-05',
      gender: 'FEMININO',
      classGroup: '2 ANO C'
    },
    medical: {
      preExisting: false,
      allergies: false,
      dietary: true,
      dietaryDetails: 'Intolerância a lactose (não consome derivados)',
      pcd: false,
    },
    parent: {
      name: 'Juliana Santos',
      cpf: '333.444.555-66',
      phone: '(19) 99122-8877',
      email: 'juliana.santos@outlook.com',
      address: 'Rua das Flores 120, Americana - SP'
    },
    payer: {
      different: false
    },
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><path d="M 10 40 L 40 10 L 70 35 L 90 20" stroke="green" stroke-width="2" fill="none"/></svg>',
    payments: [
      { id: 'pay-3-1', installmentNumber: 1, amount: 170.00, dueDate: '2026-06-10', status: 'ATRASADO' },
      { id: 'pay-3-2', installmentNumber: 2, amount: 170.00, dueDate: '2026-07-10', status: 'PENDENTE' },
    ]
  }
];

export const getActiveClausesList = (trip: Trip) => {
  const list: { id: string; title: string; text: string }[] = [];
  const active = trip.activeClauses || ['paymentPedagogico', 'cancelationPedagogico', 'pcdPedagogico', 'regrasPedagogico', 'documentacaoPedagogico'];
  
  const titles: Record<string, string> = {
    paymentPedagogico: "Condições de Pagamento e Vagas -pedagogico",
    payment: "Condições de Pagamento e Vagas",
    cancelationPedagogico: "Política de Cancelamento -pedagogico",
    cancelation: "Política de Cancelamento",
    pcdPedagogico: "Regulamento PCD -pedagogico",
    pcd: "Regulamento PCD",
    regrasPedagogico: "Regras Gerais -pedagogico",
    regras: "Regras Gerais",
    regrasTv: "Regras Gerais e Participação em Programa de TV",
    documentacaoPedagogico: "Documentação de Embarque -pedagogico",
    documentacao: "Documentação de Embarque"
  };

  const keys = [
    { key: 'paymentPedagogico', defaultKey: 'payment' },
    { key: 'payment' },
    { key: 'cancelationPedagogico', defaultKey: 'cancelation' },
    { key: 'cancelation' },
    { key: 'pcdPedagogico', defaultKey: 'pcd' },
    { key: 'pcd' },
    { key: 'regrasPedagogico', defaultKey: 'regras' },
    { key: 'regras' },
    { key: 'regrasTv' },
    { key: 'documentacaoPedagogico', defaultKey: 'documentacao' },
    { key: 'documentacao' }
  ];

  keys.forEach(({ key, defaultKey }) => {
    if (active.includes(key)) {
      let text = (trip.clauses as any)[key];
      if ((text === undefined || text === null) && defaultKey && !trip.activeClauses) {
        text = (trip.clauses as any)[defaultKey];
      }
      if (text && text.trim() !== '') {
        list.push({
          id: key,
          title: titles[key] || key,
          text: text.trim()
        });
      }
    }
  });

  return list;
};
