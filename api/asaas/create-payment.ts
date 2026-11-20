import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCE20hU1RhPVpOJll5yFrEyCOWQ1gtOpF0",
  authDomain: "app-contrato-gestao-patitour.firebaseapp.com",
  projectId: "app-contrato-gestao-patitour",
  storageBucket: "app-contrato-gestao-patitour.firebasestorage.app",
  messagingSenderId: "960061004285",
  appId: "1:960061004285:web:ed3734f04483a067d4e194",
  measurementId: "G-YYGVC7Z6SH"
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp);

export default async function handler(req: any, res: any) {
  // Support CORS if needed
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { payer, studentName, trip, payments: rawPayments, registrationId } = req.body;
    const apiKey = process.env.ASAAS_API_KEY;

    // Ensure all installment due dates are today or in the future in Brazil timezone
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(today);
    const brDay = Number(parts.find(p => p.type === 'day')?.value || today.getDate());
    const brMonth = Number(parts.find(p => p.type === 'month')?.value || (today.getMonth() + 1));
    const brYear = Number(parts.find(p => p.type === 'year')?.value || today.getFullYear());
    const todayBr = new Date(brYear, brMonth - 1, brDay);

    const payments = (rawPayments || []).map((p: any) => {
      if (!p.dueDate) return p;
      const [py, pm, pd] = p.dueDate.split('-').map(Number);
      const dueBr = new Date(py, pm - 1, pd);
      if (dueBr < todayBr) {
        const adjustedDate = `${brYear}-${String(brMonth).padStart(2, '0')}-${String(brDay).padStart(2, '0')}`;
        return { ...p, dueDate: adjustedDate };
      }
      return p;
    });

    if (!apiKey) {
      return res.status(400).json({ error: "Variável de ambiente ASAAS_API_KEY não configurada no servidor." });
    }

    const baseUrl = "https://api.asaas.com/v3";

    const cleanCpf = payer.cpf ? payer.cpf.replace(/\D/g, "") : "";
    const cleanPhone = (payer.phone || "").replace(/\D/g, "");
    const cleanEmail = (payer.email || "").trim().toLowerCase();

    let customerId = "";

    // 1. Search customer by CPF
    if (cleanCpf) {
      try {
        const searchCpfRes = await fetch(`${baseUrl}/customers?cpfCnpj=${cleanCpf}`, {
          method: "GET",
          headers: {
            "access_token": apiKey,
            "Content-Type": "application/json"
          }
        });
        if (searchCpfRes.ok) {
          const searchData = await searchCpfRes.json();
          if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
            console.log("Customer found by CPF in Asaas:", customerId);
          }
        }
      } catch (err) {
        console.error("Error searching customer by CPF in Asaas:", err);
      }
    }

    // 2. Search customer by Email if not found by CPF
    if (!customerId && cleanEmail) {
      try {
        const searchEmailRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(cleanEmail)}`, {
          method: "GET",
          headers: {
            "access_token": apiKey,
            "Content-Type": "application/json"
          }
        });
        if (searchEmailRes.ok) {
          const searchData = await searchEmailRes.json();
          if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
            console.log("Customer found by Email in Asaas:", customerId);
          }
        }
      } catch (err) {
        console.error("Error searching customer by Email in Asaas:", err);
      }
    }

    // 3. Update or Create Customer
    if (customerId) {
      try {
        const updateRes = await fetch(`${baseUrl}/customers/${customerId}`, {
          method: "POST",
          headers: {
            "access_token": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: payer.name,
            cpfCnpj: cleanCpf || undefined,
            email: cleanEmail || undefined,
            phone: cleanPhone || undefined,
            mobilePhone: cleanPhone || undefined,
            address: payer.address || undefined
          })
        });
        if (!updateRes.ok) {
          console.warn("Failed to update existing customer details in Asaas:", await updateRes.text());
        }
      } catch (err) {
        console.error("Error updating Asaas customer:", err);
      }
    } else {
      const customerPayload = {
        name: payer.name,
        cpfCnpj: cleanCpf,
        email: cleanEmail,
        phone: cleanPhone,
        mobilePhone: cleanPhone,
        address: payer.address,
        notificationDisabled: false
      };

      const createRes = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers: {
          "access_token": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(customerPayload)
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        const errorMsg = errData.errors && errData.errors[0] 
          ? errData.errors[0].description 
          : "Erro desconhecido ao criar cliente no Asaas";
        return res.status(400).json({ error: `Asaas: ${errorMsg}` });
      }

      const customerData = await createRes.json();
      customerId = customerData.id;
      console.log("Created new customer in Asaas:", customerId);
    }

    // 4. Create payments/charges
    const createdPayments = [];

    if (payments.length === 1) {
      const p = payments[0];
      const descriptionParts = [
        `Aluno: ${studentName || "N/A"}`,
        trip.school ? `Escola: ${trip.school}` : "",
        trip.title ? `Viagem: ${trip.title}` : "",
        trip.destination ? `Destino: ${trip.destination}` : "",
        trip.date ? `Data da Viagem: ${trip.date}` : "",
        `Parcela Única`
      ].filter(Boolean);
      const description = descriptionParts.join(" | ").substring(0, 255);

      const paymentPayload = {
        customer: customerId,
        billingType: "BOLETO",
        value: Number(p.amount.toFixed(2)),
        dueDate: p.dueDate,
        description,
        externalReference: registrationId,
        postalService: false
      };

      const payRes = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          "access_token": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(paymentPayload)
      });

      if (!payRes.ok) {
        const errData = await payRes.json().catch(() => ({}));
        const errorMsg = errData.errors && errData.errors[0] 
          ? errData.errors[0].description 
          : "Erro ao gerar cobrança única no Asaas";
        return res.status(400).json({ error: `Asaas: ${errorMsg}` });
      }

      const payData = await payRes.json();
      createdPayments.push({
        id: p.id,
        installmentNumber: 1,
        asaasId: payData.id,
        invoiceUrl: payData.invoiceUrl,
        bankSlipUrl: payData.bankSlipUrl,
        amount: payData.value,
        dueDate: payData.dueDate,
        status: "PENDENTE"
      });
    } else {
      // Multi-installment payment
      // For precision and to guarantee custom due dates and custom installment amounts match perfectly,
      // we generate individual payments in Asaas with the exact custom due dates and amounts.
      // This completely avoids any arbitrary Asaas automatic monthly scheduling restrictions.
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        const descriptionParts = [
          `Aluno: ${studentName || "N/A"}`,
          trip.school ? `Escola: ${trip.school}` : "",
          trip.title ? `Viagem: ${trip.title}` : "",
          trip.destination ? `Destino: ${trip.destination}` : "",
          trip.date ? `Data da Viagem: ${trip.date}` : "",
          `Parcela ${i + 1} de ${payments.length}`
        ].filter(Boolean);

        const baseDesc = descriptionParts.join(" | ");

        // Build schedule string
        const scheduleParts = payments.map((pm, idx) => {
          const dateParts = pm.dueDate.split('-');
          const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : pm.dueDate;
          const formattedAmount = `R$ ${Number(pm.amount).toFixed(2).replace('.', ',')}`;
          return `${idx + 1}ª ${formattedDate} (${formattedAmount})`;
        });
        const scheduleString = ` | Parcelas: ${scheduleParts.join(" / ")}`;

        const description = (baseDesc + scheduleString).substring(0, 255);

        const paymentPayload = {
          customer: customerId,
          billingType: "BOLETO",
          value: Number(p.amount.toFixed(2)),
          dueDate: p.dueDate,
          description,
          externalReference: registrationId,
          postalService: false
        };

        const payRes = await fetch(`${baseUrl}/payments`, {
          method: "POST",
          headers: {
            "access_token": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(paymentPayload)
        });

        if (!payRes.ok) {
          const errData = await payRes.json().catch(() => ({}));
          const errorMsg = errData.errors && errData.errors[0] 
            ? errData.errors[0].description 
            : `Erro ao gerar parcela ${i + 1} no Asaas`;
          return res.status(400).json({ error: `Asaas: ${errorMsg}` });
        }

        const payData = await payRes.json();
        createdPayments.push({
          id: p.id,
          installmentNumber: i + 1,
          asaasId: payData.id,
          invoiceUrl: payData.invoiceUrl,
          bankSlipUrl: payData.bankSlipUrl,
          amount: payData.value,
          dueDate: payData.dueDate,
          status: "PENDENTE"
        });
      }
    }

    return res.status(200).json({
      success: true,
      customerId,
      payments: createdPayments,
      redirectUrl: createdPayments[0]?.invoiceUrl || ""
    });

  } catch (error: any) {
    console.error("API error in serverless create-payment handler:", error);
    return res.status(500).json({ error: `Erro interno no servidor: ${error.message}` });
  }
}
