import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockCancelManagedReservation = jest.fn();
const mockUseState = jest.fn();
const mockUseRef = jest.fn();

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: mockUseState,
  useRef: mockUseRef,
}));
jest.mock("react-icons/fa", () => ({
  FaSpinner: () => null,
}));
jest.mock(
  "@/reservas/actions/cancelManagedReservation",
  () => ({
    cancelManagedReservation: mockCancelManagedReservation,
  }),
  { virtual: true },
);

import ManagedReservationCancelForm from "./ManagedReservationCancelForm";

type TestElement = {
  type: unknown;
  props: Record<string, unknown> & {
    children?: unknown;
    onClick?: (event?: { stopPropagation: () => void }) => unknown;
  };
};

const CANCELLED_RESULT = {
  ok: true,
  code: "RESERVATION_CANCELLED",
  message: "Tu reserva fue cancelada correctamente.",
} as const;

let stateSlots: unknown[];
let refSlots: Array<{ current: unknown }>;
let stateCursor: number;
let refCursor: number;

function isTestElement(value: unknown): value is TestElement {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "props" in value
  );
}

function collectElements(value: unknown): TestElement[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectElements);
  }

  if (!isTestElement(value)) {
    return [];
  }

  return [value, ...collectElements(value.props.children)];
}

function textContent(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(textContent).join("");
  }

  return isTestElement(value) ? textContent(value.props.children) : "";
}

function renderComponent(): TestElement {
  stateCursor = 0;
  refCursor = 0;
  return ManagedReservationCancelForm() as unknown as TestElement;
}

function findButton(tree: TestElement, label: string): TestElement {
  const button = collectElements(tree).find(
    (element) => element.type === "button" && textContent(element) === label,
  );

  if (!button) {
    throw new Error(`Button not found: ${label}`);
  }

  return button;
}

function findByRole(tree: TestElement, role: string): TestElement | null {
  return (
    collectElements(tree).find((element) => element.props.role === role) ?? null
  );
}

function click(element: TestElement): unknown {
  return element.props.onClick?.({ stopPropagation: () => undefined });
}

async function openAndConfirm(): Promise<TestElement> {
  let tree = renderComponent();
  click(findButton(tree, "Cancelar reserva"));
  tree = renderComponent();
  await click(findButton(tree, "Confirmar cancelación"));
  return renderComponent();
}

describe("ManagedReservationCancelForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stateSlots = [];
    refSlots = [];
    stateCursor = 0;
    refCursor = 0;

    mockUseState.mockImplementation((initialValue: unknown) => {
      const slot = stateCursor;
      stateCursor += 1;

      if (!(slot in stateSlots)) {
        stateSlots[slot] =
          typeof initialValue === "function"
            ? (initialValue as () => unknown)()
            : initialValue;
      }

      const setValue = (nextValue: unknown) => {
        stateSlots[slot] =
          typeof nextValue === "function"
            ? (nextValue as (current: unknown) => unknown)(stateSlots[slot])
            : nextValue;
      };

      return [stateSlots[slot], setValue];
    });

    mockUseRef.mockImplementation((initialValue: unknown) => {
      const slot = refCursor;
      refCursor += 1;

      if (!(slot in refSlots)) {
        refSlots[slot] = { current: initialValue };
      }

      return refSlots[slot];
    });

    mockCancelManagedReservation.mockResolvedValue(CANCELLED_RESULT);
  });

  it("es un Client Component sin props ni locators de autoridad", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/reservas/componentes/ManagedReservationCancelForm.tsx",
      ),
      "utf8",
    );

    expect(source.startsWith('"use client";')).toBe(true);
    expect(source).toContain(
      "export default function ManagedReservationCancelForm()",
    );
    expect(ManagedReservationCancelForm.length).toBe(0);
    expect(source).not.toMatch(
      /reservationId|capabilityId|negocioId|usuarioId|FormData|type=["']hidden["']|data-(?:reservation|capability)/,
    );
  });

  it("el primer click abre confirmación sin invocar la action", () => {
    let tree = renderComponent();

    click(findButton(tree, "Cancelar reserva"));
    tree = renderComponent();

    expect(mockCancelManagedReservation).not.toHaveBeenCalled();
    expect(findByRole(tree, "alertdialog")).not.toBeNull();
    expect(textContent(tree)).toContain("Cancelar reserva");
    expect(textContent(tree)).toContain(
      "¿Estás seguro de que deseas cancelar esta reserva?",
    );
    expect(textContent(tree)).toContain(
      "Esta acción no se puede deshacer desde esta página.",
    );
  });

  it("Volver cierra la confirmación sin llamar la action", () => {
    let tree = renderComponent();
    click(findButton(tree, "Cancelar reserva"));
    tree = renderComponent();

    click(findButton(tree, "Volver"));
    tree = renderComponent();

    expect(findByRole(tree, "alertdialog")).toBeNull();
    expect(mockCancelManagedReservation).not.toHaveBeenCalled();
  });

  it("confirma exactamente una vez y sin argumentos", async () => {
    const tree = await openAndConfirm();

    expect(mockCancelManagedReservation).toHaveBeenCalledTimes(1);
    expect(mockCancelManagedReservation.mock.calls[0]).toEqual([]);
    expect(findByRole(tree, "alertdialog")).toBeNull();
  });

  it("impide doble submit con guard síncrono y deshabilita ambos botones", async () => {
    let resolveAction!: (value: typeof CANCELLED_RESULT) => void;
    const pendingAction = new Promise<typeof CANCELLED_RESULT>((resolve) => {
      resolveAction = resolve;
    });
    mockCancelManagedReservation.mockReturnValue(pendingAction);

    let tree = renderComponent();
    click(findButton(tree, "Cancelar reserva"));
    tree = renderComponent();
    const confirmButton = findButton(tree, "Confirmar cancelación");

    const firstSubmit = click(confirmButton) as Promise<void>;
    const duplicateSubmit = click(confirmButton) as Promise<void> | undefined;

    expect(mockCancelManagedReservation).toHaveBeenCalledTimes(1);

    tree = renderComponent();
    const pendingButton = findButton(tree, "Cancelando...");
    const backButton = findButton(tree, "Volver");
    expect(pendingButton.props.disabled).toBe(true);
    expect(backButton.props.disabled).toBe(true);
    expect(findByRole(tree, "alertdialog")?.props["aria-busy"]).toBe(true);

    click(pendingButton);
    expect(mockCancelManagedReservation).toHaveBeenCalledTimes(1);

    resolveAction(CANCELLED_RESULT);
    await firstSubmit;
    await duplicateSubmit;
  });

  it.each([
    ["RESERVATION_CANCELLED", "Tu reserva fue cancelada correctamente."],
    ["RESERVATION_ALREADY_CANCELLED", "Esta reserva ya fue cancelada."],
  ])("trata %s como éxito terminal", async (code, message) => {
    mockCancelManagedReservation.mockResolvedValue({
      ok: true,
      code,
      message,
    });

    const tree = await openAndConfirm();

    expect(textContent(tree)).toContain(message);
    expect(findByRole(tree, "status")?.props.className).toContain("green");
    expect(
      collectElements(tree).some((element) => element.type === "button"),
    ).toBe(false);
  });

  it.each([
    [
      "RESERVATION_ACCESS_DENIED",
      "No se puede acceder a la gestión de esta reserva.",
    ],
    ["RESERVATION_NOT_AVAILABLE", "Esta reserva ya no se puede cancelar."],
  ])("trata %s como error terminal sin retry", async (code, message) => {
    mockCancelManagedReservation.mockResolvedValue({
      ok: false,
      code,
      message,
    });

    const tree = await openAndConfirm();

    expect(textContent(tree)).toContain(message);
    expect(findByRole(tree, "status")?.props.className).toContain("red");
    expect(
      collectElements(tree).some((element) => element.type === "button"),
    ).toBe(false);
  });

  it("INTERNAL_ERROR muestra mensaje controlado y permite retry explícito", async () => {
    mockCancelManagedReservation.mockResolvedValue({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "No pudimos procesar la cancelación. Inténtalo nuevamente.",
    });

    let tree = await openAndConfirm();

    expect(textContent(tree)).toContain(
      "No pudimos procesar la cancelación. Inténtalo nuevamente.",
    );
    const retryButton = findButton(tree, "Reintentar cancelación");
    click(retryButton);
    tree = renderComponent();

    expect(findByRole(tree, "alertdialog")).not.toBeNull();
    expect(mockCancelManagedReservation).toHaveBeenCalledTimes(1);
  });

  it("una excepción no rompe UI, oculta detalles y permite retry", async () => {
    mockCancelManagedReservation.mockRejectedValue(
      new Error("private provider and database detail"),
    );

    const tree = await openAndConfirm();
    const renderedText = textContent(tree);

    expect(renderedText).toContain(
      "No pudimos procesar la cancelación. Inténtalo nuevamente.",
    );
    expect(renderedText).not.toContain("provider");
    expect(renderedText).not.toContain("database");
    expect(findButton(tree, "Reintentar cancelación")).toBeDefined();
  });

  it("no usa cookies, storage, Origin, auth, PUBLISHED, logs ni payload", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/reservas/componentes/ManagedReservationCancelForm.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("await cancelManagedReservation()");
    expect(source.match(/cancelManagedReservation\(/g)).toHaveLength(1);
    expect(source).not.toMatch(
      /cookies\(|document\.cookie|localStorage|sessionStorage|\bauth\(|PUBLISHED|Origin|console\./,
    );
    expect(source).not.toMatch(/\btoken\b|capabilityId|reservationId/);
  });

  it("no puede renderizar IDs o tokens sintéticos porque no recibe props", () => {
    const tree = renderComponent();
    const htmlLikeText = textContent(tree);

    expect(htmlLikeText).not.toContain("reservation-secret-id");
    expect(htmlLikeText).not.toContain("capability-secret-id");
    expect(htmlLikeText).not.toContain("raw-secret-token");
    expect(
      collectElements(tree).some(
        (element) =>
          element.props["data-reservation-id"] !== undefined ||
          element.props["data-capability-id"] !== undefined,
      ),
    ).toBe(false);
  });
});
