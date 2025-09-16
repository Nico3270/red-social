import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { publicId, resourceType } = await req.json();

    if (!publicId) {
      console.error("Delete request failed: publicId is required");
      return NextResponse.json({ success: false, error: "publicId is required" }, { status: 400 });
    }

    // Validar variables de entorno
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Cloudinary configuration error:", {
        cloudName: cloudName ? "[SET]" : undefined,
        apiKey: apiKey ? "[SET]" : undefined,
        apiSecret: apiSecret ? "[REDACTED]" : undefined,
      });
      return NextResponse.json(
        { success: false, error: "Missing Cloudinary configuration (cloud_name, api_key, or api_secret)" },
        { status: 500 }
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // console.log("Deleting resource:", { publicId, resourceType });
    // console.log("Cloudinary config:", {
    //   cloud_name: cloudName,
    //   api_key: apiKey,
    //   api_secret: apiSecret ? "[REDACTED]" : undefined,
    // });

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || "image",
    });
    // console.log("Cloudinary delete result:", result);

    if (result.result === "ok") {
      return NextResponse.json({ success: true });
    } else {
      console.error("Cloudinary delete failed:", result);
      return NextResponse.json(
        { success: false, error: `Failed to delete: ${result.result || "Unknown error"}` },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Cloudinary delete error:", {
        message: error.message,
        name: error.name,
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // fallback si no es instancia de Error
    console.error("Cloudinary delete error:", error);
    return NextResponse.json(
      { success: false, error: "Unknown server error" },
      { status: 500 }
    );
  }
}