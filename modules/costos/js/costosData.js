// costosData.js
// Proporciona utilidades puras para administrar los catálogos del módulo de costos.

function cloneItem(item) {
  return item ? { ...item } : item;
}

function normalizeCollection(collection) {
  return Array.isArray(collection) ? [...collection] : [];
}

function normalizeId(value) {
  return value === undefined || value === null ? "" : `${value}`;
}

function upsertItem(collection, candidate) {
  const items = normalizeCollection(collection);
  const normalizedId = normalizeId(candidate?.id);

  if (!normalizedId) {
    throw new Error("Se requiere un identificador para registrar el elemento.");
  }

  const index = items.findIndex((entry) => normalizeId(entry.id) === normalizedId);

  if (index >= 0) {
    items[index] = { ...items[index], ...cloneItem(candidate) };
  } else {
    items.push(cloneItem(candidate));
  }

  return items;
}

function removeItem(collection, identifier) {
  const items = normalizeCollection(collection);
  const normalizedId = normalizeId(identifier);

  if (!normalizedId) {
    return items;
  }

  return items.filter((entry) => normalizeId(entry.id) !== normalizedId);
}

export function upsertProduct(list, product) {
  return upsertItem(list, product);
}

export function removeProduct(list, productId) {
  return removeItem(list, productId);
}

export function upsertFixedCost(list, fixedCost) {
  return upsertItem(list, fixedCost);
}

export function removeFixedCost(list, fixedCostId) {
  return removeItem(list, fixedCostId);
}

export function upsertTransaction(list, transaction) {
  return upsertItem(list, transaction);
}

export function removeTransaction(list, transactionId) {
  return removeItem(list, transactionId);
}

export const __TESTING__ = {
  cloneItem,
  normalizeCollection,
  normalizeId,
  upsertItem,
  removeItem
};
