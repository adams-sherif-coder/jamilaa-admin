import { useEffect, useId, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  api,
  currentActor,
  request,
  useReadQuery,
  queryString,
} from "../lib/api";
import { acknowledge, operationKey } from "../lib/operations";
import {
  dateTime,
  idList,
  labels,
  minor,
  money,
  pageData,
  stringList,
} from "../lib/domain";

export function Notice({ children, danger = false }) {
  return (
    <div className={`notice ${danger ? "danger" : ""}`}>
      <AlertCircle size={19} />
      <div>{children}</div>
    </div>
  );
}
export function ErrorBox({ error, retry }) {
  return error ? (
    <div role="alert" className="notice danger">
      <AlertCircle size={20} />
      <div>
        <strong>{error.message ?? "تعذر تحميل البيانات"}</strong>
        {error.code && <small dir="ltr">{error.code}</small>}
        {Object.entries(error.fields ?? {}).map(([key, values]) => (
          <p key={key}>
            {fieldNames[key] ?? key}: {[].concat(values).join("، ")}
          </p>
        ))}
        {retry && (
          <button onClick={retry} className="secondary">
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="empty" role="status">
      <LoaderCircle className="spin" />
      <span>جارٍ تحميل البيانات…</span>
    </div>
  );
}
export function Empty({ children = "لا توجد بيانات لعرضها" }) {
  return (
    <div className="empty">
      <Inbox size={34} />
      <strong>{children}</strong>
      <small>ستظهر السجلات هنا عند توفرها.</small>
    </div>
  );
}
export function Badge({ value }) {
  return (
    <span
      className={`badge ${["cancelled", "damaged", "lost", "voided"].includes(value) ? "bad" : ["completed", "delivered", "available", "confirmed"].includes(value) ? "good" : ""}`}
    >
      {labels[value] ?? value ?? "—"}
    </span>
  );
}
export function Field({ label, children, hint }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {typeof children === "function" ? children(id) : children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button aria-label="إغلاق" className="icon-button" onClick={onClose}>
          <X />
        </button>
      </header>
      <div className="dialog-content">{children}</div>
    </dialog>
  );
}
const fieldNames = {
  id: "المعرّف",
  name: "الاسم",
  name_ar: "الاسم بالعربية",
  name_en: "الاسم بالإنجليزية",
  phone: "الهاتف",
  email: "البريد الإلكتروني",
  role: "الدور",
  branch_id: "الفرع",
  status: "الحالة",
  state: "حالة القطعة",
  reference: "المرجع",
  number: "رقم الفاتورة",
  purchase_date: "تاريخ الشراء",
  total_minor: "الإجمالي",
  cost_minor: "التكلفة الأصلية",
  price_minor: "سعر البيع",
  paid_minor: "المبلغ المدفوع",
  regular_minor: "السعر الأساسي",
  amount_minor: "المبلغ",
  refund_minor: "قيمة الاسترداد",
  valuation_minor: "قيمة المخزون بالتكلفة",
  net_revenue_minor: "صافي المبيعات",
  cogs_minor: "تكلفة القطع المباعة",
  gross_profit_minor: "مجمل الربح",
  net_profit_minor: "صافي الربح",
  business_expenses_minor: "المصروفات التشغيلية",
  completed_sales_minor: "المبيعات المكتملة",
  refunds_minor: "المرتجعات",
  orders: "الطلبات",
  pieces: "القطع",
  piece_count: "عدد القطع",
  count: "العدد",
  quantity: "الكمية",
  threshold: "حد التنبيه",
  variant_id: "معرّف المتغير",
  product_id: "معرّف المنتج",
  piece_id: "معرّف القطعة",
  piece_ids: "معرّفات القطع",
  supplier_id: "المورد",
  merchandise_selector_id: "مختار البضاعة",
  selector_id: "مختار البضاعة",
  group_key: "المجموعة",
  sold_pieces: "القطع المباعة",
  returned_pieces: "القطع المرتجعة",
  purchases_minor: "المشتريات",
  returns_minor: "المرتجعات",
  net_paid_minor: "صافي المدفوع",
  balance_due_minor: "المستحق للمورد",
  refund_due_minor: "المستحق من المورد",
  created_at: "تاريخ الإنشاء",
  updated_at: "آخر تعديل",
  completed_at: "تاريخ الإتمام",
  expires_at: "انتهاء الحجز",
  channel: "القناة",
  fulfillment: "طريقة الاستلام",
  intended_tender: "وسيلة الدفع المطلوبة",
  remittance_status: "حالة التحصيل",
  carrier_reference: "مرجع الشحن",
  contact: "بيانات الاتصال",
  customer: "العميل",
  lines: "البنود",
  items: "القطع",
  payments: "المدفوعات",
  method: "وسيلة الدفع",
  custody: "جهة الاحتفاظ بالمبلغ",
  cash_received_minor: "النقد المستلم",
  change_minor: "الباقي",
  reason: "السبب",
  notes: "الملاحظات",
  barcode: "الباركود",
  snapshot: "بيانات الفاتورة الأصلية",
  color: "اللون",
  size: "المقاس",
  color_id: "اللون",
  size_id: "المقاس",
  returned_points: "النقاط المسترجعة",
  restored_points: "النقاط المستعادة",
  reversed_points: "النقاط الملغاة",
  earned_points: "النقاط المكتسبة",
  redeemed_points: "النقاط المستخدمة",
  points: "النقاط",
  return_days: "مدة الإرجاع بالأيام",
  opening_cash_minor: "الرصيد الافتتاحي",
  expected_cash_minor: "النقد المتوقع",
  counted_cash_minor: "النقد المعدود",
  difference_minor: "الفرق",
  cash_sales_minor: "المبيعات النقدية",
  cash_refunds_minor: "المرتجعات النقدية",
  cash_movements_minor: "الحركات النقدية",
  opened_at: "بداية الوردية",
  closed_at: "نهاية الوردية",
  closed_by: "أغلقها",
  user_id: "المستخدم",
  actor_id: "منفذ الإجراء",
  subject_id: "السجل",
  subject_type: "نوع السجل",
  action: "الإجراء",
  before: "قبل التعديل",
  after: "بعد التعديل",
  old_minor: "السعر السابق",
  new_minor: "السعر الجديد",
  labels: "الملصقات",
  preview: "معاينة",
  batch_id: "دفعة الطباعة",
  width_mm: "العرض بالمليمتر",
  height_mm: "الارتفاع بالمليمتر",
  copies: "النسخ",
  hardware_calibrated: "تم اختبار الطابعة فعلياً",
  symbology: "نوع الباركود",
  unassigned_quantity: "الكمية المتبقية للتجهيز",
  online_order_id: "الطلب الإلكتروني",
  receiving_id: "إذن الاستلام",
  direction: "الاتجاه",
  collect_minor: "فرق مطلوب تحصيله",
  refund_difference_minor: "فرق مطلوب رده",
  new_sale_minor: "قيمة البيع الجديد",
  offset_minor: "قيمة التسوية",
  version: "الإصدار",
  report: "التقرير",
  totals: "الإجماليات",
  receiving: "إذن الاستلام",
  order: "الطلب",
  shift: "الوردية",
  station_id: "نقطة البيع",
  from_utc: "بداية الفترة",
  to_utc: "نهاية الفترة",
  currency: "العملة",
  anonymous_transactions: "طلبات بدون عميل",
  identified_customers: "عملاء معروفون",
  available_quantity: "الكمية المتاحة",
  product_name_ar: "اسم المنتج",
  product_name_en: "الاسم الإنجليزي",
  price: "السعر",
  current_minor: "السعر الفعلي",
  minimum_minor: "الحد الأدنى",
  other_variants: "المتغيرات الأخرى",
  discount_minor: "الخصم",
  policy_version: "إصدار السياسة",
  archived: "مؤرشف",
  published: "منشور",
  packed: "عدد القطع المجهزة",
  removed: "تم الحذف",
  active: "نشط",
};
function display(value, key) {
  if (value === null || value === undefined) return "غير متاح";
  if (key.endsWith("_minor")) return money(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (key.endsWith("_at") && !Number.isNaN(Date.parse(value)))
    return dateTime(value);
  return labels[value] ?? String(value);
}
export function RecordView({ data }) {
  if (data == null) return <Empty />;
  if (Array.isArray(data))
    return data.length ? (
      <div className="records">
        {data.map((row, i) => (
          <RecordView key={row?.id ?? i} data={row} />
        ))}
      </div>
    ) : (
      <span className="muted">لا توجد سجلات</span>
    );
  if (typeof data !== "object") return <span>{display(data, "")}</span>;
  return (
    <dl className="record">
      {Object.entries(data)
        .filter(
          ([key]) =>
            ![
              "password",
              "approver_password",
              "bot_token",
              "phone_lookup",
              "remember_token",
            ].includes(key),
        )
        .map(([key, value]) => (
          <div
            key={key}
            className={
              typeof value === "object" && value !== null ? "wide" : ""
            }
          >
            <dt>{fieldNames[key] ?? key}</dt>
            <dd>
              {typeof value === "object" && value !== null ? (
                <RecordView data={value} />
              ) : (
                display(value, key)
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}
export function DataTable({ rows, columns, onRow }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label ?? fieldNames[c.key] ?? c.key}</th>
            ))}
            {onRow && <th>التفاصيل</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(row) : display(row[c.key], c.key)}
                </td>
              ))}
              {onRow && (
                <td>
                  <button className="secondary" onClick={() => onRow(row)}>
                    عرض <ChevronLeft size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pager({ data, onPage }) {
  const p = pageData(data);
  return (
    <div className="pager">
      <span>{p.total} سجل</span>
      <div>
        <button
          aria-label="الصفحة السابقة"
          disabled={p.page <= 1}
          onClick={() => onPage(p.page - 1)}
        >
          <ChevronRight size={18} />
        </button>
        <span>
          صفحة {p.page} من {p.last}
        </span>
        <button
          aria-label="الصفحة التالية"
          disabled={p.page >= p.last}
          onClick={() => onPage(p.page + 1)}
        >
          <ChevronLeft size={18} />
        </button>
      </div>
    </div>
  );
}
export function RemoteSelect({
  path,
  value,
  onChange,
  label,
  required = false,
  nullable = true,
}) {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const id = setTimeout(() => {
      setTerm(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);
  const q = useReadQuery(
    `${path}?${queryString({ search: term, page, per_page: 20 })}`,
  );
  const rows = pageData(q.currentData).rows;
  return (
    <div className="lookup">
      <Field label={label}>
        {(id) => (
          <select
            id={id}
            required={required}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{nullable ? "بدون / غير محدد" : "اختر…"}</option>
            {value && !rows.some((r) => String(r.id) === String(value)) && (
              <option value={value}>السجل #{value}</option>
            )}
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name_ar ?? row.name ?? row.name_en} · {row.id}
              </option>
            ))}
          </select>
        )}
      </Field>
      <details>
        <summary>بحث في القائمة</summary>
        <input
          aria-label={`بحث ${label}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم (الإنجليزي للقوائم الأساسية)"
        />
        {q.isFetching ? (
          <Loading />
        ) : (
          <Pager data={q.currentData} onPage={setPage} />
        )}
        <ErrorBox error={q.error} />
      </details>
    </div>
  );
}
export function FormInput({ field, value, onChange }) {
  if (field.type === "lookup")
    return <RemoteSelect {...field} value={value} onChange={onChange} />;
  return (
    <Field label={field.label ?? fieldNames[field.name]} hint={field.hint}>
      {(id) =>
        field.type === "boolean" ? (
          <span className="check">
            <input
              id={id}
              type="checkbox"
              checked={!!value}
              required={field.required}
              onChange={(e) => onChange(e.target.checked)}
            />
            {field.checkLabel ?? "تأكيد"}
          </span>
        ) : field.options ? (
          <select
            id={id}
            value={value ?? ""}
            required={field.required}
            onChange={(e) => onChange(e.target.value)}
          >
            {!field.required && <option value="">غير محدد</option>}
            {field.options.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        ) : ["textarea", "ids", "barcodes"].includes(field.type) ? (
          <textarea
            id={id}
            value={value ?? ""}
            required={field.required}
            maxLength={field.maxLength ?? 5000}
            onChange={(e) => onChange(e.target.value)}
            dir={field.type === "textarea" ? undefined : "ltr"}
          />
        ) : (
          <input
            id={id}
            value={value ?? ""}
            type={field.type === "money" ? "text" : (field.type ?? "text")}
            inputMode={
              ["money", "number"].includes(field.type) ? "decimal" : undefined
            }
            required={field.required}
            min={field.min}
            max={field.max}
            maxLength={field.maxLength ?? 255}
            step={field.step}
            autoComplete={
              field.type === "password" ? "new-password" : undefined
            }
            dir={
              ["email", "password", "money", "number"].includes(field.type)
                ? "ltr"
                : undefined
            }
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    </Field>
  );
}
function formBody(fields, values) {
  return Object.fromEntries(
    fields
      .filter(
        (f) =>
          f.type === "boolean" ||
          (values[f.name] !== "" && values[f.name] !== undefined),
      )
      .map((f) => [
        f.name,
        f.type === "money"
          ? minor(values[f.name])
          : ["number", "lookup"].includes(f.type)
            ? Number(values[f.name])
            : f.type === "ids"
              ? idList(values[f.name])
              : f.type === "barcodes"
                ? stringList(values[f.name])
                : values[f.name],
      ]),
  );
}
export function MutationForm({
  title,
  path,
  fields = [],
  initial = {},
  method = "POST",
  previewPath,
  previewBody,
  transform,
  onSuccess,
  children,
  notice,
  submitLabel = "حفظ",
  idempotent = true,
}) {
  const [values, setValues] = useState(() => ({
    ...Object.fromEntries(
      fields.map((f) => [
        f.name,
        f.default ?? (f.type === "boolean" ? false : ""),
      ]),
    ),
    ...initial,
  }));
  const [review, setReview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(null);
  const lock = useRef(false);
  const dispatch = useDispatch();
  const uncertain =
    error && (error.status === "NETWORK" || Number(error.status) >= 500);
  async function run(commit = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const base = transform
        ? transform(formBody(fields, values), values)
        : formBody(fields, values);
      const preview = !!previewPath && !commit;
      const body = preview
        ? previewBody
          ? previewBody(base)
          : { ...base, preview: true }
        : previewPath && !previewBody
          ? { ...base, preview: false }
          : base;
      const target = preview ? previewPath : path;
      const signature = JSON.stringify({ target, body, method });
      if (pending.current?.signature !== signature)
        pending.current = {
          signature,
          ...(fields.some((field) => field.type === "password")
            ? { key: crypto.randomUUID() }
            : await operationKey(currentActor, signature)),
        };
      const data = await request(target, {
        method,
        body,
        key: idempotent ? pending.current.key : undefined,
      });
      if (pending.current.hash) acknowledge(pending.current.hash);
      pending.current = null;
      if (preview) setReview(data);
      else {
        setResult(data);
        setReview(null);
        dispatch(api.util.invalidateTags(["Business"]));
        onSuccess?.(data);
      }
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="form-panel">
      {title && <h3>{title}</h3>}
      {notice && <Notice>{notice}</Notice>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(false);
        }}
      >
        <fieldset disabled={busy || !!review || !!result || uncertain}>
          <div className="form-grid">
            {fields.map((f) => (
              <FormInput
                key={f.name}
                field={{
                  ...f,
                  hint: error?.fields?.[f.name]?.join("، ") ?? f.hint,
                }}
                value={values[f.name]}
                onChange={(v) => {
                  setValues({ ...values, [f.name]: v });
                  setError(null);
                }}
              />
            ))}
          </div>
          {children}
        </fieldset>
        <ErrorBox error={error} />
        {result ? (
          <div role="status">
            <div className="success">
              <Check /> تم الحفظ بنجاح
            </div>
            <RecordView data={result} />
          </div>
        ) : review ? (
          <div className="review">
            <h3>مراجعة قبل التنفيذ</h3>
            <RecordView data={review} />
            <div className="actions">
              <button type="button" disabled={busy} onClick={() => run(true)}>
                {busy ? "جارٍ التنفيذ…" : "تأكيد التنفيذ"}
              </button>
              <button
                type="button"
                disabled={busy || uncertain}
                className="secondary"
                onClick={() => {
                  setReview(null);
                  setError(null);
                }}
              >
                العودة للتعديل
              </button>
            </div>
          </div>
        ) : (
          <button disabled={busy} type="submit">
            {busy ? (
              <>
                <LoaderCircle className="spin" size={16} /> جارٍ الإرسال…
              </>
            ) : uncertain ? (
              "إعادة نفس الطلب بأمان"
            ) : previewPath ? (
              "معاينة ومراجعة"
            ) : (
              submitLabel
            )}
          </button>
        )}
      </form>
    </section>
  );
}
export function QueryPanel({ path, children }) {
  const q = useReadQuery(path);
  if (q.isLoading || (q.isFetching && !q.currentData)) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  return children(q.currentData, q);
}
export function Download({
  path,
  label = "عرض نسخة الطباعة",
  format = "html",
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);
  const frame = useRef(null);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  async function load() {
    setBusy(true);
    setError(null);
    try {
      const data = await request(path, { format });
      setUrl(
        URL.createObjectURL(
          format === "html"
            ? new Blob([data], { type: "text/html;charset=utf-8" })
            : data,
        ),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="secondary" disabled={busy} onClick={load}>
        {busy ? "جارٍ التحميل…" : label}
      </button>
      <ErrorBox error={error} />
      {url &&
        (format === "html" ? (
          <Modal title="معاينة الطباعة" onClose={() => setUrl(null)}>
            <Notice>
              استخدم طباعة المتصفح أو الحفظ بصيغة PDF. تحقق من اتجاه العربية
              والهوامش قبل الطباعة.
            </Notice>
            <button
              className="secondary"
              onClick={() => frame.current?.contentWindow?.print()}
            >
              طباعة هذه النسخة
            </button>
            <iframe
              ref={frame}
              title="نسخة الطباعة"
              sandbox="allow-same-origin allow-modals"
              src={url}
            />
          </Modal>
        ) : (
          <a href={url} download="purchase-document">
            تنزيل الملف الخاص
          </a>
        ))}
    </>
  );
}
