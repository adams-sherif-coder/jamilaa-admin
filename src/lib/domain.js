export function minor(value) {
  const text = String(value).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(text))
    throw new Error("أدخل مبلغاً صحيحاً بحد أقصى منزلتين عشريتين");
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const result = Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
  if (!Number.isSafeInteger(result))
    throw new Error("المبلغ أكبر من الحد المسموح");
  return negative ? -result : result;
}
export function money(value) {
  if (value === null || value === undefined || value === "") return "غير متاح";
  if (!/^-?\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    return "غير متاح";
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(Number(value) / 100);
}
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("ar-EG", {
        timeZone: "Africa/Cairo",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export function pageData(data) {
  const rows = Array.isArray(data) ? data : (data?.data ?? data?.rows ?? []);
  const meta = data?.meta ?? data ?? {};
  return {
    rows,
    page: Number(meta.current_page ?? meta.page ?? 1),
    last: Number(
      meta.last_page ??
        Math.max(
          1,
          Math.ceil((meta.total ?? rows.length) / (meta.per_page ?? 20)),
        ),
    ),
    total: meta.total ?? rows.length,
  };
}
export function orderTransitions(order) {
  if (order.status === "new" && new Date(order.expires_at) <= new Date())
    return [];
  return (
    {
      new: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: [
        order.fulfillment === "pickup"
          ? "ready_for_pickup"
          : "out_for_delivery",
        "cancelled",
      ],
      ready_for_pickup: ["collected", "cancelled"],
      out_for_delivery: ["delivered", "awaiting_return"],
      awaiting_return: ["cancelled"],
    }[order.status] ?? []
  );
}
export const labels = {
  cash: "نقدي",
  card: "بطاقة",
  instapay: "إنستاباي",
  wallet: "محفظة",
  pos: "المحل",
  website: "الموقع",
  owner: "مالك",
  manager: "مدير",
  employee: "موظف",
  new: "جديد",
  confirmed: "مؤكد",
  preparing: "قيد التجهيز",
  out_for_delivery: "خرج للتوصيل",
  delivered: "تم التوصيل",
  ready_for_pickup: "جاهز للاستلام",
  collected: "تم الاستلام",
  cancelled: "ملغى",
  awaiting_return: "بانتظار عودة الشحنة",
  available: "متاح",
  held: "معلق",
  packed: "مجهز",
  offline: "مخصص لجهاز",
  sold: "مباع",
  damaged: "تالف",
  lost: "مفقود",
  supplier_returned: "مرتجع للمورد",
  completed: "مكتمل",
  reversed: "معكوس",
  voided: "ملغى بعد البيع",
  pickup: "استلام من المحل",
  delivery: "توصيل",
  pending: "قيد الانتظار",
  not_applicable: "لا ينطبق",
  saved: "محفوظ",
  submitted: "أُرسل — الطباعة غير مؤكدة",
  reprinted: "إعادة طباعة",
  saleable: "صالح للبيع",
  payment: "دفع",
  refund: "استرداد",
  alphabetic: "حروف",
  numeric: "أرقام",
  custom: "مخصص",
  free: "مقاس حر",
  percent: "نسبة مئوية",
  fixed: "مبلغ ثابت",
};
export const tenderOptions = ["cash", "card", "instapay", "wallet"].map(
  (value) => [value, labels[value]],
);
export function stringList(value) {
  return String(value)
    .split(/[\n,،]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
export function idList(value) {
  const list = stringList(value);
  if (
    list.some(
      (x) =>
        !/^\d+$/.test(x) || !Number.isSafeInteger(Number(x)) || Number(x) < 1,
    )
  )
    throw new Error("معرّفات غير صحيحة");
  if (new Set(list).size !== list.length) throw new Error("يوجد معرّف مكرر");
  return list.map(Number);
}
