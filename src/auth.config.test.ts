const mockUsuarioFindUnique = jest.fn();
const mockCompareSync = jest.fn();

jest.mock("./lib/prisma", () => ({
  __esModule: true,
  default: {
    usuario: { findUnique: mockUsuarioFindUnique },
  },
}));
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: { compareSync: mockCompareSync },
}));
jest.mock("next-auth/providers/google", () => ({
  __esModule: true,
  default: jest.fn(() => ({ id: "google" })),
}));
jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn((options) => ({ id: "credentials", ...options })),
}));
jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    signIn: jest.fn(),
    signOut: jest.fn(),
    auth: jest.fn(),
    handlers: {},
  })),
}));

import { authConfig } from "./auth.config";

type Authorize = (credentials: {
  email: string;
  password: string;
}) => Promise<unknown>;

const credentialsProvider = authConfig.providers.find(
  (provider) =>
    typeof provider === "object" &&
    provider !== null &&
    "id" in provider &&
    provider.id === "credentials",
) as unknown as { authorize: Authorize } | undefined;

if (!credentialsProvider) {
  throw new Error("Credentials provider missing from real auth config");
}

const authorize = credentialsProvider.authorize;
const user = {
  id: "usuario-1",
  nombre: "Persona",
  apellido: "Prueba",
  email: "persona@example.com",
  role: "user",
  ciudad: "Tunja",
  contraseña: "synthetic-bcrypt-hash",
  isPlaceholder: false,
};

describe("Credentials authorize", () => {
  beforeEach(() => {
    mockUsuarioFindUnique.mockReset();
    mockCompareSync.mockReset();
  });

  it("blocks a placeholder before comparing even a matching password", async () => {
    mockUsuarioFindUnique.mockResolvedValue({ ...user, isPlaceholder: true });
    mockCompareSync.mockReturnValue(true);

    await expect(
      authorize({ email: user.email, password: "Password1!" }),
    ).resolves.toBeNull();
    expect(mockCompareSync).not.toHaveBeenCalled();
  });

  it("blocks a legacy placeholder regardless of the supplied password", async () => {
    mockUsuarioFindUnique.mockResolvedValue({
      ...user,
      email: "cafeteria@myckeo.com",
      isPlaceholder: true,
    });

    await expect(
      authorize({ email: "cafeteria@myckeo.com", password: "anything" }),
    ).resolves.toBeNull();
    expect(mockCompareSync).not.toHaveBeenCalled();
  });

  it("keeps activated-user authentication and response shape unchanged", async () => {
    mockUsuarioFindUnique.mockResolvedValue(user);
    mockCompareSync.mockReturnValue(true);

    await expect(
      authorize({ email: "PERSONA@EXAMPLE.COM", password: "Password1!" }),
    ).resolves.toEqual({
      id: user.id,
      name: user.nombre,
      apellido: user.apellido,
      email: user.email,
      role: user.role,
      ciudad: user.ciudad,
    });
    expect(mockUsuarioFindUnique).toHaveBeenCalledWith({
      where: { email: user.email },
    });
    expect(mockCompareSync).toHaveBeenCalledWith(
      "Password1!",
      user.contraseña,
    );
  });

  it("still rejects a wrong password for an activated user", async () => {
    mockUsuarioFindUnique.mockResolvedValue(user);
    mockCompareSync.mockReturnValue(false);

    await expect(
      authorize({ email: user.email, password: "incorrect" }),
    ).resolves.toBeNull();
    expect(mockCompareSync).toHaveBeenCalledTimes(1);
  });

  it("still rejects a missing user before comparing passwords", async () => {
    mockUsuarioFindUnique.mockResolvedValue(null);

    await expect(
      authorize({ email: user.email, password: "Password1!" }),
    ).resolves.toBeNull();
    expect(mockCompareSync).not.toHaveBeenCalled();
  });
});
