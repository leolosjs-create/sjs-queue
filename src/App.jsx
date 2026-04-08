import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ticket, Monitor, UserCheck, Stethoscope, Info, 
  Printer, BellRing, CheckCircle, Clock, XCircle,
  Home, ChevronRight, Activity, LogOut, ArrowUpDown, 
  Timer, FileEdit, BarChart3, TrendingUp, Users, Database
} from 'lucide-react';

// --- FIREBASE CLOUD SYNC IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- INITIALIZE FIREBASE WITH YOUR UNIQUE KEYS ---
const firebaseConfig = {
  apiKey: "AIzaSyDeiVnmjGMs_Ma6oBdM108lUXyRYYo-4Lw",
  authDomain: "sjs-queuing-system.firebaseapp.com",
  projectId: "sjs-queuing-system",
  storageBucket: "sjs-queuing-system.firebasestorage.app",
  messagingSenderId: "86585395739",
  appId: "1:86585395739:web:7494b5c567e8dc9442c6be",
  measurementId: "G-S9HTGDQTGB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// This ID is used to create a unique space in your database
const appId = 'sjs-queuing-system'; 

// --- CONFIGURATION ---
const PHARMACY_NAME = "PHARM+ St. James' Settlement Community Pharmacy";
const PHARMACY_NAME_ZH = "藥健同心聖雅各福群會社區藥房";

const SERVICES = [
  { id: 'A', name: 'Prescription & Dispensing', nameZh: '配藥及取藥', icon: Ticket, color: 'bg-blue-600', hover: 'hover:bg-blue-700' },
  { id: 'B', name: 'Pharmacist Consultation', nameZh: '藥劑師諮詢', icon: Stethoscope, color: 'bg-teal-600', hover: 'hover:bg-teal-700' },
  { id: 'C', name: 'General Enquiry', nameZh: '一般查詢', icon: Info, color: 'bg-purple-600', hover: 'hover:bg-purple-700' },
];

const STATIONS = ['Counter 1', 'Counter 2', 'Room 3', 'Room 4'];

// --- HELPER FUNCTIONS ---
const formatTime = (dateString) => {
  if (!dateString) return '--:--';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-HK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-HK', { year: 'numeric', month: 'short', day: 'numeric' });
};

const msToMins = (ms) => {
  if (!ms || isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 60000);
};

// --- SUB-COMPONENTS ---
const MemoDialog = ({ memoModal, onClose, onSave }) => {
  const [text, setText] = useState(memoModal.text);
  
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <FileEdit className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            Add Memo for {memoModal.ticketId}
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Enter Rx number, patient name, or any specific requirements.
        </p>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 min-h-[100px] mb-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          placeholder="e.g. Rx 12345, Patient Name..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onSave(memoModal.ticketId, text)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Memo</button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  
  // Real-time App State
  const [tickets, setTickets] = useState([]);
  const [counters, setCounters] = useState({ A: 0, B: 0, C: 0 });
  const [currentlyCalling, setCurrentlyCalling] = useState(null);
  
  // Panel Specific State
  const [panelRoom, setPanelRoom] = useState(null);
  const [queueSortBy, setQueueSortBy] = useState('time');
  const [memoModal, setMemoModal] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- 1. CLOUD AUTHENTICATION ---
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Firebase Auth Error:", err));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- 2. REAL-TIME CLOUD DATA SYNC ---
  useEffect(() => {
    if (!user) return;

    // Sync Tickets from Firestore
    const ticketsRef = collection(db, 'artifacts', appId, 'public', 'data', 'tickets');
    const unsubTickets = onSnapshot(ticketsRef, (snapshot) => {
      const loadedTickets = [];
      snapshot.forEach(doc => loadedTickets.push(doc.data()));
      setTickets(loadedTickets);
    }, (error) => console.error("Sync Error (Tickets):", error));

    // Sync Counters from Firestore
    const countersRef = collection(db, 'artifacts', appId, 'public', 'data', 'counters');
    const unsubCounters = onSnapshot(countersRef, (snapshot) => {
      const loadedCounters = { A: 0, B: 0, C: 0 };
      snapshot.forEach(doc => {
        loadedCounters[doc.id] = doc.data().count;
      });
      setCounters(loadedCounters);
    }, (error) => console.error("Sync Error (Counters):", error));

    return () => {
      unsubTickets();
      unsubCounters();
    };
  }, [user]);

  // Keep live timers ticking
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Derived State
  const waitingTickets = tickets.filter(t => t.status === 'waiting');
  const activeTickets = tickets.filter(t => ['calling', 'arrived'].includes(t.status));
  const completedTickets = tickets.filter(t => ['completed', 'missed'].includes(t.status));

  // --- ACTIONS (Write to Cloud) ---
  const generateTicket = async (serviceId) => {
    if (!user) return;
    const service = SERVICES.find(s => s.id === serviceId);
    const newNum = (counters[serviceId] || 0) + 1;
    
    // Update Counter in Cloud
    const counterRef = doc(db, 'artifacts', appId, 'public', 'data', 'counters', serviceId);
    await setDoc(counterRef, { count: newNum });
    
    const ticketId = `${serviceId}${newNum.toString().padStart(3, '0')}`;
    const newTicket = {
      id: ticketId,
      type: serviceId,
      serviceName: service.name,
      serviceNameZh: service.nameZh,
      status: 'waiting', 
      createdAt: new Date().toISOString(),
      calledAt: null,
      arrivedAt: null,
      completedAt: null,
      calledByCounter: null,
      memo: ''
    };
    
    // Create Ticket in Cloud
    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, newTicket);
    
    return newTicket;
  };

  const updateTicketStatus = async (ticketId, newStatus, counterName = null) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;

    const timestamp = new Date().toISOString();
    const updated = { ...t, status: newStatus };
    
    if (newStatus === 'calling') {
      if (!t.calledAt) updated.calledAt = timestamp; 
      if (counterName) updated.calledByCounter = counterName;
    }
    if (newStatus === 'arrived') updated.arrivedAt = timestamp;
    if (newStatus === 'completed' || newStatus === 'missed') updated.completedAt = timestamp;

    // Update in Cloud
    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, updated);

    if (newStatus === 'calling') setCurrentlyCalling(ticketId);
  };

  const updateTicketMemo = async (ticketId, memoText) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;

    const updated = { ...t, memo: memoText };
    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, updated);
    
    setMemoModal(null);
  };

  const getWaitTimeMinutes = (createdAt) => {
    const diffMs = currentTime - new Date(createdAt);
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // --- VIEWS ---
  const HomeView = () => (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-gray-50 p-8 print:hidden">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">{PHARMACY_NAME}</h1>
        <h2 className="text-2xl text-gray-600 font-medium">{PHARMACY_NAME_ZH}</h2>
        
        <div className="flex items-center justify-center gap-2 mt-4 text-green-600 bg-green-50 px-4 py-2 rounded-full w-max mx-auto border border-green-200">
          <Database className="w-4 h-4" /> 
          <span className="text-sm font-bold">Cloud Sync Connected</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          <button onClick={() => setCurrentView('kiosk')} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all group flex flex-col items-center cursor-pointer">
            <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform"><Printer className="w-8 h-8 text-blue-600" /></div>
            <h3 className="text-lg font-bold text-gray-800">Ticketing Kiosk</h3>
            <p className="text-gray-500 mt-2 text-sm">Customer ticket machine</p>
          </button>
          <button onClick={() => setCurrentView('monitor')} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all group flex flex-col items-center cursor-pointer">
            <div className="bg-indigo-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform"><Monitor className="w-8 h-8 text-indigo-600" /></div>
            <h3 className="text-lg font-bold text-gray-800">TV Monitor</h3>
            <p className="text-gray-500 mt-2 text-sm">Public queue display</p>
          </button>
          <button onClick={() => setCurrentView('panel')} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all group flex flex-col items-center cursor-pointer">
            <div className="bg-teal-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform"><UserCheck className="w-8 h-8 text-teal-600" /></div>
            <h3 className="text-lg font-bold text-gray-800">Pharmacist Panel</h3>
            <p className="text-gray-500 mt-2 text-sm">Staff station control</p>
          </button>
          <button onClick={() => setCurrentView('reports')} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all group flex flex-col items-center cursor-pointer">
            <div className="bg-purple-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform"><BarChart3 className="w-8 h-8 text-purple-600" /></div>
            <h3 className="text-lg font-bold text-gray-800">Reports</h3>
            <p className="text-gray-500 mt-2 text-sm">Data & Analytics</p>
          </button>
        </div>
      </div>
    </div>
  );

  const KioskView = () => {
    const [printedTicket, setPrintedTicket] = useState(null);
    const handlePrint = async (serviceId) => {
      const ticket = await generateTicket(serviceId);
      if(!ticket) return;
      setPrintedTicket(ticket);
      setTimeout(() => { window.print(); }, 100);
      setTimeout(() => setPrintedTicket(null), 5000);
    };
    return (
      <>
        <div className="h-[calc(100vh-64px)] bg-gray-100 flex flex-col items-center justify-center p-6 print:hidden">
          <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="bg-blue-900 p-8 text-center text-white">
              <h1 className="text-3xl font-bold mb-2">Welcome 歡迎光臨</h1>
              <p className="text-blue-100 text-lg">Please select a service to get a ticket</p>
            </div>
            <div className="p-8 space-y-6">
              {SERVICES.map(service => {
                const Icon = service.icon;
                return (
                  <button key={service.id} onClick={() => handlePrint(service.id)} className={`w-full ${service.color} ${service.hover} text-white p-6 rounded-2xl shadow-md transform transition-all active:scale-95 flex items-center justify-between group`}>
                    <div className="flex items-center gap-6">
                      <div className="bg-white/20 p-4 rounded-full"><Icon className="w-10 h-10" /></div>
                      <div className="text-left">
                        <h2 className="text-3xl font-bold">{service.name}</h2>
                        <h3 className="text-2xl mt-1 opacity-90">{service.nameZh}</h3>
                      </div>
                    </div>
                    <ChevronRight className="w-10 h-10 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
            {printedTicket && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in zoom-in duration-200">
                <div className="bg-white p-8 rounded-xl shadow-2xl w-96 text-center transform border-t-8 border-blue-600">
                  <Printer className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-bounce" />
                  <p className="text-gray-900 text-xl font-bold">Printing Ticket...</p>
                  <p className="text-gray-500 mb-6">Please take your ticket.</p>
                  <button onClick={() => setPrintedTicket(null)} className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-lg">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {printedTicket && (
          <div className="hidden print:block text-black text-center w-full max-w-[80mm] mx-auto pt-4 pb-8 font-sans">
            <h1 className="text-xl font-bold mb-1">{PHARMACY_NAME}</h1>
            <h2 className="text-lg mb-4">{PHARMACY_NAME_ZH}</h2>
            <div className="border-t-2 border-b-2 border-black py-4 my-4">
              <div className="text-sm uppercase tracking-widest">{printedTicket.serviceName}</div>
              <div className="text-[4rem] font-black leading-none my-2">{printedTicket.id}</div>
              <div className="text-sm">{printedTicket.serviceNameZh}</div>
            </div>
            <div className="text-sm mt-4">{formatDate(printedTicket.createdAt)} {formatTime(printedTicket.createdAt)}</div>
          </div>
        )}
      </>
    );
  };

  const MonitorView = () => {
    const currentTicket = tickets.find(t => t.id === currentlyCalling);
    const [flash, setFlash] = useState(false);
    useEffect(() => {
      if (currentlyCalling) {
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), 3000);
        return () => clearTimeout(timer);
      }
    }, [currentlyCalling]);
    return (
      <div className="h-[calc(100vh-64px)] bg-slate-900 text-white flex overflow-hidden print:hidden">
        <div className="w-2/3 p-12 flex flex-col justify-center items-center relative border-r border-slate-700">
          <div className="absolute top-12 left-12"><h2 className="text-2xl font-bold text-slate-400 flex items-center gap-3"><Activity className="w-8 h-8 text-blue-500" />{PHARMACY_NAME}</h2></div>
          <div className="text-center space-y-8">
            <h1 className="text-5xl font-medium text-slate-400 uppercase tracking-widest">Now Calling 現在叫號</h1>
            <div className={`transition-all duration-300 ${flash ? 'scale-110 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]' : 'text-white'}`}>
              <div className="text-[12rem] font-black leading-none tracking-tighter">{currentTicket ? currentTicket.id : '---'}</div>
            </div>
            {currentTicket && currentTicket.calledByCounter && (
              <div className="mt-8"><div className="inline-block bg-slate-800 text-slate-200 px-10 py-4 rounded-full text-4xl font-bold border border-slate-700 text-yellow-400">{currentTicket.calledByCounter}</div></div>
            )}
          </div>
        </div>
        <div className="w-1/3 bg-slate-800 p-8 flex flex-col">
          <h2 className="text-3xl font-bold text-slate-300 mb-8 pb-4 border-b border-slate-700">Next in Line</h2>
          <div className="flex-1 overflow-hidden">
            <div className="space-y-4">
              {waitingTickets.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(0, 8).map((ticket) => (
                <div key={ticket.id} className="flex justify-between items-center bg-slate-700/50 p-6 rounded-xl border border-slate-600/50">
                  <span className="text-4xl font-bold text-slate-200">{ticket.id}</span>
                  <span className="text-slate-400 text-lg">{ticket.serviceNameZh}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PanelView = () => {
    if (!panelRoom) {
      return (
        <div className="h-[calc(100vh-64px)] bg-gray-100 flex items-center justify-center p-6 print:hidden">
          <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md text-center">
            <UserCheck className="w-16 h-16 text-teal-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Pharmacist Login</h2>
            <p className="text-gray-500 mb-8">Select your station to begin calling tickets.</p>
            <div className="grid grid-cols-2 gap-4">
              {STATIONS.map(station => (
                <button key={station} onClick={() => setPanelRoom(station)} className="p-4 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:border-teal-500 hover:bg-teal-50 transition-all">{station}</button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    const sortedWaitingTickets = [...waitingTickets].sort((a, b) => {
      if (queueSortBy === 'number') return a.id.localeCompare(b.id);
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    return (
      <div className="h-[calc(100vh-64px)] bg-gray-100 flex flex-col md:flex-row gap-6 p-6 overflow-hidden print:hidden">
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 shrink-0">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Station: {panelRoom}</h2>
              <button onClick={() => setPanelRoom(null)} className="text-gray-500 hover:text-red-600 flex items-center gap-1 text-sm"><LogOut className="w-4 h-4" /> Exit</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {SERVICES.map(service => {
                const nextWaiting = [...waitingTickets].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)).find(t => t.type === service.id);
                return (
                  <button key={service.id} onClick={() => nextWaiting && updateTicketStatus(nextWaiting.id, 'calling', panelRoom)} disabled={!nextWaiting} className={`p-4 rounded-lg border-2 text-left transition-all ${nextWaiting ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' : 'opacity-50'}`}>
                    <div className="text-sm font-medium text-gray-600">{service.name}</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{nextWaiting ? nextWaiting.id : 'None'}</div>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50"><h2 className="text-lg font-bold text-gray-800">Active Tickets</h2></div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {activeTickets.filter(t => t.calledByCounter === panelRoom).map(ticket => (
                <div key={ticket.id} onContextMenu={(e) => { e.preventDefault(); setMemoModal({ ticketId: ticket.id, text: ticket.memo || '' }); }} className={`p-4 rounded-xl border-l-4 shadow-sm flex items-center justify-between cursor-context-menu ${ticket.status === 'calling' ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-500'}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-1"><span className="text-2xl font-bold">{ticket.id}</span><span className="text-xs uppercase px-2 py-0.5 bg-white/50 rounded-full">{ticket.status}</span></div>
                    <div className="text-sm text-gray-600">{ticket.serviceName}</div>
                    {ticket.memo && <div className="mt-2 text-sm text-blue-700 bg-blue-50 p-1.5 rounded flex items-center gap-2"><FileEdit className="w-4 h-4" /> {ticket.memo}</div>}
                  </div>
                  <div className="flex gap-2">
                    {ticket.status === 'calling' ? (
                      <>
                        <button onClick={() => updateTicketStatus(ticket.id, 'arrived')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Arrived</button>
                        <button onClick={() => updateTicketStatus(ticket.id, 'missed')} className="px-4 py-2 bg-red-100 text-red-600 rounded">Miss</button>
                      </>
                    ) : (
                      <button onClick={() => updateTicketStatus(ticket.id, 'completed')} className="px-4 py-2 bg-green-600 text-white rounded">Complete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full md:w-96 flex flex-col gap-6 overflow-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold">Queue</h2>
              <div className="flex bg-gray-200 p-1 rounded text-xs">
                <button onClick={() => setQueueSortBy('time')} className={`px-2 py-1 rounded ${queueSortBy === 'time' ? 'bg-white shadow' : ''}`}>Time</button>
                <button onClick={() => setQueueSortBy('number')} className={`px-2 py-1 rounded ${queueSortBy === 'number' ? 'bg-white shadow' : ''}`}>Num</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y">
              {sortedWaitingTickets.map(ticket => {
                const waitTime = getWaitTimeMinutes(ticket.createdAt);
                const isOvertime = waitTime > 10;
                return (
                  <div key={ticket.id} onContextMenu={(e) => { e.preventDefault(); setMemoModal({ ticketId: ticket.id, text: ticket.memo || '' }); }} className={`p-4 transition-colors flex justify-between items-center group cursor-context-menu border-l-4 ${isOvertime ? 'bg-red-50 border-red-500' : 'border-transparent'}`}>
                    <div>
                      <div className={`font-bold ${isOvertime ? 'text-red-700' : ''}`}>{ticket.id}</div>
                      <div className="text-xs text-gray-500">Wait: {waitTime} min</div>
                      {ticket.memo && <div className="text-[10px] text-blue-600 mt-1 max-w-[150px] truncate">{ticket.memo}</div>}
                    </div>
                    <button onClick={() => updateTicketStatus(ticket.id, 'calling', panelRoom)} className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-blue-600 text-white text-xs rounded">Call</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ReportsView = () => {
    const stats = useMemo(() => {
      const completed = tickets.filter(t => t.status === 'completed' || t.status === 'missed');
      let totalWaitMs = 0;
      let waitCount = 0;
      completed.forEach(t => {
        if (t.calledAt) {
          totalWaitMs += (new Date(t.calledAt).getTime() - new Date(t.createdAt).getTime());
          waitCount++;
        }
      });
      return {
        total: completed.length,
        avgWait: waitCount ? msToMins(totalWaitMs / waitCount) : 0,
      };
    }, [tickets]);
    return (
      <div className="h-[calc(100vh-64px)] bg-gray-100 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border text-center shadow-sm">
              <p className="text-sm text-gray-500 uppercase">Total Served</p>
              <p className="text-4xl font-black mt-2">{stats.total}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border text-center shadow-sm">
              <p className="text-sm text-gray-500 uppercase">Avg Wait Time</p>
              <p className="text-4xl font-black mt-2">{stats.avgWait} <span className="text-lg">min</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-sans bg-gray-50 print:bg-white">
      <nav className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm print:hidden">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="bg-teal-600 p-2 rounded-lg"><Ticket className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-xl text-gray-800">SJS Smart Queuing System</span>
        </div>
        <div className="flex items-center bg-gray-100 p-1 rounded-lg gap-1">
          <button onClick={() => setCurrentView('kiosk')} className={`px-4 py-2 text-sm rounded-md transition-all ${currentView === 'kiosk' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Kiosk</button>
          <button onClick={() => setCurrentView('monitor')} className={`px-4 py-2 text-sm rounded-md transition-all ${currentView === 'monitor' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Monitor</button>
          <button onClick={() => setCurrentView('panel')} className={`px-4 py-2 text-sm rounded-md transition-all ${currentView === 'panel' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Panel</button>
          <button onClick={() => setCurrentView('reports')} className={`px-4 py-2 text-sm rounded-md transition-all ${currentView === 'reports' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}>Reports</button>
        </div>
      </nav>
      <main>
        {currentView === 'home' && <HomeView />}
        {currentView === 'kiosk' && <KioskView />}
        {currentView === 'monitor' && <MonitorView />}
        {currentView === 'panel' && <PanelView />}
        {currentView === 'reports' && <ReportsView />}
      </main>
      {memoModal && <MemoDialog memoModal={memoModal} onClose={() => setMemoModal(null)} onSave={updateTicketMemo} />}
    </div>
  );
}