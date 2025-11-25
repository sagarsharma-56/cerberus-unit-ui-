import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Terminal, Lock, Unlock, Zap, Activity, Volume2, Power, 
  AlertTriangle, MessageSquare, Flame, Wifi, WifiOff, Send, Cpu, ShieldCheck,
  Grid, Battery, Signal, Radio, XOctagon, Key
} from 'lucide-react';

// --- CONFIGURATION ---
const PASSWORD_ADMIN = "SAGAR";
const PASSWORD_GUEST = "SAGAR*";
const LOCK_WORD = "HIDDEN*";

const CIPHER_MAP: Record<string, string> = {
  // Letters
  'A': '@1*', 'B': '#21', 'C': '*31', 'D': '#11', 'E': '107',
  'F': '*121', 'G': '##3', 'H': '11&', 'I': '11', 'J': '@33',
  'K': '@#3', 'L': '1#11', 'M': '##', 'N': '#1', 'O': '3@',
  'P': '@*1', 'Q': '*##', 'R': '@11', 'S': '111', 'T': '3',
  'U': '113', 'V': '1@%', 'W': '@13', 'X': '#113', 'Y': '#33',
  'Z': '#11',
  // Digits
  '0': '@1', '1': '#21@', '2': '*31%', '3': '#11$', '4': '1',
  '5': '*121', '6': '##3', '7': '11*%', '8': '11#%', '9': '@333',
  // Special
  ' ': ' ' 
};

// --- TYPES ---
enum SystemState { BOOT_SEQ, LOCKED, UNLOCKED, SOS, SLEEP, HARD_SHUTDOWN, ENCRYPTING, DISPLAYING_MSG }

interface LogEntry {
  id: string;
  timestamp: string;
  source: 'SYS' | 'USR' | 'HW';
  message: string;
  type: 'info' | 'error' | 'success' | 'warn';
}

// --- SUB-COMPONENTS ---

// 1. Boot Sequence Overlay
const BootSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const steps = [
    "INITIALIZING KERNEL...",
    "LOADING DRIVERS: GPIO... I2C... UART...",
    "ESTABLISHING SECURE HANDSHAKE...",
    "MOUNTING FILE SYSTEM...",
    "CERBERUS PROTOCOL ENGAGED."
  ];

  useEffect(() => {
    if (step < steps.length) {
      const timeout = setTimeout(() => setStep(s => s + 1), 600);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(onComplete, 800);
      return () => clearTimeout(timeout);
    }
  }, [step, steps.length, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center font-mono-tech text-cyan-500">
      <div className="w-64 mb-8">
        <ShieldCheck className="w-16 h-16 mx-auto mb-4 animate-pulse text-cyan-400" />
        <div className="h-1 bg-gray-800 rounded overflow-hidden">
          <div 
            className="h-full bg-cyan-500 transition-all duration-300 ease-out"
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="text-sm h-6">
        {step < steps.length ? steps[step] : "SYSTEM READY"}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  // --- STATE ---
  const [booted, setBooted] = useState(false);
  
  // Hardware Sim
  const [lcdLines, setLcdLines] = useState(["", ""]);
  const [oledText, setOledText] = useState("");
  const [oledIcon, setOledIcon] = useState<null | 'LOCK' | 'MAIL' | 'HAPPY' | 'FIRE' | 'SOS'>(null);
  const [ledActive, setLedActive] = useState(false);
  const [buzzerActive, setBuzzerActive] = useState(false);
  
  // Logic
  const [sysState, setSysState] = useState<SystemState>(SystemState.LOCKED);
  const [inputValue, setInputValue] = useState("");
  const [awaitingAwake, setAwaitingAwake] = useState(false);
  
  // Serial
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const portRef = useRef<any>(null);
  const writerRef = useRef<WritableStreamDefaultWriter | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Timers
  const lastActivityRef = useRef<number>(Date.now());
  const fireWarningShownRef = useRef(false);

  // --- HELPERS ---
  const addLog = useCallback((source: 'SYS' | 'USR' | 'HW', message: string, type: 'info' | 'error' | 'success' | 'warn' = 'info') => {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    setLogs(p => [...p, { id: Math.random().toString(36), timestamp: ts, source, message, type }].slice(-50)); // Keep last 50
  }, []);

  const beep = useCallback((duration = 150) => {
    setBuzzerActive(true);
    setTimeout(() => setBuzzerActive(false), duration);
  }, []);

  const updateLCD = (l1: string, l2: string = "") => setLcdLines([l1, l2]);

  const encodeMessage = (msg: string) => {
    return msg.toUpperCase().split('').map(char => {
        return CIPHER_MAP[char] || char;
    }).join(' ');
  };

  // --- EFFECTS ---
  
  // Scroll logs
  useEffect(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [logs]);

  // Boot Logic
  useEffect(() => {
    if (booted) {
      addLog('SYS', 'CERBERUS V3.1 ONLINE', 'success');
      updateLCD("ENTER PASSWORD:", "");
      setOledText("LOCKED");
      setOledIcon('LOCK');
      setSysState(SystemState.LOCKED);

      // Check Serial Compatibility immediately on boot
      if (!("serial" in navigator)) {
        setTimeout(() => {
          addLog('SYS', 'ALERT: SERIAL API MISSING', 'error');
          const ua = navigator.userAgent.toLowerCase();
          if (ua.includes("iphone") || ua.includes("ipad")) {
             addLog('SYS', 'IOS NOT SUPPORTED', 'warn');
          } else if (ua.includes("mac") && !ua.includes("chrome") && !ua.includes("edg")) {
             addLog('SYS', 'MAC: USE CHROME BROWSER', 'warn');
          } else {
             addLog('SYS', 'USE DESKTOP CHROME/EDGE', 'warn');
          }
        }, 1500);
      }
    }
  }, [booted, addLog]);

  // Watchdog Timer (Sleep/Fire)
  useEffect(() => {
    if (!booted) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      
      // Fire
      if (sysState === SystemState.UNLOCKED && elapsed > 35000 && !fireWarningShownRef.current) {
        setOledIcon('FIRE'); setOledText("WARNING");
        fireWarningShownRef.current = true;
        addLog('SYS', 'THERMAL WARNING DETECTED', 'warn');
      }

      // Sleep
      if (sysState !== SystemState.SLEEP && sysState !== SystemState.SOS && sysState !== SystemState.DISPLAYING_MSG && elapsed > 40000) {
        setSysState(SystemState.SLEEP);
        setAwaitingAwake(true);
        updateLCD("", ""); setOledText(""); setOledIcon(null);
        beep(500);
        addLog('SYS', 'TIMEOUT. ENTROPY MODE ENGAGED.', 'info');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [booted, sysState, beep, addLog]);

  // Animation for "ENCRYPTING" state on LCD
  useEffect(() => {
    if (sysState === SystemState.DISPLAYING_MSG) {
      let dots = 0;
      const interval = setInterval(() => {
        dots = (dots + 1) % 4;
        updateLCD("ENCRYPTING" + ".".repeat(dots), "");
      }, 400);
      return () => clearInterval(interval);
    }
  }, [sysState]);

  // --- SERIAL CONNECTION ---
  
  const readLoop = async (reader: ReadableStreamDefaultReader) => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (readerRef.current === reader) readerRef.current = null;
          break;
        }
        if (value && value.trim()) {
           console.log("RX:", value);
           // Enable if you want to see raw Arduino output in the UI logs
           // addLog('HW', `RX: ${value.trim()}`, 'info');
        }
      }
    } catch (e) {
      console.error("Serial Read Error:", e);
    } finally {
      if (readerRef.current === reader) {
          try { reader.releaseLock(); } catch(e){}
      }
    }
  };

  const disconnectSerial = async () => {
    addLog('SYS', 'TERMINATING UPLINK...', 'info');
    
    // Cancel Reader
    if (readerRef.current) {
        try { await readerRef.current.cancel(); } catch(e){}
        readerRef.current = null;
    }
    // Close Writer
    if (writerRef.current) {
        try { await writerRef.current.close(); } catch(e){}
        writerRef.current = null;
    }
    // Close Port
    if (portRef.current) {
        try { await portRef.current.close(); } catch(e){}
        portRef.current = null;
    }
    
    setIsConnected(false);
    addLog('HW', 'LINK SEVERED', 'warn');
  };

  const connectSerial = async () => {
    // 0. Handle Disconnect Toggle
    if (isConnected) {
        await disconnectSerial();
        return;
    }

    // 1. Browser Support Check
    if (!("serial" in navigator)) {
        addLog('SYS', 'BROWSER UNSUPPORTED', 'error');
        // Specific Mac Check
        if (navigator.userAgent.toLowerCase().includes("mac")) {
          addLog('SYS', 'MAC USERS: SAFARI NOT SUPPORTED', 'warn');
          addLog('SYS', 'PLEASE USE GOOGLE CHROME', 'warn');
        } else {
          addLog('SYS', 'TRY CHROME OR EDGE DESKTOP', 'warn');
        }
        return;
    }
    
    try {
      // 2. Request Port - MUST BE FIRST AWAIT
      // This prompt MUST happen directly from the click event.
      const port = await (navigator as any).serial.requestPort({ filters: [] });
      
      // If we got here, user selected a port.
      addLog('SYS', 'TARGET ACQUIRED. OPENING...', 'info');

      // 3. Safety Cleanup of OLD port if it exists (rare edge case)
      if (portRef.current && portRef.current !== port) {
          try { await portRef.current.close(); } catch(e){}
      }

      // 4. Open Port
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      
      // 5. Setup Streams
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable);
      const writer = textEncoder.writable.getWriter();
      writerRef.current = writer;

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;
      
      // 6. Start Loop
      readLoop(reader);

      setIsConnected(true);
      addLog('HW', 'UPLINK ESTABLISHED: 9600 BAUD', 'success');
      
    } catch (e: any) {
      // Handle User Cancel specifically to avoid console errors
      // 'NotFoundError' is standard, but check message too just in case
      if (e.name === 'NotFoundError' || (e.message && e.message.includes("selected"))) {
        addLog('SYS', 'PORT SELECTION CANCELLED', 'warn');
        setIsConnected(false);
        return;
      }

      console.error(e);
      let errMsg = "CONNECTION FAILED";
      let hint = "";

      if (e.name === 'SecurityError') {
        errMsg = "ACCESS BLOCKED";
        if (e.message && e.message.includes("permissions policy")) {
           hint = "NEEDS SERIAL PERMISSION";
        } else {
           hint = "CHECK URL BAR PERMISSIONS";
        }
      } else if (e.name === 'NetworkError') {
        errMsg = "PORT BUSY";
        hint = "CLOSE SERIAL MONITOR?";
      } else if (e.name === 'InvalidStateError') {
        errMsg = "PORT ALREADY OPEN";
        hint = "RELOAD PAGE";
      } else {
        errMsg = "ACCESS DENIED";
        hint = "CHECK USB CONNECTION";
      }
      
      addLog('SYS', errMsg, 'error');
      if (hint) setTimeout(() => addLog('SYS', `HINT: ${hint}`, 'warn'), 200);
      setIsConnected(false);
      // Reset ref if we failed to open
      if (!portRef.current) portRef.current = null;
    }
  };

  const sendToArduino = async (cmd: string) => {
    if (writerRef.current) {
      try {
        await writerRef.current.write(cmd.toUpperCase() + "\n");
      } catch (e) {
        addLog('HW', 'TX FAIL: PORT CLOSED?', 'error');
        setIsConnected(false);
      }
    }
  };

  // --- COMMAND HANDLING ---
  const executeCommand = (cmd: string) => {
    const input = cmd.trim().toUpperCase();
    if (!input) return;
    
    lastActivityRef.current = Date.now();
    fireWarningShownRef.current = false;
    setInputValue("");
    addLog('USR', input, 'info');

    if (isConnected) sendToArduino(input);

    // WAKE UP
    if (sysState === SystemState.SLEEP) {
        if (awaitingAwake) {
            if (input === "AWAKE") {
                setAwaitingAwake(false);
                setSysState(SystemState.LOCKED);
                updateLCD("ENTER PASSWORD");
                setOledText("PASSWORD?");
                setOledIcon('LOCK');
                return;
            }
            return; // Ignore other inputs while waiting for AWAKE
        }
        setSysState(SystemState.UNLOCKED); // If not locked, just wake up
    }

    // GLOBAL COMMANDS
    if (input === "ERASED") {
        setLogs([]); // Clear Visual Log
        updateLCD("DATA WIPED");
        setOledText("ERASED");
        setOledIcon(null);
        // We add the log slightly later so it appears as the first new entry
        setTimeout(() => addLog('SYS', 'MEMORY CORE FLUSHED', 'success'), 50);
        setTimeout(() => sysState === SystemState.LOCKED ? updateLCD("SYSTEM LOCKED") : updateLCD("ENTER MESSAGE"), 1500);
        return;
    }

    // LOCKED STATE
    if (sysState === SystemState.LOCKED) {
        if (input === "SOS" || input === "1") { triggerSOS(); return; }
        
        const admin = input === PASSWORD_ADMIN;
        const guest = input === PASSWORD_GUEST;

        if (admin || guest) {
            setSysState(SystemState.UNLOCKED);
            updateLCD(admin ? "WELCOME SAGAR" : "WELCOME");
            setOledText(admin ? "HELLO" : "");
            setOledIcon(admin ? null : 'HAPPY');
            setLedActive(true); beep(800);
            addLog('SYS', `IDENTITY VERIFIED: ${admin ? 'LVL_1 (ADMIN)' : 'LVL_2 (GUEST)'}`, 'success');
            setTimeout(() => {
                setLedActive(false);
                updateLCD("ENTER MESSAGE");
                setOledIcon('MAIL');
            }, 1500);
        } else {
            updateLCD("ACCESS DENIED");
            setOledText("INVALID");
            beep(200);
            addLog('SYS', 'AUTH_FAIL: INVALID CREDENTIALS', 'error');
        }
    } 
    // UNLOCKED STATE
    else if (sysState === SystemState.UNLOCKED) {
        if (input === "SAGAR BYE") {
            setLogs([]); // Clear Visual Log
            updateLCD("ERASED"); setOledText("ERASED");
            setTimeout(() => {
                setSysState(SystemState.SLEEP);
                setAwaitingAwake(true);
                updateLCD("",""); setOledText(""); setOledIcon(null);
            }, 2000);
            return;
        }
        if (input === LOCK_WORD) {
            setSysState(SystemState.SLEEP);
            setAwaitingAwake(true);
            updateLCD("",""); setOledText(""); setOledIcon(null);
            addLog('SYS', 'MANUAL LOCKDOWN INITIATED', 'warn');
            return;
        }
        if (input === "SOS" || input === "1") { triggerSOS(); return; }

        let msg = input;
        if (input === "2") msg = "MISSION CONFIRMED";
        if (input === "3") msg = "NEGATIVE ABORT";
        
        // --- MODIFIED LOGIC: CUSTOM ENCODED BACKSLASH CODE ON LCD ---
        const encoded = encodeMessage(msg);
        
        // 1. Start Encryption Phase (LCD shows animating "ENCRYPTING...")
        setSysState(SystemState.DISPLAYING_MSG); 
        updateLCD("ENCRYPTING", "");
        
        // 2. OLED starts Text-Only Sequence
        setOledText("SENDING...");
        setOledIcon(null); 
        
        setTimeout(() => {
             // OLED Step 2
             setOledText("SENT");
             
             setTimeout(() => {
                // OLED Step 3
                setOledText("RECEIVED");
                
                setTimeout(() => {
                    // OLED Step 4: Show actual message (decoded/readable)
                    setSysState(SystemState.UNLOCKED); // This stops the "ENCRYPTING" animation
                    
                    // Show encoded cipher on LCD only now that data is received
                    updateLCD(`\\ ${encoded}`, "");
                    
                    // Show full message on OLED
                    setOledText(msg);
                    addLog('SYS', `PACKET DELIVERED: ${msg.length} BYTES`, 'success');
                    
                    // Reset to Ready state after a delay
                    setTimeout(() => { 
                        updateLCD("ENTER MESSAGE", ""); 
                        setOledText("");
                        setOledIcon('MAIL'); 
                    }, 5000);
                }, 1000);
             }, 1000);
        }, 1000);
    }
  };

  const triggerSOS = () => {
    setSysState(SystemState.SOS);
    updateLCD("!!! WARNING !!!", "SOS SIGNAL");
    setOledText("SOS SOS");
    setOledIcon('SOS');
    addLog('SYS', 'EMERGENCY BEACON ACTIVATED', 'error');
    
    // Simulate flashing
    let flash = 0;
    const interval = setInterval(() => {
        flash++;
        setLedActive(f => !f);
        setBuzzerActive(f => !f);
        if (flash > 20) {
            clearInterval(interval);
            setSysState(SystemState.LOCKED);
            setAwaitingAwake(true);
            updateLCD("SYSTEM LOCKED");
            setOledText("LOCKED");
            setOledIcon('LOCK');
            setLedActive(false); setBuzzerActive(false);
        }
    }, 200);
  };

  if (!booted) return <BootSequence onComplete={() => setBooted(true)} />;

  return (
    <div className="relative w-full h-screen flex items-center justify-center p-4">
      
      {/* --- DASHBOARD CONTAINER --- */}
      <div className="relative w-full max-w-7xl h-[85vh] bg-black/80 backdrop-blur-xl border border-cyan-900/60 clip-panel shadow-[0_0_80px_rgba(0,240,255,0.05)] flex flex-col overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="h-14 border-b border-cyan-900/50 bg-cyan-950/10 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/50 flex items-center justify-center animate-pulse">
                <ShieldCheck className="text-cyan-400 w-5 h-5" />
             </div>
             <div>
                <h1 className="font-header text-xl text-cyan-400 tracking-[0.2em] glitch-text">CERBERUS<span className="text-white">OS</span></h1>
                <div className="text-[10px] text-cyan-700 font-mono-tech flex gap-2">
                   <span>BUILD.2044.8A</span> | <span>KERNEL: SECURE</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-4 text-xs font-mono-tech text-cyan-600/80">
                <span className="flex items-center gap-1"><Cpu size={12}/> CPU: 12%</span>
                <span className="flex items-center gap-1"><Activity size={12}/> MEM: 4GB</span>
                <span className="flex items-center gap-1"><Signal size={12}/> NET: 1GB/S</span>
            </div>
            <button 
               onClick={connectSerial}
               className={`group relative px-4 py-2 text-xs font-bold border transition-all overflow-hidden ${isConnected ? 'border-green-500 text-green-400 bg-green-900/10' : 'border-red-500 text-red-400 hover:bg-red-500/10 cursor-pointer'}`}
            >
               <span className="relative z-10 flex items-center gap-2">
                  {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                  {isConnected ? 'DISCONNECT' : 'INITIALIZE LINK'}
               </span>
               {/* Button Glitch Hover Effect */}
               <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </button>
          </div>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
           
           {/* LEFT: HARDWARE STATUS PANEL */}
           <div className="w-full md:w-[350px] bg-black/40 border-r border-cyan-900/30 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              
              {/* HARDWARE VIZ */}
              <div className="space-y-4">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-cyan-500 text-xs font-bold tracking-widest flex items-center gap-2"><Grid size={14}/> MODULE STATUS</h3>
                    <div className="flex gap-2">
                       <div className={`w-2 h-2 rounded-full ${ledActive ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-red-950'}`}></div>
                       <div className={`w-2 h-2 rounded-full ${buzzerActive ? 'bg-yellow-500 shadow-[0_0_10px_yellow]' : 'bg-yellow-950'}`}></div>
                    </div>
                 </div>

                 {/* LCD SIMULATION */}
                 <div className="relative group">
                    <div className="absolute -top-3 left-2 bg-black px-1 text-[10px] text-lime-700 font-mono-tech z-10">LCD_1602_I2C</div>
                    <div className={`lcd-screen w-full h-24 rounded border-4 border-[#3f4a21] p-3 flex flex-col justify-center gap-1 font-lcd text-2xl tracking-widest uppercase relative overflow-hidden transition-opacity duration-500 ${sysState === SystemState.SLEEP ? 'opacity-30' : 'opacity-100'}`}>
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                        <div className="whitespace-nowrap">{lcdLines[0]}</div>
                        <div className="whitespace-nowrap">{lcdLines[1]}</div>
                    </div>
                 </div>

                 {/* OLED SIMULATION */}
                 <div className="relative mt-2">
                    <div className="absolute -top-3 left-2 bg-black px-1 text-[10px] text-sky-700 font-mono-tech z-10">SSD1306_OLED</div>
                    <div className={`oled-screen h-32 w-full rounded p-4 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-300 ${sysState === SystemState.SOS ? 'sos-pulse border-red-500' : ''}`}>
                         {/* Scanline overlay for OLED */}
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:100%_3px] pointer-events-none"></div>
                         
                         <div className="relative z-10 flex flex-col items-center w-full">
                            {oledIcon === 'LOCK' && <Lock className="w-8 h-8 mb-2" />}
                            {oledIcon === 'MAIL' && <MessageSquare className="w-8 h-8 mb-2" />}
                            {oledIcon === 'HAPPY' && <span className="text-3xl mb-2">☺</span>}
                            {oledIcon === 'FIRE' && <Flame className="w-8 h-8 mb-2 text-orange-500 animate-bounce" />}
                            {oledIcon === 'SOS' && <AlertTriangle className="w-8 h-8 mb-2 text-red-500 animate-pulse" />}
                            
                            {/* Text Container with wrapping */}
                            <span className="font-lcd text-xl whitespace-pre-wrap leading-tight break-words w-full px-2">
                                {oledText}
                            </span>
                         </div>
                    </div>
                 </div>
              </div>

           </div>

           {/* CENTER/RIGHT: TERMINAL & CONTROLS */}
           <div className="flex-1 flex flex-col bg-black/20 relative">
              
              {/* TERMINAL OUTPUT */}
              <div className="flex-1 p-6 overflow-y-auto font-mono-tech text-sm space-y-1 relative">
                 <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Grid size={200} strokeWidth={0.5} />
                 </div>
                 
                 {logs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <Terminal size={48} className="mb-4" />
                        <p>WAITING FOR INPUT STREAM...</p>
                    </div>
                 )}

                 {logs.map((log) => (
                    <div key={log.id} className="flex gap-4 border-l-2 border-transparent hover:border-cyan-500/50 hover:bg-white/5 p-1 transition-all group">
                        <span className="text-gray-600 text-[10px] w-14 pt-1 opacity-50 font-sans">{log.timestamp}</span>
                        <span className={`text-xs font-bold pt-1 w-10 text-right ${
                            log.source === 'SYS' ? 'text-cyan-400' : 
                            log.source === 'USR' ? 'text-fuchsia-400' : 'text-orange-400'
                        }`}>{log.source}</span>
                        <span className={`flex-1 break-all ${
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'success' ? 'text-emerald-400' :
                            log.type === 'warn' ? 'text-yellow-400' : 'text-slate-300'
                        }`}>
                           {log.source === 'USR' && <span className="mr-2 text-fuchsia-600">❯</span>}
                           {log.message}
                        </span>
                    </div>
                 ))}
                 <div ref={logsEndRef} />
              </div>

              {/* QUICK ACTIONS KEYPAD (Desktop & Mobile) */}
              <div className="h-auto bg-black border-t border-cyan-900/50 p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                 <button onClick={() => executeCommand("AWAKE")} className="bg-cyan-900/20 hover:bg-cyan-500/20 border border-cyan-700/50 text-cyan-400 text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors">
                    <Power size={14} /> WAKE SYSTEM
                 </button>
                 <button onClick={() => executeCommand(LOCK_WORD)} className="bg-cyan-900/20 hover:bg-cyan-500/20 border border-cyan-700/50 text-cyan-400 text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors">
                    <Lock size={14} /> FORCE LOCK
                 </button>
                 <button onClick={() => executeCommand("SOS")} className="bg-red-900/20 hover:bg-red-500/20 border border-red-700/50 text-red-400 text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors animate-pulse">
                    <Zap size={14} /> PANIC / SOS
                 </button>
                 <button onClick={() => executeCommand("ERASED")} className="bg-yellow-900/20 hover:bg-yellow-500/20 border border-yellow-700/50 text-yellow-400 text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors">
                    <XOctagon size={14} /> WIPE DATA
                 </button>
              </div>

              {/* MAIN INPUT */}
              <div className="h-16 bg-black flex items-center px-4 gap-4 relative z-20">
                 <div className="w-1 h-full bg-cyan-500 absolute left-0 top-0 shadow-[0_0_10px_#06b6d4]"></div>
                 <div className="text-cyan-500 font-bold text-lg animate-pulse">{'>'}</div>
                 <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeCommand(inputValue)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-cyan-100 font-mono-tech text-lg placeholder-cyan-900/50"
                    placeholder="ENTER COMMAND SEQUENCE..."
                    autoFocus
                 />
                 <button 
                    onClick={() => executeCommand(inputValue)}
                    className="p-2 text-cyan-500 hover:text-white hover:bg-cyan-500/20 rounded-lg transition-all"
                 >
                    <Send size={20} />
                 </button>
              </div>
           </div>

        </div>

        {/* DECORATIVE CORNER ELEMENTS */}
        <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-3xl pointer-events-none"></div>

      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);