import { getBusinessTypeBadgeClasses } from "./businessesShared";

type BusinessTypeBadgeProps = {
  isTestData: boolean;
};

export default function BusinessTypeBadge({ isTestData }: BusinessTypeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getBusinessTypeBadgeClasses(
        isTestData
      )}`}
    >
      {isTestData ? "Test" : "Real"}
    </span>
  );
}
