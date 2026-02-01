import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { GoogleLogin, googleLogout, useGoogleLogin } from "@react-oauth/google";

type LocalTask = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
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
}) {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(() => initial.focusMin * 60);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      lastTickRef.current = null;
      return;
    }

    const id = window.setInterval(() => {
      const now = Date.now();
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const delta = Math.max(0, Math.floor((now - last) / 1000));
      if (delta <= 0) return;

      setRemaining((prev) => {
        const next = prev - delta;
        if (next > 0) return next;

        const nextMode = mode === "focus" ? "break" : "focus";
        setMode(nextMode);
        return (nextMode === "focus" ? initial.focusMin : initial.breakMin) * 60;
      });
    }, 250);

    return () => window.clearInterval(id);
  }, [running, mode, initial.breakMin, initial.focusMin]);

  function reset(nextMode: "focus" | "break" = mode) {
    setRunning(false);
    setMode(nextMode);
    setRemaining((nextMode === "focus" ? initial.focusMin : initial.breakMin) * 60);
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

function useFullscreenTimer(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      lastTickRef.current = null;
      return;
    }
    const id = window.setInterval(() => {
      const now = Date.now();
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const delta = Math.max(0, Math.floor((now - last) / 1000));
      if (delta <= 0) return;

      setSeconds((prev) => {
        const next = prev - delta;
        return next <= 0 ? 0 : next;
      });
    }, 250);
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
          <div data-testid="google-login-container">
            <GoogleLogin
              onSuccess={onLoginSuccess}
              onError={() => console.log('Login Failed')}
              useOneTap
              theme="outline"
              shape="pill"
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
  disabled,
}: {
  tasks: LocalTask[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  const [title, setTitle] = useState("");

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <Card className="glass rounded-3xl p-5 shadow-soft" data-testid="card-todos">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ListTodo className="h-4 w-4 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">To-do</div>
              <div className="text-xs text-muted-foreground" data-testid="text-todo-count">
                {remaining} left today
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={disabled ? "Sign in to save" : "Add a task\u2026"}
            disabled={disabled}
            className="h-10 rounded-2xl bg-card/50"
            data-testid="input-new-task"
          />
          <Button
            className="rounded-2xl"
            onClick={() => {
              const t = title.trim();
              if (!t) return;
              onAdd(t);
              setTitle("");
            }}
            disabled={disabled || title.trim().length === 0}
            data-testid="button-add-task"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2" data-testid="list-tasks">
        <AnimatePresence initial={false}>
          {tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground"
              data-testid="empty-tasks"
            >
              Add your first tiny task. Keep it soft.
            </motion.div>
          ) : (
            tasks.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="rounded-2xl border border-border/60 bg-card/40 px-3 py-2 flex items-center justify-between gap-3"
                data-testid={`row-task-${t.id}`}
              >
                <button
                  className={cn(
                    "flex items-center gap-3 text-left min-w-0",
                    disabled && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={() => !disabled && onToggle(t.id)}
                  disabled={disabled}
                  data-testid={`button-toggle-task-${t.id}`}
                >
                  <span
                    className={cn(
                      "h-8 w-8 rounded-xl border flex items-center justify-center",
                      t.done
                        ? "bg-primary text-primary-foreground border-primary/40"
                        : "bg-card/60 border-border/60",
                    )}
                  >
                    {t.done ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span
                    className={cn(
                      "truncate text-sm",
                      t.done
                        ? "line-through text-muted-foreground"
                        : "text-foreground",
                    )}
                    data-testid={`text-task-title-${t.id}`}
                  >
                    {t.title}
                  </span>
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  onClick={() => onRemove(t.id)}
                  disabled={disabled}
                  data-testid={`button-remove-task-${t.id}`}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function PomodoroCard() {
  const [focusMin] = useState(25);
  const [breakMin] = useState(5);
  const pomo = usePomodoro({ focusMin, breakMin });

  const label = pomo.mode === "focus" ? "Focus" : "Break";
  const chip = pomo.mode === "focus" ? "bg-primary/12" : "bg-accent/40";

  const total = (pomo.mode === "focus" ? focusMin : breakMin) * 60;
  const pct = 1 - pomo.remaining / total;

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
                {label} \u2022 {focusMin}/{breakMin}
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
            {formatHMS(pomo.remaining)}
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
            onClick={() => pomo.setRunning(!pomo.running)}
            data-testid={pomo.running ? "button-pomo-pause" : "button-pomo-start"}
          >
            <Timer className="mr-2 h-4 w-4" />
            {pomo.running ? "Pause" : "Start"}
          </Button>
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => pomo.reset("focus")}
            data-testid="button-pomo-reset"
          >
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FullscreenTimerCard() {
  const timer = useFullscreenTimer(10 * 60);

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
                A calm, distraction-free screen.
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

              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className="font-serif tracking-tight text-[min(18vw,160px)] leading-none mono-tabular"
                    data-testid="text-fullscreen-time"
                  >
                    {formatHMS(timer.seconds)}
                  </div>
                  <div
                    className="mt-4 text-sm text-muted-foreground"
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

export default function Home() {
  const [session, setSession] = useState<Session>({
    signedIn: false,
    name: "",
    email: "",
  });

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
    setSession({ signedIn: false, name: "", email: "" });
  };

  const [autoTheme, setAutoTheme] = useState(true);
  useAutoTheme(autoTheme);

  const [manualDark, setManualDark] = useState(false);
  useEffect(() => {
    if (autoTheme) return;
    document.documentElement.classList.toggle("dark", manualDark);
  }, [autoTheme, manualDark]);

  const [tasks, setTasks] = useState<LocalTask[]>([]);

  const dayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

  function addTask(title: string) {
    setTasks((prev) => [
      {
        id: crypto.randomUUID(),
        title,
        done: false,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  }

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const signedIn = session.signedIn;

  return (
    <div className="min-h-screen bg-roseboard grain">
      <div className="relative z-10">
        <header className="mx-auto max-w-6xl px-5 pt-8 pb-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-10 w-10 rounded-2xl bg-primary/15 border border-primary/25 shadow-soft-sm flex items-center justify-center"
                    data-testid="logo-mark"
                  >
                    <span className="font-serif text-xl text-primary">R</span>
                  </div>
                  <div>
                    <h1
                      className="font-serif tracking-tight text-3xl sm:text-4xl leading-none"
                      data-testid="text-title"
                    >
                      Roseboard
                    </h1>
                    <div className="mt-1 text-sm text-muted-foreground" data-testid="text-date">
                      {dayLabel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="hidden sm:flex items-center gap-2 rounded-2xl px-3 py-2 glass shadow-soft-sm"
                  data-testid="chip-theme"
                >
                  <span className="text-xs text-muted-foreground">Auto</span>
                  <Switch
                    checked={autoTheme}
                    onCheckedChange={(v) => setAutoTheme(Boolean(v))}
                    data-testid="switch-auto-theme"
                  />
                  <div className="h-6 w-px bg-border/60" />
                  <button
                    className={cn(
                      "h-9 w-9 rounded-xl border flex items-center justify-center transition",
                      "bg-card/50 border-border/60 hover:bg-card/70",
                      autoTheme && "opacity-50 cursor-not-allowed",
                    )}
                    onClick={() => !autoTheme && setManualDark((d) => !d)}
                    data-testid="button-toggle-theme"
                    disabled={autoTheme}
                  >
                    {document.documentElement.classList.contains("dark") ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <Button
                  variant={signedIn ? "secondary" : "default"}
                  className="rounded-2xl"
                  onClick={() => {
                    if (signedIn) handleLogout();
                  }}
                  data-testid={signedIn ? "button-header-signout" : "button-header-signin"}
                >
                  {signedIn ? "Sign out" : "Sign in"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <AccentPill
                    icon={<ListTodo className="h-4 w-4" strokeWidth={2.2} />}
                    label="A tiny plan"
                    hint="One list. No overwhelm."
                    testId="pill-plan"
                  />
                  <AccentPill
                    icon={<Focus className="h-4 w-4" strokeWidth={2.2} />}
                    label="Focus blocks"
                    hint="Pomodoro that feels gentle."
                    testId="pill-focus"
                  />
                  <AccentPill
                    icon={<Clock className="h-4 w-4" strokeWidth={2.2} />}
                    label="Full-screen"
                    hint="Big timer \u2022 calm screen."
                    testId="pill-fullscreen"
                  />
                </div>

                <Card className="glass rounded-3xl p-5 shadow-soft" data-testid="card-main">
                  <Tabs defaultValue="today" data-testid="tabs-main">
                    <TabsList className="rounded-2xl" data-testid="tabs-list">
                      <TabsTrigger value="today" className="rounded-xl" data-testid="tab-today">
                        Today
                      </TabsTrigger>
                      <TabsTrigger value="focus" className="rounded-xl" data-testid="tab-focus">
                        Focus
                      </TabsTrigger>
                      <TabsTrigger value="timer" className="rounded-xl" data-testid="tab-timer">
                        Timer
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="today" className="mt-4" data-testid="panel-today">
                      <TasksCard
                        tasks={tasks}
                        onAdd={addTask}
                        onToggle={toggleTask}
                        onRemove={removeTask}
                        disabled={!signedIn}
                      />
                    </TabsContent>

                    <TabsContent value="focus" className="mt-4" data-testid="panel-focus">
                      <PomodoroCard />
                    </TabsContent>

                    <TabsContent value="timer" className="mt-4" data-testid="panel-timer">
                      <FullscreenTimerCard />
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>

              <div className="space-y-3">
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
                          <div className="text-sm font-semibold text-foreground">Minimal, like Notion\u2014but calm</div>
                          <div className="text-xs text-muted-foreground" data-testid="text-note">
                            No pages. No databases. Just \"today\".
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
                        3 days
                      </div>
                    </div>
                    <div
                      className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3"
                      data-testid="stat-focus"
                    >
                      <div className="text-xs text-muted-foreground">Focus</div>
                      <div className="mt-1 text-xl font-semibold" data-testid="text-focus-min">
                        55 min
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-4 text-xs text-muted-foreground leading-relaxed"
                    data-testid="text-auth-explain"
                  >
                    To make Google sign-in and account-synced tasks real, we\u2019ll need to upgrade this
                    prototype into a full app with a backend and database.
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </header>

        <footer className="mx-auto max-w-6xl px-5 pb-10">
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground"
            data-testid="footer"
          >
            <div className="flex items-center gap-2">
              <span className="font-serif">Roseboard</span>
              <span>\u2022</span>
              <span>minimal daily space</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1" data-testid="footer-theme">
                {document.documentElement.classList.contains("dark") ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
                <span>{autoTheme ? "Auto theme" : "Manual theme"}</span>
              </span>
              <span>\u2022</span>
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
