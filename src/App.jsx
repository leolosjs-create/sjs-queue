import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Ticket, Monitor, UserCheck, Stethoscope, Info, 
  Printer, BellRing, CheckCircle, Clock, XCircle,
  Home, ChevronRight, Activity, LogOut, ArrowUpDown, 
  Timer, FileEdit, BarChart3, TrendingUp, Users, Database,
  Lock, KeyRound, AlertTriangle, Edit3, Menu, RotateCcw,
  Volume2, VolumeX, Trash2
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
const appId = 'sjs-pharmacy-live'; 

// --- CONFIGURATION ---
const PHARMACY_NAME = "PHARM+ St. James' Settlement Community Pharmacy";
const PHARMACY_NAME_ZH = "藥健同心聖雅各福群會社區藥房";
const STAFF_PIN = "1234"; // Default security PIN

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
  return date.toLocaleTimeString('en-HK', { hour: '2-digit', minute: '2-digit', hour12: true });
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
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <FileEdit className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            Memo for Ticket {memoModal.ticketId}
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Add patient name, Rx number, or purpose of visit.
        </p>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 min-h-[100px] mb-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-base"
          placeholder="e.g. Rx 12345, Patient Name..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onSave(memoModal.ticketId, text)} className="px-6 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Memo</button>
        </div>
      </div>
    </div>
  );
};

const ReturnDialog = ({ returnModal, onClose, onConfirm }) => {
  const [text, setText] = useState("");
  
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
            <RotateCcw className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            Return Ticket {returnModal} to Queue
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Add a remark (e.g., waiting for doctor, missing info). This ticket will be sent back to the waiting list.
        </p>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 min-h-[100px] mb-4 focus:ring-2 focus:ring-orange-500 outline-none resize-none text-base"
          placeholder="Reason for returning to queue..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onConfirm(returnModal, text)} className="px-6 py-3 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">Confirm Return</button>
        </div>
      </div>
    </div>
  );
};

const DeleteDialog = ({ deleteModal, onClose, onConfirm }) => {
  const [selectedReason, setSelectedReason] = useState("Customer left");
  const [customReason, setCustomReason] = useState("");

  const COMMON_REASONS = [
    "Customer left",
    "Printed by mistake",
    "Duplicate ticket",
    "Other"
  ];

  const handleConfirm = () => {
    const finalReason = selectedReason === "Other" ? customReason : selectedReason;
    onConfirm(deleteModal, finalReason || "No reason provided");
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-100 p-2 rounded-lg text-red-600">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            Cancel Ticket {deleteModal}?
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Are you sure you want to cancel this ticket? Please select a reason below.
        </p>
        
        <div className="space-y-2 mb-4">
          {COMMON_REASONS.map((reason) => (
            <label key={reason} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="radio" 
                name="deleteReason" 
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-gray-700 text-sm font-medium">{reason}</span>
            </label>
          ))}
        </div>

        {selectedReason === "Other" && (
          <textarea
            className="w-full border border-gray-200 rounded-lg p-3 min-h-[80px] mb-4 focus:ring-2 focus:ring-red-500 outline-none resize-none text-base animate-in fade-in"
            placeholder="Please specify the reason..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            autoFocus
          />
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Keep Ticket</button>
          <button onClick={handleConfirm} className="px-6 py-3 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm">Confirm Cancel</button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [tickets, setTickets] = useState([]);
  const [counters, setCounters] = useState({ A: 0, B: 0, C: 0 });
  const [lastCallEvent, setLastCallEvent] = useState({ id: null, time: null, counter: null });
  
  const [panelRoom, setPanelRoom] = useState(null);
  const [queueSortBy, setQueueSortBy] = useState('time');
  const [memoModal, setMemoModal] = useState(null);
  const [returnModal, setReturnModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
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
      snapshot.forEach(doc => {
        loadedCounters[doc.id] = doc.data().count;
      });
      setCounters(loadedCounters);
    });

    const displayRef = doc(db, 'artifacts', appId, 'public', 'data', 'system', 'display');
    const unsubDisplay = onSnapshot(displayRef, (snapshot) => {
      if (snapshot.exists()) {
        setLastCallEvent(snapshot.data());
      }
    });

    return () => {
      unsubTickets();
      unsubCounters();
      unsubDisplay();
    };
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
      memo: '',
      isReturned: false
    };
    
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

    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, updated);

    if (newStatus === 'calling') {
      const displayRef = doc(db, 'artifacts', appId, 'public', 'data', 'system', 'display');
      await setDoc(displayRef, { id: ticketId, time: Date.now(), counter: counterName || updated.calledByCounter });
    }
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

  const handleReturnTicket = async (ticketId, reason) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;

    const prefix = "[Returned]";
    const newMemoNote = reason ? `${prefix} ${reason}` : prefix;
    const finalMemo = t.memo ? `${t.memo} | ${newMemoNote}` : newMemoNote;

    const updated = { 
      ...t, 
      status: 'waiting', 
      calledByCounter: null,
      memo: finalMemo,
      isReturned: true
    };

    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, updated);
    setReturnModal(null);
  };

  const handleDeleteTicket = async (ticketId, reason) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;

    const prefix = "[Cancelled]";
    const newMemoNote = reason ? `${prefix} ${reason}` : prefix;
    const finalMemo = t.memo ? `${t.memo} | ${newMemoNote}` : newMemoNote;

    const updated = { 
      ...t, 
      status: 'cancelled', 
      completedAt: new Date().toISOString(), 
      memo: finalMemo
    };

    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, updated);
    setDeleteModal(null);
  };

  const getWaitTimeMinutes = (createdAt) => {
    const diffMs = currentTime - new Date(createdAt);
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // --- VIEWS ---
  const HomeView = () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gray-50 p-4 md:p-8 print:hidden">
      <div className="max-w-5xl w-full text-center space-y-6 md:space-y-8">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-800 tracking-tight leading-tight">{PHARMACY_NAME}</h1>
        <h2 className="text-xl md:text-3xl text-gray-600 font-medium">{PHARMACY_NAME_ZH}</h2>
        <div className="flex items-center justify-center gap-2 mt-4 text-green-700 bg-green-100 px-4 py-2 rounded-full w-max mx-auto shadow-sm border border-green-200">
          <Database className="w-4 h-4 md:w-5 md:h-5" /> <span className="text-sm md:text-base font-bold">Cloud Sync Active</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8 md:mt-12">
          <button onClick={() => setCurrentView('kiosk')} className="bg-white p-6 md:p-8 rounded-2xl shadow hover:shadow-lg transition-all group flex flex-col items-center cursor-pointer border border-gray-100">
            <div className="bg-blue-100 p-4 md:p-5 rounded-full mb-4 group-hover:scale-110 transition-transform"><Printer className="w-8 h-8 md:w-10 md:h-10 text-blue-600" /></div>
            <h3 className="text-lg md:text-xl font-bold text-gray-800">Ticketing Kiosk</h3>
            <p className="text-gray-500 mt-2 text-sm">Customer ticket machine</p>
          </button>
          <button onClick={() => setCurrentView('monitor')} className="bg-white p-6 md:p-8 rounded-2xl shadow hover:shadow-lg transition-all group flex flex-col items-center cursor-pointer border border-gray-100">
            <div className="bg-indigo-100 p-4 md:p-5 rounded-full mb-4 group-hover:scale-110 transition-transform"><Monitor className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" /></div>
            <h3 className="text-lg md:text-xl font-bold text-gray-800">TV Monitor</h3>
            <p className="text-gray-500 mt-2 text-sm">Public queue display</p>
          </button>
          <button onClick={() => { if(isStaffAuthenticated) setCurrentView('panel'); else setCurrentView('login'); }} className="bg-white p-6 md:p-8 rounded-2xl shadow hover:shadow-lg transition-all group flex flex-col items-center cursor-pointer border border-gray-100">
            <div className="bg-teal-100 p-4 md:p-5 rounded-full mb-4 group-hover:scale-110 transition-transform"><UserCheck className="w-8 h-8 md:w-10 md:h-10 text-teal-600" /></div>
            <h3 className="text-lg md:text-xl font-bold text-gray-800">Pharmacist Panel</h3>
            <p className="text-gray-500 mt-2 text-sm">Staff station control</p>
          </button>
          <button onClick={() => { if(isStaffAuthenticated) setCurrentView('reports'); else setCurrentView('login'); }} className="bg-white p-6 md:p-8 rounded-2xl shadow hover:shadow-lg transition-all group flex flex-col items-center cursor-pointer border border-gray-100">
            <div className="bg-purple-100 p-4 md:p-5 rounded-full mb-4 group-hover:scale-110 transition-transform"><BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-purple-600" /></div>
            <h3 className="text-lg md:text-xl font-bold text-gray-800">Backstage Data</h3>
            <p className="text-gray-500 mt-2 text-sm">Reports & Analytics</p>
          </button>
        </div>
      </div>
    </div>
  );

  const LoginView = () => {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const handleLogin = () => {
      if (pin === STAFF_PIN) { setIsStaffAuthenticated(true); setCurrentView('panel'); }
      else { setError(true); setPin(""); }
    };
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-100 flex items-center justify-center p-4 md:p-6 print:hidden">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="w-8 h-8 text-slate-600" /></div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Staff Only</h2>
          <p className="text-gray-500 mb-8">Enter the security PIN</p>
          <input type="password" value={pin} onChange={(e) => { setError(false); setPin(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className={`w-full text-center text-3xl tracking-[1em] border-2 rounded-xl p-4 mb-4 outline-none ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500'}`} placeholder="****" maxLength={4} autoFocus />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all text-lg shadow-md active:scale-95">Unlock Access</button>
          <button onClick={() => setCurrentView('home')} className="mt-6 text-gray-400 font-medium w-full py-2">Cancel</button>
        </div>
      </div>
    );
  };

  const KioskView = () => {
    const [printedTicket, setPrintedTicket] = useState(null);
    const handlePrint = async (serviceId) => {
      const ticket = await generateTicket(serviceId);
      if(!ticket) return;
      setPrintedTicket(ticket);
      
      // Delay printing slightly to let the browser draw the ticket UI first
      setTimeout(() => { 
        window.print(); 
      }, 500);
      
      // I HAVE REMOVED THE 5-SECOND AUTO-CLEAR TIMER.
      // This gives Safari as much time as it needs to generate the preview.
      // The ticket will now stay on screen until the customer taps "Close".
    };

    return (
      <>
        <div className="min-h-[calc(100vh-64px)] bg-gray-100 flex flex-col items-center justify-center p-4 md:p-6 print:hidden">
          <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="bg-blue-900 p-6 md:p-8 text-center text-white">
              <h1 className="text-2xl md:text-4xl font-bold mb-2">Welcome 歡迎光臨</h1>
              <p className="text-blue-100 text-sm md:text-lg">Please select a service to get a ticket</p>
              <p className="text-blue-100 text-sm md:text-lg">請選擇服務以領取籌號</p>
            </div>
            <div className="p-4 md:p-8 space-y-4 md:space-y-6">
              {SERVICES.map(service => {
                const Icon = service.icon;
                return (
                  <button key={service.id} onClick={() => handlePrint(service.id)} className={`w-full ${service.color} ${service.hover} text-white p-5 md:p-6 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-between`}>
                    <div className="flex items-center gap-4 md:gap-6 text-left">
                      <div className="bg-white/20 p-3 md:p-4 rounded-full"><Icon className="w-8 h-8 md:w-10 md:h-10" /></div>
                      <div>
                        <h2 className="text-xl md:text-3xl font-bold">{service.name}</h2>
                        <h3 className="text-lg md:text-2xl mt-1 opacity-90">{service.nameZh}</h3>
                      </div>
                    </div>
                    <ChevronRight className="w-8 h-8 md:w-10 md:h-10 opacity-50" />
                  </button>
                );
              })}
            </div>
            
            {printedTicket && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border-t-8 border-blue-600 flex flex-col items-center animate-in zoom-in-95 duration-200">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Your Ticket Number</h2>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">您的籌號</h2>
                  <div className="text-7xl font-black text-blue-600 my-4 tracking-tighter">{printedTicket.id}</div>
                  
                  <div className="flex items-center justify-center gap-3 text-gray-800 font-bold text-xl mt-4 mb-2">
                    <Printer className="w-6 h-6 animate-pulse text-blue-600" /> Printing... 列印中
                  </div>
                  <p className="text-gray-500 mb-8 text-sm">Please take your ticket from the machine.</p>
                  
                  <button onClick={() => setPrintedTicket(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold w-full py-4 rounded-xl transition-colors">Close 關閉</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- PRINTABLE TICKET --- */}
        {/* We use print:absolute print:top-0 print:left-0 to ensure it snaps cleanly to the printer margins */}
        {printedTicket && (
          <div className="hidden print:block print:absolute print:top-0 print:left-0 text-black text-center w-full max-w-[80mm] mx-auto p-4 font-sans bg-white z-[9999]">
            <div className="border-b-2 border-black pb-4 mb-4">
              <h1 className="text-base font-bold leading-tight">{PHARMACY_NAME}</h1>
              <h2 className="text-lg font-bold mt-1">{PHARMACY_NAME_ZH}</h2>
            </div>
            <div className="mb-2">
              <div className="text-xs uppercase font-bold tracking-widest text-gray-600">{printedTicket.serviceName}</div>
              <div className="text-sm font-bold">{printedTicket.serviceNameZh}</div>
            </div>
            <div className="border-y-4 border-black py-6 my-4">
              <div className="text-sm font-bold uppercase mb-1">Your Ticket Number 您的籌號</div>
              <div className="text-[6rem] font-black leading-none">{printedTicket.id}</div>
            </div>
            <div className="text-sm font-bold">{formatDate(printedTicket.createdAt)}</div>
            <div className="text-sm mb-6">{formatTime(printedTicket.createdAt)}</div>
            <div className="border-t border-dashed border-gray-400 pt-4 text-xs italic">
              Please wait for your number.<br/>請耐心等候叫號。
            </div>
          </div>
        )}
      </>
    );
  };

  const MonitorView = () => {
    const currentTicket = tickets.find(t => t.id === lastCallEvent.id);
    const [flash, setFlash] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    
    // Store latest tickets in ref so voice effect doesn't trigger on every queue update
    const ticketsRef = useRef(tickets);
    useEffect(() => { ticketsRef.current = tickets; }, [tickets]);

    useEffect(() => {
      if (lastCallEvent.time && lastCallEvent.id) {
        // Visual Flash
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), 3000);

        // Voice Announcement
        if (isAudioEnabled) {
          const t = ticketsRef.current.find(t => t.id === lastCallEvent.id);
          if (t && t.calledByCounter) {
            const formattedTicket = t.id.split('').join(' '); // Speaks "A 0 0 1" instead of "A one"
            
            // English Voice
            const msgEn = new SpeechSynthesisUtterance(`Ticket ${formattedTicket}, please proceed to ${t.calledByCounter}.`);
            msgEn.lang = 'en-US';
            msgEn.rate = 0.85;

            // Cantonese Voice
            let zhCounter = t.calledByCounter;
            if (zhCounter.includes('Counter')) zhCounter = zhCounter.replace('Counter ', '') + '號櫃位';
            if (zhCounter.includes('Room')) zhCounter = zhCounter.replace('Room ', '') + '號房間';
            
            const msgZh = new SpeechSynthesisUtterance(`請 ${formattedTicket} 號客, 到 ${zhCounter}。`);
            msgZh.lang = 'zh-HK';
            msgZh.rate = 0.85;

            window.speechSynthesis.speak(msgEn);
            window.speechSynthesis.speak(msgZh);
          }
        }
        return () => clearTimeout(timer);
      }
    }, [lastCallEvent.time]);

    const handleToggleAudio = () => {
      if (!isAudioEnabled) {
        const initVoice = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(initVoice);
      }
      setIsAudioEnabled(!isAudioEnabled);
    };

    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-900 text-white flex flex-col lg:flex-row overflow-hidden print:hidden">
        <div className="w-full lg:w-2/3 p-8 md:p-12 flex flex-col justify-center items-center border-b lg:border-b-0 lg:border-r border-slate-700 relative">
          
          <div className="lg:absolute top-8 left-12 mb-8 lg:mb-0 w-full lg:w-auto flex justify-between lg:block">
            <h2 className="text-xl md:text-2xl font-bold text-slate-400 flex items-center gap-3 justify-center"><Activity className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />{PHARMACY_NAME}</h2>
          </div>

          <button onClick={handleToggleAudio} className={`absolute top-6 right-6 md:top-8 md:right-12 flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-base transition-all ${isAudioEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'}`}>
            {isAudioEnabled ? <><Volume2 className="w-5 h-5 md:w-6 md:h-6"/> Sound ON</> : <><VolumeX className="w-5 h-5 md:w-6 md:h-6"/> Sound OFF (Click to Enable)</>}
          </button>

          <div className="mt-10 lg:mt-0">
            <h1 className="text-3xl md:text-5xl font-medium text-slate-400 uppercase tracking-widest text-center">Now Calling 現在叫號</h1>
            <div className={`transition-all duration-300 text-center ${flash ? 'scale-110 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]' : 'text-white'}`}>
              <div className="text-[8rem] md:text-[15rem] lg:text-[18rem] font-black leading-none my-4 md:my-8">{currentTicket ? currentTicket.id : '---'}</div>
            </div>
            {currentTicket && currentTicket.calledByCounter && (
              <div className="text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="inline-block bg-slate-800 text-yellow-400 px-8 py-3 md:px-12 md:py-4 rounded-full text-2xl md:text-4xl font-bold border border-slate-700">
                  {currentTicket.calledByCounter} {currentTicket.calledByCounter.includes('Counter') ? '櫃位' : '房間'}
                </div>
              </div>
            )}
          </div>

        </div>
        <div className="w-full lg:w-1/3 bg-slate-800 p-6 md:p-8 flex flex-col">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-300 mb-6 border-b border-slate-700 pb-4">Next in Line</h2>
          <div className="space-y-4 overflow-y-auto flex-1">
            {waitingTickets.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(0, 8).map((ticket) => (
              <div key={ticket.id} className="flex justify-between items-center bg-slate-700/50 p-4 md:p-6 rounded-xl border border-slate-600/50">
                <span className="text-3xl md:text-4xl font-bold text-slate-200">{ticket.id}</span>
                <span className="text-slate-400 text-base md:text-lg truncate pl-4">{ticket.serviceNameZh}</span>
              </div>
            ))}
            {waitingTickets.length === 0 && <div className="text-center text-slate-500 mt-10 text-lg">No tickets waiting</div>}
          </div>
        </div>
      </div>
    );
  };

  const PanelView = () => {
    if (!panelRoom) return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-100 flex items-center justify-center p-4 print:hidden">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Pharmacist Panel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STATIONS.map(station => (
              <button key={station} onClick={() => setPanelRoom(station)} className="p-4 border-2 rounded-xl font-bold text-lg text-gray-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 transition-all shadow-sm active:scale-95">{station}</button>
            ))}
          </div>
          <button onClick={() => { setIsStaffAuthenticated(false); setCurrentView('home'); }} className="mt-8 text-sm font-medium text-gray-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto px-4 py-2"><Lock className="w-4 h-4" /> Log Out System</button>
        </div>
      </div>
    );

    const sortedWaitingTickets = [...waitingTickets].sort((a, b) => {
      if (queueSortBy === 'number') return a.id.localeCompare(b.id);
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return (
      <div className="h-auto lg:h-[calc(100vh-64px)] bg-gray-100 p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden print:hidden">
        <div className="flex-1 flex flex-col gap-4 lg:gap-6 lg:overflow-hidden">
          
          {/* Top Control Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6 shrink-0">
            <div className="flex justify-between items-center mb-4 lg:mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl lg:text-2xl font-bold text-teal-700 flex items-center gap-2"><UserCheck className="w-6 h-6"/> {panelRoom}</h2>
              <button onClick={() => setPanelRoom(null)} className="text-gray-500 hover:text-red-600 text-sm font-medium flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-lg"><LogOut className="w-4 h-4"/> Switch</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
              {SERVICES.map(service => {
                const next = waitingTickets.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).find(t=>t.type===service.id);
                return (
                  <button key={service.id} onClick={() => next && updateTicketStatus(next.id, 'calling', panelRoom)} disabled={!next} className={`p-4 rounded-xl border-2 text-left transition-all ${next ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 shadow-sm active:scale-95 cursor-pointer' : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}`}>
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 truncate">{service.name}</div>
                    <div className="text-3xl font-black text-gray-900">{next ? next.id : '--'}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Tickets List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 min-h-[300px] lg:min-h-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-gray-700 flex items-center gap-2"><Activity className="w-5 h-5 text-green-500"/> Serving at {panelRoom}</div>
            <div className="p-4 overflow-y-auto space-y-3 lg:space-y-4 flex-1">
              {activeTickets.filter(t => t.calledByCounter === panelRoom).length === 0 ? (
                <div className="text-center text-gray-400 py-10 italic">No tickets currently being served.</div>
              ) : (
                activeTickets.filter(t => t.calledByCounter === panelRoom).map(ticket => (
                  <div key={ticket.id} className={`p-4 rounded-xl border-l-4 shadow-sm flex flex-col xl:flex-row gap-4 xl:gap-0 justify-between items-start xl:items-center ${ticket.status === 'calling' ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-500'}`}>
                    <div className="w-full xl:w-auto">
                      <div className="flex items-center justify-between xl:justify-start gap-4">
                        <div className="text-3xl font-black text-gray-900">{ticket.id}</div>
                        {/* Mobile Buttons for Active Tickets */}
                        <div className="flex gap-2 xl:hidden">
                          <button onClick={() => setMemoModal({ticketId: ticket.id, text: ticket.memo || ''})} className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 shadow-sm"><Edit3 className="w-5 h-5" /></button>
                          <button onClick={() => setReturnModal(ticket.id)} className="p-2 bg-white rounded-lg border border-gray-200 text-orange-500 hover:text-orange-600 shadow-sm"><RotateCcw className="w-5 h-5" /></button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 font-medium">{ticket.serviceNameZh}</div>
                      {ticket.memo && <div className="mt-2 text-blue-700 bg-white px-3 py-1.5 rounded-lg text-sm border border-blue-200 shadow-sm flex items-start gap-2"><FileEdit className="w-4 h-4 shrink-0 mt-0.5" /> <span className="break-words">{ticket.memo}</span></div>}
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full xl:w-auto mt-2 xl:mt-0">
                      {/* Desktop Buttons for Active Tickets */}
                      <button onClick={() => setMemoModal({ticketId: ticket.id, text: ticket.memo || ''})} className="hidden xl:flex p-3 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm" title="Add Memo"><Edit3 className="w-5 h-5" /></button>
                      <button onClick={() => setReturnModal(ticket.id)} className="hidden xl:flex p-3 bg-white rounded-lg border border-gray-200 text-orange-500 hover:text-white hover:bg-orange-500 transition-colors shadow-sm" title="Return to Queue"><RotateCcw className="w-5 h-5" /></button>
                      
                      {ticket.status === 'calling' ? (
                        <>
                          <button onClick={()=>updateTicketStatus(ticket.id, 'calling', panelRoom)} className="p-3 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 flex-1 sm:flex-none shadow-sm" title="Recall (Ring Bell)"><BellRing className="w-5 h-5 mx-auto" /></button>
                          <button onClick={()=>updateTicketStatus(ticket.id, 'arrived')} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700 flex-1 sm:flex-none shadow-sm active:scale-95">Arrived</button>
                          <button onClick={()=>updateTicketStatus(ticket.id, 'missed')} className="bg-red-50 border border-red-200 text-red-600 font-bold px-4 py-3 rounded-lg hover:bg-red-100 flex-1 sm:flex-none">Miss</button>
                        </>
                      ) : (
                        <button onClick={()=>updateTicketStatus(ticket.id, 'completed')} className="bg-green-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-green-700 w-full xl:w-auto shadow-sm active:scale-95 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5"/> Complete</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Waiting Queue Sidebar */}
        <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[400px] lg:min-h-0 shrink-0">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3 shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2"><Users className="w-5 h-5 text-blue-500"/> Queue <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{waitingTickets.length}</span></h3>
            </div>
            <div className="flex bg-gray-200 p-1 rounded-lg">
              <button onClick={() => setQueueSortBy('time')} className={`flex-1 flex justify-center items-center gap-1 text-xs font-bold py-2 rounded-md transition-colors ${queueSortBy === 'time' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><Timer className="w-4 h-4" /> Wait Time</button>
              <button onClick={() => setQueueSortBy('number')} className={`flex-1 flex justify-center items-center gap-1 text-xs font-bold py-2 rounded-md transition-colors ${queueSortBy === 'number' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><ArrowUpDown className="w-4 h-4" /> Number</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {sortedWaitingTickets.length === 0 ? <div className="text-center text-gray-400 py-10 italic">Queue is empty</div> : (
              sortedWaitingTickets.map(t => {
                const waitTime = getWaitTimeMinutes(t.createdAt);
                const isOvertime = waitTime > 10;
                
                return (
                  <div key={t.id} onContextMenu={(e) => { e.preventDefault(); setMemoModal({ ticketId: t.id, text: t.memo || '' }); }} className={`p-4 transition-colors flex justify-between items-center group relative border-l-4 ${isOvertime ? 'bg-red-50 border-red-500' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`text-xl font-black ${isOvertime ? 'text-red-700' : 'text-gray-900'}`}>{t.id}</div>
                        {isOvertime && <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" title="Waiting over 10 minutes" />}
                        {t.isReturned && <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-orange-200">Returned</span>}
                      </div>
                      <div className={`text-xs font-medium mt-1 w-max px-2 py-0.5 rounded-full ${isOvertime ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-600'}`}>Wait: {waitTime} min</div>
                      {t.memo && <div className={`text-xs mt-2 p-1.5 rounded border flex items-start gap-1 truncate shadow-sm ${isOvertime ? 'bg-white border-red-200 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`} title={t.memo}><FileEdit className="w-3 h-3 shrink-0 mt-0.5"/> <span className="truncate">{t.memo}</span></div>}
                    </div>
                    <div className="flex gap-2 shrink-0 items-center">
                      <button onClick={() => updateTicketStatus(t.id, 'calling', panelRoom)} className={`px-4 py-2 font-bold rounded-lg text-sm transition-all shadow-sm active:scale-95 ${isOvertime ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white lg:opacity-0 lg:group-hover:opacity-100'}`}>Call</button>
                      <button onClick={() => setMemoModal({ ticketId: t.id, text: t.memo || '' })} className="px-3 py-2 bg-white border border-gray-200 text-gray-500 rounded-lg text-sm flex items-center justify-center hover:text-blue-600 lg:opacity-0 lg:group-hover:opacity-100 transition-all shadow-sm" title="Edit Memo"><Edit3 className="w-4 h-4"/></button>
                      <button onClick={() => setDeleteModal(t.id)} className="px-3 py-2 bg-white border border-gray-200 text-red-500 rounded-lg text-sm flex items-center justify-center hover:text-white hover:bg-red-500 lg:opacity-0 lg:group-hover:opacity-100 transition-all shadow-sm" title="Cancel Ticket"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const ReportsView = () => {
    const stats = useMemo(() => {
      const completed = tickets.filter(t => t.status === 'completed' || t.status === 'missed');
      return { total: completed.length };
    }, [tickets]);
    return (
      <div className="h-[calc(100vh-64px)] bg-gray-100 p-4 md:p-6 print:hidden">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">Total Served Tickets</div>
            <div className="text-4xl font-black text-gray-800 mt-2">{stats.total}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-sans bg-gray-50 print:bg-white">
      <nav className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 shadow-sm print:hidden relative z-50">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="bg-teal-600 p-1.5 md:p-2 rounded-lg"><Ticket className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-lg md:text-xl text-gray-800 truncate">SJS Queue</span>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg gap-1">
          {['home', 'kiosk', 'monitor', 'panel', 'reports'].map(v => (
            <button key={v} onClick={() => { if(['panel', 'reports'].includes(v) && !isStaffAuthenticated) setCurrentView('login'); else setCurrentView(v); }} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${currentView === v ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>

        {/* Mobile Dropdown Nav */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b shadow-lg flex flex-col md:hidden py-2 px-4 space-y-2">
            {['home', 'kiosk', 'monitor', 'panel', 'reports'].map(v => (
              <button 
                key={v} 
                onClick={() => { 
                  setIsMobileMenuOpen(false);
                  if(['panel', 'reports'].includes(v) && !isStaffAuthenticated) setCurrentView('login'); 
                  else setCurrentView(v); 
                }} 
                className={`px-4 py-3 text-left text-base font-bold rounded-lg ${currentView === v ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        )}
      </nav>
      
      <main>
        {currentView === 'home' && <HomeView />}
        {currentView === 'login' && <LoginView />}
        {currentView === 'kiosk' && <KioskView />}
        {currentView === 'monitor' && <MonitorView />}
        {currentView === 'panel' && <PanelView />}
        {currentView === 'reports' && <ReportsView />}
      </main>
      
      {memoModal && <MemoDialog memoModal={memoModal} onClose={() => setMemoModal(null)} onSave={updateTicketMemo} />}
      {returnModal && <ReturnDialog returnModal={returnModal} onClose={() => setReturnModal(null)} onConfirm={handleReturnTicket} />}
      {deleteModal && <DeleteDialog deleteModal={deleteModal} onClose={() => setDeleteModal(null)} onConfirm={handleDeleteTicket} />}
    </div>
  );
}