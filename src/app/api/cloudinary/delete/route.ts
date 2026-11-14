import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCloudinaryActor,
  isSameOriginCloudinaryRequest,
} from "@/lib/cloudinary/cloudinaryRequestAuthorization";
import {
  cloudinaryDeletePayloadSchema,
  parseCloudinaryDeletionUrl,
} from "@/lib/cloudinary/cloudinaryDeletionReference";
import {
  verifyTemporaryUploadAuthorization,
  UPLOAD_OWNER_CONTEXT_KEY,
} from "@/lib/cloudinary/temporaryUploadAuthorization";
import { isCloudinaryAssetReferenced } from "@/lib/cloudinary/isCloudinaryAssetReferenced";
import { getServerCloudinary } from "@/lib/cloudinary/serverCloudinary";

export const runtime = "nodejs";
function providerHttpStatus(error: unknown): number | undefined {
  const parsed = z
    .object({
      http_code: z.number().optional(),
      error: z.object({ http_code: z.number().optional() }).optional(),
    })
    .safeParse(error);
  return parsed.success
    ? (parsed.data.http_code ?? parsed.data.error?.http_code)
    : undefined;
}
const deny = () =>
  NextResponse.json(
    {
      success: false,
      error: "No tienes autorización para eliminar este archivo.",
      code: "ASSET_NOT_AUTHORIZED",
    },
    { status: 403 },
  );
export async function POST(req: Request) {
  let stage = "identity";
  try {
    const actor = await getCloudinaryActor();
    if (!actor)
      return NextResponse.json(
        { success: false, error: "Debes iniciar sesión." },
        { status: 401 },
      );
    if (!isSameOriginCloudinaryRequest(req)) return deny();
    const parsed = cloudinaryDeletePayloadSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { success: false, error: "Referencia de archivo inválida." },
        { status: 400 },
      );
    const input = parsed.data;
    if (!input.deleteAuthorization) return deny();
    const proof = verifyTemporaryUploadAuthorization(
      input.deleteAuthorization,
      actor.id,
    );
    if (!proof) return deny();
    const reference = input.url ? parseCloudinaryDeletionUrl(input.url) : null;
    if (input.url && !reference)
      return NextResponse.json(
        { success: false, error: "URL de archivo inválida." },
        { status: 400 },
      );
    const { cloudinary } = getServerCloudinary();
    const cloudName = cloudinary.config().cloud_name!;
    if (
      (input.publicId && input.publicId !== proof.publicId) ||
      (input.resourceType && input.resourceType !== proof.resourceType) ||
      (reference &&
        (reference.cloudName !== cloudName ||
          reference.publicId !== proof.publicId ||
          reference.resourceType !== proof.resourceType))
    )
      return deny();
    stage = "references";
    if (
      await isCloudinaryAssetReferenced({
        cloudName,
        publicId: proof.publicId,
        resourceType: proof.resourceType,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El archivo sigue asociado a información guardada. Retíralo del formulario y guarda los cambios antes de planificar su limpieza.",
          code: "ASSET_IN_USE",
        },
        { status: 409 },
      );
    }
    stage = "provider_lookup";
    let resource;
    try {
      resource = await cloudinary.api.resource(proof.publicId, {
        resource_type: proof.resourceType,
        type: "upload",
        context: true,
      });
    } catch (error) {
      // El SDK puede rechazar con { error: { http_code } } o con el error directo.
      if (providerHttpStatus(error) === 404)
        return NextResponse.json({
          success: true,
          deleted: 0,
          alreadyMissing: 1,
          publicId: proof.publicId,
          resourceType: proof.resourceType,
        });
      throw error;
    }
    if (
      !resource ||
      resource.public_id !== proof.publicId ||
      resource.resource_type !== proof.resourceType ||
      resource.type !== "upload" ||
      typeof resource.asset_id !== "string" ||
      !resource.asset_id.trim() ||
      resource.context?.custom?.[UPLOAD_OWNER_CONTEXT_KEY] !==
        input.deleteAuthorization ||
      (reference && resource.version !== reference.version)
    )
      return deny();
    // El asset_id inmutable impide borrar una sustitución que reutilice el public_id tras la consulta.
    stage = "provider_delete";
    const result = await cloudinary.api.delete_resources_by_asset_ids([
      resource.asset_id,
    ]);
    // El SDK instalado declara erróneamente esta respuesta como un listado de recursos.
    const confirmation = z
      .object({
        deleted: z.record(z.enum(["deleted", "not_found"])),
        partial: z.boolean().optional(),
      })
      .safeParse(result);
    if (!confirmation.success || confirmation.data.partial)
      throw new Error("Deletion not confirmed");
    const statuses = Object.values(confirmation.data.deleted);
    if (statuses.length !== 1) throw new Error("Deletion not confirmed");
    return NextResponse.json({
      success: true,
      deleted: statuses[0] === "deleted" ? 1 : 0,
      alreadyMissing: statuses[0] === "not_found" ? 1 : 0,
      publicId: proof.publicId,
      resourceType: proof.resourceType,
    });
  } catch (error) {
    const status = providerHttpStatus(error);
    const reason =
      error instanceof Error &&
      error.message === "Unresolved Cloudinary reference"
        ? "UNRESOLVED_REFERENCE"
        : error instanceof Error &&
            error.message === "Cloudinary reference scan limit reached"
          ? "REFERENCE_SCAN_LIMIT"
          : "VERIFICATION_FAILED";
    console.warn("[Cloudinary cleanup] stopped", {
      stage,
      reason,
      providerStatus: status,
    });
    // No exponer mensajes del proveedor, secretos ni detalles de otros registros.
    return NextResponse.json(
      {
        success: false,
        error:
          "No pudimos verificar o eliminar el archivo. No se confirmó ningún borrado.",
        code: `${stage.toUpperCase()}_UNAVAILABLE`,
      },
      { status: 503 },
    );
  }
}
