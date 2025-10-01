// supabaseClient.js
// Este módulo crea y expone una instancia compartida del cliente de Supabase.

const SUPABASE_URL = "https://jsjwgjaprgymeonsadny.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzandnamFwcmd5bWVvbnNhZG55Iiwi" +
  "cm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY5NjQsImV4cCI6MjA3NDIxMjk2NH0.4fjXkdOCyaubZuVIZNeViaA6MfdDK-4pdH9h-Ty2bfk";

function createDisabledQueryBuilder() {
  const resolvedResponse = Promise.resolve({ data: null, error: null });

  const builder = {
    select() {
      return builder;
    },
    insert() {
      return builder;
    },
    update() {
      return builder;
    },
    upsert() {
      return builder;
    },
    delete() {
      return builder;
    },
    eq() {
      return builder;
    },
    order() {
      return builder;
    },
    single() {
      return resolvedResponse;
    },
    maybeSingle() {
      return resolvedResponse;
    }
  };

  return builder;
}

function createDisabledClient() {
  return {
    from() {
      return createDisabledQueryBuilder();
    },
    auth: {
      getUser: async () => ({ data: { user: null }, error: null })
    }
  };
}

export let supabaseClient = createDisabledClient();

let clientReady = false;

function markClientReady() {
  clientReady = true;
}

export function isSupabaseClientReady() {
  return clientReady;
}

export const supabaseClientReadyPromise =
  typeof window !== "undefined"
    ? import("https://esm.sh/@supabase/supabase-js@2")
        .then(({ createClient }) => {
          supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          markClientReady();
          return supabaseClient;
        })
        .catch((error) => {
          console.warn("No fue posible inicializar el cliente de Supabase.", error);
          return supabaseClient;
        })
    : Promise.resolve(supabaseClient);
