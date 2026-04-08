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

// --- INITIALIZE FIREBASE ---
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

const MemoDialog = ({ memoModal, onClose, onSave }) => {
  const [text, setText] = useState(memoModal.text);
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Add Memo for {memoModal.ticketId}</h3>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 min-h-[100px] mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="e.g. Rx number, Patient Name..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={() => onSave(memoModal.ticketId, text)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [tickets, setTickets] = useState([]);
  const [counters, setCounters] = useState({ A: 0, B: 0, C: 0 });
  const [currentlyCalling, setCurrentlyCalling] = useState(null);
  const [panelRoom, setPanelRoom] = useState(null);
  const [queueSortBy, setQueueSortBy] = useState('time');
  const [memoModal, setMemoModal] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth error:", err));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const ticketsRef = collection(db, 'artifacts', appId, 'public', 'data', 'tickets');
    const unsubTickets = onSnapshot(ticketsRef, (snapshot) => {
      const loadedTickets = [];
      snapshot.forEach(doc => loadedTickets.push(doc.data()));
      setTickets(loadedTickets);
    });
    const countersRef = collection(db, 'artifacts', appId, 'public', 'data', 'counters');
    const unsubCounters = onSnapshot(countersRef, (snapshot) => {
      const loadedCounters = { A: 0, B: 0, C: 0 };
      snapshot.forEach(doc => { loadedCounters[doc.id] = doc.data().count; });
      setCounters(loadedCounters);
    });
    return () => { unsubTickets(); unsubCounters(); };
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const waitingTickets = tickets.filter(t => t.status === 'waiting');
  const activeTickets = tickets.filter(t => ['calling', 'arrived'].includes(t.status));
  const completedTickets = tickets.filter(t => ['completed', 'missed'].includes(t.status));

  const generateTicket = async (serviceId) => {
    if (!user) return;
    const service = SERVICES.find(s => s.id === serviceId);
    const newNum = (counters[serviceId] || 0) + 1;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'counters', serviceId), { count: newNum });
    const ticketId = `${serviceId}${newNum.toString().padStart(3, '0')}`;
    const newTicket = {
      id: ticketId, type: serviceId, serviceName: service.name, serviceNameZh: service.nameZh,
      status: 'waiting', createdAt: new Date().toISOString(), calledAt: null,
      arrivedAt: null, completedAt: null, calledByCounter: null, memo: ''
    };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId), newTicket);
    return newTicket;
  };

  const updateTicketStatus = async (ticketId, newStatus, counterName = null) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;
    const updated = { ...t, status: newStatus };
    const ts = new Date().toISOString();
    if (newStatus === 'calling') { if (!t.calledAt) updated.calledAt = ts; if (counterName) updated.calledByCounter = counterName; setCurrentlyCalling(ticketId); }
    if (newStatus === 'arrived') updated.arrivedAt = ts;
    if (newStatus === 'completed' || newStatus === 'missed') updated.completedAt = ts;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId), updated);
  };

  const updateTicketMemo = async (ticketId, memoText) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId), { ...t, memo: memoText });
    setMemoModal(null);
  };

  const HomeView = () => (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-gray-50 p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">{PHARMACY_NAME}</h1>
      <h2 className="text-2xl text-gray-600 font-medium mb-12">{PHARMACY_NAME_ZH}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button onClick={() => setCurrentView('kiosk')} className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition-all border border-gray-100 flex flex-col items-center">
          <Printer className="w-12 h-12 text-blue-600 mb-4" />
          <h3 className="text-lg font-bold">Kiosk</h3>
        </button>
        <button onClick={() => setCurrentView('monitor')} className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition-all border border-gray-100 flex flex-col items-center">
          <Monitor className="w-12 h-12 text-indigo-600 mb-4" />
          <h3 className="text-lg font-bold">Monitor</h3>
        </button>
        <button onClick={() => setCurrentView('panel')} className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition-all border border-gray-100 flex flex-col items-center">
          <UserCheck className="w-12 h-12 text-teal-600 mb-4" />
          <h3 className="text-lg font-bold">Panel</h3>
        </button>
      </div>
    </div>
  );

  const KioskView = () => {
    const [printed, setPrinted] = useState(null);
    const handlePrint = async (sid) => {
      const t = await generateTicket(sid);
      setPrinted(t);
      setTimeout(() => window.print(), 100);
      setTimeout(() => setPrinted(null), 5000);
    };
    return (
      <div className="h-[calc(100vh-64px)] bg-gray-100 flex flex-col items-center justify-center p-6 print:hidden">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Select Service 選擇服務</h1>
          <div className="space-y-4">
            {SERVICES.map(s => (
              <button key={s.id} onClick={() => handlePrint(s.id)} className={`w-full ${s.color} text-white p-6 rounded-2xl text-2xl font-bold flex justify-between items-center hover:opacity-90 active:scale-95 transition-all`}>
                <span>{s.name} <br/> <small>{s.nameZh}</small></span>
                <ChevronRight className="w-8 h-8" />
              </button>
            ))}
          </div>
        </div>
        {printed && (
          <div className="hidden print:block text-center pt-10 font-sans">
            <h1 className="text-xl font-bold">{PHARMACY_NAME}</h1>
            <div className="text-[5rem] font-black my-4">{printed.id}</div>
            <div className="text-lg">{printed.serviceName}</div>
            <div className="text-sm mt-4">{formatTime(printed.createdAt)}</div>
          </div>
        )}
      </div>
    );
  };

  const MonitorView = () => {
    const current = tickets.find(t => t.id === currentlyCalling);
    return (
      <div className="h-[calc(100vh-64px)] bg-slate-900 text-white flex">
        <div className="flex-1 flex flex-col items-center justify-center border-r border-slate-800">
          <h1 className="text-4xl text-slate-400 mb-8 uppercase tracking-widest">Now Calling</h1>
          <div className="text-[15rem] font-black leading-none">{current ? current.id : '---'}</div>
          {current && <div className="mt-8 bg-blue-600 px-8 py-4 rounded-full text-4xl font-bold">{current.calledByCounter}</div>}
        </div>
        <div className="w-1/3 p-8">
          <h2 className="text-2xl font-bold text-slate-500 mb-6 border-b border-slate-800 pb-4">Next</h2>
          <div className="space-y-4">
            {waitingTickets.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).slice(0,5).map(t => (
              <div key={t.id} className="text-4xl font-bold p-4 bg-slate-800 rounded-xl">{t.id}</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const PanelView = () => {
    if (!panelRoom) return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gray-100">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-80 text-center">
          <h2 className="text-xl font-bold mb-6">Select Station</h2>
          <div className="grid grid-cols-1 gap-3">
            {STATIONS.map(s => (
              <button key={s} onClick={()=>setPanelRoom(s)} className="p-4 border rounded-xl hover:bg-blue-50 hover:border-blue-500 transition-all">{s}</button>
            ))}
          </div>
        </div>
      </div>
    );
    return (
      <div className="h-[calc(100vh-64px)] bg-gray-100 p-6 flex gap-6 overflow-hidden">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border p-6 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-teal-700">Station: {panelRoom}</h2>
            <button onClick={()=>setPanelRoom(null)} className="text-gray-400 hover:text-red-500"><LogOut/></button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {SERVICES.map(s => {
              const next = waitingTickets.find(t => t.type === s.id);
              return (
                <button key={s.id} onClick={()=>next && updateTicketStatus(next.id, 'calling', panelRoom)} className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-left">
                  <div className="text-xs text-blue-600 font-bold uppercase">{s.id} Service</div>
                  <div className="text-2xl font-bold">{next ? next.id : '--'}</div>
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto space-y-4">
            <h3 className="font-bold text-gray-500">Active at your station:</h3>
            {activeTickets.filter(t => t.calledByCounter === panelRoom).map(t => (
              <div key={t.id} onContextMenu={(e)=>{e.preventDefault(); setMemoModal({ticketId: t.id, text: t.memo||''})}} className="p-4 border rounded-xl flex justify-between items-center bg-yellow-50 border-yellow-200">
                <div>
                  <div className="text-2xl font-black">{t.id}</div>
                  <div className="text-sm text-gray-500">{t.serviceName}</div>
                  {t.memo && <div className="mt-2 text-blue-600 bg-white p-1 rounded text-xs border border-blue-100">{t.memo}</div>}
                </div>
                <div className="flex gap-2">
                  {t.status === 'calling' ? (
                    <>
                      <button onClick={()=>updateTicketStatus(t.id, 'arrived')} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Arrived</button>
                      <button onClick={()=>updateTicketStatus(t.id, 'missed')} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg">Miss</button>
                    </>
                  ) : (
                    <button onClick={()=>updateTicketStatus(t.id, 'completed')} className="bg-green-600 text-white px-4 py-2 rounded-lg">Complete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-80 bg-white rounded-2xl shadow-sm border p-4 overflow-y-auto">
          <h3 className="font-bold text-gray-500 mb-4">Queue</h3>
          {waitingTickets.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).map(t => (
            <div key={t.id} className="p-3 border-b flex justify-between items-center group">
              <div><div className="font-bold">{t.id}</div><div className="text-xs text-gray-400">{getWaitTimeMinutes(t.createdAt)}m wait</div></div>
              <button onClick={()=>updateTicketStatus(t.id, 'calling', panelRoom)} className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white text-xs px-2 py-1 rounded">Call</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getWaitTimeMinutes = (createdAt) => Math.floor((new Date() - new Date(createdAt)) / 60000);

  return (
    <div className="min-h-screen font-sans bg-gray-50">
      <nav className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm print:hidden">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="bg-teal-600 p-1.5 rounded-lg"><Ticket className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-gray-800">SJS Queue</span>
        </div>
        <div className="flex gap-2">
          {['home', 'kiosk', 'monitor', 'panel'].map(v => (
            <button key={v} onClick={()=>setCurrentView(v)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${currentView === v ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
          ))}
        </div>
      </nav>
      <main>{currentView === 'home' && <HomeView />}{currentView === 'kiosk' && <KioskView />}{currentView === 'monitor' && <MonitorView />}{currentView === 'panel' && <PanelView />}</main>
      {memoModal && <MemoDialog memoModal={memoModal} onClose={()=>setMemoModal(null)} onSave={updateTicketMemo} />}
    </div>
  );
}