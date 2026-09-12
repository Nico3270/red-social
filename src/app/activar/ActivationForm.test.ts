import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

const mockActivateAccount = jest.fn();
const mockHookValues: unknown[] = [];
let mockHookIndex = 0;

jest.mock("@/actions/auth/activateAccount", () => ({
  activateAccount: mockActivateAccount,
}));
jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = mockHookIndex++;
      if (!(index in mockHookValues)) mockHookValues[index] = initial;
      return [
        mockHookValues[index],
        (value: unknown) => {
          mockHookValues[index] = value;
        },
      ];
    },
    useRef: (initial: unknown) => {
      const index = mockHookIndex++;
      if (!(index in mockHookValues)) mockHookValues[index] = { current: initial };
      return mockHookValues[index];
    },
  };
});

import ActivationForm from "./ActivationForm";

const csrfNonce = "C".repeat(43);
const fieldNames = [
  "nombre",
  "apellido",
  "email",
  "username",
  "ciudadCompleta",
  "genero",
  "fechaNacimiento",
  "password",
  "confirmPassword",
] as const;
const formValues = {
  csrfNonce,
  nombre: "María",
  apellido: "Pérez",
  email: "persona@example.com",
  username: "persona_1",
  ciudadCompleta: "Tunja - Boyacá",
  genero: "otro",
  fechaNacimiento: "2000-01-15",
  password: "Password1!",
  confirmPassword: "Password1!",
};
type FieldName = (typeof fieldNames)[number];

function render() {
  mockHookIndex = 0;
  return ActivationForm({ csrfNonce });
}

function html(): string {
  return renderToStaticMarkup(render());
}

function submit(expectFormData = true): Promise<void> {
  const fields = new FormData();
  for (const [name, value] of Object.entries(formValues)) {
    fields.append(name, value);
  }
  const form = {} as HTMLFormElement;
  const constructorSpy = jest.spyOn(globalThis, "FormData").mockImplementation(
    () => fields,
  );
  const element = render();
  const event = {
    preventDefault: jest.fn(),
    currentTarget: form,
  } as unknown as React.FormEvent<HTMLFormElement>;

  // React despacha este handler con el elemento form como currentTarget.
  const pending = element.props.onSubmit(event) as Promise<void>;
  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  if (expectFormData) {
    expect(constructorSpy).toHaveBeenCalledWith(form);
  } else {
    expect(constructorSpy).not.toHaveBeenCalled();
  }
  constructorSpy.mockRestore();
  return pending;
}

function setPasswordRefs() {
  render();
  const passwordInput = { value: formValues.password };
  const confirmationInput = { value: formValues.confirmPassword };
  (mockHookValues[3] as { current: typeof passwordInput | null }).current =
    passwordInput;
  (mockHookValues[4] as { current: typeof confirmationInput | null }).current =
    confirmationInput;
  return { passwordInput, confirmationInput };
}

function expectButtonDisabled(output: string, disabled: boolean) {
  const button = output.match(/<button\b[^>]*>/)?.[0];
  expect(button).toBeDefined();
  if (disabled) {
    expect(button).toMatch(/\sdisabled=""/);
  } else {
    expect(button).not.toMatch(/\sdisabled=""/);
  }
}

describe("ActivationForm aislado", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookValues.length = 0;
    mockHookIndex = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("es Client Component con exactamente csrfNonce como prop y una acción existente", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/activar/ActivationForm.tsx"),
      "utf8",
    );
    expect(source.startsWith('"use client";')).toBe(true);
    expect(source).toMatch(/type ActivationFormProps = \{\s*csrfNonce: string;\s*\}/);
    expect(source).toContain('from "@/actions/auth/activateAccount"');
    expect(source).not.toMatch(
      /@\/lib\/prisma|@prisma\/client|AccountClaim|account-activation-session|bcrypt|node:crypto|\bfetch\s*\(/,
    );
    expect(source).not.toMatch(/console\.|\blogger\b|localStorage|sessionStorage/);
  });

  it("renderiza exactamente nueve campos de usuario y nonce hidden", () => {
    const output = html();
    const names = Array.from(output.matchAll(/\bname="([^"]+)"/g), (match) => match[1]);
    expect(names).toEqual(["csrfNonce", ...fieldNames]);
    expect(output).not.toMatch(/name="(role|isPlaceholder|perfilCompleto|usuarioId|rawToken|negocioId)"/);
    for (const field of fieldNames) {
      expect(output).toContain(`id="activation-${field}"`);
      expect(output).toContain(`for="activation-${field}"`);
    }
  });

  it("nonce únicamente dentro del input hidden, nunca en texto ni atributos data o URL", () => {
    const output = html();
    expect(output).toContain(`type="hidden" name="csrfNonce" value="${csrfNonce}"`);
    expect(output.match(new RegExp(csrfNonce, "g"))).toHaveLength(1);
    expect(output).not.toMatch(/data-csrf|href=|<script/);
  });

  it("campos tienen tipos, autocomplete y restricciones UX", () => {
    const output = html();
    for (const [field, type, autoComplete] of [
      ["nombre", "text", "given-name"],
      ["apellido", "text", "family-name"],
      ["email", "email", "email"],
      ["username", "text", "username"],
      ["password", "password", "new-password"],
      ["confirmPassword", "password", "new-password"],
    ]) {
      const input = output.match(new RegExp(`<input[^>]*name="${field}"[^>]*>`))?.[0];
      expect(input).toContain(`type="${type}"`);
      expect(input).toContain(`autoComplete="${autoComplete}"`.toLowerCase().replace("autocomplete", "autoComplete"));
      expect(input).toContain("required");
    }
    expect(output).toContain('type="date"');
    expect(output).toContain('name="genero"');
    expect(output).toContain('pattern="[A-Za-z0-9_]+"');
    expect(output).toContain('placeholder="Tunja - Boyacá"');
    expect(output).toContain("Mínimo 8 caracteres, una mayúscula, una minúscula y un número.");
    expect(output).toContain("sm:grid-cols-2");
  });

  it("envía FormData intacto, exclusivamente nonce y nueve campos", async () => {
    mockActivateAccount.mockResolvedValue({ ok: false, code: "INTERNAL_ERROR" });
    await submit();
    const sent = mockActivateAccount.mock.calls[0][0] as FormData;
    expect(mockActivateAccount).toHaveBeenCalledTimes(1);
    expect(Array.from(sent.keys())).toEqual(["csrfNonce", ...fieldNames]);
    expect(Object.fromEntries(sent.entries())).toEqual(formValues);
    expect(sent.has("rawToken")).toBe(false);
    expect(sent.has("usuarioId")).toBe(false);
    expect(sent.has("role")).toBe(false);
  });

  it("bloquea doble click síncrono y expone pending accesible durante request", async () => {
    let resolve!: (value: { ok: false; code: "INTERNAL_ERROR" }) => void;
    mockActivateAccount.mockImplementation(
      () => new Promise((done) => { resolve = done; }),
    );
    const first = submit();
    const during = html();
    expect(during).toContain('aria-busy="true"');
    expect(during).toContain("Activando...");
    expect(during).toMatch(/<fieldset[^>]*disabled/);
    expectButtonDisabled(during, true);
    const second = submit(false);
    await second;
    expect(mockActivateAccount).toHaveBeenCalledTimes(1);
    resolve({ ok: false, code: "INTERNAL_ERROR" });
    await first;
    expect(html()).toContain("Activar mi cuenta");
  });

  it("muestra errores del validator junto a todos los campos, sin serializar objetos", async () => {
    const errors = Object.fromEntries(
      fieldNames.map((field) => [field, [`Corrige ${field}`]]),
    ) as Record<FieldName, string[]>;
    mockActivateAccount.mockResolvedValue({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: errors,
    });
    await submit();
    const output = html();
    for (const field of fieldNames) {
      expect(output).toContain(`id="activation-${field}-error" role="alert"`);
      expect(output).toContain(`Corrige ${field}`);
      const describedBy = field === "password"
        ? "activation-password-help activation-password-error"
        : `activation-${field}-error`;
      expect(output).toContain(`aria-describedby="${describedBy}"`);
    }
    expect(output).not.toContain("[object Object]");
    expect(output).not.toContain(formValues.password);
  });

  it.each([
    ["EMAIL_UNAVAILABLE", "email", "Este correo no está disponible. Usa otro."],
    ["USERNAME_UNAVAILABLE", "username", "Este nombre de usuario no está disponible."],
  ] as const)("muestra %s junto a %s", async (code, field, message) => {
    mockActivateAccount.mockResolvedValue({ ok: false, code });
    await submit();
    const output = html();
    expect(output).toContain(`id="activation-${field}-error" role="alert"`);
    expect(output).toContain(message);
    expect(output).not.toContain("Activación no disponible");
  });

  it.each([
    ["ACTIVATION_UNAVAILABLE", "El enlace de activación ya no está disponible."],
    ["INVALID_CSRF", "No pudimos validar esta solicitud."],
    ["INVALID_ORIGIN", "No pudimos validar esta solicitud."],
  ] as const)("trata %s como error terminal sin detalles internos", async (code, message) => {
    mockActivateAccount.mockResolvedValue({ ok: false, code });
    await submit();
    const output = html();
    expect(output).toContain(message);
    expectButtonDisabled(output, true);
    const alert = output.match(/<p role="alert"[^>]*>([^<]*)<\/p>/)?.[1] ?? "";
    expect(alert).not.toMatch(/CSRF|Origin|tampered|expired|stack/i);
    await submit(false);
    expect(mockActivateAccount).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["INVALID_REQUEST", "El formulario contiene datos no válidos."],
    ["INTERNAL_ERROR", "No pudimos completar la activación en este momento."],
    ["AUTH_SESSION_PRESENT", "Ya tienes una sesión iniciada."],
  ] as const)("muestra %s sin bloquear un nuevo intento", async (code, message) => {
    mockActivateAccount.mockResolvedValue({ ok: false, code });
    await submit();
    const output = html();
    expect(output).toContain(message);
    expectButtonDisabled(output, false);
    expect(output).toContain("Activar mi cuenta");
  });

  it("error inesperado se presenta como temporal sin filtrar excepciones", async () => {
    mockActivateAccount.mockRejectedValue(new Error("private-server-stack"));
    await submit();
    const output = html();
    expect(output).toContain("No pudimos completar la activación en este momento.");
    expect(output).not.toContain("private-server-stack");
    expectButtonDisabled(output, false);
  });

  it("tras error limpia ambas contraseñas pero no reinicia otros campos", async () => {
    const { passwordInput, confirmationInput } = setPasswordRefs();
    mockActivateAccount.mockResolvedValue({ ok: false, code: "EMAIL_UNAVAILABLE" });
    await submit();
    expect(passwordInput.value).toBe("");
    expect(confirmationInput.value).toBe("");
    expect(html()).toContain("Este correo no está disponible.");
    const source = readFileSync(join(process.cwd(), "src/app/activar/ActivationForm.tsx"), "utf8");
    expect(source).not.toMatch(/\breset\s*\(|form\.reset/);
  });

  it("no renderiza bearer, cookie, IDs ni password enviados", async () => {
    mockActivateAccount.mockResolvedValue({ ok: false, code: "INTERNAL_ERROR" });
    await submit();
    const output = html();
    for (const secret of [
      "RAW_TOKEN_SHOULD_NEVER_RENDER",
      "COOKIE_VALUE_SHOULD_NEVER_RENDER",
      "USUARIO_ID_SHOULD_NEVER_RENDER",
      "CLAIM_ID_SHOULD_NEVER_RENDER",
      formValues.password,
      formValues.confirmPassword,
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output.match(new RegExp(csrfNonce, "g"))).toHaveLength(1);
  });
});
