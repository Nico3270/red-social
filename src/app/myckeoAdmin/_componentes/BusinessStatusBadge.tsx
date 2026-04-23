import { getBusinessStatusBadgeClasses } from "./businessesShared";

type BusinessStatusBadgeProps = {
  estado: string;
};

export default function BusinessStatusBadge({ estado }: BusinessStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${getBusinessStatusBadgeClasses(
        estado
      )}`}
    >
      {estado}
    </span>
  );
}
