import { useState } from "react";
import { Field, MutationForm } from "./UI";
export default function RestoreRecord({ path }) {
  const [id, setId] = useState("");
  return (
    <details>
      <summary>استعادة سجل مؤرشف بمعرّفه المعروف</summary>
      <Field label="معرّف السجل المؤرشف">
        {(inputId) => (
          <input
            id={inputId}
            type="number"
            min="1"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
        )}
      </Field>
      {/^[1-9][0-9]*$/.test(id) && (
        <MutationForm
          key={id}
          path={`${path}/${id}/archive`}
          fields={[
            { name: "reason", required: true },
            {
              name: "confirm",
              label: "تأكيد استعادة السجل",
              type: "boolean",
              required: true,
            },
          ]}
          transform={({ reason }) => ({ restore: true, reason })}
          submitLabel="استعادة السجل"
        />
      )}
    </details>
  );
}
