import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowUpLeft,
  Banknote,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { modules, queryString, useReadQuery } from "../lib/api";
import {
  dateTime,
  labels,
  money,
  pageData,
  tenderOptions,
  today,
} from "../lib/domain";
import {
  DataTable,
  Download,
  Empty,
  ErrorBox,
  Field,
  Loading,
  Notice,
  Pager,
} from "../components/UI";

function PeriodFilters({ params, setParams, grouped = false }) {
  const start = params.get("from") ?? today().slice(0, 8) + "01";
  const end = params.get("to") ?? today();
  return (
    <form
      className="filters"
      onSubmit={(e) => {
        e.preventDefault();
        setParams(Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      <Field label="من">
        {(id) => (
          <input
            key={start}
            id={id}
            name="from"
            type="date"
            required
            defaultValue={start}
          />
        )}
      </Field>
      <Field label="إلى">
        {(id) => (
          <input
            key={end}
            id={id}
            name="to"
            type="date"
            required
            defaultValue={end}
          />
        )}
      </Field>
      <Field label="قناة البيع">
        {(id) => (
          <select
            id={id}
            name="channel"
            defaultValue={params.get("channel") ?? ""}
          >
            <option value="">كل القنوات</option>
            {modules.pos && <option value="pos">المحل</option>}
            {modules.website && <option value="website">الموقع</option>}
          </select>
        )}
      </Field>
      {grouped && (
        <>
          <Field label="تجميع حسب">
            {(id) => (
              <select
                name="group_by"
                id={id}
                defaultValue={params.get("group_by") ?? "product"}
              >
                {Object.entries({
                  product: "المنتج",
                  category: "التصنيف",
                  selector: "مختار البضاعة",
                  customer: "العميل",
                  employee: "الموظف",
                  variant: "المتغير",
                  channel: "القناة",
                }).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <details className="filter-extra">
            <summary>فلاتر إضافية</summary>
            <div className="form-grid">
              {[
                ["employee_id", "الموظف"],
                ["customer_id", "العميل"],
                ["shift_id", "الوردية"],
                ["product_id", "المنتج"],
                ["variant_id", "المتغير"],
                ["category_id", "التصنيف"],
                ["selector_id", "مختار البضاعة"],
              ].map(([name, label]) => (
                <Field key={name} label={`معرّف ${label}`}>
                  {(id) => (
                    <input
                      id={id}
                      name={name}
                      type="number"
                      min="1"
                      defaultValue={params.get(name) ?? ""}
                    />
                  )}
                </Field>
              ))}
              <Field label="وسيلة الدفع">
                {(id) => (
                  <select
                    name="tender"
                    id={id}
                    defaultValue={params.get("tender") ?? ""}
                  >
                    <option value="">الكل</option>
                    {tenderOptions.map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </details>
        </>
      )}
      <button>تطبيق</button>
      <button className="secondary" type="button" onClick={() => setParams({})}>
        إعادة ضبط
      </button>
    </form>
  );
}
const metricDefinitions = {
  net_revenue_minor:
    "إيراد المبيعات المكتملة بعد المرتجعات. الطلبات الجديدة ليست إيراداً.",
  gross_profit_minor:
    "صافي الإيراد ناقص التكلفة الأصلية للقطع المباعة بعد عكس تكلفة المرتجعات.",
  net_profit_minor:
    "مجمل الربح ناقص المصروفات التشغيلية للفترة. لا يُوزّع على قناة بيع أو عميل.",
  refunds_minor: "قيمة المرتجعات بتاريخ تنفيذ الإرجاع.",
  business_expenses_minor: "المصروفات التشغيلية المسجلة في الفترة.",
};
export function Dashboard() {
  const [params, setParams] = useSearchParams();
  const filters = {
    from: params.get("from") ?? today().slice(0, 8) + "01",
    to: params.get("to") ?? today(),
    channel: params.get("channel") ?? "",
  };
  const q = useReadQuery(
    `/api/v1/admin/reports/summary?${queryString(filters)}`,
  );
  const data = q.currentData;
  const daily = Object.entries(data?.daily ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => ({
      day,
      amount: Number(value),
    }));
  return (
    <>
      <div className="page-heading">
        <div>
          <p>مساحة إدارة المتجر</p>
          <h1>
            نظرة عامة <span className="heading-dot">✦</span>
          </h1>
          <span className="muted">صورة واضحة لأداء جميلة كلوزت.</span>
        </div>
        <Link className="button" to="/receiving">
          <PlusIcon /> استلام بضاعة
        </Link>
      </div>
      <div className="welcome-banner">
        <div>
          <span className="eyebrow">كل التفاصيل تصنع الفرق</span>
          <h2>متجرك، تحت السيطرة.</h2>
          <p>تابعي المبيعات والمخزون وطلبات العملاء من مكان واحد.</p>
        </div>
        <div className="banner-mark" aria-hidden="true">
          J<span>✦</span>
        </div>
      </div>
      <section className="panel">
        <PeriodFilters params={params} setParams={setParams} />
      </section>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={q.refetch} />
      ) : (
        data && (
          <>
            <div className="freshness">
              <span>
                الفترة بتوقيت القاهرة · آخر تحميل:{" "}
                {dateTime(q.fulfilledTimeStamp)}
              </span>
              <button
                className="text-button"
                disabled={q.isFetching}
                onClick={q.refetch}
              >
                <RefreshCw size={14} /> تحديث
              </button>
            </div>
            <div className="metrics">
              {[
                ["net_revenue_minor", "صافي المبيعات", Banknote],
                ["gross_profit_minor", "مجمل الربح", TrendingUp],
                ["net_profit_minor", "صافي الربح", Wallet],
                ["orders", "طلبات مكتملة", ShoppingBag],
              ].map(([key, title, Icon]) => (
                <article className="metric" key={key}>
                  <div>
                    <span>{title}</span>
                    <Icon size={20} />
                  </div>
                  <strong>
                    {key.endsWith("_minor")
                      ? money(data[key])
                      : (data[key] ?? "غير متاح")}
                  </strong>
                  <small>
                    {metricDefinitions[key] ??
                      "مبيعات مكتملة خلال الفترة المحددة"}
                  </small>
                </article>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="panel chart-panel">
                <div className="section-heading">
                  <div>
                    <h2>حركة المبيعات</h2>
                    <p>مبيعات مكتملة يومياً، قبل خصم المرتجعات</p>
                  </div>
                  <TrendingUp size={22} />
                </div>
                {daily.length ? (
                  <>
                    <div className="chart" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={daily}>
                          <defs>
                            <linearGradient
                              id="rose"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#b65679"
                                stopOpacity={0.25}
                              />
                              <stop
                                offset="100%"
                                stopColor="#b65679"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 4"
                            vertical={false}
                            stroke="#eee8e9"
                          />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(s) => s.slice(5)}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(n) => money(Math.round(n))}
                            width={90}
                          />
                          <Tooltip
                            formatter={(v) => [
                              money(Math.round(v)),
                              "المبيعات",
                            ]}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#ad4f70"
                            fill="url(#rose)"
                            strokeWidth={3}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <details>
                      <summary>عرض بيانات الرسم كجدول</summary>
                      <DataTable
                        rows={daily}
                        columns={[
                          { key: "day", label: "اليوم" },
                          {
                            key: "amount",
                            label: "المبيعات",
                            render: (r) => money(r.amount),
                          },
                        ]}
                      />
                    </details>
                  </>
                ) : (
                  <Empty />
                )}
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>وسائل الدفع</h2>
                  <Wallet size={22} />
                </div>
                {data.tenders?.length ? (
                  <div className="tenders">
                    {data.tenders.map((t) => (
                      <div key={t.method}>
                        <span className="tender-icon">
                          <Banknote size={20} />
                        </span>
                        <span>{labels[t.method] ?? t.method}</span>
                        <strong>{money(t.amount_minor)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty />
                )}
                <p className="muted small">
                  إجمالي التحصيل الأصلي؛ لا يشمل خصم المرتجعات. نقد شركة الشحن
                  ليس نقد الدرج.
                </p>
              </section>
            </div>
            <div className="metrics secondary-metrics">
              {[
                ["refunds_minor", "المرتجعات"],
                ["business_expenses_minor", "المصروفات"],
                ["pieces", "القطع المباعة"],
                ["identified_customers", "عملاء معروفون"],
                ["anonymous_transactions", "طلبات بدون عميل"],
              ].map(([key, title]) => (
                <article className="metric" key={key}>
                  <span>{title}</span>
                  <strong>
                    {key.endsWith("_minor")
                      ? money(data[key])
                      : (data[key] ?? "غير متاح")}
                  </strong>
                </article>
              ))}
            </div>
            <div className="quick-links">
              <Link to="/inventory">
                <ShoppingBag />
                <div>
                  <strong>راجعي المخزون</strong>
                  <small>أرصدة المتغيرات وتنبيهات النقص</small>
                </div>
                <ArrowUpLeft />
              </Link>
              <Link to="/reports">
                <Users />
                <div>
                  <strong>تفاصيل الأداء</strong>
                  <small>تقارير المنتجات والعملاء ومختاري البضاعة</small>
                </div>
                <ArrowUpLeft />
              </Link>
            </div>
          </>
        )
      )}
    </>
  );
}
function PlusIcon() {
  return <span aria-hidden="true">＋</span>;
}
export function Reports() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState("grouped");
  const filters = {
    ...Object.fromEntries(params),
    from: params.get("from") ?? today().slice(0, 8) + "01",
    to: params.get("to") ?? today(),
    group_by: params.get("group_by") ?? "product",
  };
  const q = useReadQuery(
    `/api/v1/admin/reports/${view}?${view === "grouped" ? queryString(filters) : view === "low-stock" ? queryString({ page: params.get("page") ?? 1 }) : ""}`,
  );
  const rows = pageData(q.currentData).rows;
  return (
    <>
      <div className="page-heading">
        <div>
          <p>قرارات مبنية على البيانات</p>
          <h1>التقارير والتحليلات</h1>
        </div>
        <Download
          path={`/api/v1/admin/reports/print?${queryString({ from: filters.from, to: filters.to, channel: filters.channel })}`}
          label="طباعة ملخص الفترة"
        />
      </div>
      <div className="tabs">
        {[
          ["grouped", "تحليل المبيعات"],
          ["suppliers", "حسابات الموردين"],
          ["low-stock", "نواقص المخزون"],
        ].map(([key, title]) => (
          <button
            key={key}
            className={view === key ? "active" : ""}
            onClick={() => setView(key)}
          >
            {title}
          </button>
        ))}
      </div>
      <div className="panel">
        {view === "grouped" && (
          <PeriodFilters params={params} setParams={setParams} grouped />
        )}
        <Notice>
          {view === "grouped"
            ? "مجمل الربح = صافي المبيعات − التكلفة الأصلية بعد المرتجعات. المرتجعات تُنسب إلى تاريخ الإرجاع. فلتر الدفع يختار الفواتير الأصلية المطابقة دون تكرار إيراد الدفع المقسّم. الترتيب من الخادم حسب صافي المبيعات."
            : "هذا التقرير يعرض الأرصدة الحالية؛ لا يدعم فلتر الفترة."}
        </Notice>
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox error={q.error} retry={q.refetch} />
        ) : (
          <>
            {view === "grouped" && rows.length > 0 && (
              <div className="chart" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="group_key" />
                    <YAxis
                      tickFormatter={(v) => money(Math.round(v))}
                      width={90}
                    />
                    <Tooltip formatter={(v) => money(Math.round(v))} />
                    <Bar
                      name="صافي المبيعات"
                      dataKey="net_revenue_minor"
                      fill="#ad4f70"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      name="مجمل الربح"
                      dataKey="gross_profit_minor"
                      fill="#498477"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <DataTable
              rows={rows}
              columns={(view === "grouped"
                ? [
                    "group_key",
                    "net_revenue_minor",
                    "cogs_minor",
                    "gross_profit_minor",
                    "sold_pieces",
                    "returned_pieces",
                    "orders",
                  ]
                : view === "suppliers"
                  ? [
                      "supplier_id",
                      "purchases_minor",
                      "returns_minor",
                      "net_paid_minor",
                      "balance_due_minor",
                      "refund_due_minor",
                    ]
                  : [
                      "name_ar",
                      "variant_id",
                      "color_id",
                      "size_id",
                      "quantity",
                      "threshold",
                    ]
              ).map((key) => ({
                key,
                render:
                  key === "group_key"
                    ? (r) =>
                        r.group_key === "unassigned"
                          ? "غير منسوب"
                          : (labels[r.group_key] ?? r.group_key)
                    : undefined,
              }))}
            />
            {view !== "suppliers" && (
              <Pager
                data={q.currentData}
                onPage={(page) =>
                  setParams({ ...Object.fromEntries(params), page })
                }
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
