import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCloudinaryActor,
  isSameOriginCloudinaryRequest,
} from "@/lib/cloudinary/cloudinaryRequestAuthorization";
import {
  issueTemporaryUploadAuthorization,
  UPLOAD_OWNER_CONTEXT_KEY,
} from "@/lib/cloudinary/temporaryUploadAuthorization";
import { getServerCloudinary } from "@/lib/cloudinary/serverCloudinary";

export const runtime = "nodejs";
const schema = z
  .object({ resourceType: z.enum(["image", "video", "raw"]) })
  .strict();
export async function POST(req: Request) {
  try {
    const actor = await getCloudinaryActor();
    if (!actor)
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 },
      );
    if (!isSameOriginCloudinaryRequest(req))
      return NextResponse.json(
        { error: "Origen no autorizado." },
        { status: 403 },
      );
    const input = schema.safeParse(await req.json().catch(() => null));
    if (!input.success)
      return NextResponse.json(
        { error: "Solicitud de subida inválida." },
        { status: 400 },
      );
    const { cloudinary } = getServerCloudinary();
    const config = cloudinary.config();
    const { claims, token } = issueTemporaryUploadAuthorization(
      actor.id,
      input.data.resourceType,
    );
    const params = {
      timestamp: claims.issuedAt,
      public_id: claims.publicId,
      overwrite: false,
      context: `${UPLOAD_OWNER_CONTEXT_KEY}=${token}`,
    };
    const signature = cloudinary.utils.api_sign_request(
      params,
      config.api_secret!,
    );
    return NextResponse.json(
      {
        uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloud_name}/${claims.resourceType}/upload`,
        resourceType: claims.resourceType,
        fields: {
          ...params,
          timestamp: String(params.timestamp),
          overwrite: "false",
          signature,
          api_key: config.api_key,
        },
        deleteAuthorization: token,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No pudimos autorizar la subida. Inténtalo nuevamente." },
      { status: 503 },
    );
  }
}
