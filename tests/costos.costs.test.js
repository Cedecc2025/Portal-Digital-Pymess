import { describe, expect, it } from "vitest";

import { removeFixedCost, upsertFixedCost } from "../modules/costos/js/costosData.js";

describe("costosData - costos fijos", () => {
  it("registra un costo fijo nuevo en la última posición", () => {
    const original = [
      { id: "cost-1", concepto: "Alquiler", monto: 500, frecuencia: "mensual" }
    ];

    const result = upsertFixedCost(original, {
      id: "cost-2",
      concepto: "Servicios",
      monto: 120,
      frecuencia: "mensual"
    });

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: "cost-2", concepto: "Servicios" });
    expect(original).toEqual([
      { id: "cost-1", concepto: "Alquiler", monto: 500, frecuencia: "mensual" }
    ]);
  });

  it("actualiza un costo fijo existente sin duplicarlo", () => {
    const original = [
      { id: "cost-1", concepto: "Alquiler", monto: 500, frecuencia: "mensual" },
      { id: "cost-2", concepto: "Servicios", monto: 120, frecuencia: "mensual" }
    ];

    const result = upsertFixedCost(original, {
      id: "cost-1",
      concepto: "Alquiler",
      monto: 550,
      frecuencia: "mensual"
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "cost-1", monto: 550 });
    expect(result[1]).toMatchObject(original[1]);
  });

  it("remueve un costo fijo conservando los demás registros", () => {
    const original = [
      { id: "cost-1", concepto: "Alquiler" },
      { id: "cost-2", concepto: "Servicios" }
    ];

    const result = removeFixedCost(original, "cost-1");

    expect(result).toEqual([{ id: "cost-2", concepto: "Servicios" }]);
    expect(original).toHaveLength(2);
  });
});
