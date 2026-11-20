import React, { useState, useEffect } from 'react';
import { Trip, Registration, AsaasConfig, TripDefaults, SYSTEM_DEFAULT_TRIP_DEFAULTS, INITIAL_TRIPS, INITIAL_REGISTRATIONS } from './types';
import AdminPanel from './components/AdminPanel';
import TripForm from './components/TripForm';
import ClientForm from './components/ClientForm';
import { ArrowLeft, HelpCircle, Loader2, Lock, Eye, EyeOff, ShieldAlert, Check } from 'lucide-react';
import { db, OperationType, handleFirestoreError, cleanUndefined } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export default function App() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [asaasConfig, setAsaasConfig] = useState<AsaasConfig>({
    apiKey: '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmIzY2RkZDY5LTNkMTMtNGQxMi1hNzI2LWEyZjM4NjhmMzU4MTo6JGFhY2hfMDU1MTM1YTgtN2NlNi00MDcwLTgwNTQtMjM5YThhMzQ4Yzg5',
    environment: 'production',
    enabled: true
  });
  const [tripDefaults, setTripDefaults] = useState<TripDefaults>(() => {
    try {
      const cached = localStorage.getItem('patitour_trip_defaults');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...SYSTEM_DEFAULT_TRIP_DEFAULTS,
          ...parsed,
          clauses: { ...SYSTEM_DEFAULT_TRIP_DEFAULTS.clauses, ...(parsed.clauses || {}) },
          requiredFields: { ...SYSTEM_DEFAULT_TRIP_DEFAULTS.requiredFields, ...(parsed.requiredFields || {}) }
        };
      }
    } catch {
      // Ignore invalid cache
    }
    return SYSTEM_DEFAULT_TRIP_DEFAULTS;
  });
  
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // App routing state
  // 'admin' | 'create-trip' | 'edit-trip' | 'client-view'
  const [view, setView] = useState<'admin' | 'create-trip' | 'edit-trip' | 'client-view'>('admin');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | undefined>(undefined);
  const [isClientRegistrationFinished, setIsClientRegistrationFinished] = useState<boolean>(false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('patitour_admin_authenticated') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Parse URL query parameter "?trip=..." on mount
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const tripParam = params.get('trip');
    if (tripParam) {
      // Find trip
      const found = trips.find(t => t.id === tripParam);
      if (found) {
        setSelectedTripId(tripParam);
        setView('client-view');
      }
    }
  }, [trips, loading]);

  // Real-time Firestore synchronization
  useEffect(() => {
    let isSubscribed = true;

    // Helper to seed initial data if collections are empty
    const seedInitialData = async () => {
      try {
        console.log("Seeding initial data into Firestore...");
        for (const trip of INITIAL_TRIPS) {
          await setDoc(doc(db, 'trips', trip.id), cleanUndefined({
            ...trip,
            clauses: {
              regrasTv: '',
              ...trip.clauses
            }
          }));
        }
        for (const reg of INITIAL_REGISTRATIONS) {
          await setDoc(doc(db, 'registrations', reg.id), cleanUndefined(reg));
        }
      } catch (err) {
        console.error("Error seeding Firestore database:", err);
      }
    };

    // 1. Listen for Trips
    const unsubscribeTrips = onSnapshot(collection(db, 'trips'), (snapshot) => {
      if (!isSubscribed) return;
      if (snapshot.empty) {
        if (localStorage.getItem('patitour_db_seeded') === 'true') {
          setTrips([]);
        } else {
          localStorage.setItem('patitour_db_seeded', 'true');
          seedInitialData();
        }
      } else {
        localStorage.setItem('patitour_db_seeded', 'true');
        const loadedTrips: Trip[] = [];
        snapshot.forEach((docSnap) => {
          const tripData = docSnap.data() as Trip;
          let cleanRegrasTv = tripData.clauses?.regrasTv || '';
          if (cleanRegrasTv.includes('listras finas')) {
            cleanRegrasTv = cleanRegrasTv.replace(', listras finas, cores específicas', '');
          }
          loadedTrips.push({
            ...tripData,
            clauses: {
              ...tripData.clauses,
              regrasTv: cleanRegrasTv
            }
          });
        });
        setTrips(loadedTrips);
      }
    }, (error) => {
      console.error("Trips snapshot error:", error);
      if (isSubscribed) {
        setConnectionError(error.message || String(error));
        setLoading(false);
      }
    });

    // 2. Listen for Registrations
    const unsubscribeRegistrations = onSnapshot(collection(db, 'registrations'), (snapshot) => {
      if (!isSubscribed) return;
      const loadedRegs: Registration[] = [];
      snapshot.forEach((docSnap) => {
        loadedRegs.push(docSnap.data() as Registration);
      });
      setRegistrations(loadedRegs);
    }, (error) => {
      console.error("Registrations snapshot error:", error);
      if (isSubscribed) {
        setConnectionError(error.message || String(error));
        setLoading(false);
      }
    });

    // 3. Listen for Asaas Config
    const unsubscribeAsaas = onSnapshot(doc(db, 'config', 'asaas'), (snapshot) => {
      if (!isSubscribed) return;
      if (snapshot.exists()) {
        setAsaasConfig(snapshot.data() as AsaasConfig);
      } else {
        // Seed default Asaas config in production mode with key provided
        const defaultAsaas: AsaasConfig = {
          apiKey: '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmIzY2RkZDY5LTNkMTMtNGQxMi1hNzI2LWEyZjM4NjhmMzU4MTo6JGFhY2hfMDU1MTM1YTgtN2NlNi00MDcwLTgwNTQtMjM5YThhMzQ4Yzg5',
          environment: 'production',
          enabled: true
        };
        setDoc(doc(db, 'config', 'asaas'), defaultAsaas).catch(err => {
          console.error("Failed to seed default Asaas config", err);
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Asaas config snapshot error:", error);
      if (isSubscribed) {
        setConnectionError(error.message || String(error));
        setLoading(false);
      }
    });

    // 4. Listen for Trip Defaults
    const unsubscribeDefaults = onSnapshot(doc(db, 'config', 'tripDefaults'), (snapshot) => {
      if (!isSubscribed) return;
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<TripDefaults>;
        const merged: TripDefaults = {
          ...SYSTEM_DEFAULT_TRIP_DEFAULTS,
          ...data,
          clauses: { ...SYSTEM_DEFAULT_TRIP_DEFAULTS.clauses, ...(data.clauses || {}) },
          requiredFields: { ...SYSTEM_DEFAULT_TRIP_DEFAULTS.requiredFields, ...(data.requiredFields || {}) },
          activeClauses: Array.isArray(data.activeClauses) ? data.activeClauses : SYSTEM_DEFAULT_TRIP_DEFAULTS.activeClauses
        };
        setTripDefaults(merged);
        try {
          localStorage.setItem('patitour_trip_defaults', JSON.stringify(merged));
        } catch {
          // Ignore storage error
        }
      }
    }, (error) => {
      console.error("Trip defaults snapshot error:", error);
    });

    return () => {
      isSubscribed = false;
      unsubscribeTrips();
      unsubscribeRegistrations();
      unsubscribeAsaas();
      unsubscribeDefaults();
    };
  }, []);

  // Trip operations saved to Firestore
  const handleSaveTrip = async (savedTrip: Trip) => {
    // Optimistic local state update
    const finalTrip = {
      ...savedTrip,
      clauses: {
        regrasTv: '',
        ...savedTrip.clauses
      }
    };
    setTrips(prev => {
      const exists = prev.some(t => t.id === finalTrip.id);
      if (exists) {
        return prev.map(t => t.id === finalTrip.id ? finalTrip : t);
      } else {
        return [...prev, finalTrip];
      }
    });
    setView('admin');
    setEditingTrip(undefined);

    try {
      await setDoc(doc(db, 'trips', savedTrip.id), cleanUndefined(finalTrip));
    } catch (err) {
      console.error(err);
      alert(`Erro ao salvar no Firebase. Verifique se o seu Firestore Database está ativo no console do Firebase e com as regras de segurança liberadas.\n\nDetalhes do erro: ${err instanceof Error ? err.message : String(err)}`);
      handleFirestoreError(err, OperationType.WRITE, `trips/${savedTrip.id}`);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    // Optimistic local state update
    setTrips(prev => prev.filter(t => t.id !== id));
    setRegistrations(prev => prev.filter(r => r.tripId !== id));

    try {
      await deleteDoc(doc(db, 'trips', id));
      // Cascade delete registrations associated with this trip
      const assocRegs = registrations.filter(r => r.tripId === id);
      for (const reg of assocRegs) {
        await deleteDoc(doc(db, 'registrations', reg.id));
      }
    } catch (err) {
      console.error(err);
      alert(`Erro ao excluir no Firebase. Verifique as permissões de gravação/exclusão no Firestore.\n\nDetalhes do erro: ${err instanceof Error ? err.message : String(err)}`);
      handleFirestoreError(err, OperationType.DELETE, `trips/${id}`);
    }
  };

  // Registration operations saved to Firestore
  const handleAddRegistration = async (newReg: Registration) => {
    try {
      // Optimistic local state update
      setRegistrations(prev => {
        const index = prev.findIndex(r => r.id === newReg.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = newReg;
          return updated;
        }
        return [...prev, newReg];
      });
      await setDoc(doc(db, 'registrations', newReg.id), cleanUndefined(newReg));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `registrations/${newReg.id}`);
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    try {
      // Optimistic local state update
      setRegistrations(prev => prev.filter(r => r.id !== id));
      await deleteDoc(doc(db, 'registrations', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `registrations/${id}`);
    }
  };

  const handleUpdateRegistration = async (updatedReg: Registration) => {
    try {
      // Optimistic local state update
      setRegistrations(prev => {
        const index = prev.findIndex(r => r.id === updatedReg.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = updatedReg;
          return updated;
        }
        return [...prev, updatedReg];
      });
      await setDoc(doc(db, 'registrations', updatedReg.id), cleanUndefined(updatedReg));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `registrations/${updatedReg.id}`);
    }
  };

  const handleSaveTripDefaults = async (newDefaults: TripDefaults) => {
    setTripDefaults(newDefaults);
    try {
      localStorage.setItem('patitour_trip_defaults', JSON.stringify(newDefaults));
    } catch {
      // Ignore storage error
    }
    try {
      // Include apiKey/environment compatibility fields so existing Firestore /config/{configId} rules also permit this write
      await setDoc(doc(db, 'config', 'tripDefaults'), cleanUndefined({
        ...newDefaults,
        apiKey: 'system-defaults',
        environment: 'production'
      }));
    } catch (err) {
      console.error("Erro ao salvar padrões no Firestore:", err);
      alert(`Padrões salvos localmente, mas houve erro ao sincronizar com o Firebase: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] text-natural-text p-4 md:p-8">
        <div className="max-w-2xl w-full bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-red-100 animate-fadeIn">
          <div className="flex items-center gap-3 text-red-500 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="font-sans font-black text-lg md:text-xl text-gray-900 leading-tight">Configuração do Firebase Pendente</h1>
              <p className="text-xs text-gray-400 mt-0.5">O app está publicado no Vercel, mas precisa da ativação do Firestore no seu Console do Firebase.</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <p className="text-xs font-mono text-red-800 break-words">
              <strong>Detalhes do Erro Técnico:</strong> {connectionError}
            </p>
          </div>

          <h2 className="font-sans font-bold text-sm text-gray-900 mb-4 uppercase tracking-wider">Como resolver isso em 2 minutos:</h2>
          
          <div className="space-y-4 text-xs text-gray-600">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-natural-brand text-white flex items-center justify-center font-bold text-xs">1</div>
              <p className="pt-0.5">
                Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-natural-brand underline font-bold">Console do Firebase</a> e entre no seu projeto <strong>app-contrato-gestao-patitour</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-natural-brand text-white flex items-center justify-center font-bold text-xs">2</div>
              <p className="pt-0.5">
                No menu lateral esquerdo, vá em <strong>Construir / Build</strong> e clique em <strong>Firestore Database</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-natural-brand text-white flex items-center justify-center font-bold text-xs">3</div>
              <p className="pt-0.5">
                Clique no botão <strong>Criar banco de dados (Create database)</strong>, escolha a região mais próxima (ex: <code>southamerica-east1</code> ou <code>us-east1</code>) e ative.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-natural-brand text-white flex items-center justify-center font-bold text-xs">4</div>
              <p className="pt-0.5">
                Vá na aba <strong>Rules (Regras)</strong> no topo da página do Firestore. Altere as regras para liberar o acesso, cole o seguinte código e clique em <strong>Publicar (Publish)</strong>:
              </p>
            </div>

            <div className="ml-9 bg-gray-50 p-3 rounded-xl border border-gray-100 font-mono text-[11px] text-gray-700 select-all whitespace-pre">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
            </div>

            <div className="flex gap-3 pt-2">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-natural-brand text-white flex items-center justify-center font-bold text-xs">5</div>
              <p className="pt-0.5">
                Pronto! Depois de salvar e publicar as regras no Firebase, basta recarregar esta página para que seu banco de dados seja sincronizado e o aplicativo funcione perfeitamente.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="px-5 py-2.5 bg-natural-brand text-white font-bold rounded-2xl hover:bg-opacity-95 transition text-xs shadow-md"
            >
              🔄 Já configurei! Recarregar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] text-natural-text p-6">
        <Loader2 className="w-10 h-10 text-natural-brand animate-spin mb-4" />
        <p className="font-display font-black text-xs uppercase tracking-widest text-natural-brand/80">
          Sincronizando Banco de Dados Real...
        </p>
        <span className="text-[10px] text-gray-400 mt-2 font-sans">
          Conectando ao Firebase de forma segura.
        </span>
      </div>
    );
  }

  // Render login screen if accessing admin panel and not authenticated
  if (!isAdminAuthenticated && view !== 'client-view') {
    const handleLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === '1306') {
        localStorage.setItem('patitour_admin_authenticated', 'true');
        setIsAdminAuthenticated(true);
        setPasswordError('');
      } else {
        setPasswordError('Senha incorreta. Tente novamente.');
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] p-4 text-natural-text">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-natural-border/40 animate-fadeIn">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <img 
                src="https://raw.githubusercontent.com/easybyzcreator/imagens/c364de998313d54887e1ca668bbf2997f0e6e903/logo%20patitour%20-%20fundo%20transp.png" 
                alt="Patitour Logo" 
                className="h-[83px] w-auto object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="font-display font-black text-2xl text-gray-900 uppercase tracking-tight">
              Área Restrita
            </h1>
            <p className="text-xs text-gray-400 mt-1.5 font-medium leading-relaxed">
              Digite a senha mestre para acessar as ferramentas administrativas e os contratos.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  className="w-full bg-[#FAF9F6] border border-natural-border/40 rounded-2xl pl-10 pr-10 py-3.5 text-sm font-semibold text-natural-text placeholder-gray-300 focus:outline-none focus:border-natural-brand focus:ring-1 focus:ring-natural-brand transition"
                  autoFocus
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-natural-brand text-white font-bold rounded-2xl hover:bg-natural-brand-hover transition text-xs shadow-md shadow-natural-brand/10 uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Entrar no Painel
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-natural-border/30 text-center">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
              CONTRATOS PATITOUR v1.2
            </span>
            <span className="text-[9px] text-gray-300 mt-0.5 block">
              Protegido de forma segura com criptografia integrada
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans text-natural-text antialiased">
      
      {/* 1. RENDER MAIN ADMIN DASHBOARD */}
      {view === 'admin' && (
        <AdminPanel 
          trips={trips}
          registrations={registrations}
          tripDefaults={tripDefaults}
          onSaveTripDefaults={handleSaveTripDefaults}
          onAddTrip={() => {
            setEditingTrip(undefined);
            setView('create-trip');
          }}
          onEditTrip={(trip) => {
            setEditingTrip(trip);
            setView('edit-trip');
          }}
          onDeleteTrip={handleDeleteTrip}
          onUpdateRegistration={handleUpdateRegistration}
          onDeleteRegistration={handleDeleteRegistration}
          onOpenClientLink={(tripId) => {
            setSelectedTripId(tripId);
            setView('client-view');
          }}
          onLogout={() => {
            localStorage.removeItem('patitour_admin_authenticated');
            setIsAdminAuthenticated(false);
          }}
        />
      )}

      {/* 2. RENDER CREATE TRIP FORM */}
      {view === 'create-trip' && (
        <div className="p-4 md:p-8 bg-[#FAF9F6] min-h-screen">
          <TripForm 
            tripDefaults={tripDefaults}
            onSave={handleSaveTrip}
            onCancel={() => setView('admin')}
          />
        </div>
      )}

      {/* 3. RENDER EDIT TRIP FORM */}
      {view === 'edit-trip' && editingTrip && (
        <div className="p-4 md:p-8 bg-[#FAF9F6] min-h-screen">
          <TripForm 
            trip={editingTrip}
            tripDefaults={tripDefaults}
            onSave={handleSaveTrip}
            onCancel={() => {
              setView('admin');
              setEditingTrip(undefined);
            }}
          />
        </div>
      )}

      {/* 4. RENDER PUBLIC CLIENT PORTAL VIEW */}
      {view === 'client-view' && selectedTripId && (
        <div className="relative">
          {isClientRegistrationFinished ? (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] p-4 text-natural-text">
              <div className="max-w-md w-full bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-natural-border/40 text-center animate-fadeIn space-y-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <Check className="w-8 h-8" />
                </div>
                <h1 className="font-display font-black text-2xl text-gray-900 uppercase tracking-tight">
                  Cadastro Concluído!
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed font-sans">
                  Sua inscrição foi registrada com sucesso no nosso sistema. O organizador da viagem já recebeu a sua ficha assinada.
                </p>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    Patitour Turismo Pedagógico e Experiências
                  </p>
                  <p className="text-[10px] text-gray-300 mt-1">
                    Você já pode fechar esta aba com segurança.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ClientForm 
              trip={trips.find(t => t.id === selectedTripId) || trips[0]}
              asaasConfig={asaasConfig}
              onSaveRegistration={handleAddRegistration}
              onComplete={(newReg) => {
                handleAddRegistration(newReg);
                const params = new URLSearchParams(window.location.search);
                if (params.get('trip')) {
                  setIsClientRegistrationFinished(true);
                } else {
                  alert('Inscrição concluída com sucesso!');
                  setView('admin');
                  setSelectedTripId(null);
                }
              }}
            />
          )}
        </div>
      )}

    </div>
  );
}
