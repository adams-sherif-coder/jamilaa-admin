import { useState } from "react";
import { Field, MutationForm, Notice } from "../components/UI";

export default function SizeChart({ product }) {
  const [ar, setAr] = useState(
    (product.size_chart?.labels?.ar ?? []).join("، "),
  );
  const [en, setEn] = useState(
    (product.size_chart?.labels?.en ?? []).join(", "),
  );
  const [rows, setRows] = useState(
    (product.size_chart?.rows ?? []).map((row) => row.join(" | ")).join("\n"),
  );
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  function review(e) {
    e.preventDefault();
    const labels = {
      ar: ar.split(/[,،]/).map((x) => x.trim()),
      en: en.split(/[,،]/).map((x) => x.trim()),
    };
    const cells = rows.trim()
      ? rows.split("\n").map((row) => row.split("|").map((x) => x.trim()))
      : [];
    if (
      labels.ar.length !== labels.en.length ||
      labels.ar.length > 10 ||
      labels.ar.some((x) => !x) ||
      labels.en.some((x) => !x) ||
      cells.length > 50 ||
      cells.some(
        (row) => row.length !== labels.ar.length || row.some((x) => !x),
      )
    ) {
      setError(
        "عدد الأعمدة يجب أن يتطابق في اللغتين وكل الصفوف. الحد الأقصى 10 أعمدة و50 صفاً.",
      );
      return;
    }
    setDraft({ labels, rows: cells });
    setError("");
  }
  return draft ? (
    <>
      <MutationForm
        method="PUT"
        path={`/api/v1/admin/products/${product.id}/size-chart`}
        transform={() => draft}
        notice="راجعت أعمدة الجدول وصفوفه؛ الحفظ يستبدل جدول المقاسات الحالي."
        fields={[
          {
            name: "confirmed",
            label: "تأكيد استبدال جدول المقاسات",
            type: "boolean",
            required: true,
          },
        ]}
      />
      <button className="secondary" onClick={() => setDraft(null)}>
        العودة للتعديل
      </button>
    </>
  ) : (
    <form onSubmit={review}>
      <Field label="عناوين الأعمدة بالعربية — مفصولة بفاصلة">
        {(id) => (
          <input
            id={id}
            required
            value={ar}
            onChange={(e) => setAr(e.target.value)}
          />
        )}
      </Field>
      <Field label="عناوين الأعمدة بالإنجليزية — مفصولة بفاصلة">
        {(id) => (
          <input
            id={id}
            required
            dir="ltr"
            value={en}
            onChange={(e) => setEn(e.target.value)}
          />
        )}
      </Field>
      <Field
        label="صف لكل سطر، وافصل الخلايا بالرمز |"
        hint="مثال: M | 90 | 65"
      >
        {(id) => (
          <textarea
            id={id}
            value={rows}
            onChange={(e) => setRows(e.target.value)}
          />
        )}
      </Field>
      {error && <Notice danger>{error}</Notice>}
      <button>مراجعة الجدول</button>
    </form>
  );
}
