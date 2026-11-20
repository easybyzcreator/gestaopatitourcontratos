import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyCE20hU1RhPVpOJll5yFrEyCOWQ1gtOpF0",
  authDomain: "app-contrato-gestao-patitour.firebaseapp.com",
  projectId: "app-contrato-gestao-patitour",
  storageBucket: "app-contrato-gestao-patitour.firebasestorage.app",
  messagingSenderId: "960061004285",
  appId: "1:960061004285:web:ed3734f04483a067d4e194",
  measurementId: "G-YYGVC7Z6SH"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Asaas integration
  app.post("/api/asaas/create-payment", async (req, res) => {
    try {
      const { payer, studentName, trip, payments, registrationId } = req.body;
      const apiKey = process.env.ASAAS_API_KEY;

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
          fine: { value: 2, type: "PERCENTAGE" },
          interest: { value: 1 },
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
            fine: { value: 2, type: "PERCENTAGE" },
            interest: { value: 1 },
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

      return res.json({
        success: true,
        customerId,
        payments: createdPayments,
        redirectUrl: createdPayments[0]?.invoiceUrl || ""
      });

    } catch (error: any) {
      console.error("API error in server.ts:", error);
      return res.status(500).json({ error: `Erro interno no servidor: ${error.message}` });
    }
  });

  // API Route for Asaas webhook notifications
  app.post(["/api/asaas/webhook", "/api/asaas"], async (req, res) => {
    try {
      const eventData = req.body;
      console.log("Received Asaas Webhook Event:", eventData?.event, "Id:", eventData?.id);

      if (!eventData || !eventData.event || !eventData.payment) {
        return res.status(400).json({ error: "Invalid webhook payload structure." });
      }

      const payment = eventData.payment;
      const paymentId = payment.id; // pay_xxxxxxxx
      const status = payment.status; // e.g., "RECEIVED", "CONFIRMED", etc.
      const externalReference = payment.externalReference; // e.g., "reg-xxxxxxx"
      const rawPaidValue = Number(payment.value);
      const hasValidPaidValue = !isNaN(rawPaidValue) && rawPaidValue > 0;
      const paidDate = payment.clientPaymentDate || payment.paymentDate || payment.confirmedDate || new Date().toISOString().split("T")[0];

      console.log(`Asaas Payment Notification: ID=${paymentId}, Event=${eventData.event}, Status=${status}, Value=${payment.value}, ExtRef=${externalReference}`);

      // Check both event name and payment status for paid confirmation
      const isPaid =
        ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(eventData.event) ||
        ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status);

      if (externalReference) {
        // Retrieve the registration document from Firestore
        const regDocRef = doc(db, "registrations", externalReference);
        const regSnapshot = await getDoc(regDocRef);

        if (regSnapshot.exists()) {
          const regData = regSnapshot.data();
          let updated = false;

          // Map through the payments array inside the registration
          if (regData.payments && Array.isArray(regData.payments)) {
            regData.payments = regData.payments.map((p: any) => {
              if (p.asaasId === paymentId) {
                const newStatus = isPaid ? "PAGO" : "PENDENTE";
                if (p.status !== newStatus) {
                  p.status = newStatus;
                  updated = true;
                  console.log(`Updated payment status of registration ${externalReference} to ${newStatus}`);
                }
                if (isPaid) {
                  if (hasValidPaidValue && p.paidAmount !== rawPaidValue) {
                    p.paidAmount = rawPaidValue;
                    updated = true;
                    console.log(`Saved effective paidAmount=${rawPaidValue} for registration ${externalReference}`);
                  }
                  if (!p.paymentDate && paidDate) {
                    p.paymentDate = paidDate;
                    updated = true;
                  }
                }
              }
              return p;
            });

            if (updated) {
              const allPaid = regData.payments.length > 0 && regData.payments.every((p: any) => p.status === "PAGO");
              const hasOverdue = regData.payments.some((p: any) => p.status === "ATRASADO");
              regData.status = allPaid ? "PAGO" : hasOverdue ? "ATRASADO" : "PENDENTE";
            }
          }

          if (updated) {
            // Remove any undefined fields recursively to prevent setDoc failures
            const cleanUndefinedLocal = (obj: any): any => {
              if (obj === null || obj === undefined) return obj;
              if (Array.isArray(obj)) return obj.map(cleanUndefinedLocal);
              if (typeof obj === 'object') {
                const cleaned: any = {};
                for (const k of Object.keys(obj)) {
                  const val = obj[k];
                  if (val !== undefined) cleaned[k] = cleanUndefinedLocal(val);
                }
                return cleaned;
              }
              return obj;
            };

            await setDoc(regDocRef, cleanUndefinedLocal(regData));
            console.log(`Successfully updated Firestore for registration ${externalReference}`);
          } else {
            console.log(`Payment status in registration ${externalReference} was already up to date.`);
          }
        } else {
          console.warn(`Registration with ID ${externalReference} not found in Firestore.`);
        }
      } else {
        console.warn(`No externalReference found in Asaas webhook payload. Cannot associate with any registration.`);
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("Error processing Asaas webhook:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
