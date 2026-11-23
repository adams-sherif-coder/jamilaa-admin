import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Plus, Printer } from "lucide-react";
import JsBarcode from "jsbarcode";
import { modules, queryString, useReadQuery } from "../lib/api";
import {
  dateTime,
  labels,
  money,
  orderTransitions,
  pageData,
  tenderOptions,
} from "../lib/domain";
import {
  Badge,
  DataTable,
  Download,
  ErrorBox,
  Field,
  Loading,
  Modal,
  MutationForm,
  Notice,
  Pager,
  QueryPanel,
  RecordView,
} from "../components/UI";

const reason = { name: "reason", required: true, maxLength: 500 };
const confirm = {
  name: "confirm",
  label: "راجعت البيانات وأؤكد تنفيذ الإجراء",
  type: "boolean",
  required: true,
};
const barcodeField = {
  name: "barcodes",
  label: "باركودات القطع — سطر لكل قطعة",
  type: "barcodes",
  required: true,
};
const paymentFields = tenderOptions.map(([name, label]) => ({
  name: `pay_${name}`,
  label: `${label} — المبلغ بالجنيه`,
  type: "money",
}));
function withPayments(body) {
  const result = { ...body };
  result.payments = [];
  for (const [method] of tenderOptions) {
    const key = `pay_${method}`;
    if (result[key] !== undefined && result[key] > 0)
      result.payments.push({ method, amount_minor: result[key] });
    delete result[key];
  }
  delete result.confirm;
  return result;
}

export function ResourceList({
  title,
  path,
  columns,
  onSelect,
  children,
  poll = false,
}) {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const q = useReadQuery(
    `${path}${path.includes("?") ? "&" : "?"}page=${page}`,
  );
  const { error, refetch } = q;
  useEffect(() => {
    if (!poll || error) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) refetch();
    }, 45000);
    return () => clearInterval(timer);
  }, [poll, error, refetch]);
  return (
    <>
      <div className="page-heading">
        <div>
          <p>عمليات المتجر</p>
          <h1>{title}</h1>
        </div>
        {children}
      </div>
      <div className="panel">
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox error={q.error} retry={q.refetch} />
        ) : (
          <>
            <DataTable
              rows={pageData(q.currentData).rows}
              columns={columns.map((c) =>
                typeof c === "string" ? { key: c } : c,
              )}
              onRow={onSelect}
            />
            <Pager
              data={q.currentData}
              onPage={(page) => setParams({ page })}
            />
          </>
        )}
      </div>
    </>
  );
}
function Countdown({ order }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  if (order.status !== "new") return null;
  const minutes = Math.ceil((new Date(order.expires_at) - now) / 60000);
  return (
    <Notice danger={minutes <= 0}>
      {minutes <= 0
        ? "انتهى الحجز؛ لا يمكن تمديده."
        : `الحجز ينتهي خلال ${minutes} دقيقة · ${dateTime(order.expires_at)}`}
    </Notice>
  );
}
function OrderDetail({ id }) {
  return (
    <QueryPanel path={`/api/v1/admin/orders/${id}`}>
      {(data) => (
        <>
          <Countdown order={data.order} />
          <RecordView data={data} />
          <Notice>
            وسيلة الدفع المطلوبة ليست تأكيداً للسداد. رسوم التوصيل التقديرية لا
            تدخل في إيراد البيع.
          </Notice>
          {data.order.status === "new" &&
            new Date(data.order.expires_at) > new Date() && (
              <details>
                <summary>تمديد الحجز</summary>
                <MutationForm
                  path={`/api/v1/admin/orders/${id}/extend`}
                  fields={[
                    {
                      name: "minutes",
                      label: "دقائق إضافية",
                      type: "number",
                      min: 1,
                      max: 10080,
                      required: true,
                    },
                    reason,
                  ]}
                />
              </details>
            )}
          {data.order.status === "preparing" && (
            <details open>
              <summary>تجهيز القطع بالمسح</summary>
              <MutationForm
                key={`pack-${data.lines.map((l) => l.unassigned_quantity).join("-")}`}
                path={`/api/v1/admin/orders/${id}/pack`}
                fields={[barcodeField]}
                notice="امسح القطع الفعلية المطابقة للون والمقاس. تُرسل المجموعة كوحدة واحدة؛ لا تُختار قطع تلقائياً."
                submitLabel="تأكيد القطع الممسوحة"
              />
            </details>
          )}
          {orderTransitions(data.order).map((status) => (
            <details key={status}>
              <summary>{labels[status]}</summary>
              <MutationForm
                path={`/api/v1/admin/orders/${id}/transition`}
                key={`${data.order.status}-${status}`}
                fields={[
                  ...(["delivered", "collected"].includes(status)
                    ? paymentFields
                    : []),
                  ...(status === "cancelled"
                    ? [
                        {
                          name: "physical_return_confirmed",
                          label: "أؤكد وجود القطع بالمحل / عودتها فعلياً",
                          type: "boolean",
                          required: true,
                        },
                      ]
                    : []),
                  confirm,
                ]}
                transform={(body) => ({
                  status,
                  ...(["delivered", "collected"].includes(status)
                    ? withPayments(body)
                    : status === "cancelled"
                      ? {
                          physical_return_confirmed:
                            body.physical_return_confirmed,
                        }
                      : {}),
                })}
                notice={
                  status === "cancelled"
                    ? "الإلغاء يحرر الحجز. الخادم يشترط تأكيد وجود القطع حتى للإلغاء المبكر."
                    : status === "awaiting_return"
                      ? "تبقى القطع غير متاحة للبيع حتى تأكيد عودة الشحنة."
                      : ["delivered", "collected"].includes(status)
                        ? `يجب تسجيل السداد الكامل: ${money(data.order.total_minor)}. تحصيل شركة الشحن لا يدخل الدرج.`
                        : undefined
                }
                submitLabel={`تأكيد: ${labels[status]}`}
              />
            </details>
          ))}
        </>
      )}
    </QueryPanel>
  );
}
export function Orders() {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <ResourceList
        title="طلبات الموقع"
        path="/api/v1/admin/orders"
        columns={[
          "id",
          "reference",
          { key: "status", render: (r) => <Badge value={r.status} /> },
          "fulfillment",
          "total_minor",
          "expires_at",
        ]}
        onSelect={setSelected}
        poll
      />
      <Notice>
        تحديث تلقائي كل 45 ثانية أثناء ظهور الصفحة. البحث وتصفية حالة الطلب غير
        مدعومين في قائمة الخادم.
      </Notice>
      {selected && (
        <Modal title={`طلب #${selected.id}`} onClose={() => setSelected(null)}>
          <OrderDetail id={selected.id} />
        </Modal>
      )}
    </>
  );
}
function SaleDetail({ id, email }) {
  return (
    <QueryPanel path={`/api/v1/sales/${id}`}>
      {(sale) => (
        <>
          <RecordView data={sale} />
          <Download
            path={`/api/v1/sales/${id}/receipt`}
            label="عرض وطباعة الفاتورة"
          />
          <details>
            <summary>إرجاع قطع</summary>
            <MutationForm
              path={`/api/v1/sales/${id}/returns`}
              previewPath={`/api/v1/sales/${id}/returns/preview`}
              previewBody={(b) => ({ item_ids: b.item_ids })}
              fields={[
                {
                  name: "item_ids",
                  label: "معرّفات بنود الفاتورة المراد إرجاعها",
                  type: "ids",
                  required: true,
                },
                reason,
                {
                  name: "disposition",
                  label: "حالة القطع المستلمة",
                  default: "saleable",
                  required: true,
                  options: [
                    ["saleable", "صالح للبيع"],
                    ["damaged", "تالف"],
                  ],
                },
                ...paymentFields,
                {
                  name: "physical_receipt_confirmed",
                  label: "استلمت القطع المرتجعة فعلياً",
                  type: "boolean",
                  required: true,
                },
              ]}
              transform={withPayments}
              notice="استخدم معرّف بند الفاتورة، لا معرّف القطعة. الخادم يحسب المبلغ المدفوع الفعلي والنقاط ويُراجع أهلية الإرجاع."
            />
          </details>
          {modules.pos && (
            <details>
              <summary>استبدال قطع</summary>
              <MutationForm
                path={`/api/v1/sales/${id}/exchange`}
                previewPath={`/api/v1/sales/${id}/exchange`}
                fields={[
                  {
                    name: "item_ids",
                    label: "معرّفات بنود الفاتورة المرتجعة",
                    type: "ids",
                    required: true,
                  },
                  barcodeField,
                  reason,
                  {
                    name: "disposition",
                    default: "saleable",
                    required: true,
                    options: [
                      ["saleable", "صالح للبيع"],
                      ["damaged", "تالف"],
                    ],
                  },
                  ...paymentFields,
                  {
                    name: "physical_receipt_confirmed",
                    label: "استلمت القطع فعلياً",
                    type: "boolean",
                    required: true,
                  },
                ]}
                transform={(body) => {
                  const b = withPayments(body);
                  b.items = b.barcodes.map((barcode) => ({ barcode }));
                  delete b.barcodes;
                  return b;
                }}
                notice="يلزم وردية نشطة. راجع فرق التحصيل أو الاسترداد من معاينة الخادم قبل التأكيد."
              />
            </details>
          )}
          <details>
            <summary>إلغاء فاتورة مكتملة</summary>
            <MutationForm
              path={`/api/v1/sales/${id}/void`}
              fields={[
                {
                  name: "approver_password",
                  label: "كلمة مرور حسابك لإعادة التحقق",
                  type: "password",
                  required: true,
                },
                reason,
                ...paymentFields,
                {
                  name: "confirm_void",
                  label: "أؤكد إلغاء الفاتورة بالكامل",
                  type: "boolean",
                  required: true,
                },
                {
                  name: "physical_receipt_confirmed",
                  label: "استلمت كل القطع فعلياً",
                  type: "boolean",
                  required: true,
                },
              ]}
              transform={(body) => ({
                ...withPayments(body),
                approver_email: email,
              })}
              notice="الإلغاء يُسجل مرتجعاً وتدقيقاً باستخدام حسابك الحالي. لا يُغيّر أسعار الفاتورة الأصلية."
              submitLabel="إلغاء الفاتورة"
            />
          </details>
        </>
      )}
    </QueryPanel>
  );
}
export function Sales({ user }) {
  const [selected, setSelected] = useState(null);
  const [lookup, setLookup] = useState("");
  const [kind, setKind] = useState("barcode");
  const [search, setSearch] = useState(null);
  return (
    <>
      <ResourceList
        title="المبيعات والفواتير"
        path="/api/v1/admin/reports/sales"
        columns={[
          "id",
          "number",
          "channel",
          "status",
          "total_minor",
          "completed_at",
        ]}
        onSelect={setSelected}
      />
      <section className="panel">
        <h2>البحث عن فاتورة</h2>
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch({ [kind]: lookup });
          }}
        >
          <select
            aria-label="البحث باستخدام"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="barcode">باركود قطعة</option>
            <option value="number">رقم الفاتورة الكامل</option>
          </select>
          <input
            aria-label="رقم الفاتورة أو الباركود"
            required
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            dir="ltr"
          />
          <button>بحث</button>
        </form>
        {search && (
          <QueryPanel path={`/api/v1/receipts/search?${queryString(search)}`}>
            {(data) => (
              <DataTable
                rows={pageData(data).rows}
                columns={["id", "number", "channel", "total_minor"].map(
                  (key) => ({ key }),
                )}
                onRow={setSelected}
              />
            )}
          </QueryPanel>
        )}
      </section>
      {selected && (
        <Modal
          title={`فاتورة #${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <SaleDetail id={selected.id} email={user.email} />
        </Modal>
      )}
    </>
  );
}
export function Inventory() {
  return (
    <>
      <ResourceList
        title="المخزون"
        path="/api/v1/admin/reports/stock"
        columns={[
          "variant_id",
          { key: "state", render: (r) => <Badge value={r.state} /> },
          "quantity",
          "valuation_minor",
        ]}
      />
      <Notice>
        الأرصدة هنا حسب الحالة الفعلية؛ كمية «متاح» لا تخصم حجوزات الموقع غير
        المجهزة. كمية الشراء المتاحة موجودة في كتالوج المنتجات.
      </Notice>
      <div className="panel">
        <MutationForm
          title="تسوية تلف أو فقد"
          path="/api/v1/admin/stock/adjust"
          previewPath="/api/v1/admin/stock/adjust"
          fields={[
            barcodeField,
            {
              name: "state",
              required: true,
              default: "damaged",
              options: [
                ["damaged", "تالف"],
                ["lost", "مفقود"],
              ],
            },
            reason,
          ]}
        />
      </div>
      {modules.pos && (
        <div className="panel">
          <MutationForm
            title="بحث بباركود حالي"
            path="/api/v1/pos/scan"
            idempotent={false}
            fields={[{ name: "barcode", required: true }]}
            submitLabel="بحث"
          />
        </div>
      )}
    </>
  );
}
export function Pricing() {
  const [auditId, setAuditId] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <p>السعر الصحيح لكل قطعة</p>
          <h1>الأسعار والعروض</h1>
        </div>
      </div>
      <div className="panel">
        <MutationForm
          title="إعادة تسعير متغيرات"
          path="/api/v1/admin/prices/reprice"
          previewPath="/api/v1/admin/prices/reprice"
          fields={[
            {
              name: "variant_ids",
              label: "معرّفات المتغيرات",
              type: "ids",
              required: true,
            },
            { name: "price_minor", type: "money", required: true },
            reason,
          ]}
          notice="التعديل يشمل القطع المتبقية لهذه المتغيرات. الفواتير السابقة والتكاليف الأصلية لا تتغير. لا يمكن تجاوز حد التكلفة."
        />
      </div>
      <div className="panel">
        <h2>عكس تعديل سعر سابق</h2>
        <Field label="معرّف إجراء التسعير في سجل التدقيق">
          {(id) => (
            <input
              id={id}
              type="number"
              min="1"
              value={auditId}
              onChange={(e) => setAuditId(e.target.value)}
            />
          )}
        </Field>
        {/^[1-9][0-9]*$/.test(auditId) && (
          <MutationForm
            key={auditId}
            path={`/api/v1/admin/prices/${auditId}/reverse`}
            previewPath={`/api/v1/admin/prices/${auditId}/reverse`}
            fields={[reason]}
          />
        )}
        <Notice>
          إنشاء عرض ترويجي متوقف: العقد لا يوفر معاينة لتأثير العرض قبل الحفظ،
          والأسعار الفعلية تُقيد بحد التكلفة. يلزم إضافة معاينة خلفية لتلبية شرط
          المراجعة قبل الالتزام.
        </Notice>
      </div>
    </>
  );
}

function Barcode({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current)
      JsBarcode(ref.current, value, {
        format: "CODE128C",
        displayValue: false,
        margin: 4,
        height: 38,
        width: 1,
      });
  }, [value]);
  return <svg ref={ref} role="img" aria-label={`باركود ${value}`} />;
}
export function Labels() {
  const [payload, setPayload] = useState(null);
  const sheet = useRef(null);
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    if (!payload) return;
    const frame = requestAnimationFrame(() =>
      setClipped(
        [...sheet.current.querySelectorAll(".thermal-label")].some(
          (node) =>
            node.scrollHeight > node.clientHeight + 1 ||
            [...node.children].some(
              (child) =>
                child.getBoundingClientRect().width > node.clientWidth - 4,
            ),
        ),
      ),
    );
    return () => cancelAnimationFrame(frame);
  }, [payload]);
  const [status, setStatus] = useState("saved");
  const [actionRevision, setActionRevision] = useState(0);
  const [printUsed, setPrintUsed] = useState(false);
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("jamila-printer") ?? "{}");
    } catch {
      return {};
    }
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <p>طباعة القطع</p>
          <h1>الملصقات والباركود</h1>
        </div>
        <Printer />
      </div>
      <div className="panel">
        <Notice>
          قِس عرض وارتفاع الملصق الفعلي. نطاق 20–60 مم هو عرض الورق المدعوم،
          وليس مقاس ملصق مفترض. اختبار الطابعة والماسح الفعلي ما زال مطلوباً.
        </Notice>
        <MutationForm
          path="/api/v1/admin/labels"
          previewPath="/api/v1/admin/labels/preview"
          previewBody={(b) => ({ ...b, save: false })}
          transform={(b) => {
            if (b.piece_ids.length * b.copies > 100)
              throw new Error(
                "استخدم دفعات صغيرة: بحد أقصى 100 ملصق في الدفعة",
              );
            return { ...b, save: true };
          }}
          fields={[
            {
              name: "piece_ids",
              label: "معرّفات القطع المحددة (ليست الباركودات)",
              type: "ids",
              required: true,
            },
            {
              name: "copies",
              label: "نسخ لكل قطعة",
              type: "number",
              default: 1,
              required: true,
              min: 1,
              max: 20,
            },
            {
              name: "width_mm",
              label: "عرض الملصق الفعلي (مم)",
              type: "number",
              required: true,
              min: 20,
              max: 60,
              step: "0.1",
              default: profile.width_mm ?? "",
            },
            {
              name: "height_mm",
              label: "ارتفاع الملصق الفعلي (مم)",
              type: "number",
              required: true,
              min: 15,
              max: 150,
              step: "0.1",
              default: profile.height_mm ?? "",
            },
          ]}
          onSuccess={(data) => {
            setPayload(data);
            const p = { width_mm: data.width_mm, height_mm: data.height_mm };
            setProfile(p);
            localStorage.setItem("jamila-printer", JSON.stringify(p));
          }}
        />
      </div>
      {payload && (
        <section className="panel">
          <style>{`@media print { @page { size: ${Number(payload.width_mm)}mm ${Number(payload.height_mm)}mm; margin: 0; } }`}</style>
          <h2>
            دفعة #{payload.batch_id} · <Badge value={status} />
          </h2>
          <Notice>
            هذه معاينة بمقاس فعلي. تحقق من وضوح الكود بالكامل والهوامش. الطباعة
            من المتصفح لا تثبت خروج الورق، ولا يمكن سحب عمل أُرسل إلى طابور
            Windows.
          </Notice>
          <div
            ref={sheet}
            className="label-sheet"
            style={{
              "--label-width": `${payload.width_mm}mm`,
              "--label-height": `${payload.height_mm}mm`,
            }}
          >
            {payload.labels.flatMap((label) =>
              Array.from({ length: payload.copies }, (_, i) => (
                <div
                  className="thermal-label"
                  dir="ltr"
                  key={`${label.piece_id}-${i}`}
                >
                  <b>{label.store}</b>
                  <strong>{label.name}</strong>
                  <span>
                    {[label.color, label.size].filter(Boolean).join(" / ")}
                  </span>
                  <Barcode value={label.barcode} />
                  <span className="barcode-number">{label.barcode}</span>
                  <span>
                    {label.previous_minor > label.price_minor && (
                      <del>{money(label.previous_minor)}</del>
                    )}{" "}
                    {money(label.price_minor)}
                  </span>
                </div>
              )),
            )}
          </div>
          {clipped && (
            <Notice danger>
              المحتوى لا يتسع في المقاس المحدد. لا تطبع هذه الدفعة؛ ألغها وأنشئ
              دفعة بمقاس مناسب بعد قياس الملصق الفعلي.
            </Notice>
          )}
          {status !== "cancelled" && (
            <>
              <MutationForm
                key={`${status}-${clipped}-${actionRevision}`}
                path={`/api/v1/admin/labels/${payload.batch_id}/action`}
                fields={[
                  {
                    name: "action",
                    label: "الإجراء",
                    required: true,
                    default: clipped
                      ? "cancelled"
                      : status === "saved"
                        ? "submitted"
                        : "reprinted",
                    options: clipped
                      ? [["cancelled", "إلغاء الدفعة غير المناسبة"]]
                      : status === "saved"
                        ? [
                            ["submitted", "تسجيل الإرسال للطباعة"],
                            ["cancelled", "إلغاء الدفعة غير المرسلة"],
                          ]
                        : [["reprinted", "تسجيل إعادة الطباعة"]],
                  },
                  reason,
                ]}
                onSuccess={(data) => {
                  setStatus(data.status);
                  setPrintUsed(false);
                  setActionRevision((n) => n + 1);
                }}
              />
              {status !== "saved" && (
                <button
                  disabled={clipped || printUsed}
                  onClick={() => {
                    window.print();
                    setPrintUsed(true);
                  }}
                >
                  <Printer size={18} /> فتح طباعة المتصفح
                </button>
              )}
            </>
          )}
        </section>
      )}
      <div className="panel">
        <h2>خطوات المعايرة</h2>
        <ol>
          <li>
            أدخل المقاس الفعلي واضبط الطباعة على 100% بلا رؤوس أو تذييلات.
          </li>
          <li>ابدأ بقطعة واحدة ونسخة واحدة. تحقق من الهوامش ووضوح الأرقام.</li>
          <li>امسح الملصق بقارئ ALFA 500 وقارن الكود حرفياً.</li>
          <li>عند إيقاف الطباعة، ألغِ الأعمال المتبقية من طابور Windows.</li>
        </ol>
      </div>
    </>
  );
}

export function Staff() {
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const roles = [
    ["employee", "موظف"],
    ["manager", "مدير"],
    ["owner", "مالك"],
  ];
  return (
    <>
      <ResourceList
        title="المستخدمون والصلاحيات"
        path="/api/v1/admin/staff"
        columns={["id", "name", "email", "role", "branch_id"]}
        onSelect={setSelected}
      >
        <button onClick={() => setCreate(true)}>
          <Plus size={18} /> مستخدم جديد
        </button>
      </ResourceList>
      {create && (
        <Modal title="مستخدم جديد" onClose={() => setCreate(false)}>
          <MutationForm
            path="/api/v1/admin/staff"
            fields={[
              { name: "name", required: true },
              { name: "email", type: "email", required: true },
              {
                name: "password",
                label: "كلمة المرور",
                type: "password",
                required: true,
                hint: "12 حرفاً على الأقل مع حروف كبيرة وصغيرة وأرقام ورموز",
              },
              {
                name: "role",
                default: "employee",
                options: roles,
                required: true,
              },
            ]}
          />
        </Modal>
      )}
      {selected && (
        <Modal title="تعديل المستخدم" onClose={() => setSelected(null)}>
          <Notice>
            تعديل الدور أو كلمة المرور أو النشاط يلغي جلسات المستخدم. حالة
            النشاط الحالية لا تظهر في الاستجابة.
          </Notice>
          <MutationForm
            path={`/api/v1/admin/staff/${selected.id}`}
            method="PATCH"
            initial={selected}
            fields={[
              { name: "name", required: true },
              { name: "role", required: true, options: roles },
              {
                name: "password",
                label: "كلمة مرور جديدة (اختياري)",
                type: "password",
              },
              reason,
            ]}
          />
          <MutationForm
            title="حالة الحساب"
            path={`/api/v1/admin/staff/${selected.id}`}
            method="PATCH"
            fields={[
              {
                name: "active",
                label: "تنشيط الحساب (إلغاء الاختيار يعطّله)",
                type: "boolean",
              },
              reason,
              confirm,
            ]}
            transform={({ active, reason }) => ({ active, reason })}
          />
        </Modal>
      )}
    </>
  );
}
export function Audit() {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const q = useReadQuery(
    `/api/v1/admin/audit?${queryString(Object.fromEntries(params))}`,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p>سجل لا يُعدل</p>
          <h1>سجل التدقيق</h1>
        </div>
      </div>
      <div className="panel">
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setParams(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <input
            name="subject_type"
            aria-label="نوع السجل"
            placeholder="نوع السجل مثل product"
            defaultValue={params.get("subject_type") ?? ""}
          />
          <input
            name="subject_id"
            type="number"
            aria-label="معرّف السجل"
            placeholder="معرّف السجل"
            defaultValue={params.get("subject_id") ?? ""}
          />
          <button>بحث</button>
        </form>
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox error={q.error} retry={q.refetch} />
        ) : (
          <>
            <DataTable
              rows={pageData(q.currentData).rows}
              columns={[
                "id",
                "action",
                "subject_type",
                "subject_id",
                "actor_id",
                "created_at",
              ].map((key) => ({ key }))}
              onRow={setSelected}
            />
            <Pager
              data={q.currentData}
              onPage={(page) =>
                setParams({ ...Object.fromEntries(params), page })
              }
            />
          </>
        )}
      </div>
      {selected && (
        <Modal title="تفاصيل التدقيق" onClose={() => setSelected(null)}>
          <RecordView data={selected} />
        </Modal>
      )}
    </>
  );
}
export function Customers() {
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [create, setCreate] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <p>علاقات العملاء</p>
          <h1>العملاء</h1>
        </div>
        <button onClick={() => setCreate(true)}>عميل جديد</button>
      </div>
      <section className="panel">
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(phone);
          }}
        >
          <Field label="رقم الهاتف الكامل بصيغة +20">
            {(id) => (
              <input
                id={id}
                type="tel"
                dir="ltr"
                required
                pattern="\+201[0125][0-9]{8}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+201012345678"
              />
            )}
          </Field>
          <button>بحث عن العميل</button>
        </form>
        {search && (
          <QueryPanel
            path={`/api/v1/customers/search?${queryString({ phone: search })}`}
          >
            {(data) => (
              <DataTable
                rows={data}
                columns={(modules.pos
                  ? ["id", "name", "phone", "points"]
                  : ["id", "name", "phone"]
                ).map((key) => ({ key }))}
              />
            )}
          </QueryPanel>
        )}
        <Notice>
          البحث مطابق لرقم الهاتف الكامل. سجل النقاط التفصيلي ودمج العملاء
          وتعديلهم غير متاح في الواجهة الخلفية الحالية.
        </Notice>
      </section>
      {create && (
        <Modal title="إضافة عميل" onClose={() => setCreate(false)}>
          <MutationForm
            path="/api/v1/customers"
            fields={[
              { name: "name", required: true },
              {
                name: "phone",
                label: "الهاتف بصيغة +201…",
                type: "tel",
                required: true,
              },
            ]}
          />
        </Modal>
      )}
    </>
  );
}
export function Expenses() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p>التشغيل اليومي</p>
          <h1>المصروفات والحركات النقدية</h1>
        </div>
      </div>
      <div className="panel">
        <MutationForm
          title="تسجيل مصروف تشغيلي"
          path="/api/v1/expenses"
          fields={[
            { name: "description", label: "وصف المصروف", required: true },
            { name: "amount_minor", type: "money", required: true },
            {
              name: "method",
              required: true,
              default: "cash",
              options: tenderOptions,
            },
            ...(modules.pos
              ? [
                  {
                    name: "drawer_paid",
                    label: "دُفع نقداً من درج الوردية الحالية",
                    type: "boolean",
                  },
                ]
              : []),
            confirm,
          ]}
          transform={({ confirm, ...body }) => {
            void confirm;
            return { ...body, drawer_paid: body.drawer_paid ?? false };
          }}
          notice="مصروف الدرج يحتاج وردية نشطة ووسيلة نقدية. المصروف الخارجي متاح دون وردية."
        />
      </div>
      {modules.pos && (
        <div className="panel">
          <MutationForm
            title="حركة نقدية للوردية الحالية"
            path="/api/v1/pos/cash-movements"
            fields={[
              {
                name: "amount_minor",
                label: "المبلغ بالجنيه (سالب للصرف، موجب للإيداع)",
                type: "money",
                required: true,
              },
              reason,
              confirm,
            ]}
            transform={({ amount_minor, reason }) => ({ amount_minor, reason })}
          />
        </div>
      )}
    </>
  );
}
export function Shifts() {
  const [value, setValue] = useState("");
  const [id, setId] = useState(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <p>الإشراف على المحل</p>
          <h1>الورديات</h1>
        </div>
      </div>
      <div className="panel">
        <Notice>
          لا توجد قائمة ورديات في العقد الحالي. افتح وردية بمعرّفها المعروف. لا
          يمكن الإغلاق مع فواتير معلقة أو مخصصات أجهزة لم تتم تسويتها.
        </Notice>
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setId(value);
          }}
        >
          <input
            aria-label="معرّف الوردية"
            type="number"
            min="1"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button>فتح الوردية</button>
        </form>
        {id && (
          <QueryPanel path={`/api/v1/pos/shifts/${id}`}>
            {(data) => (
              <>
                <RecordView data={data} />
                {!data.shift.closed_at && (
                  <MutationForm
                    key={id}
                    title="إغلاق الوردية"
                    path={`/api/v1/pos/shifts/${id}/close`}
                    fields={[
                      {
                        name: "counted_cash_minor",
                        label: "النقد المعدود (جنيه)",
                        type: "money",
                        required: true,
                      },
                      reason,
                      confirm,
                    ]}
                    transform={({ counted_cash_minor, reason }) => ({
                      counted_cash_minor,
                      reason,
                    })}
                  />
                )}
              </>
            )}
          </QueryPanel>
        )}
      </div>
    </>
  );
}
export function Settings(){return <><div className="page-heading"><h1>إعدادات العرض التجريبي</h1></div><section className="panel"><Notice>تُحفظ التغييرات على هذا المتصفح فقط. لا يوجد اتصال بخادم أو قاعدة بيانات.</Notice><MutationForm path="/settings" method="PATCH" fields={[{name:'name_ar',label:'اسم المتجر بالعربية',required:true},{name:'name_en',label:'اسم المتجر بالإنجليزية',required:true}]} initial={{name_ar:'جميلة كلوزيت',name_en:'Jamila Closet'}}/><h2>الصور والبيانات</h2><p>الصور مرفقة محلياً. بيانات المنتجات موجودة في ملف catalog.json داخل المشروع.</p></section></>;}
