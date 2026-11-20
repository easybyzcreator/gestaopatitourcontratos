import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Trip, Registration, AsaasConfig, TripDefaults, SYSTEM_DEFAULT_TRIP_DEFAULTS, INITIAL_TRIPS, INITIAL_REGISTRATIONS } from './types';
import { Loader2, Lock, Eye, EyeOff, ShieldAlert, Check, RefreshCw, WifiOff } from 'lucide-react';
import { db, OperationType, handleFirestoreError, cleanUndefined } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const AdminPanel = lazy(() => import('./components/AdminPanel'));
const TripForm = lazy(() => import('./components/TripForm'));
const ClientForm = lazy(() => import('./components/ClientForm'));

const DEFAULT_ASAAS_CONFIG: AsaasConfig = {
  apiKey: '',
  environment: 'production',
  enabled: true
};

const normalizeTrip = (tripData: Trip): Trip => {
  let cleanRegrasTv = tripData.clauses?.regrasTv || '';
  if (cleanRegrasTv.includes('listras finas')) {
    cleanRegrasTv = cleanRegrasTv.replace(', listras finas, cores específicas', '');
  }
  return {
    ...tripData,
    clauses: {
      ...tripData.clauses,
      regrasTv: cleanRegrasTv
    }
  };
};

const isTransientFirestoreError = (error: unknown): boolean => {
  const errObj = error as { code?: string; message?: string } | undefined;
  const code = String(errObj?.code || '').toLowerCase();
  const msg = String(errObj?.message || error || '').toLowerCase();
  if (code === 'permission-denied' || code === 'not-found' || code === 'unimplemented') {
    return false;
  }
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'aborted' ||
    msg.includes('temporarily unavailable') ||
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('unavailable')
  );
};

export default function App() {
  const [urlTripId] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('trip');
    } catch {
      return null;
    }
  });

  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      if (urlTripId) {
        const cachedSingle = localStorage.getItem(`patitour_trip_cache_${urlTripId}`);
        if (cachedSingle) {
          return [normalizeTrip(JSON.parse(cachedSingle) as Trip)];
        }
      } else {
        const cachedAll = localStorage.getItem('patitour_trips_cache');
        if (cachedAll) {
          const parsed = JSON.parse(cachedAll);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(normalizeTrip);
          }
        }
      }
    } catch {
      // Ignore invalid cache
    }
    return [];
  });

  const [registrations, setRegistrations] = useState<Registration[]>([]);
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

  // If we already have cached trip data, render immediately while Firestore syncs in background
  const [loading, setLoading] = useState<boolean>(() => trips.length === 0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [transientError, setTransientError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState<number>(0);

  // App routing state
  const [view, setView] = useState<'admin' | 'create-trip' | 'edit-trip' | 'client-view'>(() =>
    urlTripId ? 'client-view' : 'admin'
  );
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() => urlTripId);
  const [editingTrip, setEditingTrip] = useState<Trip | undefined>(undefined);
  const [isClientRegistrationFinished, setIsClientRegistrationFinished] = useState<boolean>(false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('patitour_admin_authenticated') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle Firestore listener errors gracefully (distinguish transient network hiccups vs real permission/setup issues)
  const handleListenerError = (error: unknown) => {
    console.error("Firestore listener error:", error);
    const errMsg = (error as Error)?.message || String(error);
    if (isTransientFirestoreError(error)) {
      setTransientError(errMsg);
      setLoading(false);
    } else {
      setSetupError(errMsg);
      setLoading(false);
    }
  };

  // Auto-retry when a transient connection error occurred and no trips are loaded yet
  useEffect(() => {
    if (!transientError || trips.length > 0) return;
    const timer = setTimeout(() => {
      setRetryTick(prev => prev + 1);
    }, 3500);
    return () => clearTimeout(timer);
  }, [transientError, trips.length]);

  // 1. Fast Trip Sync:
  // - On public client link (?trip=ID), subscribe ONLY to that single trip document (avoids downloading all trips, all registrations, and base64 signatures!)
  // - On admin mode, subscribe to trips collection
  useEffect(() => {
    let isSubscribed = true;

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

    if (urlTripId) {
      const unsubscribeSingleTrip = onSnapshot(
        doc(db, 'trips', urlTripId),
        (docSnap) => {
          if (!isSubscribed) return;
          setTransientError(null);
          setSetupError(null);
          if (docSnap.exists()) {
            const normalized = normalizeTrip(docSnap.data() as Trip);
            setTrips([normalized]);
            try {
              localStorage.setItem(`patitour_trip_cache_${urlTripId}`, JSON.stringify(normalized));
            } catch {
              // Ignore storage quota error
            }
          } else {
            setTrips([]);
          }
          setLoading(false);
        },
        (error) => {
          if (!isSubscribed) return;
          handleListenerError(error);
        }
      );

      return () => {
        isSubscribed = false;
        unsubscribeSingleTrip();
      };
    }

    const unsubscribeTrips = onSnapshot(
      collection(db, 'trips'),
      (snapshot) => {
        if (!isSubscribed) return;
        setTransientError(null);
        setSetupError(null);

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
            loadedTrips.push(normalizeTrip(docSnap.data() as Trip));
          });
          setTrips(loadedTrips);
          try {
            localStorage.setItem('patitour_trips_cache', JSON.stringify(loadedTrips));
          } catch {
            // Ignore storage quota error
          }
        }
        setLoading(false);
      },
      (error) => {
        if (!isSubscribed) return;
        handleListenerError(error);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribeTrips();
    };
  }, [urlTripId, retryTick]);

  // 2. Admin-only real-time listeners (Registrations & Trip Defaults)
  // Never downloaded on public client links (?trip=...) or before admin authentication!
  useEffect(() => {
    if (urlTripId || !isAdminAuthenticated) return;
    let isSubscribed = true;

    const unsubscribeRegistrations = onSnapshot(
      collection(db, 'registrations'),
      (snapshot) => {
        if (!isSubscribed) return;
        setTransientError(null);
        const loadedRegs: Registration[] = [];
        snapshot.forEach((docSnap) => {
          loadedRegs.push(docSnap.data() as Registration);
        });
        setRegistrations(loadedRegs);
      },
      (error) => {
        if (!isSubscribed) return;
        console.error("Registrations snapshot error:", error);
        if (isTransientFirestoreError(error)) {
          setTransientError(error.message || String(error));
        } else {
          setSetupError(error.message || String(error));
        }
      }
    );

    const unsubscribeDefaults = onSnapshot(
      doc(db, 'config', 'tripDefaults'),
      (snapshot) => {
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
      },
      (error) => {
        console.error("Trip defaults snapshot error:", error);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribeRegistrations();
      unsubscribeDefaults();
    };
  }, [urlTripId, isAdminAuthenticated, retryTick]);

  // Trip operations saved to Firestore
  const handleSaveTrip = async (savedTrip: Trip) => {
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
      alert(`Erro ao salvar no Firebase. Verifique sua conexão e as regras do Firestore.\n\nDetalhes do erro: ${err instanceof Error ? err.message : String(err)}`);
      handleFirestoreError(err, OperationType.WRITE, `trips/${savedTrip.id}`);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));
    setRegistrations(prev => prev.filter(r => r.tripId !== id));

    try {
      await deleteDoc(doc(db, 'trips', id));
      const assocRegs = registrations.filter(r => r.tripId === id);
      for (const reg of assocRegs) {
        await deleteDoc(doc(db, 'registrations', reg.id));
      }
    } catch (err) {
      console.error(err);
      alert(`Erro ao excluir no Firebase. Verifique sua conexão e permissões no Firestore.\n\nDetalhes do erro: ${err instanceof Error ? err.message : String(err)}`);
      handleFirestoreError(err, OperationType.DELETE, `trips/${id}`);
    }
  };

  // Registration operations saved to Firestore
  const handleAddRegistration = async (newReg: Registration) => {
    try {
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
      setRegistrations(prev => prev.filter(r => r.id !== id));
      await deleteDoc(doc(db, 'registrations', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `registrations/${id}`);
    }
  };

  const handleUpdateRegistration = async (updatedReg: Registration) => {
    try {
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

  // Real permission / setup error screen (ONLY for genuine permission-denied or unconfigured Firestore)
  if (setupError) {
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
              <h1 className="font-sans font-black text-lg md:text-xl text-gray-900 leading-tight">Permissão ou Configuração do Firebase</h1>
              <p className="text-xs text-gray-400 mt-0.5">Não foi possível acessar o Firestore com as regras atuais no projeto <strong>app-contrato-gestao-patitour</strong>.</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <p className="text-xs font-mono text-red-800 break-words">
              <strong>Detalhes do Erro Técnico:</strong> {setupError}
            </p>
          </div>

          <h2 className="font-sans font-bold text-sm text-gray-900 mb-4 uppercase tracking-wider">Verifique as Regras no Console do Firebase:</h2>
          
          <div className="space-y-4 text-xs text-gray-600">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-natural-brand text-white flex items-center justify-center font-bold text-xs">1</div>
              <p className="pt-0.5">
                Acesse o <a href="https://console.firebase.google.com/project/app-contrato-gestao-patitour/firestore/rules" target="_blank" rel="noopener noreferrer" className="text-natural-brand underline font-bold">Console do Firebase (Regras do Firestore)</a> no projeto <strong>app-contrato-gestao-patitour</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-natural-brand text-white flex items-center justify-center font-bold text-xs">2</div>
              <p className="pt-0.5">
                Confirme se as regras publicadas correspondem ao padrão abaixo e clique em <strong>Publicar (Publish)</strong>:
              </p>
            </div>

            <div className="ml-9 bg-gray-50 p-3 rounded-xl border border-gray-100 font-mono text-[11px] text-gray-700 select-all whitespace-pre overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/{tripId} {
      allow read: if true;
      allow create, update: if request.resource.data.title is string
                            && request.resource.data.school is string
                            && request.resource.data.destination is string;
      allow delete: if true;
    }
    match /registrations/{registrationId} {
      allow read: if true;
      allow create: if request.resource.data.tripId is string
                    && request.resource.data.student != null
                    && request.resource.data.parent != null;
      allow update, delete: if resource.data.tripId is string;
    }
    match /config/{configId} {
      allow read: if true;
      allow write: if configId == 'tripDefaults'
                   || (request.resource.data.apiKey is string && request.resource.data.environment is string);
    }
  }
}`}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button 
              onClick={() => {
                setSetupError(null);
                setLoading(true);
                setRetryTick(prev => prev + 1);
              }} 
              className="px-5 py-2.5 bg-natural-brand text-white font-bold rounded-2xl hover:bg-opacity-95 transition text-xs shadow-md flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Transient error when there is NO cached data yet -> show friendly connection retry screen (never "Firebase Pendente")
  if (transientError && trips.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] text-natural-text p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-amber-200/60 text-center space-y-5 animate-fadeIn">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
            <WifiOff className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display font-black text-lg text-gray-900 uppercase tracking-tight">
              Conexão Temporariamente Instável
            </h1>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              O servidor demorou para responder na sua rede atual. Estamos tentando reconectar automaticamente...
            </p>
          </div>
          <button
            onClick={() => {
              setTransientError(null);
              setLoading(true);
              setRetryTick(prev => prev + 1);
            }}
            className="w-full py-3 bg-natural-brand hover:bg-natural-brand-hover text-white font-bold rounded-2xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
          >
            <RefreshCw className="w-4 h-4" /> Tentar Novamente Agora
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] text-natural-text p-6">
        <Loader2 className="w-9 h-9 text-natural-brand animate-spin mb-3" />
        <p className="font-display font-black text-xs uppercase tracking-widest text-natural-brand/80">
          Carregando Contrato...
        </p>
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
              CONTRATOS PATITOUR
            </span>
            <span className="text-[9px] text-gray-300 mt-0.5 block">
              Protegido de forma segura com criptografia integrada
            </span>
          </div>
        </div>
      </div>
    );
  }

  const activeClientTrip = selectedTripId
    ? trips.find(t => t.id === selectedTripId) || (!urlTripId ? trips[0] : undefined)
    : undefined;

  return (
    <div className="font-sans text-natural-text antialiased">
      {transientError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-[11px] font-semibold text-amber-800 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Conexão instável com o banco — tentando reconectar automaticamente...</span>
        </div>
      )}

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] text-natural-text p-6">
            <Loader2 className="w-9 h-9 text-natural-brand animate-spin mb-3" />
            <p className="font-display font-black text-xs uppercase tracking-widest text-natural-brand/80">
              Abrindo...
            </p>
          </div>
        }
      >
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
            ) : activeClientTrip ? (
              <ClientForm 
                trip={activeClientTrip}
                asaasConfig={DEFAULT_ASAAS_CONFIG}
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
            ) : (
              <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] p-4 text-natural-text">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-red-100 text-center space-y-4">
                  <h1 className="font-display font-black text-xl text-gray-900 uppercase">Link Não Encontrado</h1>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Este link de contrato não existe ou foi removido. Por favor, solicite um novo link diretamente com a agência Patitour.
                  </p>
                  <a
                    href={`https://wa.me/5519997474575?text=${encodeURIComponent(`Oi Pati, tentei acessar o link ${window.location.href} e não encontrei o contrato.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center px-5 py-3 bg-[#25D366] text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md"
                  >
                    Falar com a Patitour no WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </Suspense>
    </div>
  );
}
