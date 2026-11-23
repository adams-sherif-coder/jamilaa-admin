import SizeChart from "./SizeChart";
import RestoreRecord from "../components/RestoreRecord";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Plus, Package, Upload } from "lucide-react";
import {
  api,
  modules,
  origin,
  queryString,
  request,
  useReadQuery,
} from "../lib/api";
import { useDispatch } from "react-redux";
import { money, minor, pageData } from "../lib/domain";
import {
  Badge,
  DataTable,
  Download,
  ErrorBox,
  Field,
  FormInput,
  Loading,
  Modal,
  MutationForm,
  Notice,
  Pager,
  RecordView,
  RemoteSelect,
} from "../components/UI";

const bilingual = [
  { name: "name_ar", required: true },
  { name: "name_en", required: true },
];
const reason = { name: "reason", required: true, maxLength: 500 };
const masterNames = {
  categories: "التصنيفات",
  colors: "الألوان",
  sizes: "المقاسات",
  suppliers: "الموردون",
  selectors: "مختارو البضاعة",
};
export function MasterForm({ type, onSuccess }) {
  const fields = ["categories", "colors", "sizes"].includes(type)
    ? [...bilingual]
    : [
        { name: "name", required: true },
        { name: "phone", type: "tel" },
        { name: "notes", type: "textarea" },
      ];
  if (type === "categories")
    fields.push(
      {
        name: "parent_id",
        label: "التصنيف الأب",
        type: "lookup",
        path: "/api/v1/admin/master/categories",
      },
      { name: "return_days", type: "number", min: 0, max: 365 },
    );
  if (type === "colors")
    fields.push({
      name: "swatch",
      label: "اللون",
      type: "color",
      default: "#b65c7b",
      required: true,
    });
  if (type === "sizes")
    fields.push(
      {
        name: "group",
        label: "مجموعة المقاس",
        required: true,
        default: "alphabetic",
        options: [
          ["alphabetic", "حروف"],
          ["numeric", "أرقام"],
          ["custom", "مخصص"],
          ["free", "مقاس حر"],
        ],
      },
      { name: "position", label: "الترتيب", type: "number", min: 0, max: 999 },
    );
  return (
    <MutationForm
      path={`/api/v1/admin/master/${type}`}
      fields={fields}
      onSuccess={onSuccess}
    />
  );
}
export function MasterPage({ type }) {
  const [params, setParams] = useSearchParams();
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const q = useReadQuery(
    `/api/v1/admin/master/${type}?${queryString({ page: params.get("page") ?? 1, search: params.get("search") ?? "" })}`,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p>دليل المتجر</p>
          <h1>{masterNames[type]}</h1>
        </div>
        <button onClick={() => setCreate(true)}>
          <Plus size={18} /> إضافة جديد
        </button>
      </div>
      <div className="panel">
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ search: new FormData(e.currentTarget).get("search") });
          }}
        >
          <input
            name="search"
            aria-label="بحث بالاسم"
            placeholder={
              ["categories", "colors", "sizes"].includes(type)
                ? "بحث بالاسم الإنجليزي"
                : "بحث بالاسم"
            }
            defaultValue={params.get("search") ?? ""}
          />
          <button className="secondary">بحث</button>
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
                { key: "id" },
                ...(["categories", "colors", "sizes"].includes(type)
                  ? [{ key: "name_ar" }, { key: "name_en" }]
                  : [{ key: "name" }, { key: "phone" }]),
              ]}
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
      <RestoreRecord
        path={type ? `/api/v1/admin/master/${type}` : "/api/v1/admin/products"}
      />
      {create && (
        <Modal
          title={`إضافة إلى ${masterNames[type]}`}
          onClose={() => setCreate(false)}
        >
          <MasterForm type={type} />
        </Modal>
      )}
      {selected && (
        <Modal title="تفاصيل السجل" onClose={() => setSelected(null)}>
          <RecordView data={selected} />
          <MutationForm
            title="أرشفة السجل"
            path={`/api/v1/admin/master/${type}/${selected.id}/archive`}
            fields={[
              reason,
              {
                name: "confirmed",
                label: "تأكيد الأرشفة",
                type: "boolean",
                required: true,
              },
            ]}
            transform={({ reason }) => ({ restore: false, reason })}
          />
        </Modal>
      )}
    </>
  );
}
export function ProductCreate({ onSuccess }) {
  const [values, setValues] = useState({
    name_ar: "",
    name_en: "",
    category_id: "",
    description_ar: "",
    description_en: "",
  });
  const [variants, setVariants] = useState([
    { color_id: "", size_id: "", price: "" },
  ]);
  const [error, setError] = useState(null);
  const [body, setBody] = useState(null);
  const [inline, setInline] = useState(null);
  const update = (i, key, value) =>
    setVariants(variants.map((v, n) => (n === i ? { ...v, [key]: value } : v)));
  function review(e) {
    e.preventDefault();
    try {
      const combinations = variants.map(
        (v) => `${v.color_id || 0}:${v.size_id || 0}`,
      );
      if (new Set(combinations).size !== variants.length)
        throw new Error("تكرار في تركيبة اللون والمقاس");
      setBody({
        ...values,
        category_id: Number(values.category_id),
        variants: variants.map((v) => ({
          color_id: v.color_id ? Number(v.color_id) : null,
          size_id: v.size_id ? Number(v.size_id) : null,
          price_minor: minor(v.price),
        })),
      });
    } catch (e) {
      setError(e);
    }
  }
  return body ? (
    <>
      <Notice>
        سيُنشأ المنتج كمسودة. النشر يحتاج صورة صالحة. إلغاء هذه المراجعة لا ينشئ
        المنتج.
      </Notice>
      <RecordView data={body} />
      <MutationForm
        path="/api/v1/admin/products"
        transform={() => body}
        onSuccess={onSuccess}
        submitLabel="تأكيد إنشاء المنتج"
      />
      <button className="secondary" onClick={() => setBody(null)}>
        العودة للتعديل
      </button>
    </>
  ) : (
    <form onSubmit={review}>
      <div className="form-grid">
        {[
          ...bilingual,
          { name: "description_ar", label: "الوصف بالعربية", type: "textarea" },
          {
            name: "description_en",
            label: "الوصف بالإنجليزية",
            type: "textarea",
          },
        ].map((f) => (
          <FormInput
            key={f.name}
            field={f}
            value={values[f.name]}
            onChange={(v) => setValues({ ...values, [f.name]: v })}
          />
        ))}
        <RemoteSelect
          label="التصنيف"
          path="/api/v1/admin/master/categories"
          value={values.category_id}
          required
          onChange={(v) => setValues({ ...values, category_id: v })}
        />
      </div>
      <div className="actions">
        {["categories", "colors", "sizes"].map((t) => (
          <button
            key={t}
            className="secondary"
            type="button"
            onClick={() => setInline(t)}
          >
            إضافة {masterNames[t]}
          </button>
        ))}
      </div>
      <h3>متغيرات المنتج</h3>
      <p className="muted">
        بدون لون أو مقاس متاح للإكسسوارات والعطور. المقاس الحر اختيار مستقل.
      </p>
      {variants.map((v, i) => (
        <div className="variant-row" key={i}>
          <RemoteSelect
            label="اللون"
            path="/api/v1/admin/master/colors"
            value={v.color_id}
            onChange={(x) => update(i, "color_id", x)}
          />
          <RemoteSelect
            label="المقاس"
            path="/api/v1/admin/master/sizes"
            value={v.size_id}
            onChange={(x) => update(i, "size_id", x)}
          />
          <Field label="سعر البيع بالجنيه">
            {(id) => (
              <input
                id={id}
                required
                inputMode="decimal"
                value={v.price}
                onChange={(e) => update(i, "price", e.target.value)}
              />
            )}
          </Field>
          <button
            type="button"
            className="secondary"
            disabled={variants.length === 1}
            onClick={() => setVariants(variants.filter((_, n) => n !== i))}
          >
            حذف
          </button>
        </div>
      ))}
      <button
        className="secondary"
        type="button"
        disabled={variants.length >= 200}
        onClick={() =>
          setVariants([...variants, { color_id: "", size_id: "", price: "" }])
        }
      >
        إضافة متغير
      </button>
      <ErrorBox error={error} />
      <div className="actions">
        <button>مراجعة المنتج</button>
      </div>
      {inline && (
        <Modal
          title={`إضافة ${masterNames[inline]}`}
          onClose={() => setInline(null)}
        >
          <MasterForm type={inline} />
        </Modal>
      )}
    </form>
  );
}
export function UploadForm({ path, attachment = false, onUploaded }) {
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({
    alt_ar: "",
    alt_en: "",
    color_id: "",
    position: "0",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const dispatch = useDispatch();
  async function upload(e) {
    e.preventDefault();
    setError(null);
    if (!file) return;
    if (file.size > (attachment ? 10 : 5) * 1024 * 1024) {
      setError({ message: "حجم الملف أكبر من الحد المسموح" });
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append(attachment ? "file" : "image", file);
      if (!attachment)
        Object.entries(meta).forEach(([k, v]) => {
          if (v !== "") body.append(k, v);
        });
      const data = await request(path, { method: "POST", body });
      setResult(data);
      dispatch(api.util.invalidateTags(["Business"]));
      onUploaded?.(data);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={upload}>
      <h3>{attachment ? "مستند مورد خاص" : "رفع صورة المنتج"}</h3>
      <Field
        label={
          attachment
            ? "صورة أو PDF · حتى 10 ميجابايت"
            : "JPG / PNG / WebP · حتى 5 ميجابايت"
        }
      >
        {(id) => (
          <input
            id={id}
            required
            type="file"
            accept={
              attachment
                ? ".jpg,.jpeg,.png,.webp,.pdf"
                : ".jpg,.jpeg,.png,.webp"
            }
            onChange={(e) => {
              setFile(e.target.files[0]);
              setResult(null);
            }}
          />
        )}
      </Field>
      {!attachment && (
        <div className="form-grid">
          {[
            { name: "alt_ar", label: "وصف الصورة بالعربية", required: true },
            { name: "alt_en", label: "وصف الصورة بالإنجليزية", required: true },
            {
              name: "color_id",
              label: "معرّف اللون (اختياري)",
              type: "number",
            },
            {
              name: "position",
              label: "ترتيب الصورة — صفر للصورة الرئيسية",
              type: "number",
              min: 0,
              max: 500,
            },
          ].map((f) => (
            <FormInput
              key={f.name}
              field={f}
              value={meta[f.name]}
              onChange={(v) => setMeta({ ...meta, [f.name]: v })}
            />
          ))}
        </div>
      )}
      <ErrorBox error={error} />
      <button disabled={busy || !!result}>
        <Upload size={16} />
        {busy ? "جارٍ رفع الملف…" : result ? "تم الرفع" : "رفع الملف"}
      </button>
      {busy && <progress aria-label="جارٍ رفع الملف" />}
      {result && <RecordView data={result} />}
    </form>
  );
}
export function ProductDetail({ product }) {
  return (
    <>
      <div className="product-detail">
        <div className="product-thumb large">
          {product.primary_image ? (
            <img
              src={
                new URL(product.primary_image.url, origin || location.origin)
                  .href
              }
              alt={product.primary_image.alt_ar}
            />
          ) : (
            <Package />
          )}
        </div>
        <div>
          <h2>{product.name_ar}</h2>
          <p dir="ltr">{product.name_en}</p>
          <span className="muted">
            {product.model_code} · {product.category?.name_ar}
          </span>
        </div>
      </div>
      <DataTable
        rows={product.variants ?? []}
        columns={[
          { key: "id" },
          { key: "color", render: (r) => r.color?.name_ar ?? "بدون لون" },
          { key: "size", render: (r) => r.size?.name_ar ?? "بدون مقاس" },
          { key: "price_minor", render: (r) => money(r.price.current_minor) },
          { key: "quantity", render: (r) => r.availability.quantity },
        ]}
      />
      <details open>
        <summary>تعديل بيانات المنتج</summary>
        <MutationForm
          path={`/api/v1/admin/products/${product.id}`}
          method="PATCH"
          fields={[
            ...bilingual,
            {
              name: "description_ar",
              label: "الوصف بالعربية",
              type: "textarea",
            },
            {
              name: "description_en",
              label: "الوصف بالإنجليزية",
              type: "textarea",
            },
            reason,
          ]}
          initial={product}
        />
      </details>
      <details>
        <summary>الصور والمعرض</summary>
        <UploadForm path={`/api/v1/admin/products/${product.id}/images`} />
        {product.gallery?.map((image) => (
          <div className="panel" key={image.id}>
            <img
              className="gallery-image"
              src={new URL(image.url, origin || location.origin).href}
              alt={image.alt_ar}
            />
            <MutationForm
              path={`/api/v1/admin/products/${product.id}/images/${image.id}`}
              method="PATCH"
              initial={image}
              fields={[
                { name: "alt_ar", label: "وصف بالعربية", required: true },
                { name: "alt_en", label: "وصف بالإنجليزية", required: true },
                {
                  name: "position",
                  label: "ترتيب الصورة",
                  type: "number",
                  required: true,
                  min: 0,
                  max: 500,
                },
              ]}
            />
            <MutationForm
              title="إزالة الصورة"
              path={`/api/v1/admin/products/${product.id}/images/${image.id}`}
              method="DELETE"
              fields={[
                {
                  name: "confirmed",
                  label: "تأكيد إزالة الصورة؛ إزالة آخر صورة توقف النشر",
                  type: "boolean",
                  required: true,
                },
              ]}
              transform={() => ({})}
              submitLabel="إزالة الصورة"
            />
          </div>
        ))}
      </details>
      {modules.website && (
        <details>
          <summary>النشر على الموقع</summary>
          <Notice>
            حالة النشر الحالية غير متاحة في بيانات المنتج. الخادم يتحقق من وجود
            صورة قبل النشر.
          </Notice>
          <MutationForm
            path={`/api/v1/admin/products/${product.id}/publish`}
            fields={[
              {
                name: "published",
                label: "نشر المنتج على الموقع",
                type: "boolean",
              },
            ]}
          />
        </details>
      )}
      <details>
        <summary>تصحيح التصنيف وإعادة الملصقات</summary>
        <MutationForm
          path={`/api/v1/admin/products/${product.id}/category-correction`}
          previewPath={`/api/v1/admin/products/${product.id}/category-correction`}
          fields={[
            {
              name: "category_id",
              label: "التصنيف الجديد",
              type: "lookup",
              path: "/api/v1/admin/master/categories",
              required: true,
            },
            reason,
          ]}
          notice="قد تتغير باركودات القطع. راجع التأثير واستبدل الملصقات القديمة بعد التنفيذ."
        />
      </details>
      <details>
        <summary>جدول المقاسات</summary>
        <SizeChart product={product} />
      </details>
      <details>
        <summary>أرشفة المنتج</summary>
        <MutationForm
          path={`/api/v1/admin/products/${product.id}/archive`}
          fields={[
            reason,
            {
              name: "confirm",
              label: "تأكيد الأرشفة",
              type: "boolean",
              required: true,
            },
          ]}
          transform={({ reason }) => ({ restore: false, reason })}
        />
      </details>
    </>
  );
}
export function Catalog() {
  const [params, setParams] = useSearchParams();
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const q = useReadQuery(
    `/api/v1/admin/products?${queryString({ page: params.get("page") ?? 1, search: params.get("search") ?? "", sort: params.get("sort") ?? "newest", category_id: params.get("category_id") ?? "" })}`,
  );
  const product =
    pageData(q.currentData).rows.find((p) => p.id === selected?.id) ?? selected;
  return (
    <>
      <div className="page-heading">
        <div>
          <p>كتالوج جميلة</p>
          <h1>المنتجات</h1>
          <span className="muted">كل التفاصيل، في مكان واحد.</span>
        </div>
        <button onClick={() => setCreate(true)}>
          <Plus size={18} /> إضافة منتج
        </button>
      </div>
      <div className="tabs">
        {Object.entries(masterNames)
          .slice(0, 3)
          .map(([key, title]) => (
            <Link to={`/master/${key}`} key={key}>
              {title}
            </Link>
          ))}
      </div>
      <section className="panel">
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setParams(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <input
            name="search"
            aria-label="بحث المنتجات"
            placeholder="ابحث باسم المنتج…"
            defaultValue={params.get("search") ?? ""}
          />
          <select
            name="sort"
            aria-label="ترتيب المنتجات"
            defaultValue={params.get("sort") ?? "newest"}
          >
            <option value="newest">الأحدث أولاً</option>
            <option value="name">الاسم</option>
            <option value="price_asc">السعر: الأقل أولاً</option>
            <option value="price_desc">السعر: الأعلى أولاً</option>
          </select>
          <button className="secondary">بحث</button>
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
                {
                  key: "name_ar",
                  label: "المنتج",
                  render: (p) => (
                    <div className="product-cell">
                      <div className="product-thumb">
                        {p.primary_image ? (
                          <img
                            src={
                              new URL(
                                p.primary_image.url,
                                origin || location.origin,
                              ).href
                            }
                            alt=""
                          />
                        ) : (
                          <Package size={20} />
                        )}
                      </div>
                      <div>
                        <strong>{p.name_ar}</strong>
                        <small>
                          {p.model_code} · {p.name_en}
                        </small>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "category",
                  label: "التصنيف",
                  render: (p) => p.category?.name_ar,
                },
                {
                  key: "variants",
                  label: "المتغيرات",
                  render: (p) => p.variants.length,
                },
                {
                  key: "price_minor",
                  render: (p) =>
                    p.variants.length
                      ? money(p.variants[0].price.current_minor)
                      : "—",
                },
                {
                  key: "quantity",
                  label: "خيارات المخزون",
                  render: (p) => (
                    <Badge
                      value={
                        p.variants.some((v) => v.availability.quantity > 0)
                          ? "available"
                          : "نفد المخزون"
                      }
                    />
                  ),
                },
              ]}
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
      </section>
      <RestoreRecord path="/api/v1/admin/products" />
      {create && (
        <Modal title="منتج جديد" onClose={() => setCreate(false)}>
          <ProductCreate
            onSuccess={(p) => {
              setCreate(false);
              setSelected(p);
            }}
          />
        </Modal>
      )}
      {product && (
        <Modal title="تفاصيل المنتج" onClose={() => setSelected(null)}>
          <ProductDetail product={product} />
        </Modal>
      )}
    </>
  );
}
export function ReceivingAttachments({ id }) {
  const [files, setFiles] = useState([]);
  return (
    <>
      <UploadForm
        key={files.length}
        attachment
        path={`/api/v1/admin/receivings/${id}/attachments`}
        onUploaded={(f) => setFiles([...files, f])}
      />
      {files.map((f) => (
        <Download
          key={f.id}
          path={`/api/v1/admin/media/${f.id}`}
          format="blob"
          label={`تنزيل المرفق #${f.id}`}
        />
      ))}
      <Notice>
        احتفظ بمعرّفات المرفقات؛ بيانات إذن الاستلام لا تُرجع قائمة المرفقات
        الحالية.
      </Notice>
    </>
  );
}
