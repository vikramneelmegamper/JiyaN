import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  getDoc,
} from "firebase/firestore";

import { signOut } from "firebase/auth";
import { db } from "@/firebase";
import { auth } from "@/firebase";

import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Clock,
  Focus,
  ListTodo,
  Lock,
  LogIn,
  LogOut,
  Minus,
  Moon,
  Plus,
  Sun,
  Timer,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  Repeat,
  StickyNote,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { GoogleSignInButtonWithLogo } from "@/components/ui/google-signin-button";
import { cn } from "@/lib/utils";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { format, parse } from "date-fns";

type ThemeMode = "auto" | "light" | "dark";

type LocalTask = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  dueDate?: string;
  isRecurring?: boolean;
  notes?: string;
};

type Session = {
  signedIn: boolean;
  name: string;
  email: string;
  picture?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(ss)}`;
  return `${pad2(m)}:${pad2(ss)}`;
}

function useNow(tickMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}

function useAutoTheme(enabled: boolean) {
  const now = useNow(30_000);
  useEffect(() => {
    if (!enabled) return;
    const hour = new Date(now).getHours();
    const dark = hour >= 19 || hour < 7;
    document.documentElement.classList.toggle("dark", dark);
  }, [enabled, now]);
}

function usePomodoro(initial: {
  focusMin: number;
  breakMin: number;
  onFocusTime?: (minutes: number) => void;
}) {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(() => initial.focusMin * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onFocusTimeRef = useRef(initial.onFocusTime);
  const sessionStartRef = useRef<number | null>(null);
  const sessionDurationRef = useRef(0);

  // Update the ref when onFocusTime changes
  onFocusTimeRef.current = initial.onFocusTime;

  // Calculate remaining time based on session start and current time
  const calculateRemaining = useCallback(() => {
    if (!running || !sessionStartRef.current) {
      return remaining;
    }

    const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const totalDuration = sessionDurationRef.current;
    const remainingTime = Math.max(0, totalDuration - elapsed);

    if (remainingTime === 0) {
      // Session completed
      setMode((currentMode) => {
        const nextMode = currentMode === "focus" ? "break" : "focus";

        // Track focus time when focus session completes
        if (currentMode === "focus" && onFocusTimeRef.current) {
          onFocusTimeRef.current(initial.focusMin);
        }

        return nextMode;
      });

      // Reset for next session
      sessionStartRef.current = null;
      sessionDurationRef.current = (mode === "focus" ? initial.breakMin : initial.focusMin) * 60;
      return sessionDurationRef.current;
    }

    return remainingTime;
  }, [running, remaining, mode, initial.focusMin, initial.breakMin]);

  useEffect(() => {
    if (running) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = Date.now();
        sessionDurationRef.current = remaining;
      }

      intervalRef.current = setInterval(() => {
        const newRemaining = calculateRemaining();
        setRemaining(newRemaining);
      }, 100);
    } else {
      sessionStartRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, calculateRemaining]);

  // Update remaining time when mode changes (do NOT react to running changes)
  // Only reset remaining when the mode or configured durations change.
  useEffect(() => {
    setRemaining((mode === "focus" ? initial.focusMin : initial.breakMin) * 60);
    sessionStartRef.current = null;
  // Intentionally exclude `running` so pausing doesn't trigger a reset
  }, [mode, initial.focusMin, initial.breakMin]);

  function reset(nextMode: "focus" | "break" = "focus") {
    setRunning(false);
    setMode(nextMode);
    setRemaining((nextMode === "focus" ? initial.focusMin : initial.breakMin) * 60);
    sessionStartRef.current = null;
  }

  return {
    mode,
    running,
    remaining,
    setRunning,
    reset,
    setMode,
    setRemaining,
  };
}

function useFullscreenTimer(initialSeconds: number, onFocusTime?: (minutes: number) => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const lastTickRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      sessionStartTimeRef.current = Date.now();
      lastTickRef.current = Date.now();
    } else if (sessionStartTimeRef.current && onFocusTime) {
      // Calculate focus time when timer stops
      const sessionDurationMs = Date.now() - sessionStartTimeRef.current;
      const sessionMinutes = Math.round(sessionDurationMs / (1000 * 60));
      if (sessionMinutes > 0) {
        onFocusTime(sessionMinutes);
      }
      sessionStartTimeRef.current = null;
    }
  }, [running, onFocusTime]);

  useEffect(() => {
    if (!running) {
      lastTickRef.current = null;
      return;
    }
    const id = window.setInterval(() => {
      const now = Date.now();
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const delta = (now - last) / 1000;
      if (delta <= 0) return;

      setSeconds((prev) => {
        const next = prev - delta;
        return next <= 0 ? 0 : next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);

  async function enter() {
    setOpen(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // ignore
    }
  }

  async function exit() {
    setOpen(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
    } catch {
      // ignore
    }
  }

  return {
    seconds,
    setSeconds,
    running,
    setRunning,
    open,
    enter,
    exit,
  };
}

function AccentPill({
  icon,
  label,
  hint,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  testId: string;
}) {
  return (
    <div
      className="glass shadow-soft-sm rounded-2xl px-3 py-2 flex items-center gap-2"
      data-testid={testId}
    >
      <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight text-foreground truncate">
          {label}
        </div>
        <div className="text-xs text-muted-foreground leading-tight truncate">
          {hint}
        </div>
      </div>
    </div>
  );
}

function SignInCard({
  session,
  onLoginSuccess,
  onLogout,
}: {
  session: Session;
  onLoginSuccess: (response: any) => void;
  onLogout: () => void;
}) {
  return (
    <Card className="glass rounded-3xl p-5 shadow-soft" data-testid="card-auth">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary" strokeWidth={2.2} />
            </div>
            <div className="text-sm font-semibold text-foreground">Account</div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground text-balance">
            {session.signedIn 
              ? "You're connected with Google. Your dashboard is now yours."
              : "Sign in with Google to personalize your experience and sync your space."}
          </div>
        </div>

        {session.signedIn ? (
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={onLogout}
            data-testid="button-signout"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        ) : (
          <div data-testid="google-login-container" className="flex gap-2">
            {/* Hidden GoogleLogin component for OAuth - triggered by button click */}
            <div style={{ display: "none" }} id="google-login-hidden">
              <GoogleLogin
                onSuccess={onLoginSuccess}
                onError={() => console.log('Login Failed')}
                useOneTap
              />
            </div>
            
            {/* Custom styled button */}
            <GoogleSignInButtonWithLogo
              onClick={() => {
                const hiddenLogin = document.querySelector('[role="button"]') as HTMLButtonElement;
                hiddenLogin?.click();
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3"
          data-testid="panel-auth-status"
        >
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="mt-1 text-sm font-semibold">
            {session.signedIn ? "Connected" : "Guest Mode"}
          </div>
        </div>
        <div
          className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3"
          data-testid="panel-auth-identity"
        >
          <div className="text-xs text-muted-foreground">Identity</div>
          <div className="mt-1 text-sm font-semibold truncate flex items-center gap-2" data-testid="text-user">
            {session.signedIn && session.picture && (
              <img src={session.picture} alt="" className="h-5 w-5 rounded-full" />
            )}
            {session.signedIn ? session.name : "\u2014"}
          </div>
          <div
            className="text-xs text-muted-foreground truncate"
            data-testid="text-email"
          >
            {session.signedIn ? session.email : "Sign in to sync"}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TasksCard({
  tasks,
  onAdd,
  onToggle,
  onRemove,
  onUpdate,
  disabled,
  isLowEnergyDay,
}: {
  tasks: LocalTask[];
  onAdd: (task: Omit<LocalTask, "id" | "createdAt" | "done">) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<LocalTask>) => void;
  disabled: boolean;
  isLowEnergyDay: boolean;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingField, setEditingField] = useState<"title" | "dueDate" | null>(null);
  const [editingDueDate, setEditingDueDate] = useState("");

  // Determine if a task is non-essential for low-energy day mode
  const isNonEssential = (task: LocalTask) => {
    if (task.done) return false;
    if (!task.dueDate) return true;
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate !== today;
  };

  const remaining = tasks.filter((t) => !t.done).length;

  const handleAdd = () => {
    const t = title.trim();
    if (!t) return;
    onAdd({ title: t, dueDate, isRecurring, notes });
    setTitle("");
    setDueDate("");
    setIsRecurring(false);
    setNotes("");
  };

  return (
    <Card className="glass rounded-3xl p-5 shadow-soft" data-testid="card-todos">
      <div className="space-y-4">
        {isLowEnergyDay && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Low Energy Day</span>
            </div>
            <p className="text-sm text-primary/80 leading-relaxed">
              Doing less is still doing something. Focus on what matters most.
            </p>
          </motion.div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ListTodo className="h-4 w-4 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">To-do</div>
              <div className="text-xs text-muted-foreground" data-testid="text-todo-count">
                {remaining} left {isLowEnergyDay ? "(focus mode)" : "today"}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 rounded-2xl bg-card/30 border border-border/40">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={disabled ? "Sign in to save" : "What needs to be done?"}
            disabled={disabled}
            className="h-10 rounded-xl bg-card/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
            data-testid="input-new-task"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  disabled={disabled}
                  className="flex items-center gap-2 bg-card/50 px-3 py-1.5 rounded-xl border border-border/40 hover:bg-card/60 hover:border-border/50 transition-all text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">
                    {dueDate ? format(parse(dueDate, "yyyy-MM-dd", new Date()), "MMM d") : "Pick date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gradient-to-br from-card/90 to-card/80 border border-border/60 rounded-2xl shadow-soft backdrop-blur-sm" align="start">
                <div className="p-6 space-y-4">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate ? parse(dueDate, "yyyy-MM-dd", new Date()) : undefined}
                    onSelect={(date) => {
                      if (date) setDueDate(format(date, "yyyy-MM-dd"));
                    }}
                    disabled={disabled}
                    className="rounded-lg [&_.rdp]:bg-transparent [&_.rdp-months]:gap-6 [&_.rdp-month]:w-full [&_.rdp-caption]:text-base [&_.rdp-caption]:mb-3 [&_.rdp-head_abbr]:text-sm [&_.rdp-head_abbr]:font-semibold [&_.rdp-cell]:p-1 [&_.rdp-cell]:h-11 [&_.rdp-day]:text-base [&_.rdp-day]:h-10 [&_.rdp-day]:py-2"
                  />
                </div>
              </PopoverContent>
            </Popover>
            <button
              onClick={() => setIsRecurring(!isRecurring)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs",
                isRecurring 
                  ? "bg-primary/10 border-primary/30 text-primary" 
                  : "bg-card/50 border-border/40 text-muted-foreground"
              )}
            >
              <Repeat className="h-3.5 w-3.5" />
              Recurring
            </button>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes, links, or important points..."
            disabled={disabled}
            className="min-h-[80px] rounded-xl bg-card/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30 resize-none text-sm"
          />
          <Button
            className="w-full rounded-xl shadow-soft-sm"
            onClick={handleAdd}
            disabled={disabled || title.trim().length === 0}
            data-testid="button-add-task"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-3" data-testid="list-tasks">
        <AnimatePresence initial={false}>
          {tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground text-center"
              data-testid="empty-tasks"
            >
              Your space is clear. Take a deep breath.
            </motion.div>
          ) : (
            tasks.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "rounded-2xl border border-border/60 bg-card/40 overflow-hidden transition-all duration-300",
                  isLowEnergyDay && isNonEssential(t) && "opacity-40 pointer-events-none",
                  expandedId === t.id ? "ring-1 ring-primary/20 shadow-md bg-card/60" : "hover:bg-card/50"
                )}
                data-testid={`row-task-${t.id}`}
              >
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/** Disable interactions for non-essential tasks during low-energy mode */}
                    <button
                      className={cn(
                        "h-6 w-6 rounded-lg border flex items-center justify-center transition-colors shrink-0",
                        t.done
                          ? "bg-primary text-primary-foreground border-primary/40"
                          : "bg-card/60 border-border/60",
                        isLowEnergyDay && isNonEssential(t) && "opacity-60"
                      )}
                      onClick={() => {
                        if (disabled || (isLowEnergyDay && isNonEssential(t))) return;
                        onToggle(t.id);
                      }}
                      disabled={disabled || (isLowEnergyDay && isNonEssential(t))}
                      aria-disabled={disabled || (isLowEnergyDay && isNonEssential(t))}
                    >
                      {t.done ? <Check className="h-3 w-3" /> : null}
                    </button>
                    
                    <div className="flex-1 min-w-0 flex flex-col">
                      {editingField === "title" && editingId === t.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            if (editValue.trim()) onUpdate(t.id, { title: editValue });
                            setEditingId(null);
                            setEditingField(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editValue.trim()) onUpdate(t.id, { title: editValue });
                              setEditingId(null);
                              setEditingField(null);
                            }
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setEditingField(null);
                            }
                          }}
                          className="bg-transparent text-sm font-medium outline-none border-b border-primary/30 w-full"
                        />
                      ) : (
                        <span
                          className={cn(
                            "truncate text-sm font-medium",
                            t.done ? "line-through text-muted-foreground" : "text-foreground",
                            isLowEnergyDay && isNonEssential(t) ? "text-muted-foreground cursor-default" : "cursor-pointer"
                          )}
                          onClick={() => {
                            if (isLowEnergyDay && isNonEssential(t)) return;
                            setExpandedId(expandedId === t.id ? null : t.id);
                          }}
                        >
                          {t.title}
                        </span>
                      )}
                      
                      {editingField === "dueDate" && editingId === t.id ? (
                        <div className="mt-0.5">
                          <Popover open={true} onOpenChange={(open) => {
                            if (!open) {
                              setEditingId(null);
                              setEditingField(null);
                              setEditingDueDate("");
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors cursor-pointer">
                                <Calendar className="h-3 w-3" />
                                <span>Due: {editingDueDate ? format(parse(editingDueDate, "yyyy-MM-dd", new Date()), "MMM d") : "Pick date"}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-gradient-to-br from-card/90 to-card/80 border border-border/60 rounded-2xl shadow-soft backdrop-blur-sm" align="start">
                              <div className="p-6 space-y-4">
                                <CalendarComponent
                                  mode="single"
                                  selected={editingDueDate ? parse(editingDueDate, "yyyy-MM-dd", new Date()) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      const newDate = format(date, "yyyy-MM-dd");
                                      setEditingDueDate(newDate);
                                      onUpdate(t.id, { dueDate: newDate });
                                      setEditingId(null);
                                      setEditingField(null);
                                      setEditingDueDate("");
                                    }
                                  }}
                                  className="rounded-lg [&_.rdp]:bg-transparent [&_.rdp-months]:gap-6 [&_.rdp-month]:w-full [&_.rdp-caption]:text-base [&_.rdp-caption]:mb-3 [&_.rdp-head_abbr]:text-sm [&_.rdp-head_abbr]:font-semibold [&_.rdp-cell]:p-1 [&_.rdp-cell]:h-11 [&_.rdp-day]:text-base [&_.rdp-day]:h-10 [&_.rdp-day]:py-2"
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : t.dueDate ? (
                        <button 
                          onClick={() => {
                            if (isLowEnergyDay && isNonEssential(t)) return;
                            setEditingId(t.id);
                            setEditingField("dueDate");
                            setEditingDueDate(t.dueDate ?? "");
                          }}
                          className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground hover:text-primary/70 transition-colors cursor-pointer group"
                          disabled={isLowEnergyDay && isNonEssential(t)}
                        >
                          <Calendar className="h-3 w-3 group-hover:text-primary" />
                          <span className="group-hover:underline">Due: {format(parse(t.dueDate, "yyyy-MM-dd", new Date()), "MMM d")}</span>
                          {t.isRecurring && <Repeat className="h-3 w-3 text-primary/60 ml-1" />}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (isLowEnergyDay && isNonEssential(t) || disabled) return;
                            setEditingId(t.id);
                            setEditingField("dueDate");
                            setEditingDueDate("");
                          }}
                          className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground hover:text-primary/70 transition-colors cursor-pointer group disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isLowEnergyDay && isNonEssential(t) || disabled}
                        >
                          <Calendar className="h-3 w-3 group-hover:text-primary" />
                          <span className="group-hover:underline">Add due date</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {t.isRecurring && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/10"
                        onClick={() => {
                          if (disabled || (isLowEnergyDay && isNonEssential(t))) return;
                          onAdd({ title: t.title, dueDate: t.dueDate, isRecurring: t.isRecurring, notes: t.notes });
                        }}
                        title="Repeat this task"
                        disabled={disabled || (isLowEnergyDay && isNonEssential(t))}
                      >
                        <Repeat className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => {
                        if (isLowEnergyDay && isNonEssential(t)) return;
                        setEditingId(t.id);
                        setEditValue(t.title);
                        setEditingField("title");
                      }}
                      disabled={isLowEnergyDay && isNonEssential(t)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:text-destructive"
                      onClick={() => {
                        if (isLowEnergyDay && isNonEssential(t)) return;
                        onRemove(t.id);
                      }}
                      disabled={isLowEnergyDay && isNonEssential(t)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedId === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === t.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/40 bg-card/20"
                    >
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <StickyNote className="h-3 w-3" />
                            Notes & Details
                          </div>
                          <Textarea
                            value={t.notes || ""}
                            onChange={(e) => onUpdate(t.id, { notes: e.target.value })}
                            placeholder="Add links, text, or important points..."
                            className="min-h-[100px] text-xs bg-card/40 border-border/40 rounded-xl resize-none focus-visible:ring-primary/20"
                          />
                        </div>
                        
                        {t.notes && (
                          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-[11px] leading-relaxed text-muted-foreground">
                            Pro-tip: You can paste links directly into the notes section.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function PomodoroCard({
  mode,
  running,
  remaining,
  onSetRunning,
  onReset
}: {
  mode: "focus" | "break";
  running: boolean;
  remaining: number;
  onSetRunning: (running: boolean) => void;
  onReset: (nextMode?: "focus" | "break") => void;
}) {
  const focusMin = 25;
  const breakMin = 5;
  const label = mode === "focus" ? "Focus" : "Break";
  const chip = mode === "focus" ? "bg-primary/12" : "bg-accent/40";

  const total = (mode === "focus" ? focusMin : breakMin) * 60;
  const pct = 1 - remaining / total;

  return (
    <Card className="glass rounded-3xl p-5 shadow-soft" data-testid="card-pomodoro">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Focus className="h-4 w-4 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Pomodoro</div>
              <div className="text-xs text-muted-foreground" data-testid="text-pomo-mode">
                {label}
              </div>
            </div>
          </div>
        </div>

        <div className={cn("px-3 py-1 rounded-full text-xs border border-border/50", chip)}>
          <span data-testid="badge-session">{label} session</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="rounded-3xl border border-border/60 bg-card/45 p-4">
          <div
            className="font-serif tracking-tight text-4xl sm:text-5xl mono-tabular"
            data-testid="text-pomo-time"
          >
            {formatHMS(remaining)}
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted/60 overflow-hidden" data-testid="bar-pomo">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex sm:flex-col gap-2">
          <Button
            className="rounded-2xl"
            onClick={() => onSetRunning(!running)}
            data-testid={running ? "button-pomo-pause" : "button-pomo-start"}
          >
            <Timer className="mr-2 h-4 w-4" />
            {running ? "Pause" : "Start"}
          </Button>
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => onReset("focus")}
            data-testid="button-pomo-reset"
          >
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FullscreenTimerCard({ onFocusTime }: { onFocusTime?: (minutes: number) => void }) {
  const timer = useFullscreenTimer(10 * 60, onFocusTime);

  const mins = Math.floor(timer.seconds / 60);

  return (
    <Card className="glass rounded-3xl p-5 shadow-soft" data-testid="card-fullscreen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Full-screen timer</div>
              <div
                className="text-xs text-muted-foreground"
                data-testid="text-fullscreen-hint"
              >
                A calm, distraction free screen.
              </div>
            </div>
          </div>
        </div>

        <Button
          className="rounded-2xl"
          onClick={() => timer.enter()}
          data-testid="button-open-fullscreen"
        >
          Open
        </Button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="rounded-2xl border border-border/60 bg-card/45 px-4 py-3">
          <div className="text-xs text-muted-foreground">Minutes</div>
          <div className="mt-1 text-2xl font-semibold mono-tabular" data-testid="text-fs-minutes">
            {mins}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => timer.setSeconds((s) => Math.max(0, s - 60))}
            data-testid="button-fs-minus"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => timer.setSeconds((s) => s + 60)}
            data-testid="button-fs-plus"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            className="rounded-2xl"
            onClick={() => timer.setRunning(!timer.running)}
            data-testid={timer.running ? "button-fs-pause" : "button-fs-start"}
          >
            {timer.running ? "Pause" : "Start"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {timer.open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-roseboard grain"
            data-testid="overlay-fullscreen"
          >
            <div className="absolute inset-0 bg-background/30" />
            <div className="relative z-10 h-full w-full p-6 sm:p-10 flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <div
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 glass shadow-soft-sm"
                  data-testid="badge-fullscreen"
                >
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Timer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => timer.exit()}
                    data-testid="button-exit-fullscreen"
                  >
                    Exit
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-12 sm:gap-16">
                <div className="text-center">
                  <div
                    className="font-serif tracking-tight text-[min(22vw,240px)] leading-none mono-tabular tabular-nums"
                    data-testid="text-fullscreen-time"
                  >
                    {formatHMS(timer.seconds)}
                  </div>
                  <div
                    className="mt-8 text-lg sm:text-xl text-muted-foreground font-light tracking-wide italic"
                    data-testid="text-fullscreen-sub"
                  >
                    Breathe. One thing at a time.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => timer.setSeconds((s) => Math.max(0, s - 60))}
                  data-testid="button-fullscreen-minus"
                >
                  <Minus className="h-4 w-4" />
                  -1m
                </Button>
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => timer.setSeconds((s) => s + 60)}
                  data-testid="button-fullscreen-plus"
                >
                  <Plus className="h-4 w-4" />
                  +1m
                </Button>
                <Button
                  className="rounded-2xl"
                  onClick={() => timer.setRunning(!timer.running)}
                  data-testid={
                    timer.running
                      ? "button-fullscreen-pause"
                      : "button-fullscreen-start"
                  }
                >
                  {timer.running ? "Pause" : "Start"}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}

function NotesCard({
  notes,
  onNotesChange,
  disabled,
}: {
  notes: string;
  onNotesChange: (notes: string) => void;
  disabled: boolean;
}) {
  return (
    <Card className="glass rounded-3xl p-5 shadow-soft" data-testid="card-notes">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <StickyNote className="h-4 w-4 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Notes</div>
              <div className="text-xs text-muted-foreground">
                Your space to capture ideas
              </div>
            </div>
          </div>
        </div>

        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={disabled ? "Sign in to save" : "Jot down your thoughts, ideas or reminders..."}
          disabled={disabled}
          className="min-h-[120px] rounded-xl bg-card/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30 resize-none text-sm"
          data-testid="input-global-notes"
        />
      </div>
    </Card>
  );
}

export default function Home() {
  const user = useAuth();
  useEffect(() => {
    if (user) {
      setSession({
        signedIn: true,
        name: user.displayName ?? "",
        email: user.email ?? "",
        picture: user.photoURL ?? "",
      });
    } else {
      setSession({
        signedIn: false,
        name: "",
        email: "",
      });
    }
  }, [user]);

  const [session, setSession] = useState<Session>({
    signedIn: false,
    name: "",
    email: "",
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }, [currentTime]);

  // End-of-day messages: generate a unique message each day after 9pm
  const [eodMessage, setEodMessage] = useState<string | null>(null);

  useEffect(() => {
    const hour = currentTime.getHours();
    const todayKey = new Date().toDateString();

    // Only consider showing after 21:00
    if (hour >= 21) {
      const lastDate = localStorage.getItem("rose_eod_last_date");
      const cachedMessage = localStorage.getItem("rose_eod_message");

      // Fetch if it's a new day OR if we don't have a message but the date is set
      if (lastDate !== todayKey || !cachedMessage) {
        // Fetch new message for today
        fetch("/api/eod-message")
          .then((res) => res.json())
          .then((data) => {
            localStorage.setItem("rose_eod_last_date", todayKey);
            localStorage.setItem("rose_eod_message", data.message);
            setEodMessage(data.message);
          })
          .catch((err) => {
            console.error("Failed to fetch EOD message", err);
            // Fallback message if fetch fails
            setEodMessage("Rest well. You've earned it.");
          });
      } else {
        // Already set for today — show cached message
        if (cachedMessage) setEodMessage(cachedMessage);
      }
    } else {
      // Not night yet — clear message
      setEodMessage(null);
    }
  }, [currentTime]);

  const handleLoginSuccess = (credentialResponse: any) => {
    // In a real app, you'd verify this JWT on the backend
    // For this frontend-only request, we'll decode enough to show UI
    try {
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      setSession({
        signedIn: true,
        name: payload.name,
        email: payload.email,
        picture: payload.picture
      });
    } catch (e) {
      console.error("Failed to decode Google token", e);
    }
  };

  const handleLogout = () => {
    googleLogout();
    signOut(auth);
    setSession({ signedIn: false, name: "", email: "" });
  };

  const [activeTab, setActiveTab] = useState("today");
  const [isLowEnergyDay, setIsLowEnergyDay] = useState(false);

  // Pomodoro state - moved up to persist across tab switches
  const [pomoMode, setPomoMode] = useState<"focus" | "break">("focus");
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoRemaining, setPomoRemaining] = useState(() => 25 * 60);
  const pomoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pomoOnFocusTimeRef = useRef(addFocusTime);
  const pomoSessionStartRef = useRef<number | null>(null);
  const pomoSessionDurationRef = useRef(0);

  // Update the ref when addFocusTime changes
  pomoOnFocusTimeRef.current = addFocusTime;

  // Calculate remaining time based on session start and current time
  const calculatePomoRemaining = useCallback(() => {
    if (!pomoRunning || !pomoSessionStartRef.current) {
      return pomoRemaining;
    }

    const elapsed = Math.floor((Date.now() - pomoSessionStartRef.current) / 1000);
    const totalDuration = pomoSessionDurationRef.current;
    const remainingTime = Math.max(0, totalDuration - elapsed);

    if (remainingTime === 0) {
      // Session completed
      setPomoMode((currentMode) => {
        const nextMode = currentMode === "focus" ? "break" : "focus";

        // Track focus time when focus session completes
        if (currentMode === "focus" && pomoOnFocusTimeRef.current) {
          pomoOnFocusTimeRef.current(25); // focusMin is hardcoded as 25
        }

        return nextMode;
      });

      // Reset for next session
      pomoSessionStartRef.current = null;
      pomoSessionDurationRef.current = (pomoMode === "focus" ? 5 : 25) * 60; // breakMin is 5
      return pomoSessionDurationRef.current;
    }

    return remainingTime;
  }, [pomoRunning, pomoMode]);

  useEffect(() => {
    if (pomoRunning) {
      if (!pomoSessionStartRef.current) {
        pomoSessionStartRef.current = Date.now();
        pomoSessionDurationRef.current = pomoRemaining;
      }

      pomoIntervalRef.current = setInterval(() => {
        const newRemaining = calculatePomoRemaining();
        setPomoRemaining(newRemaining);
      }, 100);
    } else {
      pomoSessionStartRef.current = null;
      if (pomoIntervalRef.current) {
        clearInterval(pomoIntervalRef.current);
        pomoIntervalRef.current = null;
      }
    }

    return () => {
      if (pomoIntervalRef.current) {
        clearInterval(pomoIntervalRef.current);
        pomoIntervalRef.current = null;
      }
    };
  }, [pomoRunning, calculatePomoRemaining]);

  // Update remaining time when mode changes. Do NOT react to running changes
  // so that pausing the timer does not reset the remaining time.
  useEffect(() => {
    setPomoRemaining((pomoMode === "focus" ? 25 : 5) * 60);
    pomoSessionStartRef.current = null;
  }, [pomoMode]);

  const resetPomodoro = useCallback((nextMode: "focus" | "break" = "focus") => {
    setPomoRunning(false);
    setPomoMode(nextMode);
    setPomoRemaining((nextMode === "focus" ? 25 : 5) * 60);
    pomoSessionStartRef.current = null;
  }, []);

  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  // Set dark theme as default on component mount
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Load theme preference from Firestore when user signs in
  useEffect(() => {
    if (!user) return;

    const loadThemePreference = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const settings = userDoc.data().settings;
          if (settings?.themeMode) {
            setThemeMode(settings.themeMode);
          }
        }
      } catch (error) {
        console.error("Error loading theme preference:", error);
      }
    };

    loadThemePreference();
  }, [user]);

  // Load header settings (title + initial) from Firestore when user signs in, otherwise from localStorage
  useEffect(() => {
    const loadHeader = async () => {
      try {
        if (!user) {
          // guest: use localStorage defaults (already initialized)
          const localTitle = localStorage.getItem("rose_header_title");
          const localInitial = localStorage.getItem("rose_header_initial");
          if (localTitle) setHeaderTitle(localTitle);
          if (localInitial) setHeaderInitial(localInitial);
          return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const settings = userDoc.data().settings || {};
          if (settings.headerTitle) {
            setHeaderTitle(settings.headerTitle);
          } else {
            // no saved title for this user -> use default and persist it
            const defaultTitle = "Your Space";
            setHeaderTitle(defaultTitle);
            const defaultInitial =
              settings.headerInitial || (user.displayName ? user.displayName.charAt(0).toUpperCase() : "T");
            setHeaderInitial(defaultInitial);
            await saveHeaderSettings(defaultTitle, defaultInitial);
          }

          if (settings.headerInitial) {
            setHeaderInitial(settings.headerInitial);
          }
        } else {
          // user document doesn't exist yet (new account) -> reset to defaults and persist
          const defaultTitle = "Your Space";
          const defaultInitial = user.displayName ? user.displayName.charAt(0).toUpperCase() : "T";
          setHeaderTitle(defaultTitle);
          setHeaderInitial(defaultInitial);
          await saveHeaderSettings(defaultTitle, defaultInitial);
        }
      } catch (err) {
        console.error("Error loading header settings:", err);
      }
    };

    loadHeader();
  }, [user]);

  // Load guest focus time from localStorage on mount
  useEffect(() => {
    try {
      const v = localStorage.getItem("rose_focus_time");
      if (v) setFocusTime(parseInt(v, 10));
    } catch {}
  }, []);

  // Save header settings (local + Firestore if signed in)
  async function saveHeaderSettings(title?: string, initial?: string) {
    const t = title ?? headerTitle;
    const i = initial ?? headerInitial;
    try {
      localStorage.setItem("rose_header_title", t);
      localStorage.setItem("rose_header_initial", i);
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          { settings: { headerTitle: t, headerInitial: i } },
          { merge: true }
        );
      }
    } catch (err) {
      console.error("Error saving header settings:", err);
    }
  }

  // Load statistics when user signs in
  useEffect(() => {
    if (!user) {
      setStreak(0);
      setFocusTime(0);
      return;
    }

    loadStatistics();
    updateLoginStreak();
  }, [user]);

  useEffect(() => {
    if (themeMode === "auto") {
      const hour = new Date().getHours();
      const shouldBeDark = hour >= 19 || hour < 7;
      document.documentElement.classList.toggle("dark", shouldBeDark);
    }

    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    }

    if (themeMode === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  async function saveThemePreference(mode: ThemeMode) {
    if (!user) return;

    await setDoc(
      doc(db, "users", user.uid),
      {
        settings: {
          themeMode: mode,
        },
      },
      { merge: true }
    );
  }

  // Load statistics from Firestore
  async function loadStatistics() {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setStreak(data.streak || 0);
        setFocusTime(data.focusTime || 0);
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  }

  // Save statistics to Firestore
  async function saveStatistics() {
    if (!user) return;

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          streak,
          focusTime,
          lastLoginDate: new Date().toDateString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving statistics:", error);
    }
  }

  // Update login streak
  async function updateLoginStreak() {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const today = new Date().toDateString();
      let currentStreak = 0;
      let lastLoginDate = null;

      if (userDoc.exists()) {
        const data = userDoc.data();
        currentStreak = data.streak || 0;
        lastLoginDate = data.lastLoginDate;
      }

      if (lastLoginDate === today) {
        // Already logged in today, don't update streak
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (lastLoginDate === yesterdayStr) {
        // Consecutive day, increment streak
        currentStreak += 1;
      } else if (lastLoginDate !== today) {
        // Not consecutive or first login, reset to 1
        currentStreak = 1;
      }

      setStreak(currentStreak);
      await setDoc(
        doc(db, "users", user.uid),
        {
          streak: currentStreak,
          lastLoginDate: today,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating login streak:", error);
    }
  }

  // Add focus time (in minutes)
  async function addFocusTime(minutes: number) {
    if (minutes <= 0) return;

    const newFocusTime = focusTime + minutes;
    setFocusTime(newFocusTime);

    try {
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            focusTime: newFocusTime,
          },
          { merge: true }
        );
      } else {
        // persist for guests
        localStorage.setItem("rose_focus_time", String(newFocusTime));
      }
    } catch (error) {
      console.error("Error saving focus time:", error);
    }
  }

  // Save global notes to Firestore
  async function saveGlobalNotes(notes: string) {
    if (!user) return;

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          globalNotes: notes,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving global notes:", error);
    }
  }

  // Load global notes when user signs in
  useEffect(() => {
    if (!user) return;

    const loadGlobalNotes = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const notes = userDoc.data().globalNotes || "";
          setGlobalNotes(notes);
        }
      } catch (error) {
        console.error("Error loading global notes:", error);
      }
    };

    loadGlobalNotes();
  }, [user]);


  const [tasks, setTasks] = useState<LocalTask[]>([]);

  // Statistics state
  const [streak, setStreak] = useState(0);
  const [focusTime, setFocusTime] = useState(0); // in minutes
  const [globalNotes, setGlobalNotes] = useState("");

  // Header editable title and initial (persist to localStorage; synced to Firestore when signed in)
  const [headerTitle, setHeaderTitle] = useState<string>(() => {
    try {
      return localStorage.getItem("rose_header_title") || "Your Space";
    } catch {
      return "Your Space";
    }
  });
  const [headerInitial, setHeaderInitial] = useState<string>(() => {
    try {
      return localStorage.getItem("rose_header_initial") || "T";
    } catch {
      return "T";
    }
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingInitial, setEditingInitial] = useState(false);

  const dayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [new Date().toDateString()]);

  async function addTask(taskData: Omit<LocalTask, "id" | "createdAt" | "done">) {
    if (!user) return;

    await addDoc(collection(db, "users", user.uid, "tasks"), {
      ...taskData,
      done: false,
      createdAt: Date.now(),
    });
  }


  async function toggleTask(id: string) {
    if (!user) return;

    const ref = doc(db, "users", user.uid, "tasks", id);
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    await updateDoc(ref, { done: !task.done });
  }


  async function removeTask(id: string) {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "tasks", id));
  }


  async function updateTask(id: string, updates: Partial<LocalTask>) {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "tasks", id), updates);
  }


  const signedIn = session.signedIn;

  useEffect(() => {
    if (!signedIn || !user) {
      setTasks([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: LocalTask[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<LocalTask, "id">),
      }));
      setTasks(list);
    });

    return () => unsub();
  }, [signedIn, user]);

  return (
    <div className="min-h-screen bg-roseboard grain">
      <div className="relative z-10 px-2 sm:px-3 lg:px-4 xl:px-6 2xl:px-8">
        <header className="mx-auto max-w-screen-2xl pt-4 pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-10 w-10 rounded-2xl bg-primary/15 border border-primary/25 shadow-soft-sm flex items-center justify-center"
                    data-testid="logo-mark"
                  >
                    {editingInitial ? (
                      <input
                        autoFocus
                        maxLength={2}
                        value={headerInitial}
                        onChange={(e) => setHeaderInitial(e.target.value.toUpperCase())}
                        onBlur={() => {
                          setEditingInitial(false);
                          saveHeaderSettings(undefined, headerInitial);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-full text-center bg-transparent outline-none font-serif text-xl text-primary"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingInitial(true)}
                        className="w-full text-center font-serif text-xl text-primary"
                      >
                        {headerInitial}
                      </button>
                    )}
                  </div>
                  <div>
                    {editingTitle ? (
                      <input
                        autoFocus
                        value={headerTitle}
                        onChange={(e) => setHeaderTitle(e.target.value)}
                        onBlur={() => {
                          setEditingTitle(false);
                          saveHeaderSettings(headerTitle, undefined);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="font-serif tracking-tight text-3xl sm:text-4xl leading-none bg-transparent outline-none"
                        data-testid="input-title"
                      />
                    ) : (
                      <h1
                        className="font-serif tracking-tight text-3xl sm:text-4xl leading-none cursor-text"
                        data-testid="text-title"
                        onClick={() => setEditingTitle(true)}
                      >
                        {headerTitle}
                      </h1>
                    )}

                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-date">
                      <span>{dayLabel}</span>
                      <span className="font-medium text-primary/80">{formattedTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded-2xl px-2 py-1 glass shadow-soft-sm mr-2"
                  data-testid="chip-time"
                >
                  <Clock className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-xs font-semibold mono-tabular">{formattedTime}</span>
                </div>
                <div
                  className="hidden sm:flex items-center gap-2 rounded-2xl px-2 py-1 glass shadow-soft-sm"
                  data-testid="chip-theme"
                >
                  <span className="text-xs text-muted-foreground">Auto</span>
                  <Switch
                    checked={themeMode === "auto"}
                    onCheckedChange={(v) => {
                      const mode: ThemeMode = v ? "auto" : "light";
                      setThemeMode(mode);
                      saveThemePreference(mode);
                    }}
                    data-testid="switch-auto-theme"
                  />

                  <div className="h-6 w-px bg-border/60" />
                  <button
                    className={cn(
                      "h-8 w-8 rounded-2xl border flex items-center justify-center transition",
                      "bg-card/50 border-border/60 hover:bg-card/70",
                      (themeMode === "auto") && "opacity-50 cursor-not-allowed",
                    )}
                    onClick={() => {
                      if (themeMode === "auto") return;
                      const newMode = themeMode === "dark" ? "light" : "dark";
                      setThemeMode(newMode);
                      saveThemePreference(newMode);
                    }}
                    data-testid="button-toggle-theme"
                    disabled={themeMode === "auto"}
                  >
                    {document.documentElement.classList.contains("dark") ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-2xl px-3 py-2 glass shadow-soft-sm">
                  <button
                    onClick={() => setIsLowEnergyDay(!isLowEnergyDay)}
                    className={cn(
                      "h-8 w-8 rounded-2xl border flex items-center justify-center transition-all duration-300",
                      isLowEnergyDay
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-card/50 border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                    title="Toggle low energy day mode"
                    data-testid="button-low-energy"
                  >
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-3 lg:gap-5">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={() => setActiveTab("today")}
                    className={cn(
                      "text-left transition-all duration-300 active:scale-95 cursor-pointer rounded-2xl",
                      activeTab === "today" ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg scale-[1.02]" : "opacity-80 hover:opacity-100"
                    )}
                    data-testid="button-pill-plan"
                  >
                    <AccentPill
                      icon={<ListTodo className="h-4 w-4" strokeWidth={2.2} />}
                      label="A tiny plan"
                      hint="One list. No overwhelm."
                      testId="pill-plan"
                    />
                  </button>
                  <button 
                    onClick={() => setActiveTab("focus")}
                    className={cn(
                      "text-left transition-all duration-300 active:scale-95 cursor-pointer rounded-2xl",
                      activeTab === "focus" ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg scale-[1.02]" : "opacity-80 hover:opacity-100"
                    )}
                    data-testid="button-pill-focus"
                  >
                    <AccentPill
                      icon={<Focus className="h-4 w-4" strokeWidth={2.2} />}
                      label="Focus blocks"
                      hint="Pomodoro that feels gentle."
                      testId="pill-focus"
                    />
                  </button>
                  <button 
                    onClick={() => setActiveTab("timer")}
                    className={cn(
                      "text-left transition-all duration-300 active:scale-95 cursor-pointer rounded-2xl",
                      activeTab === "timer" ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg scale-[1.02]" : "opacity-80 hover:opacity-100"
                    )}
                    data-testid="button-pill-fullscreen"
                  >
                    <AccentPill
                      icon={<Clock className="h-4 w-4" strokeWidth={2.2} />}
                      label="Full-screen"
                      hint="Calm screen and a big timer."
                      testId="pill-fullscreen"
                    />
                  </button>
                </div>

                <Card className="glass rounded-3xl p-5 shadow-soft" data-testid="card-main">
                  <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-main">
                    <TabsContent value="today" className="mt-0" data-testid="panel-today">
                      <TasksCard
                        tasks={tasks}
                        onAdd={addTask}
                        onToggle={toggleTask}
                        onRemove={removeTask}
                        onUpdate={updateTask}
                        disabled={!signedIn}
                        isLowEnergyDay={isLowEnergyDay}
                      />
                    </TabsContent>

                    <TabsContent value="focus" className="mt-0" data-testid="panel-focus">
                      <PomodoroCard
                        mode={pomoMode}
                        running={pomoRunning}
                        remaining={pomoRemaining}
                        onSetRunning={setPomoRunning}
                        onReset={resetPomodoro}
                      />
                    </TabsContent>

                    <TabsContent value="timer" className="mt-0" data-testid="panel-timer">
                      <FullscreenTimerCard onFocusTime={addFocusTime} />
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>

              <div className="space-y-4">
                <SignInCard
                  session={session}
                  onLoginSuccess={handleLoginSuccess}
                  onLogout={handleLogout}
                />

                <Card className="glass rounded-3xl p-5 shadow-soft" data-testid="card-notion">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-primary" strokeWidth={2.2} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">Your Statistics</div>
                          <div className="text-xs text-muted-foreground" data-testid="text-note">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="rounded-2xl border border-border/60 bg-card/45 px-3 py-2"
                      data-testid="badge-private"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        Private
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div
                      className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3"
                      data-testid="stat-streak"
                    >
                      <div className="text-xs text-muted-foreground">Streak</div>
                      <div className="mt-1 text-xl font-semibold" data-testid="text-streak">
                        {streak} {streak === 1 ? 'day' : 'days'}
                      </div>
                    </div>
                    <div
                      className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3"
                      data-testid="stat-focus"
                    >
                      <div className="text-xs text-muted-foreground">Focus</div>
                      <div className="mt-1 text-xl font-semibold" data-testid="text-focus-min">
                        {focusTime} min
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-4 text-xs text-muted-foreground leading-relaxed"
                    data-testid="text-auth-explain"
                  >
                    If you're going through hell, keep going.
                  </div>
                </Card>

                <NotesCard
                  notes={globalNotes}
                  onNotesChange={(notes) => {
                    setGlobalNotes(notes);
                    saveGlobalNotes(notes);
                  }}
                  disabled={!signedIn}
                />
              </div>
            </div>
          </div>
        </header>

        <footer className="mx-auto max-w-screen-2xl px-2 sm:px-3 lg:px-4 xl:px-6 2xl:px-8 pb-4">
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground"
            data-testid="footer"
          >
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {eodMessage && (
                  <motion.span
                    key={eodMessage}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-sm text-muted-foreground italic"
                    data-testid="footer-eod"
                  >
                    {eodMessage}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1" data-testid="footer-theme">
                {document.documentElement.classList.contains("dark") ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
                <span>{themeMode === "auto" ? "Auto theme" : "Manual theme"}</span>
              </span>
              <span className="inline-flex items-center gap-1" data-testid="footer-auth">
                {signedIn ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                <span>{signedIn ? "Signed in" : "Locked"}</span>
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
