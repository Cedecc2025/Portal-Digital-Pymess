import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

const hashSyncMock = vi.fn((password) => `hashed::${password}`);

vi.mock("https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm", () => ({
  default: {
    hashSync: hashSyncMock,
    compare: vi.fn()
  }
}));

const fromMock = vi.fn();
let insertMock;

vi.mock("../lib/supabaseClient.js", () => ({
  supabaseClient: {
    from: (...args) => fromMock(...args)
  }
}));

const registerModulePath = "../modules/auth/js/register.js";

let registerModule;
let navigationMock;

function mockSupabaseResponses({ availabilityData = [], insertResponse = { error: null } }) {
  insertMock = vi.fn().mockResolvedValue(insertResponse);
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        limit: () => Promise.resolve({ data: availabilityData, error: null })
      })
    }),
    insert: (...args) => insertMock(...args)
  });
}

beforeEach(async () => {
  vi.resetModules();
  fromMock.mockReset();
  hashSyncMock.mockClear();
  vi.useFakeTimers();

  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <form id="registerForm">
        <input id="username" />
        <input id="password" />
        <span id="usernameFeedback"></span>
        <span id="passwordFeedback"></span>
        <p id="registerFeedback"></p>
        <p id="usernameAvailability"></p>
        <div class="strength-meter"><span class="strength-bar" data-level="0"></span><span id="strengthCopy"></span></div>
        <button id="registerSubmit">Registrar</button>
      </form>
    </body></html>`,
    { url: "http://localhost/modules/auth/register.html" }
  );

  global.window = dom.window;
  global.document = dom.window.document;

  registerModule = await import(registerModulePath);
  navigationMock = vi.fn();
  registerModule.setNavigationHandler(navigationMock);
});

afterEach(() => {
  delete global.window;
  delete global.document;
  vi.useRealTimers();
});

describe("register module", () => {
  it("rechaza contraseñas cortas", () => {
    const feedback = document.createElement("span");
    const result = registerModule.validatePassword("123", feedback);

    expect(result).toBe(false);
    expect(feedback.textContent).toContain("La contraseña debe tener");
  });

  it("inserta el usuario en Supabase con la contraseña hasheada", async () => {
    mockSupabaseResponses({ availabilityData: [], insertResponse: { error: null } });

    const usernameInput = document.querySelector("#username");
    const passwordInput = document.querySelector("#password");
    const registerFeedback = document.querySelector("#registerFeedback");

    usernameInput.value = "usuario_demo";
    passwordInput.value = "ClaveSegura1";

    await registerModule.handleRegisterSubmit(new window.Event("submit"));
    await vi.runAllTimersAsync();

    expect(hashSyncMock).toHaveBeenCalledWith("ClaveSegura1", 10);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0];
    expect(payload.username).toBe("usuario_demo");
    expect(payload.password).toBe("hashed::ClaveSegura1");
    expect(registerFeedback.textContent).toBe("Registro exitoso. Ahora puedes iniciar sesión.");
    expect(navigationMock).toHaveBeenCalledWith("../login.html");
  });

  it("informa cuando el usuario ya existe", async () => {
    mockSupabaseResponses({ availabilityData: [{ id: 1 }], insertResponse: { error: { code: "23505" } } });

    const usernameInput = document.querySelector("#username");
    const passwordInput = document.querySelector("#password");
    const registerFeedback = document.querySelector("#registerFeedback");

    usernameInput.value = "usuario_demo";
    passwordInput.value = "ClaveSegura1";

    await registerModule.handleRegisterSubmit(new window.Event("submit"));
    expect(navigationMock).not.toHaveBeenCalled();

    expect(registerFeedback.textContent).toBe("El usuario ya se encuentra registrado. Elige otro nombre.");
  });
});
