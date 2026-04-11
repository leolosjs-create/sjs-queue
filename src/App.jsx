import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Ticket, Monitor, UserCheck, Stethoscope, Info, 
  Printer, BellRing, CheckCircle, Clock, XCircle,
  Home, ChevronRight, Activity, LogOut, ArrowUpDown, 
  Timer, FileEdit, BarChart3, TrendingUp, Users, Database,
  Lock, KeyRound, AlertTriangle, Edit3, Menu, RotateCcw,
  Volume2, VolumeX, Trash2, Play, Calendar, History,
  ShoppingBag, ClipboardList, HeartPulse, Settings
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
const STAFF_PIN = "1234"; 
const LOGO_PATH = "/logo.png"; 

const SERVICES = [
  { id: 'A', name: 'Prescription Dispensing', nameZh: '處方配藥', icon: Ticket, color: 'bg-blue-600', hover: 'hover:bg-blue-700' },
  { id: 'B', name: 'Minor Ailment Management', nameZh: '小病小痛管理', icon: Stethoscope, color: 'bg-teal-600', hover: 'hover:bg-teal-700' },
  { id: 'C', name: 'Travel / OTC Medication', nameZh: '購買平安藥/非處方藥', icon: ShoppingBag, color: 'bg-purple-600', hover: 'hover:bg-purple-700' },
  { id: 'D', name: 'Pharmacist Consultation', nameZh: '藥劑師諮詢', icon: UserCheck, color: 'bg-orange-500', hover: 'hover:bg-orange-600' },
  { id: 'E', name: 'Medication Management Service', nameZh: '藥物管理服務', icon: ClipboardList, color: 'bg-pink-600', hover: 'hover:bg-pink-700' },
  { id: 'F', name: 'Health Screening Service', nameZh: '健康篩查服務', icon: HeartPulse, color: 'bg-indigo-600', hover: 'hover:bg-indigo-700' },
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

const getWaitTimeMinutes = (createdAt, currentTime) => {
  const diffMs = currentTime - new Date(createdAt);
  return Math.max(0, Math.floor(diffMs / 60000));
};

const msToMins = (ms) => {
  if (!ms || isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 60000);
};

// --- DIALOGS ---
const MemoDialog = ({ memoModal, onClose, onSave }) => {
  const [text, setText] = useState(memoModal.text);
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><FileEdit className="text-blue-600"/> 備忘錄 - 籌號 {memoModal.displayId}</h3>
        <textarea className="w-full border border-gray-200 rounded-lg p-3 min-h-[100px] mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold" placeholder="例如：陳大文, Rx 12345..." value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-gray-500 font-bold">取消</button>
          <button onClick={() => onSave(memoModal.id, text)} className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold">儲存備忘</button>
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
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><RotateCcw className="text-orange-600"/> 重新排隊 - 籌號 {returnModal.displayId}</h3>
        <textarea className="w-full border border-gray-200 rounded-lg p-3 min-h-[100px] mb-4 outline-none focus:ring-2 focus:ring-orange-500 text-lg font-bold" placeholder="返回隊列原因..." value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-gray-500 font-bold">取消</button>
          <button onClick={() => onConfirm(returnModal.id, text)} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">確認返回</button>
        </div>
      </div>
    </div>
  );
};

const DeleteDialog = ({ deleteModal, onClose, onConfirm }) => {
  const [selectedReason, setSelectedReason] = useState("顧客已離開 Customer left");
  const [customReason, setCustomReason] = useState("");
  const COMMON_REASONS = ["顧客已離開 Customer left", "誤印籌號 Printed by mistake", "重複籌號 Duplicate ticket", "其他原因 Other"];
  const handleConfirm = () => {
    const finalReason = selectedReason.includes("Other") ? customReason : selectedReason;
    onConfirm(deleteModal.id, finalReason || "No reason provided");
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 text-left">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Trash2 className="text-red-600"/> 取消籌號 {deleteModal.displayId}?</h3>
        <div className="space-y-2 mb-4">
          {COMMON_REASONS.map((reason) => (
            <label key={reason} className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="radio" name="deleteReason" value={reason} checked={selectedReason === reason} onChange={(e) => setSelectedReason(e.target.value)} className="w-4 h-4 text-red-600"/>
              <span className="text-gray-800 text-base font-bold">{reason}</span>
            </label>
          ))}
        </div>
        {selectedReason.includes("Other") && <textarea className="w-full border border-gray-200 rounded-lg p-3 min-h-[80px] mb-4 outline-none focus:ring-2 focus:ring-red-500 text-lg font-bold" placeholder="請註明原因..." value={customReason} onChange={(e) => setCustomReason(e.target.value)} autoFocus />}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-gray-500 font-bold">取消</button>
          <button onClick={handleConfirm} className="px-8 py-2 bg-red-600 text-white rounded-lg font-bold">確認取消</button>
        </div>
      </div>
    </div>
  );
};

// --- SUB-VIEWS ---
const HomeView = ({ setCurrentView, isStaffAuthenticated }) => (
  <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gray-50 p-4 md:p-8 print:hidden">
    <div className="max-w-5xl w-full text-center space-y-6 md:space-y-8">
      <img src={LOGO_PATH} alt="Logo" className="h-48 md:h-64 lg:h-80 mx-auto object-contain mb-6 drop-shadow-xl" onError={(e) => e.target.style.display='none'} />
      <div>
        <h1 className="text-4xl md:text-7xl font-bold text-gray-800 tracking-tight leading-tight mb-2">{PHARMACY_NAME_ZH}</h1>
        <h2 className="text-lg md:text-2xl text-gray-500 font-medium uppercase tracking-widest">{PHARMACY_NAME}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8 md:mt-12">
        <button onClick={() => setCurrentView('kiosk')} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center">
          <div className="bg-blue-100 p-4 md:p-5 rounded-full mb-4"><Printer className="w-8 h-8 md:w-10 md:h-10 text-blue-600" /></div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-800">自助取籌機</h3>
          <p className="text-gray-500 mt-1 text-xs">Ticketing Kiosk</p>
        </button>
        <button onClick={() => setCurrentView('monitor')} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center">
          <div className="bg-indigo-100 p-4 md:p-5 rounded-full mb-4"><Monitor className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" /></div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-800">電視叫號螢幕</h3>
          <p className="text-gray-500 mt-1 text-xs">TV Monitor</p>
        </button>
        <button onClick={() => { if(isStaffAuthenticated) setCurrentView('panel'); else setCurrentView('login'); }} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center">
          <div className="bg-teal-100 p-4 md:p-5 rounded-full mb-4"><UserCheck className="w-8 h-8 md:w-10 md:h-10 text-teal-600" /></div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-800">藥劑師控制台</h3>
          <p className="text-gray-500 mt-1 text-xs">Pharmacist Panel</p>
        </button>
        <button onClick={() => { if(isStaffAuthenticated) setCurrentView('reports'); else setCurrentView('login'); }} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center">
          <div className="bg-purple-100 p-4 md:p-5 rounded-full mb-4 group-hover:scale-110 transition-transform"><BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-purple-600" /></div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-800">後台數據分析</h3>
          <p className="text-gray-500 mt-1 text-xs">Reports & Analytics</p>
        </button>
      </div>
    </div>
  </div>
);

const LoginView = ({ setCurrentView, setIsStaffAuthenticated }) => {
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
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">職員專用 Staff Only</h2>
        <p className="text-gray-500 mb-8">請輸入安全密碼 Enter security PIN</p>
        <input type="password" value={pin} onChange={(e) => { setError(false); setPin(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className={`w-full text-center text-3xl tracking-[1em] border-2 rounded-xl p-4 mb-4 outline-none transition-all ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500'}`} placeholder="****" maxLength={4} autoFocus />
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all text-lg shadow-md active:scale-95">登入系統 Unlock</button>
        <button onClick={() => setCurrentView('home')} className="mt-6 text-gray-400 font-medium w-full py-2">取消 Cancel</button>
      </div>
    </div>
  );
};

const KioskView = ({ generateTicket }) => {
  const [printedTicket, setPrintedTicket] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useAndroidUSB, setUseAndroidUSB] = useState(false);
  const printLock = useRef(false);

  useEffect(() => {
    if (printedTicket && !printLock.current && !useAndroidUSB) {
      printLock.current = true;
      const timer = setTimeout(() => {
        window.print();
        setTimeout(() => { setPrintedTicket(null); }, 3000); 
      }, 300); 
      return () => clearTimeout(timer);
    }
  }, [printedTicket, useAndroidUSB]);

  const handlePrint = async (serviceId) => {
    if (isGenerating) return;
    setIsGenerating(true);
    printLock.current = false;
    
    const ticket = await generateTicket(serviceId);
    
    if (ticket) {
      setPrintedTicket(ticket);
      
      if (useAndroidUSB) {
        printLock.current = true; // Lock out the normal browser print popup
        try {
          // Construct the ESC/POS Raw String
          const receiptText = `\x1B\x40\x1B\x61\x01${PHARMACY_NAME_ZH}\n${PHARMACY_NAME}\n\n${ticket.serviceNameZh}\n${ticket.serviceName}\n\nTicket Number:\n\x1D\x21\x11${ticket.ticketNumber || ticket.id}\x1D\x21\x00\n\n${formatDate(ticket.createdAt)}\n${formatTime(ticket.createdAt)}\n\n\n\n\n\x1DV\x00`;
          
          // Proper UTF-8 to Base64 Encoding for RawBT to handle Chinese characters
          const base64Data = window.btoa(unescape(encodeURIComponent(receiptText)));
          const rawbtUrl = `rawbt:base64,${base64Data}`;
          
          window.location.href = rawbtUrl;
        } catch (error) {
          console.error("RawBT Encoding Error:", error);
        }
        setTimeout(() => setPrintedTicket(null), 3000); // 3-second auto close
      }
    }
    setIsGenerating(false);
  };

  const handleManualPrint = () => {
    window.print();
    setTimeout(() => {
      setPrintedTicket(null);
    }, 3000);
  };

  return (
    <>
      <div className="min-h-[calc(100vh-64px)] bg-gray-100 flex flex-col items-center justify-center p-4 md:p-6 print:hidden">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-full">
          <div className="bg-blue-900 p-6 md:p-8 text-center text-white flex flex-col items-center border-b-8 border-blue-600/30 shrink-0">
            <img src={LOGO_PATH} alt="Logo" className="h-24 md:h-32 lg:h-40 max-w-[80%] mx-auto mb-4 object-contain bg-white/95 backdrop-blur-md p-2 md:p-4 rounded-2xl shadow-xl ring-1 ring-white/50" onError={(e) => e.target.style.display='none'} />
            <h1 className="text-3xl md:text-5xl font-bold mb-2">歡迎光臨 Welcome</h1>
            <p className="text-blue-100 text-lg md:text-2xl font-medium mt-1 text-center">請選擇服務以領取籌號<br/><span className="text-sm opacity-60 italic font-normal">Please select a service</span></p>
          </div>
          <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-y-auto">
            {SERVICES.map(service => (
              <button key={service.id} onClick={() => handlePrint(service.id)} disabled={isGenerating} className={`w-full ${service.color} ${service.hover} text-white p-4 md:p-6 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-between group`}>
                <div className="flex items-center gap-4 md:gap-5 text-left flex-1">
                  <div className="bg-white text-slate-800 w-16 h-16 md:w-20 md:h-20 rounded-2xl shrink-0 flex items-center justify-center shadow-lg border-b-4 border-black/20 group-active:border-b-0 group-active:translate-y-1 transition-all">
                    <span className="text-4xl md:text-5xl font-black">{service.id}</span>
                  </div>
                  <div className="flex-1 pl-1">
                    <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-1">{service.nameZh}</h2>
                    <h3 className="text-xs md:text-sm opacity-90 italic font-medium">{service.name}</h3>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 md:w-8 md:h-8 opacity-50 shrink-0" />
              </button>
            ))}
          </div>
          <div className="p-3 text-center border-t border-gray-100 flex items-center justify-center gap-4 bg-gray-50 shrink-0">
             <label className="flex items-center gap-2 cursor-pointer text-gray-400 text-xs font-bold uppercase tracking-widest">
                <input type="checkbox" checked={useAndroidUSB} onChange={(e) => setUseAndroidUSB(e.target.checked)} className="rounded" />
                Android Direct USB Mode (RawBT)
             </label>
          </div>
          {printedTicket && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border-t-8 border-blue-600 animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold text-gray-800 mb-1">您的籌號 Your Ticket</h2>
                <div className="text-7xl md:text-8xl font-black text-blue-600 my-4 tracking-tighter">{printedTicket.ticketNumber || printedTicket.id}</div>
                {!useAndroidUSB && (
                  <button onClick={handleManualPrint} className="mt-2 bg-blue-50 text-blue-700 font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors w-full border border-blue-200 mb-6 text-xl"><Printer className="w-6 h-6" /> 列印籌號 Print</button>
                )}
                <button onClick={() => setPrintedTicket(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold w-full py-4 rounded-xl transition-colors">關閉 Close</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- RE-STYLED PRINTABLE TICKET --- */}
      {printedTicket && !useAndroidUSB && (
        <div className="hidden print:block text-black text-center w-full max-w-[80mm] mx-auto p-4 font-sans bg-white z-[9999] m-0">
          <div className="flex flex-col items-center mb-4 border-b-2 border-black pb-4 text-center">
            <img src={LOGO_PATH} alt="Logo" className="w-11/12 max-w-[70mm] h-auto object-contain mb-4 mx-auto" />
            <h1 className="text-xl font-bold leading-tight">{PHARMACY_NAME_ZH}</h1>
            <h2 className="text-[10px] font-medium opacity-70 uppercase tracking-tighter mt-1">{PHARMACY_NAME}</h2>
          </div>
          <div className="mb-4 text-center">
            <div className="text-2xl font-black">{printedTicket.serviceNameZh}</div>
            <div className="text-xs font-bold opacity-60 uppercase">{printedTicket.serviceName}</div>
          </div>
          <div className="border-y-4 border-black py-6 my-4 text-center">
            <div className="text-sm font-bold uppercase mb-1">您的籌號 YOUR TICKET NUMBER</div>
            <div className="text-[6.5rem] font-black leading-none">{printedTicket.ticketNumber || printedTicket.id}</div>
          </div>
          <div className="text-sm font-bold text-center">{formatDate(printedTicket.createdAt)}</div>
          <div className="text-sm mb-6 text-center">{formatTime(printedTicket.createdAt)}</div>
          <div className="border-t border-dashed border-gray-500 pt-4 text-sm italic font-black text-center">請耐心等候叫號。<br/>Please wait for your number.</div>
        </div>
      )}
    </>
  );
};

const MonitorView = ({ tickets, lastCallEvent, isStarted, onStart, currentTime }) => {
  const currentTicket = tickets.find(t => t.id === lastCallEvent.id);
  const displayId = currentTicket ? (currentTicket.ticketNumber || currentTicket.id) : '---';
  const [flash, setFlash] = useState(false);
  
  const ticketsRef = useRef(tickets);
  useEffect(() => { ticketsRef.current = tickets; }, [tickets]);

  useEffect(() => {
    // Only trigger voice if it's a valid new call time AND the monitor is started
    if (lastCallEvent.time && isStarted) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 3000);
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel(); // Stop any currently playing audio
        setTimeout(() => {
          // Look up the exact ticket that was called
          const t = ticketsRef.current.find(ticket => ticket.id === lastCallEvent.id);
          
          // Only announce if the ticket exists and actually has a counter assigned
          if (t && t.calledByCounter) {
            const tNumber = (t.ticketNumber || t.id);
            const formattedTicket = tNumber.split('').join(' '); 
            
            const msgZh = new SpeechSynthesisUtterance(`請 ${formattedTicket} 號客, 到 ${t.calledByCounter.replace('Counter', '').replace('Room', '')} 號${t.calledByCounter.includes('Counter') ? '櫃位' : '房間'}。`);
            msgZh.lang = 'zh-HK';
            msgZh.rate = 0.85;
            
            const msgEn = new SpeechSynthesisUtterance(`Ticket ${formattedTicket}, please proceed to ${t.calledByCounter}.`);
            msgEn.lang = 'en-US';
            msgEn.rate = 0.85;
            
            window.speechSynthesis.speak(msgZh);
            window.speechSynthesis.speak(msgEn);
          }
        }, 100);
      }
      return () => clearTimeout(timer);
    }
  // IMPORTANT FIX: We ONLY depend on lastCallEvent.time and isStarted. 
  // We strictly DO NOT depend on currentTicket, so it doesn't infinite loop when status changes to 'arrived'
  }, [lastCallEvent.time, isStarted]); 

  if (!isStarted) {
    return (
      <div className="h-[calc(100vh-64px)] bg-slate-900 flex flex-col items-center justify-center p-6 print:hidden">
        <div className="max-w-lg w-full bg-slate-800 p-12 rounded-3xl shadow-2xl text-center border-2 border-slate-700">
          <Volume2 className="w-20 h-20 text-blue-500 mx-auto mb-8 animate-pulse" />
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight text-center">啟動叫號螢幕</h2>
          <p className="text-slate-400 mb-10 text-xl font-medium text-center">點擊按鈕開啟聲音通知並開始運作。<br/><span className="text-sm opacity-50 uppercase mt-2 block tracking-widest text-center">Enable sound & Start monitor</span></p>
          <button onClick={onStart} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-8 rounded-3xl text-2xl shadow-[0_0_50px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center justify-center gap-4 tracking-widest uppercase">
            <Play className="w-8 h-8 fill-current" /> 立即啟動 Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-900 text-white flex flex-col overflow-hidden print:hidden">
      <div className="w-full bg-slate-800 border-b-4 border-slate-700 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 shrink-0 z-20 shadow-2xl">
         <div className="flex items-center gap-6 md:gap-10">
            <div className="bg-white rounded-3xl p-3 md:p-4 shadow-inner ring-4 ring-slate-700/50 shrink-0">
               <img src={LOGO_PATH} alt="Logo" className="h-16 md:h-24 lg:h-32 object-contain mx-auto" onError={(e) => e.target.style.display='none'} />
            </div>
            <div className="flex flex-col text-left">
               <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-100 tracking-tight leading-none mb-2">{PHARMACY_NAME_ZH}</h2>
               <h3 className="text-xs md:text-sm lg:text-base font-bold text-slate-400 uppercase tracking-[0.2em] opacity-80">{PHARMACY_NAME}</h3>
            </div>
         </div>
         <div className="flex flex-col items-center md:items-end shrink-0">
            <h1 className="text-5xl md:text-7xl font-black text-yellow-500 tracking-[0.2em] uppercase mb-1 drop-shadow-lg text-center">現在叫號</h1>
            <p className="text-slate-500 text-sm md:text-xl font-black tracking-[0.3em] uppercase opacity-40 text-center">Now Calling</p>
         </div>
      </div>
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="w-full lg:w-2/3 p-8 flex flex-col justify-center items-center border-b lg:border-b-0 lg:border-r-4 border-slate-700/50">
          <div className={`transition-all duration-300 text-center ${flash ? 'scale-110 text-white drop-shadow-[0_0_80px_rgba(255,255,255,0.6)]' : 'text-white'}`}>
            <div className="text-[14rem] md:text-[22rem] lg:text-[28rem] font-black leading-none my-4 tracking-tighter drop-shadow-2xl">{displayId}</div>
          </div>
          {currentTicket && currentTicket.calledByCounter && currentTicket.status === 'calling' && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-8 mt-10">
              <div className="inline-block bg-yellow-500 text-slate-900 px-16 py-5 md:px-24 md:py-8 rounded-full text-4xl md:text-7xl font-black shadow-[0_0_60px_rgba(234,179,8,0.4)] border-4 border-white/20">
                {currentTicket.calledByCounter.replace('Counter', '').replace('Room', '')} 號 {currentTicket.calledByCounter.includes('Counter') ? '櫃位' : '房間'}
              </div>
            </div>
          )}
        </div>
        <div className="w-full lg:w-1/3 bg-slate-800/40 p-8 md:p-12 flex flex-col">
          <h2 className="text-4xl font-black text-slate-300 mb-10 border-b-4 border-slate-700 pb-8 flex items-end gap-5">
            準備叫號 <span className="text-xl md:text-2xl opacity-40 font-black pb-1 tracking-widest uppercase">Next</span>
          </h2>
          <div className="space-y-6 overflow-y-auto flex-1 pr-2">
            {tickets.filter(t => t.status === 'waiting' && new Date(t.createdAt).toDateString() === currentTime.toDateString()).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="flex justify-between items-center bg-slate-700/40 p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-600/30 shadow-2xl">
                <span className="text-6xl md:text-8xl font-black text-slate-100 tracking-tighter">{ticket.ticketNumber || ticket.id}</span>
                <span className="text-slate-400 text-2xl md:text-4xl font-bold truncate pl-8 text-right opacity-80">{ticket.serviceNameZh}</span>
              </div>
            ))}
            {tickets.filter(t => t.status === 'waiting' && new Date(t.createdAt).toDateString() === currentTime.toDateString()).length === 0 && <div className="text-center text-slate-600 mt-24 text-2xl font-black opacity-30 uppercase tracking-[0.2em]">暫無籌號 No Waiting</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const PanelView = ({ 
  panelRoom, setPanelRoom, waitingTickets, activeTickets, completedTickets,
  queueSortBy, setQueueSortBy, updateTicketStatus, 
  setMemoModal, setReturnModal, setDeleteModal, 
  currentTime, setIsStaffAuthenticated, setCurrentView 
}) => {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  if (!panelRoom) {
    return (
      <div className="h-[calc(100vh-64px)] bg-gray-100 flex items-center justify-center p-4 print:hidden text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">藥劑師控制台 Pharmacist Panel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STATIONS.map(station => (
              <button key={station} onClick={() => setPanelRoom(station)} className="p-4 border-2 rounded-xl font-bold text-lg text-gray-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 transition-all shadow-sm active:scale-95">{station}</button>
            ))}
          </div>
          <button onClick={() => { setIsStaffAuthenticated(false); setCurrentView('home'); }} className="mt-8 text-sm font-medium text-gray-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto px-4 py-2"><Lock className="w-4 h-4" /> 登出系統 Log Out</button>
        </div>
      </div>
    );
  }
  
  const sortedWaitingTickets = [...waitingTickets].sort((a, b) => {
    if (queueSortBy === 'number') return (a.ticketNumber || a.id).localeCompare(b.ticketNumber || b.id);
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  return (
    <div className="h-auto lg:h-[calc(100vh-64px)] bg-gray-100 p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden print:hidden">
      <div className="flex-1 flex flex-col gap-4 lg:gap-6 lg:overflow-hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6 shrink-0">
          <div className="flex justify-between items-center mb-4 lg:mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-xl lg:text-2xl font-bold text-teal-700 flex items-center gap-2"><UserCheck className="w-6 h-6"/> {panelRoom}</h2>
            <button onClick={() => setPanelRoom(null)} className="text-gray-500 hover:text-red-600 text-sm font-medium flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-lg"><LogOut className="w-4 h-4"/> 切換 Switch</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
            {SERVICES.map(service => {
              const next = waitingTickets.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).find(t=>t.type===service.id);
              return (
                <button key={service.id} onClick={() => next && updateTicketStatus(next.id, 'calling', panelRoom)} disabled={!next} className={`p-3 rounded-xl border-2 text-left transition-all ${next ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 shadow-sm active:scale-95 cursor-pointer' : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}`}>
                  <div className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 truncate" title={service.nameZh}>{service.nameZh}</div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">{next ? next.ticketNumber : '--'}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 min-h-[300px] lg:min-h-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-gray-700 flex items-center gap-2"><Activity className="w-5 h-5 text-green-500"/> 正在處理 Serving</div>
          <div className="p-4 overflow-y-auto space-y-3 lg:space-y-4 flex-1">
            {activeTickets.filter(t => t.calledByCounter === panelRoom).length === 0 ? (
              <div className="text-center text-gray-400 py-10 italic">暫無進行中籌號 No active tickets.</div>
            ) : (
              activeTickets.filter(t => t.calledByCounter === panelRoom).map(ticket => {
                const displayId = ticket.ticketNumber || ticket.id;
                return (
                  <div key={ticket.id} className={`p-4 rounded-xl border-l-4 shadow-sm flex flex-col xl:flex-row gap-4 xl:gap-0 justify-between items-start xl:items-center ${ticket.status === 'calling' ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-500'}`}>
                    <div>
                      <div className="text-3xl font-black text-gray-900">{displayId}</div>
                      <div className="text-sm text-gray-600 font-bold">{ticket.serviceNameZh}</div>
                      {ticket.memo && <div className="mt-2 text-blue-700 bg-white px-3 py-1.5 rounded-lg text-sm border border-blue-200 shadow-sm font-bold">{ticket.memo}</div>}
                    </div>
                    <div className="flex gap-2 w-full xl:w-auto">
                      <button onClick={() => setMemoModal({ id: ticket.id, displayId: displayId, text: ticket.memo || '' })} className="p-3 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600"><Edit3 className="w-5 h-5" /></button>
                      <button onClick={() => setReturnModal({ id: ticket.id, displayId: displayId })} className="p-3 bg-white rounded-lg border border-gray-200 text-orange-500"><RotateCcw className="w-5 h-5" /></button>
                      {ticket.status === 'calling' ? (
                        <>
                          <button onClick={()=>updateTicketStatus(ticket.id, 'calling', panelRoom)} className="p-3 bg-white border border-gray-200 text-gray-600 rounded-lg"><BellRing className="w-5 h-5 mx-auto" /></button>
                          <button onClick={()=>updateTicketStatus(ticket.id, 'arrived')} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg flex-1">已到 Arrived</button>
                          <button onClick={()=>updateTicketStatus(ticket.id, 'missed')} className="bg-red-50 text-red-600 font-bold px-4 py-3 rounded-lg text-center">過號 Miss</button>
                        </>
                      ) : (
                        <button onClick={()=>updateTicketStatus(ticket.id, 'completed')} className="bg-green-600 text-white font-bold px-8 py-3 rounded-lg flex-1 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5"/> 完成 Complete</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col shrink-0 overflow-hidden transition-all duration-300">
          <button onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} className="p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left">
            <div className="font-bold text-gray-700 flex items-center gap-2"><History className="w-5 h-5 text-purple-500" /> 最近處理記錄 History Log</div>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isHistoryExpanded ? 'rotate-90' : ''}`} />
          </button>
          {isHistoryExpanded && (
            <div className="p-4 border-t border-gray-200 max-h-80 overflow-y-auto space-y-2 bg-white">
              {completedTickets.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0)).slice(0, 50).map(t => (
                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 gap-2 sm:gap-4 text-left">
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xl font-black ${t.status === 'completed' ? 'text-green-600' : 'text-red-500'}`}>{t.ticketNumber || t.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border bg-white">{t.status}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-sm text-gray-600 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    {t.calledByCounter && <span className="font-bold text-gray-800 whitespace-nowrap">{t.calledByCounter}</span>}
                    {t.memo && <span className="text-gray-500 truncate">{t.memo}</span>}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap font-medium flex items-center gap-1 shrink-0"><Clock className="w-3 h-3"/> {formatTime(t.completedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3 shrink-0">
          <div className="flex justify-between items-center"><h3 className="font-bold text-gray-700 flex items-center gap-2 text-left"><Users className="w-5 h-5 text-blue-500"/> 等待隊列 Queue <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">{waitingTickets.length}</span></h3></div>
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button onClick={() => setQueueSortBy('time')} className={`flex-1 flex justify-center items-center gap-1 text-xs font-bold py-2 rounded-md transition-all ${queueSortBy === 'time' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><Timer className="w-4 h-4" /> 時間 Time</button>
            <button onClick={() => setQueueSortBy('number')} className={`flex-1 flex justify-center items-center gap-1 text-xs font-bold py-2 rounded-md transition-all ${queueSortBy === 'number' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><ArrowUpDown className="w-4 h-4" /> 籌號 No.</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {sortedWaitingTickets.map(t => (
            <div key={t.id} onContextMenu={(e) => { e.preventDefault(); setMemoModal({ id: t.id, displayId: t.ticketNumber || t.id, text: t.memo || '' }); }} className="p-4 transition-colors flex justify-between items-center group relative border-l-4 hover:bg-gray-50 text-left">
              <div className="flex-1 min-w-0 pr-4">
                <div className="text-xl font-black">{t.ticketNumber || t.id}</div>
                <div className="text-xs font-bold mt-1 text-gray-600 text-left">已等待: {getWaitTimeMinutes(t.createdAt, currentTime)} 分鐘</div>
                {t.memo && <div className="text-xs mt-2 p-1.5 rounded border border-blue-100 bg-blue-50 text-blue-700 truncate font-bold text-left">{t.memo}</div>}
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <button onClick={() => updateTicketStatus(t.id, 'calling', panelRoom)} className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm hover:bg-blue-600 hover:text-white transition-all shadow-sm">叫號</button>
                <button onClick={() => setMemoModal({ id: t.id, displayId: t.ticketNumber || t.id, text: t.memo || '' })} className="p-2 text-gray-400 hover:text-blue-600 transition-colors shadow-sm bg-white rounded border border-gray-100"><Edit3 className="w-4 h-4"/></button>
                <button onClick={() => setDeleteModal({ id: t.id, displayId: t.ticketNumber || t.id })} className="p-2 text-red-300 hover:text-red-600 transition-colors shadow-sm bg-white rounded border border-gray-100"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ReportsView = ({ tickets }) => {
  const [timeframe, setTimeframe] = useState('today');
  const stats = useMemo(() => {
    const now = new Date();
    const filtered = tickets.filter(t => {
      if (!t.createdAt) return false;
      const tDate = new Date(t.createdAt);
      if (timeframe === 'today') return tDate.toDateString() === now.toDateString();
      if (timeframe === 'week') return (now - tDate) <= 7 * 24 * 60 * 60 * 1000;
      if (timeframe === 'month') return (now - tDate) <= 30 * 24 * 60 * 60 * 1000;
      return true;
    });
    let waitTimes = []; let completedCount = 0; let cancelledCount = 0;
    filtered.forEach(t => {
      if (t.status === 'cancelled' || t.status === 'missed') cancelledCount++;
      if (t.status === 'completed') {
        completedCount++;
        const cAt = new Date(t.createdAt).getTime();
        const called = t.calledAt ? new Date(t.calledAt).getTime() : null;
        if (called) waitTimes.push(called - cAt);
      }
    });
    const avg = (arr) => arr.length ? Math.floor(arr.reduce((a,b)=>a+b,0) / arr.length / 60000) : 0;
    return { totalGenerated: filtered.length, completed: completedCount, cancelled: cancelledCount, avgWait: avg(waitTimes) };
  }, [tickets, timeframe]);
  
  return (
    <div className="h-auto min-h-[calc(100vh-64px)] bg-gray-100 p-4 md:p-8 print:hidden">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 text-left"><BarChart3 className="w-6 h-6 text-blue-600"/> 數據分析 Dashboard</h1>
          <div className="flex bg-gray-100 p-1 rounded-lg self-stretch sm:self-auto">
            {['today', 'week', 'month', 'all'].map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md capitalize transition-all ${timeframe === tf ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>{tf === 'all' ? '所有記錄' : tf === 'today' ? '今日' : tf === 'week' ? '本週' : '本月'}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center text-center">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">總籌號量 Total</div>
            <div className="text-4xl font-black text-gray-900">{stats.totalGenerated}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center text-center">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">平均等待 Avg Wait</div>
            <div className="flex items-baseline justify-center gap-1"><span className="text-4xl font-black text-blue-600">{stats.avgWait}</span><span className="text-gray-500 font-bold">分鐘</span></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center text-center">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">已完成 Completed</div>
            <div className="text-4xl font-black text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center text-center">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">已取消 Cancelled</div>
            <div className="text-4xl font-black text-red-600">{stats.cancelled}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ENTRY ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);
  const [isMonitorStarted, setIsMonitorStarted] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [tickets, setTickets] = useState([]);
  const [counters, setCounters] = useState({ A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 });
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
      const loadedTickets = []; snapshot.forEach(doc => loadedTickets.push(doc.data()));
      setTickets(loadedTickets);
    }, (err) => console.error("Firestore Error:", err));

    const countersRef = collection(db, 'artifacts', appId, 'public', 'data', 'counters');
    const unsubCounters = onSnapshot(countersRef, (snapshot) => {
      const loadedCounters = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
      snapshot.forEach(doc => { loadedCounters[doc.id] = doc.data().count; });
      setCounters(loadedCounters);
    });

    const displayRef = doc(db, 'artifacts', appId, 'public', 'data', 'system', 'display');
    const unsubDisplay = onSnapshot(displayRef, (snapshot) => {
      if (snapshot.exists()) setLastCallEvent(snapshot.data());
    });

    return () => { unsubTickets(); unsubCounters(); unsubDisplay(); };
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Daily Reset Logic
  useEffect(() => {
    if (!user || tickets.length === 0) return;
    const todayStr = currentTime.toDateString();
    const staleTickets = tickets.filter(t => ['waiting', 'calling', 'arrived'].includes(t.status) && new Date(t.createdAt).toDateString() !== todayStr);
    if (staleTickets.length > 0) {
      staleTickets.forEach(async (t) => {
        const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', t.id);
        const finalMemo = t.memo ? `${t.memo} | [System] Auto-cleared` : `[System] Auto-cleared`;
        await setDoc(ticketRef, { ...t, status: 'cancelled', completedAt: new Date().toISOString(), memo: finalMemo });
      });
      SERVICES.forEach(async (s) => {
        const counterRef = doc(db, 'artifacts', appId, 'public', 'data', 'counters', s.id);
        await setDoc(counterRef, { count: 0 });
      });
    }
  }, [currentTime, user, tickets]);

  const generateTicket = async (serviceId) => {
    if (!user) return null;
    try {
      const service = SERVICES.find(s => s.id === serviceId);
      const newNum = (counters[serviceId] || 0) + 1;
      const counterRef = doc(db, 'artifacts', appId, 'public', 'data', 'counters', serviceId);
      await setDoc(counterRef, { count: newNum });
      const ticketNumber = `${serviceId}${newNum.toString().padStart(3, '0')}`;
      const docId = `ticket_${Date.now()}`;
      const newTicket = { id: docId, ticketNumber, type: serviceId, serviceName: service.name, serviceNameZh: service.nameZh, status: 'waiting', createdAt: new Date().toISOString(), calledAt: null, arrivedAt: null, completedAt: null, calledByCounter: null, memo: '', isReturned: false };
      const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', docId);
      await setDoc(ticketRef, newTicket);
      return newTicket;
    } catch (e) { console.error(e); return null; }
  };

  const updateTicketStatus = async (ticketId, newStatus, counterName = null) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;
    const timestamp = new Date().toISOString();
    const updated = { ...t, status: newStatus };
    if (newStatus === 'calling') { if (!t.calledAt) updated.calledAt = timestamp; if (counterName) updated.calledByCounter = counterName; }
    if (newStatus === 'arrived') updated.arrivedAt = timestamp;
    if (newStatus === 'completed' || newStatus === 'missed') updated.completedAt = timestamp;
    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, updated);
    
    // Only dispatch a new voice call event if the status is strictly 'calling'
    if (newStatus === 'calling') {
      const displayRef = doc(db, 'artifacts', appId, 'public', 'data', 'system', 'display');
      await setDoc(displayRef, { id: ticketId, time: Date.now(), counter: counterName || updated.calledByCounter });
    }
  };

  const updateTicketMemo = async (ticketId, memoText) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;
    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, { ...t, memo: memoText });
    setMemoModal(null);
  };

  const handleReturnTicket = async (ticketId, reason) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;
    const finalMemo = t.memo ? `${t.memo} | [返回] ${reason}` : `[返回] ${reason}`;
    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, { ...t, status: 'waiting', calledByCounter: null, memo: finalMemo, isReturned: true });
    setReturnModal(null);
  };

  const handleDeleteTicket = async (ticketId, reason) => {
    if (!user) return;
    const t = tickets.find(t => t.id === ticketId);
    if (!t) return;
    const finalMemo = t.memo ? `${t.memo} | [取消] ${reason}` : `[取消] ${reason}`;
    const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId);
    await setDoc(ticketRef, { ...t, status: 'cancelled', completedAt: new Date().toISOString(), memo: finalMemo });
    setDeleteModal(null);
  };

  const waitingTickets = tickets.filter(t => t.status === 'waiting');
  const activeTickets = tickets.filter(t => ['calling', 'arrived'].includes(t.status));
  const completedTickets = tickets.filter(t => ['completed', 'missed', 'cancelled'].includes(t.status));

  return (
    <div className="min-h-screen font-sans bg-gray-50 print:bg-white overflow-x-hidden">
      <nav className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 shadow-sm print:hidden relative z-50">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
          <img src={LOGO_PATH} alt="Logo" className="h-10 md:h-12 w-auto object-contain drop-shadow-sm" onError={(e) => e.target.style.display='none'} />
          <div className="bg-teal-600 p-1.5 md:p-2 rounded-lg hidden sm:block"><Ticket className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-lg md:text-xl text-gray-800 truncate tracking-tight">SJS 排隊系統 Queue</span>
        </div>
        <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Menu className="w-6 h-6" /></button>
        <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg gap-1">
          {['home', 'kiosk', 'monitor', 'panel', 'reports'].map(v => (
            <button key={v} onClick={() => { if(['panel', 'reports'].includes(v) && !isStaffAuthenticated) setCurrentView('login'); else setCurrentView(v); }} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${currentView === v ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>{v === 'home' ? '首頁' : v === 'kiosk' ? '取籌機' : v === 'monitor' ? '叫號螢幕' : v === 'panel' ? '藥劑師' : '數據'}</button>
          ))}
        </div>
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b shadow-lg flex flex-col md:hidden py-2 px-4 space-y-2">
            {['home', 'kiosk', 'monitor', 'panel', 'reports'].map(v => (
              <button key={v} onClick={() => { setIsMobileMenuOpen(false); if(['panel', 'reports'].includes(v) && !isStaffAuthenticated) setCurrentView('login'); else setCurrentView(v); }} className={`px-4 py-3 text-left text-base font-bold rounded-lg ${currentView === v ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>{v === 'home' ? '首頁 Home' : v === 'kiosk' ? '取籌機 Kiosk' : v === 'monitor' ? '叫號螢幕 Monitor' : v === 'panel' ? '藥劑師控制台 Panel' : '分析數據 Reports'}</button>
            ))}
          </div>
        )}
      </nav>
      <main>
        {currentView === 'home' && <HomeView setCurrentView={setCurrentView} isStaffAuthenticated={isStaffAuthenticated} />}
        {currentView === 'login' && <LoginView setCurrentView={setCurrentView} setIsStaffAuthenticated={setIsStaffAuthenticated} />}
        {currentView === 'kiosk' && <KioskView generateTicket={generateTicket} />}
        {currentView === 'monitor' && <MonitorView tickets={tickets} waitingTickets={waitingTickets} lastCallEvent={lastCallEvent} isStarted={isMonitorStarted} onStart={() => setIsMonitorStarted(true)} currentTime={currentTime} />}
        {currentView === 'panel' && <PanelView panelRoom={panelRoom} setPanelRoom={setPanelRoom} waitingTickets={waitingTickets} activeTickets={activeTickets} completedTickets={completedTickets} queueSortBy={queueSortBy} setQueueSortBy={setQueueSortBy} updateTicketStatus={updateTicketStatus} setMemoModal={setMemoModal} setReturnModal={setReturnModal} setDeleteModal={setDeleteModal} currentTime={currentTime} setIsStaffAuthenticated={setIsStaffAuthenticated} setCurrentView={setCurrentView} />}
        {currentView === 'reports' && <ReportsView tickets={tickets} />}
      </main>
      {memoModal && <MemoDialog memoModal={memoModal} onClose={() => setMemoModal(null)} onSave={updateTicketMemo} />}
      {returnModal && <ReturnDialog returnModal={returnModal} onClose={() => setReturnModal(null)} onConfirm={handleReturnTicket} />}
      {deleteModal && <DeleteDialog deleteModal={deleteModal} onClose={() => setDeleteModal(null)} onConfirm={handleDeleteTicket} />}
    </div>
  );
}