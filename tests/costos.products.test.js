import { describe, expect, it } from "vitest";

import { removeProduct, upsertProduct } from "../modules/costos/js/costosData.js";

describe("costosData - productos", () => {
  it("agrega un producto nuevo sin mutar la colección original", () => {
    const original = [
      { id: "prod-1", nombre: "Servicio", costo: 100, precio: 200, moneda: "CRC" }
    ];

    const result = upsertProduct(original, {
      id: "prod-2",
      nombre: "Producto",
      costo: 50,
      precio: 120,
      moneda: "USD"
    });

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: "prod-2", nombre: "Producto" });
    expect(original).toEqual([
      { id: "prod-1", nombre: "Servicio", costo: 100, precio: 200, moneda: "CRC" }
    ]);
    expect(result).not.toBe(original);
  });

  it("actualiza un producto existente conservando su posición", () => {
    const original = [
      { id: "prod-1", nombre: "Servicio", costo: 100, precio: 200, moneda: "CRC" },
      { id: "prod-2", nombre: "Producto", costo: 50, precio: 120, moneda: "USD" }
    ];

    const result = upsertProduct(original, {
      id: "prod-2",
      nombre: "Producto actualizado",
      costo: 55,
      precio: 150,
      moneda: "USD"
    });

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      id: "prod-2",
      nombre: "Producto actualizado",
      costo: 55,
      precio: 150
    });
    expect(result[0]).toMatchObject(original[0]);
    expect(original[1]).toMatchObject({
      id: "prod-2",
      nombre: "Producto",
      costo: 50,
      precio: 120,
      moneda: "USD"
    });
  });

  it("elimina un producto por id sin afectar elementos restantes", () => {
    const original = [
      { id: "prod-1", nombre: "Servicio" },
      { id: "prod-2", nombre: "Producto" }
    ];

    const result = removeProduct(original, "prod-1");

    expect(result).toEqual([{ id: "prod-2", nombre: "Producto" }]);
    expect(original).toHaveLength(2);
  });
});
