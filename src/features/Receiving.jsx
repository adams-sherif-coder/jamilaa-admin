import ReceivingMatrix from "./ReceivingMatrix";
import { useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useReadQuery, queryString } from "../lib/api";
import { minor, money, pageData, tenderOptions, today } from "../lib/domain";
import {
  DataTable,
  ErrorBox,
  Field,
  Loading,
  Modal,
  MutationForm,
  Notice,
  Pager,
  QueryPanel,
  RecordView,
  RemoteSelect,
} from "../components/UI";
import { MasterForm, ProductCreate, ReceivingAttachments } from "./Catalog";

export function ReceivingDraft() {
  const [header, setHeader] = useState({
    purchase_date: today(),
    reference: "",
    notes: "",
    supplier_id: "",
    selector: "",
  });
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const q = useReadQuery(
    `/api/v1/admin/products?${queryString({ search: term, page })}`,
  );
  const [lines, setLines] = useState([]);
  const [review, setReview] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);
  const [inline, setInline] = useState(null);
  function add(product) {
    setLines((old) => [
      ...old,
      ...product.variants
        .filter((v) => !old.some((l) => l.variant_id === v.id))
        .map((v) => ({
          variant_id: v.id,
          product_id: product.id,
          color_key: v.color?.id ?? 0,
          size_key: v.size?.id ?? 0,
          product: product.name_ar,
          color: v.color?.name_ar ?? "بدون لون",
          size: v.size?.name_ar ?? "بدون مقاس",
          quantity: "0",
          cost: "",
          price: (v.price.regular_minor / 100).toFixed(2),
          current: v.price.regular_minor,
          available: v.availability.quantity,
        })),
    ]);
  }
  const update = (id, key, value) =>
    setLines(
      lines.map((l) => (l.variant_id === id ? { ...l, [key]: value } : l)),
    );
  function prepare(e) {
    e.preventDefault();
    setError(null);
    try {
      const active = lines.filter((l) => Number(l.quantity) > 0);
      if (!active.length) throw new Error("أضف قطعة واحدة على الأقل");
      if (active.length > 100) throw new Error("الحد الأقصى 100 بند");
      setReview({
        purchase_date: header.purchase_date,
        reference: header.reference,
        notes: header.notes,
        supplier_id: header.supplier_id ? Number(header.supplier_id) : null,
        lines: active.map((l) => ({
          variant_id: l.variant_id,
          quantity: Number(l.quantity),
          cost_minor: minor(l.cost),
          price_minor: minor(l.price),
          merchandise_selector_id: header.selector
            ? Number(header.selector)
            : null,
        })),
      });
    } catch (e) {
      setError(e);
    }
  }
  if (saved)
    return (
      <>
        <div className="success">تم حفظ إذن الاستلام #{saved.id}</div>
        <RecordView data={saved} />
        <ReceivingAttachments id={saved.id} />
        <Notice>
          لا تُرجع الواجهة معرّفات القطع الجديدة. يلزم الحصول على معرّفاتها من
          مسؤول النظام لإعداد الملصقات.
        </Notice>
        <Link className="button secondary" to="/labels">
          فتح إعداد الملصقات
        </Link>
      </>
    );
  if (review)
    return (
      <>
        <Notice>
          هذه المعاينة تحسب الكمية والتكلفة فقط؛ فحص المخزون وحد السعر يتم عند
          التأكيد. السعر الأعلى يرفع سعر المتغير لكل القطع المتبقية. التكاليف
          الأصلية للقطع القديمة محفوظة.
        </Notice>
        <MutationForm
          path="/api/v1/admin/receivings"
          previewPath="/api/v1/admin/receivings/preview"
          previewBody={(b) => b}
          fields={[
            {
              name: "ack",
              label: "أوافق على تأثير أسعار الاستلام على القطع المتبقية",
              type: "boolean",
              required: true,
            },
          ]}
          transform={() => review}
          onSuccess={setSaved}
        />
        <button className="secondary" onClick={() => setReview(null)}>
          العودة للمسودة
        </button>
      </>
    );
  return (
    <>
      <div className="steps">
        <b>١ بيانات الاستلام</b>
        <span>٢ مراجعة وتأكيد</span>
        <span>٣ محفوظ ومرفقات</span>
      </div>
      <form onSubmit={prepare}>
        <div className="form-grid">
          <RemoteSelect
            label="المورد (اختياري)"
            path="/api/v1/admin/master/suppliers"
            value={header.supplier_id}
            onChange={(v) => setHeader({ ...header, supplier_id: v })}
          />
          <RemoteSelect
            label="مختار البضاعة (اختياري)"
            path="/api/v1/admin/master/selectors"
            value={header.selector}
            onChange={(v) => setHeader({ ...header, selector: v })}
          />
          <Field label="تاريخ الشراء">
            {(id) => (
              <input
                id={id}
                type="date"
                required
                max={today()}
                value={header.purchase_date}
                onChange={(e) =>
                  setHeader({ ...header, purchase_date: e.target.value })
                }
              />
            )}
          </Field>
          <Field label="مرجع فاتورة المورد">
            {(id) => (
              <input
                id={id}
                value={header.reference}
                onChange={(e) =>
                  setHeader({ ...header, reference: e.target.value })
                }
              />
            )}
          </Field>
          <Field label="ملاحظات">
            {(id) => (
              <textarea
                id={id}
                value={header.notes}
                onChange={(e) =>
                  setHeader({ ...header, notes: e.target.value })
                }
              />
            )}
          </Field>
        </div>
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => setInline("suppliers")}
          >
            مورد جديد
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setInline("selectors")}
          >
            مختار بضاعة جديد
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setInline("product")}
          >
            منتج جديد
          </button>
        </div>
        <h3>إضافة منتجات إلى مصفوفة الاستلام</h3>
        <div className="filters">
          <input
            aria-label="اسم المنتج للاستلام"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اسم المنتج…"
          />
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setTerm(search);
              setPage(1);
            }}
          >
            بحث
          </button>
        </div>
        <ErrorBox error={q.error} />
        {q.isLoading ? (
          <Loading />
        ) : (
          <>
            <div className="product-picker">
              {pageData(q.currentData).rows.map((p) => (
                <button
                  type="button"
                  className="secondary"
                  key={p.id}
                  onClick={() => add(p)}
                >
                  <Plus size={15} />
                  {p.name_ar}
                </button>
              ))}
            </div>
            <Pager data={q.currentData} onPage={setPage} />
          </>
        )}
        <ReceivingMatrix
          lines={lines}
          update={update}
          remove={(id) =>
            setLines(lines.filter((line) => line.variant_id !== id))
          }
        />
        <Notice>
          الكمية صفر تستبعد المتغير من الطلب. أرفق فواتير المورد بعد حفظ
          الاستلام؛ رفعها قبل الحفظ غير مدعوم. إنشاء منتج أو سجل أساسي إجراء
          منفصل لا يلغيه إلغاء مسودة الاستلام.
        </Notice>
        <ErrorBox error={error} />
        <button>متابعة إلى المراجعة</button>
      </form>
      {inline && (
        <Modal title="إضافة سجل" onClose={() => setInline(null)}>
          {inline === "product" ? (
            <ProductCreate
              onSuccess={(p) => {
                add(p);
                setInline(null);
              }}
            />
          ) : (
            <MasterForm type={inline} />
          )}
        </Modal>
      )}
    </>
  );
}
export function ReceivingDetail({ id }) {
  return (
    <QueryPanel path={`/api/v1/admin/receivings/${id}`}>
      {(data) => (
        <>
          <RecordView data={data} />
          <details>
            <summary>مرفقات فاتورة المورد</summary>
            <ReceivingAttachments id={id} />
          </details>
          <details>
            <summary>دفعة أو استرداد للمورد</summary>
            <MutationForm
              path={`/api/v1/admin/receivings/${id}/payments`}
              fields={[
                { name: "amount_minor", type: "money", required: true },
                {
                  name: "method",
                  required: true,
                  default: "cash",
                  options: tenderOptions,
                },
                {
                  name: "direction",
                  label: "الاتجاه",
                  default: "payment",
                  required: true,
                  options: [
                    ["payment", "دفع للمورد"],
                    ["refund", "استرداد من المورد"],
                  ],
                },
                {
                  name: "confirm",
                  label: "أؤكد تسجيل هذه الدفعة",
                  type: "boolean",
                  required: true,
                },
              ]}
              transform={({ confirm, ...body }) => {
                void confirm;
                return body;
              }}
              notice="دفعة المورد ليست مصروفاً تشغيلياً. الخادم يتحقق من الرصيد المسموح."
            />
          </details>
          <details>
            <summary>مرتجع للمورد</summary>
            <MutationForm
              path={`/api/v1/admin/receivings/${id}/returns`}
              previewPath={`/api/v1/admin/receivings/${id}/returns`}
              fields={[
                {
                  name: "barcodes",
                  label: "باركودات القطع — سطر لكل قطعة",
                  type: "barcodes",
                  required: true,
                },
                { name: "reason", required: true },
              ]}
            />
          </details>
          <details>
            <summary>عكس إذن الاستلام</summary>
            <MutationForm
              path={`/api/v1/admin/receivings/${id}/reverse`}
              fields={[
                { name: "reason", required: true },
                {
                  name: "confirm",
                  label: "تأكيد عكس الاستلام",
                  type: "boolean",
                  required: true,
                },
              ]}
              transform={({ reason }) => ({ reason })}
              notice="لا يمكن عكس استلام له دفعات أو قطع بيعت أو حُجزت. الخادم يتحقق من التبعيات ويسجل الإجراء."
            />
          </details>
        </>
      )}
    </QueryPanel>
  );
}
export function Receiving() {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(false);
  const [selected, setSelected] = useState(null);
  const q = useReadQuery(`/api/v1/admin/receivings?page=${page}`);
  return (
    <>
      <div className="page-heading">
        <div>
          <p>إدارة المخزون</p>
          <h1>استلام البضاعة</h1>
          <span className="muted">من فاتورة المورد إلى مخزون جاهز للبيع.</span>
        </div>
        <button onClick={() => setDraft(true)}>
          <Plus size={18} /> استلام جديد
        </button>
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
              columns={[
                { key: "id" },
                { key: "reference" },
                { key: "purchase_date" },
                { key: "supplier_id" },
                { key: "total_minor", render: (r) => money(r.total_minor) },
                { key: "status" },
              ]}
              onRow={setSelected}
            />
            <Pager data={q.currentData} onPage={setPage} />
          </>
        )}
      </div>
      {draft && (
        <Modal title="استلام بضاعة جديدة" onClose={() => setDraft(false)}>
          <ReceivingDraft />
        </Modal>
      )}
      {selected && (
        <Modal
          title={`إذن استلام #${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <ReceivingDetail id={selected.id} />
        </Modal>
      )}
    </>
  );
}
