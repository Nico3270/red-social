import Link from "next/link";
import { BUSINESS_ENTRY_PATH } from "@/lib/business/businessEntry";
import styles from "./publicNavigation.module.css";

export function BusinessEntryLink() {
  return (
    <div className={styles.businessEntryBar}>
      <Link
        href={BUSINESS_ENTRY_PATH}
        prefetch={false}
        className={styles.businessEntry}
      >
        Tengo un negocio
      </Link>
    </div>
  );
}
