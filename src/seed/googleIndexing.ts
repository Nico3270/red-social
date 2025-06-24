import { GoogleAuth } from "google-auth-library";




interface GoogleIndexingResponse {
    urlNotificationMetadata?: { url: string };
    error?: Record<string, unknown>; // Reemplaza `any`
}

const GOOGLE_INDEXING_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";


async function getAccessToken(): Promise<string | null> {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!clientEmail || !privateKey) {
        console.error("❌ No se encontraron las credenciales de Google en las variables de entorno.");
        return null;
    }

    try {
        const auth = new GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey,
            },
            scopes: ["https://www.googleapis.com/auth/indexing"],
        });

        const client = await auth.getClient();
        const token = await client.getAccessToken();

        if (!token.token) {
            console.error("❌ No se pudo obtener un token válido.");
            return null;
        }

        return token.token;
    } catch (error) {
        console.error("❌ Error al obtener el token de acceso:", error);
        return null;
    }
}

export { getAccessToken };


async function indexUrl(url: string): Promise<GoogleIndexingResponse | null> {
    const accessToken = await getAccessToken();

    if (!accessToken) {
        console.error("❌ No se pudo obtener el token de acceso.");
        return null;
    }

    try {
        const response = await fetch(GOOGLE_INDEXING_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                url: url,
                type: "URL_UPDATED",
            }),
        });

        const data: GoogleIndexingResponse = await response.json();

        if (response.ok) {
            console.log(`✅ URL enviada a Google correctamente: ${url}`);
        } else {
            console.error("❌ Error al enviar la URL:", response.status, response.statusText, data);
        }

        return data;
    } catch (error) {
        console.error("❌ Error en la petición a Google Indexing API:", error);
        return null;
    }
}

export { indexUrl };
