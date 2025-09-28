import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

const hashMock = vi.fn(async (password) => `hashed::${password}`);
const compareMock = vi.fn(async (password, hash) => hash === `hashed::${password}`);

vi.mock("https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm", () => ({
  default: {
    hash: hashMock,
    compare: compareMock
  }
}));

const saveSessionMock = vi.fn();

vi.mock("../lib/authGuard.js", () => ({
  saveSession: saveSessionMock
}));

const fromMock = vi.fn();

vi.mock("../lib/supabaseClient.js", () => ({
  supabaseClient: {
    from: (...args) => fromMock(...args)
  }
}));

const loginModulePath = "../modules/auth/js/login.js";

let navigationMock;
let loginModule;

function buildSupabaseUserResponse(user) {
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: user, error: null })
      })
    })
  });
}

beforeEach(async () => {
  vi.resetModules();
  fromMock.mockReset();
  saveSessionMock.mockReset();
  compareMock.mockClear();
  hashMock.mockClear();

  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <form id="loginForm">
        <input id="username" />
        <input id="password" />
        <input id="rememberMe" type="checkbox" />
        <span id="usernameFeedback"></span>
        <span id="passwordFeedback"></span>
        <span id="generalFeedback"></span>
      </form>
    </body></html>`,
    { url: "http://localhost/modules/auth/login.html" }
  );

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.sessionStorage = dom.window.sessionStorage;
  loginModule = await import(loginModulePath);
  navigationMock = vi.fn();
  loginModule.setNavigationHandler(navigationMock);
});

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
  delete global.sessionStorage;
});

describe("login module", () => {
  it("valida correctamente un nombre de usuario inválido", () => {
    const feedback = document.createElement("span");
    const isValid = loginModule.validateUsername("in", feedback);

    expect(isValid).toBe(false);
    expect(feedback.textContent).toContain("El usuario debe tener");
  });

  it("almacena la sesión y redirige al dashboard con credenciales válidas", async () => {
    const hashedPassword = "hashed::ClaveSegura1";
    buildSupabaseUserResponse({
      id: 10,
      username: "usuario_empresarial",
      password: hashedPassword
    });

    document.querySelector("#username").value = "usuario_empresarial";
    document.querySelector("#password").value = "ClaveSegura1";
    document.querySelector("#rememberMe").checked = true;

    await loginModule.handleLoginSubmit(new window.Event("submit"));

    expect(fromMock).toHaveBeenCalledWith("usuarios");
    expect(saveSessionMock).toHaveBeenCalledWith("usuario_empresarial", true);
    expect(navigationMock).toHaveBeenCalledWith("../../dashboard/index.html");
  });

  it("muestra un mensaje de error cuando el usuario no existe", async () => {
    buildSupabaseUserResponse(null);

    document.querySelector("#username").value = "desconocido";
    document.querySelector("#password").value = "ClaveSegura1";

    await loginModule.handleLoginSubmit(new window.Event("submit"));

    const generalFeedback = document.querySelector("#generalFeedback");
    expect(generalFeedback.textContent).toBe("Usuario o contraseña incorrectos.");
    expect(saveSessionMock).not.toHaveBeenCalled();
    expect(navigationMock).not.toHaveBeenCalled();
  });
});
