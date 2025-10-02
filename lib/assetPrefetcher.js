// assetPrefetcher.js
// Utilidades para precargar documentos y recursos asociados a los módulos.

const prefetchedKeys = new Set();
const warmedDocuments = new Set();

function resolveUrl(href) {
  try {
    return new URL(href, document.baseURI).toString();
  } catch (error) {
    return href;
  }
}

export function prefetchAssets(assets = []) {
  if (typeof document === "undefined") {
    return;
  }

  assets.forEach((asset) => {
    if (!asset || !asset.href) {
      return;
    }
    const resolvedHref = resolveUrl(asset.href);
    const rel = asset.rel ?? "prefetch";
    const as = asset.as ?? "";
    const key = `${rel}|${as}|${resolvedHref}`;

    if (prefetchedKeys.has(key)) {
      return;
    }
    prefetchedKeys.add(key);

    const link = document.createElement("link");
    link.rel = rel;
    link.href = resolvedHref;

    if (as) {
      link.as = as;
    }

    if (asset.crossOrigin) {
      link.crossOrigin = asset.crossOrigin;
    } else if (rel === "prefetch" && resolvedHref.startsWith("http") && !resolvedHref.startsWith(window.location.origin)) {
      link.crossOrigin = "anonymous";
    }

    document.head.appendChild(link);
  });
}

export function warmDocument(url) {
  if (typeof fetch !== "function") {
    return;
  }

  const resolvedHref = resolveUrl(url);

  if (warmedDocuments.has(resolvedHref)) {
    return;
  }
  warmedDocuments.add(resolvedHref);

  fetch(resolvedHref, { credentials: "same-origin", cache: "force-cache" }).catch(() => {
    warmedDocuments.delete(resolvedHref);
  });
}
