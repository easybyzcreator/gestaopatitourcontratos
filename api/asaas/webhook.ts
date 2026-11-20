import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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
  // Support CORS
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
    const eventData = req.body;
    console.log("Received Asaas Webhook Event in serverless handler:", eventData?.event, "Id:", eventData?.id);

    if (!eventData || !eventData.event || !eventData.payment) {
      return res.status(400).json({ error: "Invalid webhook payload structure." });
    }

    const payment = eventData.payment;
    const paymentId = payment.id; // pay_xxxxxxxx
    const status = payment.status; // e.g., "RECEIVED", "CONFIRMED", etc.
    const externalReference = payment.externalReference; // e.g., "reg-xxxxxxx"

    console.log(`Asaas Payment Notification in serverless handler: ID=${paymentId}, Status=${status}, ExtRef=${externalReference}`);

    // We only care about payments that are paid/received/confirmed
    const isPaid = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status);

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
              // If the webhook status is paid, set the status to "PAGO"
              const newStatus = isPaid ? "PAGO" : "PENDENTE";
              if (p.status !== newStatus) {
                p.status = newStatus;
                updated = true;
                console.log(`Updated payment status of registration ${externalReference} to ${newStatus}`);
              }
            }
            return p;
          });
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
    console.error("Error processing Asaas webhook in serverless handler:", err);
    return res.status(500).json({ error: err.message });
  }
}
