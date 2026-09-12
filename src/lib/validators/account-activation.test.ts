import { readFileSync } from "node:fs";
import { join } from "node:path";

import { validateAccountActivationInput } from "./account-activation";

const fixedNow = new Date(2026, 8, 12, 12, 0, 0, 0);

function validInput() {
  return {
    nombre: "  María José  ",
    apellido: "  Muñoz Peña  ",
    email: "  PERSONA@Example.COM  ",
    username: "  Mi_Usuario7  ",
    ciudadCompleta: "  Tunja  -  Boyacá  ",
    genero: "otro",
    fechaNacimiento: "2000-05-20",
    password: "Password1!",
    confirmPassword: "Password1!",
  };
}

function expectInvalidField(
  input: unknown,
  field: string,
  now: Date = fixedNow,
): void {
  const result = validateAccountActivationInput(input, now);

  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error("Expected validation to fail");
  }

  expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(
    true,
  );
}

describe("account activation validator", () => {
  it("valida y normaliza el formulario completo", () => {
    const result = validateAccountActivationInput(validInput(), fixedNow);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected validation to succeed");
    }

    expect(result.data).toEqual({
      nombre: "María José",
      apellido: "Muñoz Peña",
      email: "persona@example.com",
      username: "mi_usuario7",
      ciudadCompleta: "Tunja - Boyacá",
      genero: "otro",
      fechaNacimiento: expect.any(Date),
      password: "Password1!",
      confirmPassword: "Password1!",
    });
    expect(result.data.fechaNacimiento.getFullYear()).toBe(2000);
    expect(result.data.fechaNacimiento.getMonth()).toBe(4);
    expect(result.data.fechaNacimiento.getDate()).toBe(20);
  });

  it.each([
    "nombre",
    "apellido",
    "email",
    "username",
    "ciudadCompleta",
    "genero",
    "fechaNacimiento",
    "password",
    "confirmPassword",
  ])("requiere el campo %s", (field) => {
    const input: Record<string, unknown> = validInput();
    delete input[field];

    expectInvalidField(input, field);
  });

  it.each(["csrfNonce", "usuarioId", "rawToken"])(
    "rechaza el campo extra %s",
    (field) => {
      const result = validateAccountActivationInput(
        {
          ...validInput(),
          [field]: "not-allowed",
        },
        fixedNow,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        throw new Error("Expected strict validation to fail");
      }
      expect(result.error.issues.some((issue) => issue.code === "unrecognized_keys")).toBe(
        true,
      );
    },
  );

  describe.each(["nombre", "apellido"] as const)("%s", (field) => {
    it.each([
      ["empty", ""],
      ["one character", "A"],
      ["over 50", "A".repeat(51)],
      ["number", "Persona2"],
      ["control character", "Ana\nMaría"],
      ["punctuation", "Ana-María"],
      ["wrong type", ["Ana"]],
    ])("rechaza %s", (_label, value) => {
      expectInvalidField(
        {
          ...validInput(),
          [field]: value,
        },
        field,
      );
    });

    it("acepta acentos, ñ y espacios y aplica trim", () => {
      const result = validateAccountActivationInput(
        {
          ...validInput(),
          [field]: "  Ángela María Peña  ",
        },
        fixedNow,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error("Expected accented name to pass");
      }
      expect(result.data[field]).toBe("Ángela María Peña");
    });
  });

  describe("email", () => {
    it.each([
      ["empty", ""],
      ["invalid", "not-an-email"],
      ["over 254", `${"a".repeat(243)}@example.com`],
      ["control character", "person\n@example.com"],
      ["wrong type", { address: "person@example.com" }],
    ])("rechaza %s", (_label, email) => {
      expectInvalidField({ ...validInput(), email }, "email");
    });

    it("normaliza mixed case y whitespace exterior", () => {
      const result = validateAccountActivationInput(
        {
          ...validInput(),
          email: "  Mixed.Case@Example.COM  ",
        },
        fixedNow,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error("Expected email to pass");
      }
      expect(result.data.email).toBe("mixed.case@example.com");
    });
  });

  describe("username", () => {
    it.each([
      ["under 3", "ab"],
      ["over 30", "a".repeat(31)],
      ["internal space", "user name"],
      ["hyphen", "user-name"],
      ["unicode", "usuário"],
      ["control character", "user\tname"],
      ["wrong type", 12345],
    ])("rechaza %s", (_label, username) => {
      expectInvalidField({ ...validInput(), username }, "username");
    });

    it("normaliza mixed case, trim y conserva underscore", () => {
      const result = validateAccountActivationInput(
        {
          ...validInput(),
          username: "  User_Name9  ",
        },
        fixedNow,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error("Expected username to pass");
      }
      expect(result.data.username).toBe("user_name9");
    });
  });

  describe("ciudadCompleta", () => {
    it("acepta y canoniza Ciudad - Departamento", () => {
      const result = validateAccountActivationInput(
        {
          ...validInput(),
          ciudadCompleta: "  Tunja  -  Boyacá  ",
        },
        fixedNow,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error("Expected city to pass");
      }
      expect(result.data.ciudadCompleta).toBe("Tunja - Boyacá");
    });

    it.each([
      ["missing separator", "Tunja"],
      ["missing department", "Tunja -"],
      ["missing city", "- Boyacá"],
      ["third part", "Tunja - Boyacá - Colombia"],
      ["wrong separator", "Tunja-Boyacá"],
      ["control character", "Tunja\n - Boyacá"],
      ["over 200", `${"C".repeat(190)} - ${"D".repeat(20)}`],
      ["wrong type", ["Tunja", "Boyacá"]],
    ])("rechaza %s", (_label, ciudadCompleta) => {
      expectInvalidField(
        { ...validInput(), ciudadCompleta },
        "ciudadCompleta",
      );
    });
  });

  describe("genero", () => {
    it.each(["masculino", "femenino", "otro"])(
      "acepta exactamente %s",
      (genero) => {
        const result = validateAccountActivationInput(
          { ...validInput(), genero },
          fixedNow,
        );

        expect(result.success).toBe(true);
        if (!result.success) {
          throw new Error("Expected gender to pass");
        }
        expect(result.data.genero).toBe(genero);
      },
    );

    it.each(["Masculino", "no-binario", "", 1])(
      "rechaza %p",
      (genero) => {
        expectInvalidField({ ...validInput(), genero }, "genero");
      },
    );
  });

  describe("fechaNacimiento", () => {
    it.each([
      "2026-02-30",
      "2026-13-01",
      "abc",
      "31/12/2000",
      "2000-2-01",
      "2000-02-1",
      " 2000-02-01 ",
      "2000-00-01",
    ])("rechaza fecha inválida %s", (fechaNacimiento) => {
      expectInvalidField(
        { ...validInput(), fechaNacimiento },
        "fechaNacimiento",
      );
    });

    it("rechaza una fecha futura", () => {
      expectInvalidField(
        { ...validInput(), fechaNacimiento: "2026-09-13" },
        "fechaNacimiento",
      );
    });

    it("acepta una fecha calendario válida y retorna Date local", () => {
      const result = validateAccountActivationInput(
        { ...validInput(), fechaNacimiento: "2004-02-29" },
        fixedNow,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error("Expected leap date to pass");
      }
      expect(result.data.fechaNacimiento).toBeInstanceOf(Date);
      expect(result.data.fechaNacimiento.getFullYear()).toBe(2004);
      expect(result.data.fechaNacimiento.getMonth()).toBe(1);
      expect(result.data.fechaNacimiento.getDate()).toBe(29);
      expect(result.data.fechaNacimiento.getHours()).toBe(0);
    });
  });

  describe("edad mínima", () => {
    it("acepta exactamente 13 años", () => {
      const result = validateAccountActivationInput(
        { ...validInput(), fechaNacimiento: "2013-09-12" },
        fixedNow,
      );

      expect(result.success).toBe(true);
    });

    it("rechaza un día antes de cumplir 13", () => {
      expectInvalidField(
        { ...validInput(), fechaNacimiento: "2013-09-13" },
        "fechaNacimiento",
      );
    });

    it("acepta una persona mayor de 13", () => {
      const result = validateAccountActivationInput(
        { ...validInput(), fechaNacimiento: "2008-12-31" },
        fixedNow,
      );

      expect(result.success).toBe(true);
    });

    it("usa el now inyectado sin depender del reloj real", () => {
      const input = { ...validInput(), fechaNacimiento: "2013-09-12" };
      const beforeBirthday = new Date(2026, 8, 11, 23, 59, 59, 999);
      const onBirthday = new Date(2026, 8, 12, 0, 0, 0, 0);

      expect(validateAccountActivationInput(input, beforeBirthday).success).toBe(
        false,
      );
      expect(validateAccountActivationInput(input, onBirthday).success).toBe(
        true,
      );
    });
  });

  describe("password", () => {
    it.each([
      ["under 8", "Pass1!"],
      ["without uppercase", "password1!"],
      ["without lowercase", "PASSWORD1!"],
      ["without number", "Password!"],
      ["space", "Password 1!"],
      ["unsupported character", "Password1#"],
      ["unicode", "Pássword1!"],
      ["over 72 bytes", `Aa1!${"a".repeat(69)}`],
      ["wrong type", 12345678],
    ])("rechaza %s", (_label, password) => {
      expectInvalidField(
        {
          ...validInput(),
          password,
          confirmPassword: password,
        },
        "password",
      );
    });

    it("acepta exactamente 72 bytes ASCII", () => {
      const password = `Aa1!${"a".repeat(68)}`;
      const result = validateAccountActivationInput(
        { ...validInput(), password, confirmPassword: password },
        fixedNow,
      );

      expect(Buffer.byteLength(password, "utf8")).toBe(72);
      expect(result.success).toBe(true);
    });
  });

  describe("confirmPassword", () => {
    it("asocia el mismatch a confirmPassword", () => {
      expectInvalidField(
        { ...validInput(), confirmPassword: "Different1!" },
        "confirmPassword",
      );
    });

    it("rechaza confirmación vacía", () => {
      expectInvalidField(
        { ...validInput(), confirmPassword: "" },
        "confirmPassword",
      );
    });

    it("preserva password y confirmación sin trim", () => {
      const result = validateAccountActivationInput(validInput(), fixedNow);

      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error("Expected passwords to pass");
      }
      expect(result.data.password).toBe("Password1!");
      expect(result.data.confirmPassword).toBe("Password1!");
    });
  });

  it("es un módulo puro sin DB, red, cookies, entorno, bcrypt o logging", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/validators/account-activation.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/@\/lib\/prisma|PrismaClient|@prisma\/client/);
    expect(source).not.toMatch(/findUnique|findFirst|create|update|delete|\$transaction/);
    expect(source).not.toMatch(/fetch\s*\(|XMLHttpRequest|WebSocket/);
    expect(source).not.toMatch(/next\/|cookies\s*\(|headers\s*\(|auth\.config/);
    expect(source).not.toMatch(/bcrypt|process\.env|console\.|logger/);
    expect(source).not.toMatch(/csrfNonce|rawToken|usuarioId|claimId|negocioId/);
    expect(source).toContain('Buffer.byteLength(value, "utf8")');
  });
});
