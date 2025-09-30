(function ensureSession() {
  var LOGIN_PATH = "/portal/auth/auth.html";
  try {
    var localSession = window.localStorage.getItem("sistemaModularSesion");
    var sessionSession = window.sessionStorage.getItem("sistemaModularSesion");
    var stored = localSession || sessionSession;

    if (!stored) {
      window.location.href = LOGIN_PATH;
      return;
    }

    try {
      var parsed = JSON.parse(stored);
      if (!parsed || !parsed.username) {
        window.location.href = LOGIN_PATH;
        return;
      }
    } catch (parseError) {
      window.location.href = LOGIN_PATH;
      return;
    }
  } catch (error) {
    window.location.href = LOGIN_PATH;
  }
})();
