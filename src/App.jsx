import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router";
import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  Flower2,
  House,
  LogOut,
  Menu,
  Printer,
  Receipt,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api, modules, request, useMeQuery } from "./lib/api";
import { ErrorBox, Field, Loading, Notice } from "./components/UI";
import { Catalog, MasterPage } from "./features/Catalog";
import { Receiving } from "./features/Receiving";
const Dashboard = lazy(() =>
  import("./features/Reports").then((m) => ({ default: m.Dashboard })),
);
const Reports = lazy(() =>
  import("./features/Reports").then((m) => ({ default: m.Reports })),
);
import {
  Audit,
  Customers,
  Expenses,
  Inventory,
  Labels,
  Orders,
  Pricing,
  Sales,
  Settings,
  Shifts,
  Staff,
} from "./features/Operations";

function Turnstile({ onToken }) {
  const ref = useRef(null);
  useEffect(() => {
    let widget;
    let disposed = false;
    const render = () => {
      if (disposed || !window.turnstile || !ref.current) return;
      widget = window.turnstile.render(ref.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
        action: "login",
        language: "ar",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };
    let script = document.querySelector("script[data-turnstile]");
    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.dataset.turnstile = "true";
      script.async = true;
      document.head.appendChild(script);
    }
    if (window.turnstile) render();
    else script.addEventListener("load", render);
    return () => {
      disposed = true;
      script.removeEventListener("load", render);
      if (widget !== undefined) window.turnstile?.remove(widget);
    };
  }, [onToken]);
  return <div ref={ref} />;
}
function Login({ onSuccess, expectedUser }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [challenge, setChallenge] = useState(0);
  async function login(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const user = await request("/api/v1/auth/login", {
        method: "POST",
        body: {
          email: form.get("email"),
          password: form.get("password"),
          ...(token ? { bot_token: token } : {}),
        },
      });
      if (!["owner", "manager"].includes(user.role)) {
        await request("/api/v1/auth/logout", { method: "POST" });
        throw new Error("لوحة الإدارة متاحة للمالك والمدير فقط");
      }
      if (expectedUser && user.id !== expectedUser.id) {
        await request("/api/v1/auth/logout", { method: "POST" });
        throw new Error("أعد الدخول بنفس الحساب لحماية العمليات المعلقة");
      }
      onSuccess(user);
    } catch (e) {
      setError(e);
      setToken("");
      setChallenge((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`login-page ${expectedUser ? "session-overlay" : ""}`}>
      <section className="login-brand">
        <div className="brand">
          <Flower2 size={38} />
          <div>
            <b>Jamila</b>
            <small>CLOSET</small>
          </div>
        </div>
        <h1>
          كل تفاصيل متجرك،
          <br />
          ببساطة.
        </h1>
        <p>
          مساحة واحدة لإدارة منتجاتك، متابعة مبيعاتك،
          <br />
          والاهتمام بكل طلب.
        </p>
        <span className="brand-flower" aria-hidden="true">
          ✳
        </span>
        <small>جميلة كلوزت · لوحة الإدارة</small>
      </section>
      <section className="login-form">
        <div className="mobile-brand">Jamila Closet</div>
        <div className="eyebrow">أهلاً بعودتك</div>
        <h2>{expectedUser ? "انتهت الجلسة" : "تسجيل الدخول"}</h2>
        <p className="muted">
          {expectedUser
            ? "أعد الدخول بنفس الحساب لاستكمال عملك."
            : "أدخلي بيانات حسابك للانتقال إلى لوحة الإدارة."}
        </p>
        <form onSubmit={login}>
          <Field label="البريد الإلكتروني">
            {(id) => (
              <input
                id={id}
                name="email"
                type="email"
                autoComplete="username"
                required
                dir="ltr"
                defaultValue={expectedUser?.email ?? ""}
                readOnly={!!expectedUser}
                placeholder="name@example.com"
              />
            )}
          </Field>
          <Field label="كلمة المرور">
            {(id) => (
              <input
                id={id}
                name="password"
                type="password"
                autoComplete="current-password"
                required
                dir="ltr"
              />
            )}
          </Field>
          {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
            <Turnstile key={challenge} onToken={setToken} />
          )}
          <ErrorBox error={error} />
          <button
            disabled={
              busy || (!!import.meta.env.VITE_TURNSTILE_SITE_KEY && !token)
            }
          >
            {busy ? "جارٍ تسجيل الدخول…" : "دخول لوحة الإدارة"}
          </button>
        </form>
        <div className="login-security">
          <ShieldCheck size={17} /> وصول آمن للمالك والمدير فقط
        </div>
      </section>
    </div>
  );
}
const navigation = [
  ["/", "نظرة عامة", House],
  ["/products", "المنتجات", ShoppingBag],
  ["/inventory", "المخزون", Boxes],
  ["/receiving", "استلام البضاعة", Truck],
  ["/master/suppliers", "الموردون", Users],
  ["/master/selectors", "مختارو البضاعة", Tags],
  ["/labels", "الملصقات والطباعة", Printer],
  ["/pricing", "الأسعار والعروض", Tags],
  ["/orders", "طلبات الموقع", ClipboardList, "website"],
  ["/sales", "المبيعات والفواتير", Receipt],
  ["/customers", "العملاء", Users],
  ["/shifts", "الورديات", Wallet, "pos"],
  ["/expenses", "المصروفات", Wallet],
  ["/reports", "التقارير", ChartNoAxesCombined],
  ["/staff", "المستخدمون", ShieldCheck],
  ["/audit", "سجل التدقيق", ClipboardList],
  ["/settings", "الإعدادات والموقع", SettingsIcon],
];
function Guard({ module, children }) {
  return modules[module] ? (
    children
  ) : (
    <div className="panel">
      <Notice>هذه الوحدة غير مفعّلة لهذه النسخة.</Notice>
    </div>
  );
}
function Shell({ user, onLogout }) {
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  async function logout() {
    setBusy(true);
    try {
      await request("/api/v1/auth/logout", { method: "POST" });
      onLogout();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        انتقل إلى المحتوى
      </a>
      {menu && (
        <button
          className="nav-backdrop"
          aria-label="إغلاق القائمة"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand">
          <Flower2 size={32} />
          <div>
            <b>Jamila</b>
            <small>CLOSET</small>
          </div>
          <button
            className="mobile-only icon-button"
            aria-label="إغلاق القائمة"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <div className="sidebar-caption">إدارة المتجر</div>
        <nav aria-label="القائمة الرئيسية">
          {navigation
            .filter((n) => !n[3] || modules[n[3]])
            .map(([path, title, Icon]) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={() => setMenu(false)}
              >
                <Icon size={19} />
                <span>{title}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">{user.name?.[0]}</div>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.role === "owner" ? "مالك المتجر" : "مدير المتجر"}
            </small>
          </div>
          <button
            className="icon-button"
            aria-label="تسجيل الخروج"
            disabled={busy}
            onClick={logout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-only icon-button"
              aria-label="فتح القائمة"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span>{import.meta.env.VITE_STORE_NAME ?? "جميلة كلوزت"}</span>
            <span className="separator">/</span>
            <small>
              {navigation.find((n) => n[0] === location.pathname)?.[1] ??
                "دليل المتجر"}
            </small>
          </div>
          <span className="store-status">
            <span /> لوحة الإدارة
          </span>
        </header>
        <main id="main-content">
          <ErrorBox error={error} />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Catalog />} />
              {["categories", "colors", "sizes", "suppliers", "selectors"].map(
                (type) => (
                  <Route
                    key={type}
                    path={`/master/${type}`}
                    element={<MasterPage key={type} type={type} />}
                  />
                ),
              )}
              <Route path="/receiving" element={<Receiving />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/labels" element={<Labels />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route
                path="/orders"
                element={
                  <Guard module="website">
                    <Orders />
                  </Guard>
                }
              />
              <Route path="/sales" element={<Sales user={user} />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route
                path="/shifts"
                element={
                  <Guard module="pos">
                    <Shifts />
                  </Guard>
                }
              />
              <Route path="/reports" element={<Reports />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <footer className="page-footer">
            جميلة كلوزت <span>توقيت القاهرة · الجنيه المصري</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
export default function App() {
  const me = useMeQuery();
  const dispatch = useDispatch();
  const expired = useSelector((s) => s.session.expired);
  const [user, setUser] = useState(null);
  const current = user ?? me.data;
  useEffect(() => {
    const expire = () => dispatch({ type: "session/expired" });
    window.addEventListener("jamila-session-expired", expire);
    return () => window.removeEventListener("jamila-session-expired", expire);
  }, [dispatch]);
  function signedIn(user) {
    setUser(user);
    dispatch({ type: "session/restored" });
    dispatch(api.util.invalidateTags(["Session", "Business"]));
  }
  if (me.isLoading) return <Loading />;
  if (!current) {
    if (me.error && me.error.status !== 401)
      return (
        <div className="connection-error">
          <Flower2 size={40} />
          <h1>جميلة كلوزت</h1>
          <ErrorBox error={me.error} retry={me.refetch} />
          <p>تحقق من تشغيل الخادم وإعداد عنوان API.</p>
        </div>
      );
    return <Login onSuccess={signedIn} />;
  }
  if (!["owner", "manager"].includes(current.role))
    return (
      <div className="connection-error">
        <Notice danger>حساب الموظف غير مصرح له بدخول لوحة الإدارة.</Notice>
        <button
          onClick={async () => {
            await request("/api/v1/auth/logout", { method: "POST" });
            dispatch(api.util.resetApiState());
            setUser(null);
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    );
  return (
    <>
      <Shell
        user={current}
        onLogout={() => {
          setUser(null);
          dispatch(api.util.resetApiState());
        }}
      />
      {expired && <Login expectedUser={current} onSuccess={signedIn} />}
    </>
  );
}
