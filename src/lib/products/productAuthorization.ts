import "server-only";
export {
  productActor as requireProductActor,
  requireSuperAdmin,
} from "@/lib/business/productAccess";
import { assertProductWriteBusiness } from "@/lib/business/productAccess";
export async function assertCanPublishProduct(businessId: string) {
  await assertProductWriteBusiness(businessId, "disponible");
}
