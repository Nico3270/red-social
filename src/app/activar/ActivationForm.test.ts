import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { isValidElement, type ReactElement, type ReactNode, type Ref } from "react";

const mockActivateAccount = jest.fn();
const mockHookValues: unknown[] = [];
let mockHookIndex = 0;
type MockEffect = {
  deps: readonly unknown[] | undefined;
  cleanup: void | (() => void);
};
const mockEffects = new Map<number, MockEffect>();

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
          mockHookValues[index] = typeof value === "function"
            ? (value as (previous: unknown) => unknown)(mockHookValues[index])
            : value;
        },
      ];
    },
    useRef: (initial: unknown) => {
      const index = mockHookIndex++;
      if (!(index in mockHookValues)) mockHookValues[index] = { current: initial };
      return mockHookValues[index];
    },
    useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => {
      const index = mockHookIndex++;
      const previous = mockEffects.get(index);
      if (
        previous &&
        deps &&
        previous.deps?.length === deps.length &&
        deps.every((value, position) => Object.is(value, previous.deps?.[position]))
      ) {
        return;
      }
      previous?.cleanup?.();
      mockEffects.set(index, { deps, cleanup: effect() });
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

type TestElement = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
type ControlNode = { value: string };
const controlNodes = new Map<string, ControlNode>();
const NativeFormData = globalThis.FormData;

// Sólo el mock de React usa un cursor de hooks. Las pruebas interactúan con el
// árbol público; nunca leen ni escriben posiciones de mockHookValues.
function elements(node: ReactNode): TestElement[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<TestElement["props"]>(node)) return [];
  return [node, ...elements(node.props.children)];
}

function controlKey(element: TestElement): string {
  return String(element.props.id ?? element.props.name);
}

function isControl(element: TestElement): boolean {
  return ["input", "select", "textarea"].includes(String(element.type));
}

function inputRef(element: TestElement): Ref<HTMLInputElement> | undefined {
  // React 18 expone el ref en el elemento, no en props. Se localiza por id.
  return (element as TestElement & { ref?: Ref<HTMLInputElement> }).ref;
}

function render() {
  mockHookIndex = 0;
  const tree = ActivationForm({ csrfNonce });
  for (const element of elements(tree).filter(isControl)) {
    const key = controlKey(element);
    let node = controlNodes.get(key);
    if (!node) {
      node = { value: String(element.props.value ?? element.props.defaultValue ?? "") };
      controlNodes.set(key, node);
    }
    if (element.props.value !== undefined) node.value = String(element.props.value);
    const ref = inputRef(element);
    if (typeof ref === "function") ref(node as HTMLInputElement);
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node as HTMLInputElement;
  }
  return tree;
}

function findElement(predicate: (element: TestElement) => boolean, tree: ReactNode = render()): TestElement {
  const matches = elements(tree).filter(predicate);
  expect(matches).toHaveLength(1);
  return matches[0];
}

function byId(id: string): TestElement {
  return findElement((element) => element.props.id === id);
}

function hiddenCity(): TestElement {
  return findElement((element) => element.type === "input" && element.props.name === "ciudadCompleta");
}

function textContent(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  return isValidElement<{ children?: ReactNode }>(node) ? textContent(node.props.children) : "";
}

function html(): string {
  return renderToStaticMarkup(render());
}

function change(id: string, value: string) {
  const element = byId(id);
  expect(isControl(element)).toBe(true);
  const node = controlNodes.get(controlKey(element))!;
  node.value = value;
  const onChange = element.props.onChange as React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement> | undefined;
  onChange?.({ target: node, currentTarget: node } as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>);
  return render();
}

function selectLocation(department = "Boyacá", city = "Tunja") {
  const departmentSelect = byId("activation-departamento");
  expect(departmentSelect.props.onChange).toEqual(expect.any(Function));
  expect(elements(departmentSelect).some((element) => element.type === "option" && element.props.value === department)).toBe(true);
  change("activation-departamento", department);
  const citySelect = byId("activation-ciudadCompleta");
  expect(citySelect.props.disabled).toBe(false);
  expect(citySelect.props.onChange).toEqual(expect.any(Function));
  expect(elements(citySelect).some((element) => element.type === "option" && element.props.value === city)).toBe(true);
  change("activation-ciudadCompleta", city);
  expect(hiddenCity().props.value).toBe(`${city} - ${department}`);
}

function fillPasswords(password = formValues.password, confirmation = formValues.confirmPassword) {
  change("activation-password", password);
  change("activation-confirmPassword", confirmation);
  const readRef = (id: string) => {
    const ref = inputRef(byId(id));
    expect(ref).toBeTruthy();
    expect(typeof ref).toBe("object");
    const input = (ref as React.RefObject<HTMLInputElement>).current;
    expect(input).not.toBeNull();
    return input!;
  };
  return {
    passwordInput: readRef("activation-password"),
    confirmationInput: readRef("activation-confirmPassword"),
  };
}

function togglePassword(label: string) {
  const button = findElement((element) => element.type === "button" && element.props["aria-label"] === label);
  expect(button.props.type).toBe("button");
  (button.props.onClick as () => void)();
  return render();
}

const requirementLabels = [
  "Mínimo 8 caracteres",
  "Al menos una letra mayúscula",
  "Al menos una letra minúscula",
  "Al menos un número",
];

function expectRequirements(met: readonly string[]) {
  const list = findElement((element) => element.type === "ul" && element.props["aria-label"] === "Requisitos de la contraseña");
  const items = elements(list).filter((element) => element.type === "li");
  expect(items.map(textContent).sort()).toEqual(
    requirementLabels.map((label) => `${met.includes(label) ? "Cumplido" : "Pendiente"}: ${label}`).sort(),
  );
}

function expectClearedPasswords(inputs: ReturnType<typeof fillPasswords>) {
  expect(inputs.passwordInput.value).toBe("");
  expect(inputs.confirmationInput.value).toBe("");
  expectRequirements([]);
  expect(elements(render()).some((element) => element.props.id === "activation-confirmPassword-match")).toBe(false);
  expect(byId("activation-password").props.type).toBe("password");
  expect(byId("activation-confirmPassword").props.type).toBe("password");
  // Comprueba también que el estado de password, no sólo los refs, se borró.
  change("activation-confirmPassword", formValues.password);
  expect(textContent(byId("activation-confirmPassword-match"))).toBe("Las contraseñas no coinciden");
  change("activation-confirmPassword", "");
  expect(elements(render()).some((element) => element.props.id === "activation-confirmPassword-match")).toBe(false);
}

type SubmitOptions = {
  prepareLocation?: boolean;
  prepareFields?: boolean;
  expectFormData?: boolean;
};

function submit({ prepareLocation = true, prepareFields = true, expectFormData = true }: SubmitOptions = {}): Promise<void> {
  if (prepareLocation && !hiddenCity().props.value) selectLocation();
  if (prepareFields) {
    for (const [name, value] of Object.entries(formValues)) {
      if (name !== "csrfNonce" && name !== "ciudadCompleta") change(`activation-${name}`, value);
    }
  }
  const element = render();
  const form = {} as HTMLFormElement;
  // El entorno Node no tiene HTMLFormElement. Modelamos los controles exitosos
  // del árbol, sin filtrar con la whitelist: un name extra debe fallar el test.
  const constructorSpy = jest.spyOn(globalThis, "FormData").mockImplementation(() => {
    const fields = new NativeFormData();
    for (const control of elements(element).filter(isControl)) {
      if (typeof control.props.name === "string" && !control.props.disabled) {
        fields.append(control.props.name, controlNodes.get(controlKey(control))!.value);
      }
    }
    return fields;
  });
  const event = {
    preventDefault: jest.fn(),
    currentTarget: form,
  } as unknown as React.FormEvent<HTMLFormElement>;

  try {
    const pending = element.props.onSubmit(event) as Promise<void>;
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    if (expectFormData) {
      expect(constructorSpy).toHaveBeenCalledTimes(1);
      expect(constructorSpy).toHaveBeenCalledWith(form);
    } else {
      expect(constructorSpy).not.toHaveBeenCalled();
    }
    return pending;
  } finally {
    constructorSpy.mockRestore();
  }
}

function expectButtonDisabled(output: string, disabled: boolean) {
  const buttons = (output.match(/<button\b[^>]*>/g) ?? []).filter((button) => /\btype="submit"/.test(button));
  expect(buttons).toHaveLength(1);
  expect(/\sdisabled=""/.test(buttons[0])).toBe(disabled);
}

function unmount() {
  for (const effect of mockEffects.values()) effect.cleanup?.();
  mockEffects.clear();
  mockHookValues.length = 0;
  controlNodes.clear();
}

describe("ActivationForm aislado", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookValues.length = 0;
    mockHookIndex = 0;
    mockEffects.clear();
    controlNodes.clear();
  });

  afterEach(() => {
    unmount();
    jest.useRealTimers();
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
      /@\/lib\/prisma|@prisma\/client|@upstash\/(redis|ratelimit)|AccountClaim|account-activation-session|bcrypt|node:crypto|next\/headers|\bcookies\b|\bfetch\s*\(/,
    );
    expect(source).not.toMatch(/console\.|\blogger\b|localStorage|sessionStorage|indexedDB|document\.cookie|\breset\s*\(|form\.reset/);
  });

  it("renderiza exactamente nueve campos de usuario y nonce hidden", () => {
    const output = html();
    const names = Array.from(output.matchAll(/\bname="([^"]+)"/g), (match) => match[1]);
    expect(names.sort()).toEqual(["csrfNonce", ...fieldNames].sort());
    expect(output).not.toMatch(/name="(departamento|ciudad|role|isPlaceholder|perfilCompleto|usuarioId|rawToken|negocioId)"/);
    expect(byId("activation-departamento").props.name).toBeUndefined();
    expect(byId("activation-ciudadCompleta").props.name).toBeUndefined();
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
    for (const [field, type, autoComplete] of [
      ["nombre", "text", "given-name"],
      ["apellido", "text", "family-name"],
      ["email", "email", "email"],
      ["username", "text", "username"],
      ["password", "password", "new-password"],
      ["confirmPassword", "password", "new-password"],
    ]) {
      const input = byId(`activation-${field}`);
      expect(input.type).toBe("input");
      expect(input.props.type).toBe(type);
      expect(input.props.autoComplete).toBe(autoComplete);
      expect(input.props.required).toBe(true);
    }
    expect(byId("activation-fechaNacimiento").props.type).toBe("date");
    expect(byId("activation-genero").props.name).toBe("genero");
    expect(byId("activation-username").props.pattern).toBe("[A-Za-z0-9_]+");
    expect(byId("activation-password").props.minLength).toBe(8);
    expect(byId("activation-confirmPassword").props.minLength).toBe(8);
    expectRequirements([]);
  });

  it("ofrece departamentos sin name y mantiene Ciudad deshabilitada al inicio", () => {
    const department = byId("activation-departamento");
    const city = byId("activation-ciudadCompleta");
    expect(department.type).toBe("select");
    expect(city.type).toBe("select");
    expect(department.props.name).toBeUndefined();
    expect(city.props.name).toBeUndefined();
    expect(department.props.required).toBe(true);
    expect(city.props.required).toBe(true);
    expect(textContent(department)).toContain("Selecciona un departamento");
    expect(elements(department).some((element) => element.type === "option" && element.props.value === "Boyacá")).toBe(true);
    expect(city.props.disabled).toBe(true);
    expect(hiddenCity().props).toMatchObject({ type: "hidden", name: "ciudadCompleta", value: "" });
    expectButtonDisabled(html(), true);
  });

  it("seleccionar departamento habilita sus ciudades y conserva el submit bloqueado", () => {
    change("activation-departamento", "Boyacá");
    const city = byId("activation-ciudadCompleta");
    expect(city.props.disabled).toBe(false);
    expect(city.props.value).toBe("");
    expect(elements(city).some((element) => element.type === "option" && element.props.value === "Tunja")).toBe(true);
    expect(elements(city).some((element) => element.type === "option" && element.props.value === "Leticia")).toBe(false);
    expect(hiddenCity().props.value).toBe("");
    expectButtonDisabled(html(), true);
  });

  it("seleccionar ciudad construye el único campo hidden ciudadCompleta", () => {
    selectLocation("Boyacá", "Tunja");
    expect(hiddenCity().props).toMatchObject({ type: "hidden", name: "ciudadCompleta", value: "Tunja - Boyacá" });
    expect(byId("activation-ciudadCompleta").props.value).toBe("Tunja");
    expectButtonDisabled(html(), false);
    expect(byId("activation-departamento").props.name).toBeUndefined();
    expect(byId("activation-ciudadCompleta").props.name).toBeUndefined();
    expect(html()).not.toMatch(/data-(csrf|token|cookie|usuario|claim)|name="(departamento|ciudad)"/i);
  });

  it("cambiar departamento borra ciudad y hidden hasta seleccionar una ciudad nueva", () => {
    selectLocation();
    change("activation-departamento", "Amazonas");
    const city = byId("activation-ciudadCompleta");
    expect(city.props.value).toBe("");
    expect(hiddenCity().props.value).toBe("");
    expectButtonDisabled(html(), true);
    expect(elements(city).some((element) => element.type === "option" && element.props.value === "Tunja")).toBe(false);
    expect(elements(city).some((element) => element.type === "option" && element.props.value === "Leticia")).toBe(true);
    change("activation-ciudadCompleta", "Leticia");
    expect(hiddenCity().props.value).toBe("Leticia - Amazonas");
    expectButtonDisabled(html(), false);
  });

  it.each([false, true])("bloquea submit sin ubicación completa (departamento seleccionado: %s)", async (departmentSelected) => {
    if (departmentSelected) change("activation-departamento", "Boyacá");
    await submit({ prepareLocation: false, expectFormData: false });
    expect(mockActivateAccount).not.toHaveBeenCalled();
    expect(hiddenCity().props.value).toBe("");
    expectButtonDisabled(html(), true);
    expect(render().props["aria-busy"]).toBe(false);
  });

  it("muestra y oculta ambas contraseñas con controles independientes y accesibles", () => {
    const inputs = fillPasswords("Password1", "Password2");
    expect(byId("activation-password").props.type).toBe("password");
    expect(byId("activation-confirmPassword").props.type).toBe("password");
    togglePassword("Mostrar contraseña");
    expect(byId("activation-password").props.type).toBe("text");
    expect(byId("activation-confirmPassword").props.type).toBe("password");
    togglePassword("Mostrar confirmación de contraseña");
    expect(byId("activation-password").props.type).toBe("text");
    expect(byId("activation-confirmPassword").props.type).toBe("text");
    togglePassword("Ocultar contraseña");
    expect(byId("activation-password").props.type).toBe("password");
    expect(byId("activation-confirmPassword").props.type).toBe("text");
    togglePassword("Ocultar confirmación de contraseña");
    expect(byId("activation-confirmPassword").props.type).toBe("password");
    expect(inputs.passwordInput.value).toBe("Password1");
    expect(inputs.confirmationInput.value).toBe("Password2");
    expect(mockActivateAccount).not.toHaveBeenCalled();
  });

  it.each([
    ["", []],
    ["abcdefgh", ["Mínimo 8 caracteres", "Al menos una letra minúscula"]],
    ["Abcdefgh", ["Mínimo 8 caracteres", "Al menos una letra mayúscula", "Al menos una letra minúscula"]],
    ["Abcdefg1", requirementLabels],
  ] as const)("actualiza requisitos semánticos para %j sin exigir símbolo", (password, met) => {
    change("activation-password", password);
    expectRequirements(met);
    expect(byId("activation-password").props["aria-describedby"]).toContain("activation-password-help");
  });

  it("informa coincidencia sólo cuando la confirmación tiene contenido", () => {
    expect(elements(render()).some((element) => element.props.id === "activation-confirmPassword-match")).toBe(false);
    fillPasswords("Password1", "Password2");
    const mismatch = byId("activation-confirmPassword-match");
    expect(textContent(mismatch)).toBe("Las contraseñas no coinciden");
    expect(mismatch.props).toMatchObject({ role: "status", "aria-live": "polite" });
    expect(byId("activation-confirmPassword").props["aria-invalid"]).toBe(true);
    expect(byId("activation-confirmPassword").props["aria-describedby"]).toContain("activation-confirmPassword-match");
    change("activation-confirmPassword", "Password1");
    expect(textContent(byId("activation-confirmPassword-match"))).toBe("Las contraseñas coinciden");
    expect(byId("activation-confirmPassword").props["aria-invalid"]).toBe(false);
    change("activation-confirmPassword", "");
    expect(elements(render()).some((element) => element.props.id === "activation-confirmPassword-match")).toBe(false);
    expect(byId("activation-confirmPassword").props["aria-describedby"]).toBeUndefined();
  });

  it("envía FormData intacto, exclusivamente nonce y nueve campos", async () => {
    mockActivateAccount.mockResolvedValue({ ok: false, code: "INTERNAL_ERROR" });
    await submit();
    const sent = mockActivateAccount.mock.calls[0][0] as FormData;
    expect(mockActivateAccount).toHaveBeenCalledTimes(1);
    expect(Array.from(sent.keys()).sort()).toEqual(["csrfNonce", ...fieldNames].sort());
    expect(Object.fromEntries(sent.entries())).toEqual(formValues);
    for (const forbidden of ["departamento", "ciudad", "rawToken", "usuarioId", "role", "negocioId", "claimId", "cookie"]) {
      expect(sent.has(forbidden)).toBe(false);
    }
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
    const second = submit({ prepareLocation: false, prepareFields: false, expectFormData: false });
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
    await submit({ prepareLocation: false, prepareFields: false, expectFormData: false });
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

  it("tras error limpia refs, estados visuales y visibilidad sin reiniciar otros campos", async () => {
    selectLocation();
    change("activation-nombre", "María");
    change("activation-email", "persona@example.com");
    const inputs = fillPasswords();
    togglePassword("Mostrar contraseña");
    togglePassword("Mostrar confirmación de contraseña");
    expectRequirements(requirementLabels);
    expect(textContent(byId("activation-confirmPassword-match"))).toBe("Las contraseñas coinciden");
    mockActivateAccount.mockResolvedValue({ ok: false, code: "EMAIL_UNAVAILABLE" });
    await submit({ prepareFields: false });
    expectClearedPasswords(inputs);
    expect(html()).toContain("Este correo no está disponible.");
    expect(byId("activation-departamento").props.value).toBe("Boyacá");
    expect(byId("activation-ciudadCompleta").props.value).toBe("Tunja");
    expect(hiddenCity().props.value).toBe("Tunja - Boyacá");
    expect(controlNodes.get("activation-nombre")?.value).toBe("María");
    expect(controlNodes.get("activation-email")?.value).toBe("persona@example.com");
    const source = readFileSync(join(process.cwd(), "src/app/activar/ActivationForm.tsx"), "utf8");
    expect(source).not.toMatch(/\breset\s*\(|form\.reset/);
  });

  it("muestra espera accesible, conserva campos editables y vacía contraseñas", async () => {
    jest.useFakeTimers();
    const inputs = fillPasswords();
    togglePassword("Mostrar contraseña");
    togglePassword("Mostrar confirmación de contraseña");
    mockActivateAccount.mockResolvedValue({
      ok: false,
      code: "ACTIVATION_THROTTLED",
      retryAfterSeconds: 3,
    });

    await submit();
    const output = html();

    expect(output).toContain('role="status" aria-live="polite"');
    expect(output).toContain("Podrás continuar en 3 s.");
    expect(output).toContain("Intenta de nuevo en 3 s");
    expectButtonDisabled(output, true);
    expect(output).not.toMatch(/<fieldset[^>]*disabled/);
    expectClearedPasswords(inputs);
    expect(byId("activation-ciudadCompleta").props.disabled).toBe(false);
    change("activation-nombre", "Ana");
    expect(controlNodes.get("activation-nombre")?.value).toBe("Ana");
    expect(output).not.toMatch(/LIMITED|UNAVAILABLE|Redis|Upstash|infraestructura|rate limit/i);
    const source = readFileSync(join(process.cwd(), "src/app/activar/ActivationForm.tsx"), "utf8");
    expect(source).not.toMatch(/\breset\s*\(|form\.reset/);
  });

  it("descuenta cada segundo y permite reintento manual al llegar a cero", async () => {
    jest.useFakeTimers();
    mockActivateAccount.mockResolvedValue({
      ok: false,
      code: "ACTIVATION_THROTTLED",
      retryAfterSeconds: 3,
    });

    await submit();
    expect(html()).toContain("Intenta de nuevo en 3 s");
    await submit({ prepareLocation: false, prepareFields: false, expectFormData: false });
    expect(mockActivateAccount).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(html()).toContain("Intenta de nuevo en 2 s");
    jest.advanceTimersByTime(1000);
    expect(html()).toContain("Intenta de nuevo en 1 s");
    jest.advanceTimersByTime(1000);
    const finished = html();
    expect(finished).not.toContain('role="status"');
    expect(finished).toContain("Activar mi cuenta");
    expectButtonDisabled(finished, false);
    expect(jest.getTimerCount()).toBe(0);
    expect(mockActivateAccount).toHaveBeenCalledTimes(1);

    mockActivateAccount.mockResolvedValueOnce({ ok: false, code: "INTERNAL_ERROR" });
    await submit();
    expect(mockActivateAccount).toHaveBeenCalledTimes(2);
  });

  it("reemplaza el countdown anterior por el nuevo valor tras reintentar", async () => {
    jest.useFakeTimers();
    mockActivateAccount
      .mockResolvedValueOnce({ ok: false, code: "ACTIVATION_THROTTLED", retryAfterSeconds: 3 })
      .mockResolvedValueOnce({ ok: false, code: "ACTIVATION_THROTTLED", retryAfterSeconds: 5 });

    await submit();
    html();
    for (let second = 0; second < 3; second += 1) {
      jest.advanceTimersByTime(1000);
      html();
    }
    expectButtonDisabled(html(), false);

    await submit();
    const output = html();
    expect(output).toContain("Intenta de nuevo en 5 s");
    expect(output).not.toContain("8 s");
    expect(mockActivateAccount).toHaveBeenCalledTimes(2);
  });

  it("mantiene un solo timer y lo limpia al desmontar", async () => {
    jest.useFakeTimers();
    mockActivateAccount.mockResolvedValue({
      ok: false,
      code: "ACTIVATION_THROTTLED",
      retryAfterSeconds: 3,
    });

    await submit();
    html();
    html();
    expect(jest.getTimerCount()).toBe(1);

    jest.advanceTimersByTime(1000);
    html();
    expect(jest.getTimerCount()).toBe(1);

    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([
    [0, "1 s"],
    [-10, "1 s"],
    [Number.NaN, "1 s"],
    [1.2, "2 s"],
    [10_000, "60 min"],
  ])("normaliza retryAfterSeconds %s a %s", async (retryAfterSeconds, expected) => {
    jest.useFakeTimers();
    mockActivateAccount.mockResolvedValue({
      ok: false,
      code: "ACTIVATION_THROTTLED",
      retryAfterSeconds,
    });

    await submit();
    const output = html();
    expect(output).toContain(`Intenta de nuevo en ${expected}`);
    expectButtonDisabled(output, true);
  });

  it.each([
    [1, "1 s"],
    [45, "45 s"],
    [60, "1 min"],
    [61, "1 min 1 s"],
    [120, "2 min"],
  ])("formatea %s segundos como %s", async (retryAfterSeconds, expected) => {
    jest.useFakeTimers();
    mockActivateAccount.mockResolvedValue({
      ok: false,
      code: "ACTIVATION_THROTTLED",
      retryAfterSeconds,
    });

    await submit();
    expect(html()).toContain(`Intenta de nuevo en ${expected}`);
  });

  it("no renderiza bearer, cookie, IDs ni password enviados", async () => {
    const sensitive = {
      rawToken: "RAW_TOKEN_SHOULD_NEVER_RENDER",
      cookie: "COOKIE_VALUE_SHOULD_NEVER_RENDER",
      usuarioId: "USUARIO_ID_SHOULD_NEVER_RENDER",
      claimId: "CLAIM_ID_SHOULD_NEVER_RENDER",
    };
    mockActivateAccount.mockResolvedValue({ ok: false, code: "INTERNAL_ERROR", ...sensitive });
    await submit();
    const output = html();
    for (const secret of [...Object.values(sensitive), formValues.password, formValues.confirmPassword]) {
      expect(output).not.toContain(secret);
    }
    expect(output.match(new RegExp(csrfNonce, "g"))).toHaveLength(1);
    expect(output).not.toMatch(/data-(csrf|token|cookie|usuario|claim)/i);
    expect(byId("activation-departamento").props.name).toBeUndefined();
    expect(byId("activation-ciudadCompleta").props.name).toBeUndefined();
  });
});
