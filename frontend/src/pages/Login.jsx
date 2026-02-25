import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createTimeline, set, stagger, animate as animeAnimate } from "animejs";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { AlertCircle, LogIn, Loader2 } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const cardRef = useRef(null);
  const logoRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const formRef = useRef(null);
  const usernameWrapRef = useRef(null);
  const passwordWrapRef = useRef(null);
  const submitRef = useRef(null);
  const backLinkRef = useRef(null);
  const errorRef = useRef(null);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const card = cardRef.current;
    const logo = logoRef.current;
    const title = titleRef.current;
    const desc = descRef.current;
    const form = formRef.current;
    const userWrap = usernameWrapRef.current;
    const passWrap = passwordWrapRef.current;
    const submit = submitRef.current;
    const back = backLinkRef.current;

    if (
      !card ||
      !logo ||
      !title ||
      !desc ||
      !form ||
      !userWrap ||
      !passWrap ||
      !submit ||
      !back
    )
      return;

    set([card, logo, title, desc, form], { opacity: 0 });
    set(card, { y: 24, scale: 0.98 });
    set(logo, { scale: 0.9 });
    set([title, desc], { y: 10 });
    set([userWrap, passWrap], { opacity: 0, y: 12 });
    set([submit, back], { opacity: 0, y: 8 });

    const tl = createTimeline({ defaults: { ease: "outExpo", duration: 500 } });

    tl.add(card, {
      opacity: { to: 1 },
      y: { to: 0 },
      scale: { to: 1 },
      duration: 550,
    })
      .add(
        logo,
        { opacity: { to: 1 }, scale: { to: 1 }, duration: 450 },
        "-=350",
      )
      .add(title, { opacity: { to: 1 }, y: { to: 0 }, duration: 400 }, "-=300")
      .add(desc, { opacity: { to: 1 }, y: { to: 0 }, duration: 380 }, "-=280")
      .add(form, { opacity: { to: 1 }, duration: 300 }, "-=200")
      .add(
        [userWrap, passWrap],
        { opacity: { to: 1 }, y: { to: 0 }, duration: 400, delay: stagger(80) },
        "-=180",
      )
      .add(
        [submit, back],
        { opacity: { to: 1 }, y: { to: 0 }, duration: 350, delay: stagger(60) },
        "-=120",
      );
  }, []);

  useEffect(() => {
    if (!error || prefersReducedMotion()) return;
    const el = errorRef.current;
    if (!el) return;
    set(el, { opacity: 0, y: -6 });
    animeAnimate(
      el,
      { opacity: { to: 1 }, y: { to: 0 } },
      { duration: 280, ease: "outExpo" },
    );
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(username, password);
      const user = data?.user;

      if (!user) {
        setError("Respons server tidak valid. Coba lagi atau periksa koneksi ke backend.");
        return;
      }

      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/technician/my-tasks");
      }
    } catch (err) {
      let errorMessage = "Login gagal. Coba lagi.";

      if (err.response?.status === 401) {
        errorMessage =
          err.response?.data?.message ||
          "Username atau password salah. Periksa kembali.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      if (
        errorMessage.includes("diblokir") ||
        errorMessage.includes("blocked")
      ) {
        errorMessage =
          "Request diblokir oleh browser. Silakan nonaktifkan ad blocker atau ekstensi yang memblokir request, lalu refresh halaman.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 35%, #334155 60%, #1e3a5f 85%, #0f172a 100%)",
      }}
    >
      {/* Decorative background elements */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, #38bdf8 1px, transparent 1px),
            radial-gradient(circle at 80% 70%, #818cf8 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, #22d3ee 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
        aria-hidden="true"
        style={{
          background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full opacity-15 blur-3xl pointer-events-none"
        aria-hidden="true"
        style={{
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
        }}
      />

      <main
        className="relative z-10 w-full max-w-md"
        id="login-main"
        role="main"
      >
        <Card
          ref={cardRef}
          className="border-slate-700/50 bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-black/30 text-slate-100"
          aria-labelledby="login-title"
          aria-describedby="login-desc"
        >
          <CardHeader className="space-y-4 pb-2">
            <div className="flex justify-center" ref={logoRef}>
              <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600/50 shadow-inner">
                <img
                  src={`${import.meta.env.BASE_URL}logo192.png`}
                  alt=""
                  className="h-14 w-14 object-contain"
                  width={56}
                  height={56}
                />
              </div>
            </div>
            <div className="space-y-1 text-center">
              <CardTitle
                id="login-title"
                ref={titleRef}
                className="text-2xl font-bold text-white tracking-tight sm:text-3xl"
              >
                Login
              </CardTitle>
              <CardDescription
                id="login-desc"
                ref={descRef}
                className="text-slate-400 text-base"
              >
                Masuk ke akun Admin atau Teknisi
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="space-y-4"
              noValidate
              aria-label="Form login"
            >
              <div className="space-y-2" ref={usernameWrapRef}>
                <Label
                  htmlFor="username"
                  className="text-slate-300 font-medium text-sm"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                  aria-required="true"
                  aria-invalid={error ? "true" : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  className="bg-slate-800/60 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                  placeholder="Masukkan username"
                />
              </div>
              <div className="space-y-2" ref={passwordWrapRef}>
                <Label
                  htmlFor="password"
                  className="text-slate-300 font-medium text-sm"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={error ? "true" : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  className="bg-slate-800/60 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                  placeholder="Masukkan password"
                />
              </div>
              {error && (
                <div
                  ref={errorRef}
                  id="login-error"
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-950/60 border border-red-500/40 text-red-200 px-4 py-3 rounded-lg flex items-start gap-3 shadow-lg"
                >
                  <AlertCircle
                    className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-400"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-relaxed">{error}</p>
                </div>
              )}
              <Button
                ref={submitRef}
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition-colors"
                aria-busy={loading}
                aria-live="polite"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="h-5 w-5 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Memproses...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <LogIn className="h-5 w-5" aria-hidden="true" />
                    <span>Masuk</span>
                  </span>
                )}
              </Button>
            </form>
            <div className="mt-5 text-center" ref={backLinkRef}>
              <Link
                to="/"
                className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded px-2 py-1 transition-colors"
                aria-label="Kembali ke beranda"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
