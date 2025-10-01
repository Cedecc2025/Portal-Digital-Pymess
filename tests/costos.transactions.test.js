import { describe, expect, it } from "vitest";

import { removeTransaction, upsertTransaction } from "../modules/costos/js/costosData.js";

describe("costosData - transacciones", () => {
  it("agrega una transacción nueva y mantiene las existentes", () => {
    const original = [
      { id: "tx-1", concepto: "Venta", monto: 150, tipo: "ingreso" }
    ];

    const result = upsertTransaction(original, {
      id: "tx-2",
      concepto: "Compra",
      monto: 80,
      tipo: "egreso"
    });

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: "tx-2", concepto: "Compra" });
    expect(original).toEqual([{ id: "tx-1", concepto: "Venta", monto: 150, tipo: "ingreso" }]);
  });

  it("actualiza una transacción existente con el mismo id", () => {
    const original = [
      { id: "tx-1", concepto: "Venta", monto: 150, tipo: "ingreso" },
      { id: "tx-2", concepto: "Compra", monto: 80, tipo: "egreso" }
    ];

    const result = upsertTransaction(original, {
      id: "tx-2",
      concepto: "Compra de insumos",
      monto: 95,
      tipo: "egreso"
    });

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: "tx-2", concepto: "Compra de insumos", monto: 95 });
    expect(result[0]).toMatchObject(original[0]);
  });

  it("elimina una transacción especificada", () => {
    const original = [
      { id: "tx-1", concepto: "Venta" },
      { id: "tx-2", concepto: "Compra" }
    ];

    const result = removeTransaction(original, "tx-2");

    expect(result).toEqual([{ id: "tx-1", concepto: "Venta" }]);
    expect(original).toHaveLength(2);
  });
});
