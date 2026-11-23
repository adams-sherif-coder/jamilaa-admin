import { Field } from "../components/UI";
export default function ReceivingMatrix({ lines, update, remove }) {
  const products = Map.groupBy(lines, (line) => line.product_id);
  return [...products].map(([id, variants]) => {
    const colors = [
      ...new Map(variants.map((v) => [v.color_key, v.color])).entries(),
    ];
    const sizes = [
      ...new Map(variants.map((v) => [v.size_key, v.size])).entries(),
    ];
    return (
      <section className="receiving-matrix" key={id}>
        <h3>{variants[0].product}</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>اللون / المقاس</th>
                {sizes.map(([key, name]) => (
                  <th key={key}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colors.map(([color, name]) => (
                <tr key={color}>
                  <th scope="row">{name}</th>
                  {sizes.map(([size]) => {
                    const line = variants.find(
                      (v) => v.color_key === color && v.size_key === size,
                    );
                    return (
                      <td key={size}>
                        {line ? (
                          <div className="matrix-cell">
                            <small>
                              متاح: {line.available} · المتغير #
                              {line.variant_id}
                            </small>
                            <Field label="الكمية">
                              {(id) => (
                                <input
                                  id={id}
                                  aria-label={`الكمية ${line.variant_id}`}
                                  type="number"
                                  min="0"
                                  max="500"
                                  required
                                  value={line.quantity}
                                  onChange={(e) =>
                                    update(
                                      line.variant_id,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                />
                              )}
                            </Field>
                            <Field label="التكلفة (جنيه)">
                              {(id) => (
                                <input
                                  id={id}
                                  aria-label={`التكلفة ${line.variant_id}`}
                                  inputMode="decimal"
                                  required={Number(line.quantity) > 0}
                                  value={line.cost}
                                  onChange={(e) =>
                                    update(
                                      line.variant_id,
                                      "cost",
                                      e.target.value,
                                    )
                                  }
                                />
                              )}
                            </Field>
                            <Field label="البيع (جنيه)">
                              {(id) => (
                                <input
                                  id={id}
                                  aria-label={`السعر ${line.variant_id}`}
                                  inputMode="decimal"
                                  required
                                  value={line.price}
                                  onChange={(e) =>
                                    update(
                                      line.variant_id,
                                      "price",
                                      e.target.value,
                                    )
                                  }
                                />
                              )}
                            </Field>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => remove(line.variant_id)}
                            >
                              استبعاد الخيار
                            </button>
                          </div>
                        ) : (
                          <span className="muted">غير موجود</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  });
}
