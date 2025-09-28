import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

const hashMock = vi.fn(async (password) => `hashed::${password}`);

vi.mock("https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm", () => ({
  default: {
    hash: hashMock,
    compare: vi.fn()
  }
}));

const fromMock = vi.fn();

vi.mock("../sistema-modular/lib/supabaseClient.js", () => ({
  supabaseClient: {
    from: (...args) => fromMock(...args)
  }
}));

const registerModulePath = "../sistema-modular/modules/auth/js/register.js";

let registerModule;
let insertMock;

function mockInsertResponse(response) {
  insertMock = vi.fn().mockResolvedValue(response);
  fromMock.mockReturnValue({
    insert: (...args) => insertMock(...args)
  });
}

beforeEach(async () => {
  vi.resetModules();
  fromMock.mockReset();
  hashMock.mockClear();

  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <form id="registerForm">
        <input id="username" />
        <input id="password" />
        <span id="usernameFeedback"></span>
        <span id="passwordFeedback"></span>
        <span id="generalFeedback"></span>
      </form>
    </body></html>`,
    { url: "http://localhost/modules/auth/register.html" }
  );

  global.window = dom.window;
  global.document = dom.window.document;

  registerModule = await import(registerModulePath);
});

afterEach(() => {
  delete global.window;
  delete global.document;
});

describe("register module", () => {
  it("rechaza contraseñas cortas", () => {
    const feedback = document.createElement("span");
    const result = registerModule.validatePassword("123", feedback);

    expect(result).toBe(false);
    expect(feedback.textContent).toContain("La contraseña debe tener");
  });

  it("inserta el usuario en Supabase con la contraseña hasheada", async () => {
    mockInsertResponse({ error: null });

    const usernameInput = document.querySelector("#username");
    const passwordInput = document.querySelector("#password");
    const generalFeedback = document.querySelector("#generalFeedback");

    usernameInput.value = "usuario_demo";
    passwordInput.value = "ClaveSegura1";

    await registerModule.handleRegisterSubmit(new window.Event("submit"));

    expect(hashMock).toHaveBeenCalledWith("ClaveSegura1", 10);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0];
    expect(payload.username).toBe("usuario_demo");
    expect(payload.password).toBe("hashed::ClaveSegura1");
    expect(generalFeedback.textContent).toBe("Registro exitoso. Ahora puedes iniciar sesión.");
  });

  it("informa cuando el usuario ya existe", async () => {
    mockInsertResponse({ error: { code: "23505" } });

    const usernameInput = document.querySelector("#username");
    const passwordInput = document.querySelector("#password");
    const generalFeedback = document.querySelector("#generalFeedback");

    usernameInput.value = "usuario_demo";
    passwordInput.value = "ClaveSegura1";

    await registerModule.handleRegisterSubmit(new window.Event("submit"));

    expect(generalFeedback.textContent).toBe("El usuario ya se encuentra registrado. Elige otro nombre.");
  });
});
