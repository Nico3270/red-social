import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentProps } from "react";

import type AddReservationModal from "./AddReservationModal";

const source = readFileSync(
  join(process.cwd(), "src/reservas/componentes/AddReservationModal.tsx"),
  "utf8",
);

const contextType = source.slice(
  source.indexOf("type ReservationSubmitContext"),
  source.indexOf("type ReservationSubmitResult"),
);
const contextResolver = source.slice(
  source.indexOf("function resolveReservationSubmitContext"),
  source.indexOf("async function submitReservation"),
);
const dispatcher = source.slice(
  source.indexOf("async function submitReservation"),
  source.indexOf("// Schema Zod"),
);
const publicBranch = dispatcher.slice(
  dispatcher.indexOf('case "public"'),
  dispatcher.indexOf('case "owner-create"'),
);
const ownerCreateBranch = dispatcher.slice(
  dispatcher.indexOf('case "owner-create"'),
  dispatcher.indexOf('case "owner-edit"'),
);
const ownerEditBranch = dispatcher.slice(dispatcher.indexOf('case "owner-edit"'));
const ownerStatusUi = source.slice(
  source.indexOf('{submitContext?.kind === "owner-create"'),
  source.indexOf('{submitContext?.kind !== "owner-create"'),
);
const submitHandler = source.slice(
  source.indexOf("const onSubmit:"),
  source.indexOf("  return ("),
);

type AddReservationModalProps = ComponentProps<typeof AddReservationModal>;

const baseProps = {
  negocioId: "business-a",
  horaInicio: "2026-08-20T14:00:00.000Z",
  horaFin: "2026-08-20T15:00:00.000Z",
  onClose: () => undefined,
} satisfies AddReservationModalProps;

const publicProps = {
  ...baseProps,
  publicSlug: "presttigio-restaurante-rooftop-tunja-hhg6",
} satisfies AddReservationModalProps;

describe("AddReservationModal secure boundary dispatcher", () => {
  it("define los tres contextos tipados sin autoridad del negocio cliente", () => {
    expect(contextType).toContain('kind: "public";');
    expect(contextType).toContain("slug: string;");
    expect(contextType).toContain('kind: "owner-create";');
    expect(contextType).toContain('kind: "owner-edit";');
    expect(contextType).toContain("reservationId: string;");
    expect(contextType).not.toContain("negocioId");
  });

  it("resuelve public, owner-edit y owner-create desde props estructurales", () => {
    expect(contextResolver).toContain(
      'if (normalizedSlug) return { kind: "public", slug: normalizedSlug };',
    );
    expect(contextResolver).toContain(
      'return { kind: "owner-edit", reservationId: normalizedReservationId };',
    );
    expect(contextResolver).toContain('return { kind: "owner-create" };');
  });

  it("falla cerrado si publicSlug y reservationId existen simultáneamente", () => {
    expect(contextResolver).toContain(
      "if (normalizedSlug && normalizedReservationId) return null;",
    );
    expect(submitHandler).toMatch(
      /const result = submitContext\s*\? await submitReservation\(submitContext, formData\)\s*: INVALID_CONTEXT_RESULT;/,
    );
  });

  it("importa sólo los tres boundaries seguros y elimina el legacy", () => {
    expect(source).toContain(
      'import { createPublicReservation } from "../actions/createPublicReservation";',
    );
    expect(source).toContain(
      'import { createOwnerReservation } from "../actions/createOwnerReservation";',
    );
    expect(source).toContain(
      'import { updateOwnerReservation } from "../actions/updateOwnerReservation";',
    );
    expect(source).not.toContain("createEditarReserva");
    expect(source).not.toContain("changeStatusReservations");
  });

  it("despacha public una vez con payload explícito mínimo", () => {
    expect(dispatcher.match(/createPublicReservation\(/g)).toHaveLength(1);
    expect(publicBranch).toMatch(
      /createPublicReservation\(\{\s*slug: context\.slug,\s*nombre: formData\.nombre,\s*telefono,\s*fechaHoraInicio: formData\.fechaHoraInicio,\s*fechaHoraFin,\s*notas,\s*\}\)/,
    );
    expect(publicBranch).not.toMatch(/negocioId|usuarioId|estado|\bid:/);
    expect(publicBranch).not.toContain("createOwnerReservation");
    expect(publicBranch).not.toContain("updateOwnerReservation");
  });

  it("despacha owner-create sólo con PENDIENTE o CONFIRMADA", () => {
    expect(dispatcher.match(/createOwnerReservation\(/g)).toHaveLength(1);
    expect(ownerCreateBranch).toContain(
      'formData.estado !== "PENDIENTE"',
    );
    expect(ownerCreateBranch).toContain(
      'formData.estado !== "CONFIRMADA"',
    );
    expect(ownerCreateBranch).toMatch(
      /createOwnerReservation\(\{\s*nombre: formData\.nombre,\s*telefono,\s*fechaHoraInicio: formData\.fechaHoraInicio,\s*fechaHoraFin,\s*notas,\s*estado: formData\.estado,\s*\}\)/,
    );
    expect(ownerCreateBranch).not.toMatch(/negocioId|usuarioId|slug|\bid:/);
  });

  it("despacha owner-edit sin estado ni negocioId", () => {
    expect(dispatcher.match(/updateOwnerReservation\(/g)).toHaveLength(1);
    expect(ownerEditBranch).toMatch(
      /updateOwnerReservation\(\{\s*id: context\.reservationId,\s*nombre: formData\.nombre,\s*telefono,\s*fechaHoraInicio: formData\.fechaHoraInicio,\s*fechaHoraFin,\s*notas,\s*\}\)/,
    );
    expect(ownerEditBranch).not.toMatch(/negocioId|usuarioId|estado|slug/);
  });

  it("muestra estado editable únicamente para owner-create y sólo dos opciones", () => {
    expect(ownerStatusUi).toContain(
      'submitContext?.kind === "owner-create"',
    );
    expect(ownerStatusUi).toContain('<option value="PENDIENTE">');
    expect(ownerStatusUi).toContain('<option value="CONFIRMADA">');
    expect(ownerStatusUi.match(/<option /g)).toHaveLength(2);
    expect(ownerStatusUi).not.toMatch(/CANCELADA|COMPLETADA|BLOQUEADA/);
    expect(source).toContain(
      'submitContext?.kind !== "owner-create"',
    );
  });

  it("preserva fechaHoraFin recibida y normaliza únicamente ausencia a null", () => {
    expect(dispatcher).toContain(
      "const fechaHoraFin = formData.fechaHoraFin ?? null;",
    );
    expect(publicBranch).toContain("fechaHoraFin,");
    expect(ownerCreateBranch).toContain("fechaHoraFin,");
    expect(ownerEditBranch).toContain("fechaHoraFin,");
  });

  it("unifica feedback, success, error, excepción y loading", () => {
    expect(submitHandler).toContain("setLoading(true)");
    expect(submitHandler).toContain("setResponseMessage(result.message)");
    expect(submitHandler).toContain("setIsError(!result.ok)");
    expect(submitHandler).toContain("if (result.ok)");
    expect(submitHandler).toContain("if (onSuccess) onSuccess()");
    expect(submitHandler).toContain("catch {");
    expect(submitHandler).toContain(
      "setResponseMessage(INVALID_CONTEXT_RESULT.message)",
    );
    expect(submitHandler).toMatch(/finally \{\s*setLoading\(false\);/);
    expect(source).toContain("disabled={loading || submitted}");
  });

  it("no expone capability, token ni URL de gestión al cliente", () => {
    expect(source).not.toMatch(
      /capabilityToken|tokenHash|managementUrl|reservation-capability/,
    );
  });

  it("elimina roleUser y conserva negocioId sólo como prop compatible", () => {
    expect(source).not.toContain("roleUser");
    expect(source.match(/\bnegocioId\b/g)).toHaveLength(1);
    expect(source).toContain("negocioId?: string;");
  });

  it("mantiene callers sin publicSlug y acepta el publicSlug real", () => {
    expect(baseProps).not.toHaveProperty("publicSlug");
    expect(publicProps.publicSlug).toBe(
      "presttigio-restaurante-rooftop-tunja-hhg6",
    );
  });
});
