"use client";

import {
  createAdminCatalogGroupAction,
  reorderAdminCatalogGroupsAction,
  toggleAdminCatalogGroupActiveAction,
  updateAdminCatalogGroupAction,
} from "@/actions/myckeoAdmin/adminCatalogGroupActions";
import type {
  AdminCatalogOrganizationGroup,
  AdminCatalogOrganizationStats,
} from "@/actions/myckeoAdmin/getAdminCatalogOrganizationBySlugAction";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  FolderPlus,
  Layers3,
  Loader2,
  Plus,
  Power,
  Save,
} from "lucide-react";
import AdminCatalogGroupProductsPanel from "./AdminCatalogGroupProductsPanel";
import { formatAdminDate } from "./businessesShared";

type AdminCatalogGroupsManagerProps = {
  businessId: string;
  expectedSlug: string;
  businessName: string;
  initialGroups: AdminCatalogOrganizationGroup[];
  stats?: AdminCatalogOrganizationStats;
};

type CreateMode =
  | { kind: "root" }
  | { kind: "child"; parentId: string; parentName: string }
  | null;

type FeedbackState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

type CreateDraft = {
  nombre: string;
  description: string;
  isActive: boolean;
};

function sortGroupLevel(
  groups: AdminCatalogOrganizationGroup[]
): AdminCatalogOrganizationGroup[] {
  return [...groups]
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.nombre.localeCompare(right.nombre, "es-CO");
    });
}

function sortGroups(
  groups: AdminCatalogOrganizationGroup[]
): AdminCatalogOrganizationGroup[] {
  return sortGroupLevel(groups).map((group) => ({
    ...group,
    children: sortGroups(group.children),
  }));
}

function findGroupById(
  groups: AdminCatalogOrganizationGroup[],
  groupId: string | null
): AdminCatalogOrganizationGroup | null {
  if (!groupId) {
    return null;
  }

  for (const group of groups) {
    if (group.id === groupId) {
      return group;
    }

    const nestedMatch = findGroupById(group.children, groupId);

    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function findGroupPath(
  groups: AdminCatalogOrganizationGroup[],
  groupId: string | null,
  trail: AdminCatalogOrganizationGroup[] = []
): AdminCatalogOrganizationGroup[] {
  if (!groupId) {
    return [];
  }

  for (const group of groups) {
    const nextTrail = [...trail, group];

    if (group.id === groupId) {
      return nextTrail;
    }

    const nestedPath = findGroupPath(group.children, groupId, nextTrail);

    if (nestedPath.length > 0) {
      return nestedPath;
    }
  }

  return [];
}

function insertGroupIntoTree(
  groups: AdminCatalogOrganizationGroup[],
  newGroup: AdminCatalogOrganizationGroup
): AdminCatalogOrganizationGroup[] {
  if (!newGroup.parentId) {
    return sortGroups([...groups, newGroup]);
  }

  return sortGroups(
    groups.map((group) => {
      if (group.id === newGroup.parentId) {
        return {
          ...group,
          children: sortGroups([...group.children, newGroup]),
        };
      }

      if (group.children.length === 0) {
        return group;
      }

      return {
        ...group,
        children: insertGroupIntoTree(group.children, newGroup),
      };
    })
  );
}

function patchGroupInTree(
  groups: AdminCatalogOrganizationGroup[],
  groupId: string,
  updater: (group: AdminCatalogOrganizationGroup) => AdminCatalogOrganizationGroup
): AdminCatalogOrganizationGroup[] {
  return groups.map((group) => {
    if (group.id === groupId) {
      return updater(group);
    }

    if (group.children.length === 0) {
      return group;
    }

    return {
      ...group,
      children: patchGroupInTree(group.children, groupId, updater),
    };
  });
}

function countNestedGroups(groups: AdminCatalogOrganizationGroup[]): number {
  return groups.reduce(
    (total, group) => total + 1 + countNestedGroups(group.children),
    0
  );
}

function countNestedActiveGroups(groups: AdminCatalogOrganizationGroup[]): number {
  return groups.reduce(
    (total, group) =>
      total +
      (group.isActive ? 1 : 0) +
      countNestedActiveGroups(group.children),
    0
  );
}

function countNestedAssignedProducts(
  groups: AdminCatalogOrganizationGroup[]
): number {
  return groups.reduce(
    (total, group) =>
      total +
      group.productCount +
      countNestedAssignedProducts(group.children),
    0
  );
}

function getGroupsForParentId(
  groups: AdminCatalogOrganizationGroup[],
  parentId: string | null
) {
  if (parentId === null) {
    return sortGroupLevel(groups);
  }

  const parentGroup = findGroupById(groups, parentId);

  if (!parentGroup) {
    return [] as AdminCatalogOrganizationGroup[];
  }

  return sortGroupLevel(parentGroup.children);
}

function patchGroupLevelOrder(
  groups: AdminCatalogOrganizationGroup[],
  parentId: string | null,
  orderedGroupIds: string[]
): AdminCatalogOrganizationGroup[] {
  const orderByGroupId = new Map(
    orderedGroupIds.map((groupId, index) => [groupId, index])
  );

  if (parentId === null) {
    return sortGroupLevel(
      groups.map((group) =>
        orderByGroupId.has(group.id)
          ? {
              ...group,
              order: orderByGroupId.get(group.id) ?? group.order,
            }
          : group
      )
    );
  }

  return groups.map((group) => {
    if (group.id === parentId) {
      return {
        ...group,
        children: sortGroupLevel(
          group.children.map((child) =>
            orderByGroupId.has(child.id)
              ? {
                  ...child,
                  order: orderByGroupId.get(child.id) ?? child.order,
                }
              : child
          )
        ),
      };
    }

    if (group.children.length === 0) {
      return group;
    }

    return {
      ...group,
      children: patchGroupLevelOrder(group.children, parentId, orderedGroupIds),
    };
  });
}

function buildReorderLevelKey(parentId: string | null) {
  return parentId ?? "__root__";
}

function GroupStateBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isActive
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState }) {
  if (!feedback) {
    return null;
  }

  const isSuccess = feedback.type === "success";

  return (
    <section
      className={`overflow-hidden rounded-[28px] border shadow-[0_18px_42px_-30px_rgba(15,23,42,0.24)] ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50/80"
          : "border-rose-200 bg-rose-50/85"
      }`}
    >
      <div className="flex items-start gap-3 px-5 py-4">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        )}
        <div>
          <p
            className={`text-sm font-semibold ${
              isSuccess ? "text-emerald-900" : "text-rose-900"
            }`}
          >
            {isSuccess ? "Cambio aplicado" : "No pudimos completar la acción"}
          </p>
          <p
            className={`mt-1 text-sm ${
              isSuccess ? "text-emerald-800" : "text-rose-800"
            }`}
          >
            {feedback.message}
          </p>
        </div>
      </div>
    </section>
  );
}

function EmptyGroupsState({
  onCreateRoot,
  disabled,
}: {
  onCreateRoot: () => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-[30px] border border-dashed border-slate-300 bg-slate-50/90 px-6 py-12 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_20px_44px_-28px_rgba(15,23,42,0.46)]">
          <Layers3 className="h-6 w-6" />
        </div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
          Todavía no hay grupos en este catálogo
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Crea el primer grupo raíz para empezar a estructurar la curaduría del
          catálogo de este negocio.
        </p>
        <button
          type="button"
          onClick={onCreateRoot}
          disabled={disabled}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Crear primer grupo
        </button>
      </div>
    </section>
  );
}

function GroupRailCard({
  group,
  isSelected,
  isActiveBranch = false,
  onSelect,
  onMoveBefore,
  onMoveAfter,
  canMoveBefore,
  canMoveAfter,
  disableReorderControls,
}: {
  group: AdminCatalogOrganizationGroup;
  isSelected: boolean;
  isActiveBranch?: boolean;
  onSelect: () => void;
  onMoveBefore?: () => void;
  onMoveAfter?: () => void;
  canMoveBefore: boolean;
  canMoveAfter: boolean;
  disableReorderControls: boolean;
}) {
  const cardClassName = `group min-w-[220px] max-w-[260px] rounded-[24px] border px-4 py-4 transition sm:min-w-[240px] ${
    isSelected
      ? "border-slate-950 bg-slate-950 text-white shadow-[0_24px_48px_-30px_rgba(15,23,42,0.42)]"
      : isActiveBranch
        ? "border-blue-200 bg-blue-50/80 text-slate-900 shadow-[0_16px_34px_-30px_rgba(59,130,246,0.22)]"
        : "border-slate-200 bg-white text-slate-900 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:bg-slate-50"
  }`;

  const toolbarButtonClassName = `inline-flex h-8 w-8 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-45 ${
    isSelected
      ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
  }`;

  return (
    <article className={cardClassName}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">
            {group.nombre}
          </h3>
          <GroupStateBadge isActive={group.isActive} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isSelected
                ? "border border-white/10 bg-white/10 text-white"
                : "border border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {group.parentId ? "Subgrupo" : "Raíz"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isSelected
                ? "bg-sky-400/20 text-sky-100"
                : "bg-sky-50 text-sky-700"
            }`}
          >
            {group.productCount} producto(s)
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isSelected
                ? "bg-white/10 text-slate-100"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {group.children.length} subgrupo(s)
          </span>
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={`text-xs font-medium ${
              isSelected ? "text-slate-200" : "text-slate-500"
            }`}
          >
            Orden {group.order}
          </p>

          {isActiveBranch && !isSelected ? (
            <span className="rounded-full border border-blue-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              Rama activa
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveBefore}
            disabled={!canMoveBefore || disableReorderControls}
            title="Mover antes"
            aria-label={`Mover ${group.nombre} antes`}
            className={toolbarButtonClassName}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveAfter}
            disabled={!canMoveAfter || disableReorderControls}
            title="Mover después"
            aria-label={`Mover ${group.nombre} después`}
            className={toolbarButtonClassName}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function BreadcrumbTrail({
  path,
  onSelect,
}: {
  path: AdminCatalogOrganizationGroup[];
  onSelect: (groupId: string) => void;
}) {
  if (path.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <span className="font-medium text-slate-500">Seleccionado:</span>
      {path.map((group, index) => (
        <div key={group.id} className="flex items-center gap-2">
          {index > 0 ? <span className="text-slate-300">/</span> : null}
          <button
            type="button"
            onClick={() => onSelect(group.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              index === path.length - 1
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {group.nombre}
          </button>
        </div>
      ))}
    </div>
  );
}

function EmptySubgroupsState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-6">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function GroupTreeBranch({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateChild,
  disabled,
  depth = 0,
}: {
  groups: AdminCatalogOrganizationGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onCreateChild: (groupId: string, groupName: string) => void;
  disabled: boolean;
  depth?: number;
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div
      className={
        depth === 0
          ? "space-y-3"
          : "mt-3 space-y-3 border-l border-slate-200 pl-4 sm:pl-5"
      }
    >
      {groups.map((group) => {
        const isSelected = selectedGroupId === group.id;

        return (
          <div key={group.id}>
            <article
              className={`overflow-hidden rounded-[24px] border transition ${
                isSelected
                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_24px_48px_-30px_rgba(15,23,42,0.42)]"
                  : "border-slate-200 bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.24)]"
              }`}
            >
              <div className="flex items-start gap-3 p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => onSelectGroup(group.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold tracking-tight">
                      {group.nombre}
                    </h3>
                    <GroupStateBadge isActive={group.isActive} />
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        isSelected
                          ? "border border-white/10 bg-white/10 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {group.parentId ? "Subgrupo" : "Raíz"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        isSelected
                          ? "bg-white/10 text-slate-100"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      Orden {group.order}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        isSelected
                          ? "bg-sky-400/20 text-sky-100"
                          : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {group.productCount} producto(s)
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        isSelected
                          ? "bg-white/10 text-slate-100"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {group.children.length} subgrupo(s)
                    </span>
                  </div>

                  <p
                    className={`mt-3 line-clamp-2 text-sm leading-6 ${
                      isSelected ? "text-slate-200" : "text-slate-600"
                    }`}
                  >
                    {group.description?.trim() ||
                      "Sin descripción editorial registrada todavía."}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onCreateChild(group.id, group.nombre)}
                  disabled={disabled}
                  title={`Crear subgrupo dentro de ${group.nombre}`}
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSelected
                      ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>
            </article>

            {group.children.length > 0 ? (
              <GroupTreeBranch
                groups={group.children}
                selectedGroupId={selectedGroupId}
                onSelectGroup={onSelectGroup}
                onCreateChild={onCreateChild}
                disabled={disabled}
                depth={depth + 1}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminCatalogGroupsManager({
  businessId,
  expectedSlug,
  businessName,
  initialGroups,
}: AdminCatalogGroupsManagerProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<AdminCatalogOrganizationGroup[]>(
    initialGroups
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialGroups[0]?.id ?? null
  );
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [createDraft, setCreateDraft] = useState<CreateDraft>({
    nombre: "",
    description: "",
    isActive: true,
  });
  const [detailNombre, setDetailNombre] = useState("");
  const [detailDescription, setDetailDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [reorderLoadingLevel, setReorderLoadingLevel] = useState<string | null>(
    null
  );
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  const selectedGroup = useMemo(
    () => findGroupById(groups, selectedGroupId),
    [groups, selectedGroupId]
  );
  const selectedPath = useMemo(
    () => findGroupPath(groups, selectedGroupId),
    [groups, selectedGroupId]
  );
  const selectedRoot = selectedPath[0] ?? null;
  const selectedParent =
    selectedPath.length > 1 ? selectedPath[selectedPath.length - 2] : null;
  const rootGroups = useMemo(() => sortGroupLevel(groups), [groups]);
  const relatedGroups = useMemo(() => {
    if (!selectedGroup) {
      return [] as AdminCatalogOrganizationGroup[];
    }

    if (selectedGroup.children.length > 0) {
      return sortGroupLevel(selectedGroup.children);
    }

    if (selectedParent) {
      return sortGroupLevel(selectedParent.children);
    }

    return [];
  }, [selectedGroup, selectedParent]);
  const relatedGroupsTitle = useMemo(() => {
    if (!selectedGroup) {
      return null;
    }

    if (selectedGroup.children.length > 0) {
      return `Subgrupos de ${selectedGroup.nombre}`;
    }

    if (selectedParent) {
      return `Subgrupos de ${selectedParent.nombre}`;
    }

    return null;
  }, [selectedGroup, selectedParent]);

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroupId(null);
      return;
    }

    if (!selectedGroupId || !findGroupById(groups, selectedGroupId)) {
      setSelectedGroupId(groups[0]?.id ?? null);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroup) {
      setDetailNombre("");
      setDetailDescription("");
      return;
    }

    setDetailNombre(selectedGroup.nombre);
    setDetailDescription(selectedGroup.description ?? "");
    setDetailError(null);
  }, [selectedGroup]);

  useEffect(() => {
    setIsDetailExpanded(false);
  }, [selectedGroupId]);

  const catalogStats = useMemo(() => {
    const totalGroups = countNestedGroups(groups);
    const activeGroups = countNestedActiveGroups(groups);
    const totalAssignedProducts = countNestedAssignedProducts(groups);

    return {
      totalGroups,
      activeGroups,
      inactiveGroups: totalGroups - activeGroups,
      totalAssignedProducts,
    };
  }, [groups]);

  const isBusy =
    isCreating ||
    isSaving ||
    isToggling ||
    reorderLoadingLevel !== null ||
    isRefreshing;

  function requestRefresh() {
    startRefresh(() => {
      router.refresh();
    });
  }

  function openRootCreateForm() {
    setCreateMode({ kind: "root" });
    setCreateDraft({
      nombre: "",
      description: "",
      isActive: true,
    });
    setCreateError(null);
    setFeedback(null);
  }

  function openChildCreateForm(parentId: string, parentName: string) {
    setSelectedGroupId(parentId);
    setCreateMode({
      kind: "child",
      parentId,
      parentName,
    });
    setCreateDraft({
      nombre: "",
      description: "",
      isActive: true,
    });
    setCreateError(null);
    setFeedback(null);
  }

  function closeCreateForm() {
    setCreateMode(null);
    setCreateError(null);
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nombre = createDraft.nombre.trim();

    if (!nombre) {
      setCreateError("El nombre del grupo es obligatorio.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setFeedback(null);

    try {
      const result = await createAdminCatalogGroupAction({
        businessId,
        expectedSlug,
        input: {
          nombre,
          description: createDraft.description.trim()
            ? createDraft.description
            : null,
          parentId: createMode?.kind === "child" ? createMode.parentId : null,
          isActive: createDraft.isActive,
        },
      });

      if (!result.ok) {
        setCreateError(result.error);
        return;
      }

      const createdGroup: AdminCatalogOrganizationGroup = {
        id: result.group.id,
        nombre: result.group.nombre,
        slug: result.group.slug,
        description: result.group.description,
        parentId: result.group.parentId,
        order: result.group.order,
        isActive: result.group.isActive,
        createdAt: result.group.createdAt,
        updatedAt: result.group.updatedAt,
        productCount: 0,
        children: [],
      };

      setGroups((currentGroups) =>
        insertGroupIntoTree(currentGroups, createdGroup)
      );
      setSelectedGroupId(result.group.id);
      setCreateMode(null);
      setCreateDraft({
        nombre: "",
        description: "",
        isActive: true,
      });
      setFeedback({
        type: "success",
        message: `El grupo "${result.group.nombre}" quedó creado para ${businessName}.`,
      });
      requestRefresh();
    } catch {
      setCreateError("No fue posible crear el grupo en este momento.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGroup) {
      return;
    }

    const nombre = detailNombre.trim();

    if (!nombre) {
      setDetailError("El nombre del grupo no puede quedar vacío.");
      return;
    }

    setIsSaving(true);
    setDetailError(null);
    setFeedback(null);

    try {
      const result = await updateAdminCatalogGroupAction({
        businessId,
        expectedSlug,
        groupId: selectedGroup.id,
        input: {
          nombre,
          description: detailDescription.trim() ? detailDescription : null,
        },
      });

      if (!result.ok) {
        setDetailError(result.error);
        return;
      }

      setGroups((currentGroups) =>
        sortGroups(
          patchGroupInTree(currentGroups, result.group.id, (group) => ({
            ...group,
            nombre: result.group.nombre,
            description: result.group.description,
            isActive: result.group.isActive,
            slug: result.group.slug,
            order: result.group.order,
            parentId: result.group.parentId,
            updatedAt: result.group.updatedAt,
          }))
        )
      );
      setDetailNombre(result.group.nombre);
      setDetailDescription(result.group.description ?? "");
      setFeedback({
        type: "success",
        message: `Guardamos los cambios básicos del grupo "${result.group.nombre}".`,
      });
      requestRefresh();
    } catch {
      setDetailError("No fue posible guardar los cambios del grupo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!selectedGroup) {
      return;
    }

    setIsToggling(true);
    setDetailError(null);
    setFeedback(null);

    try {
      const nextIsActive = !selectedGroup.isActive;
      const result = await toggleAdminCatalogGroupActiveAction({
        businessId,
        expectedSlug,
        groupId: selectedGroup.id,
        isActive: nextIsActive,
      });

      if (!result.ok) {
        setDetailError(result.error);
        return;
      }

      setGroups((currentGroups) =>
        patchGroupInTree(currentGroups, result.group.id, (group) => ({
          ...group,
          isActive: result.group.isActive,
          updatedAt: result.group.updatedAt,
        }))
      );
      setFeedback({
        type: "success",
        message: result.group.isActive
          ? `El grupo "${result.group.nombre}" quedó activo.`
          : `El grupo "${result.group.nombre}" quedó inactivo.`,
      });
      requestRefresh();
    } catch {
      setDetailError("No fue posible cambiar el estado del grupo.");
    } finally {
      setIsToggling(false);
    }
  }

  async function handleMoveGroupWithinLevel(
    groupId: string,
    direction: "left" | "right"
  ) {
    if (isBusy) {
      return;
    }

    const targetGroup = findGroupById(groups, groupId);

    if (!targetGroup) {
      setFeedback({
        type: "error",
        message: "No encontramos el grupo que querías reordenar.",
      });
      return;
    }

    const parentId = targetGroup.parentId;
    const siblingGroups = getGroupsForParentId(groups, parentId);
    const currentIndex = siblingGroups.findIndex((group) => group.id === groupId);

    if (currentIndex === -1) {
      setFeedback({
        type: "error",
        message: "No pudimos resolver el nivel exacto de ese grupo.",
      });
      return;
    }

    const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= siblingGroups.length) {
      return;
    }

    const reorderedSiblings = [...siblingGroups];
    const [movedGroup] = reorderedSiblings.splice(currentIndex, 1);
    reorderedSiblings.splice(nextIndex, 0, movedGroup);

    const orderedGroupIds = reorderedSiblings.map((group) => group.id);
    const reorderLevelKey = buildReorderLevelKey(parentId);

    setReorderLoadingLevel(reorderLevelKey);
    setFeedback(null);

    try {
      const result = await reorderAdminCatalogGroupsAction({
        businessId,
        expectedSlug,
        parentId,
        orderedGroupIds,
      });

      if (!result.ok) {
        setFeedback({
          type: "error",
          message: result.error,
        });
        return;
      }

      setGroups((currentGroups) =>
        patchGroupLevelOrder(currentGroups, parentId, orderedGroupIds)
      );
      setFeedback({
        type: "success",
        message:
          direction === "left"
            ? `Movimos "${targetGroup.nombre}" una posición antes dentro de este nivel.`
            : `Movimos "${targetGroup.nombre}" una posición después dentro de este nivel.`,
      });
      requestRefresh();
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible reordenar el grupo en este momento.",
      });
    } finally {
      setReorderLoadingLevel(null);
    }
  }

  return (
    <section className="space-y-6">
      <FeedbackBanner feedback={feedback} />

      <section className="overflow-hidden rounded-[30px] border border-blue-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] shadow-[0_20px_44px_-32px_rgba(59,130,246,0.35)]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">
              Fase actual
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              Organización de grupos y productos
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Puedes crear grupos raíz, crear subgrupos, editar nombre y
              descripción, activar o desactivar grupos, reordenar cada nivel y
              organizar los productos asociados con guardado por lote. La
              eliminación, el movimiento entre padres y el drag and drop siguen
              fuera de esta fase.
            </p>
          </div>

          {isRefreshing ? (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white/90 px-4 py-3 text-sm font-medium text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sincronizando vista
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                Selector de grupos
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                Estructura editorial de {businessName}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Usa un rail compacto para moverte entre grupos raíz y subgrupos
                sin abrir una columna larga en desktop.
              </p>
            </div>

            <button
              type="button"
              onClick={openRootCreateForm}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Crear grupo raíz
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
              {catalogStats.totalGroups} grupo(s)
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
              {catalogStats.activeGroups} activo(s)
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
              {catalogStats.inactiveGroups} inactivo(s)
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
              {catalogStats.totalAssignedProducts} producto(s) asociados
            </span>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {createMode ? (
            <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                    {createMode.kind === "root"
                      ? "Nuevo grupo raíz"
                      : "Nuevo subgrupo"}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                    {createMode.kind === "root"
                      ? "Crear una nueva sección principal"
                      : `Crear subgrupo dentro de ${createMode.parentName}`}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={isBusy}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleCreateGroup}>
                <div className="space-y-2">
                  <label
                    htmlFor="admin-create-group-name"
                    className="text-sm font-medium text-slate-800"
                  >
                    Nombre del grupo
                  </label>
                  <input
                    id="admin-create-group-name"
                    type="text"
                    value={createDraft.nombre}
                    onChange={(event) => {
                      setCreateError(null);
                      setCreateDraft((current) => ({
                        ...current,
                        nombre: event.target.value,
                      }));
                    }}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder={
                      createMode.kind === "root"
                        ? "Ej. Promociones, Temporada, Destacados"
                        : "Ej. Desayunos, Hamburguesas premium"
                    }
                    maxLength={120}
                    disabled={isBusy}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="admin-create-group-description"
                    className="text-sm font-medium text-slate-800"
                  >
                    Descripción
                  </label>
                  <textarea
                    id="admin-create-group-description"
                    value={createDraft.description}
                    onChange={(event) => {
                      setCreateError(null);
                      setCreateDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }));
                    }}
                    className="min-h-[112px] w-full resize-none rounded-[22px] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="Agrega un contexto corto para orientar esta sección del catálogo."
                    disabled={isBusy}
                  />
                </div>

                <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={createDraft.isActive}
                    onChange={(event) => {
                      setCreateError(null);
                      setCreateDraft((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }));
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                    disabled={isBusy}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Crear como grupo activo
                    </p>
                    <p className="text-xs text-slate-500">
                      Puedes dejarlo inactivo si quieres prepararlo antes de usarlo.
                    </p>
                  </div>
                </label>

                {createError ? (
                  <p className="text-sm font-medium text-rose-700">
                    {createError}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderPlus className="h-4 w-4" />
                    )}
                    {createMode.kind === "root"
                      ? "Crear grupo raíz"
                      : "Crear subgrupo"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {groups.length === 0 ? (
            <EmptyGroupsState
              onCreateRoot={openRootCreateForm}
              disabled={isBusy}
            />
          ) : (
            <div className="space-y-5">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      Grupos raíz
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Selecciona la rama principal del catálogo.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                    {rootGroups.length} raíz
                  </span>
                </div>

                <div className="-mx-1 mt-4 overflow-x-auto pb-2">
                  <div className="flex min-w-full gap-3 px-1">
                    {rootGroups.map((group) => (
                      <GroupRailCard
                        key={group.id}
                        group={group}
                        isSelected={selectedGroupId === group.id}
                        isActiveBranch={selectedRoot?.id === group.id}
                        canMoveBefore={rootGroups[0]?.id !== group.id}
                        canMoveAfter={
                          rootGroups[rootGroups.length - 1]?.id !== group.id
                        }
                        disableReorderControls={isBusy}
                        onSelect={() => {
                          setSelectedGroupId(group.id);
                          setFeedback(null);
                        }}
                        onMoveBefore={() =>
                          handleMoveGroupWithinLevel(group.id, "left")
                        }
                        onMoveAfter={() =>
                          handleMoveGroupWithinLevel(group.id, "right")
                        }
                      />
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[26px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <BreadcrumbTrail
                  path={selectedPath}
                  onSelect={(groupId) => {
                    setSelectedGroupId(groupId);
                    setFeedback(null);
                  }}
                />
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      {relatedGroupsTitle ?? "Subgrupos"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Navega la rama activa sin abrir un árbol vertical completo.
                    </p>
                  </div>
                  {relatedGroups.length > 0 ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                      {relatedGroups.length} relacionado(s)
                    </span>
                  ) : null}
                </div>

                {relatedGroups.length > 0 ? (
                  <div className="-mx-1 mt-4 overflow-x-auto pb-2">
                    <div className="flex min-w-full gap-3 px-1">
                      {relatedGroups.map((group) => (
                        <GroupRailCard
                          key={group.id}
                          group={group}
                          isSelected={selectedGroupId === group.id}
                          isActiveBranch={false}
                          canMoveBefore={relatedGroups[0]?.id !== group.id}
                          canMoveAfter={
                            relatedGroups[relatedGroups.length - 1]?.id !== group.id
                          }
                          disableReorderControls={isBusy}
                          onSelect={() => {
                            setSelectedGroupId(group.id);
                            setFeedback(null);
                          }}
                          onMoveBefore={() =>
                            handleMoveGroupWithinLevel(group.id, "left")
                          }
                          onMoveAfter={() =>
                            handleMoveGroupWithinLevel(group.id, "right")
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptySubgroupsState
                      title="Esta rama todavía no tiene subgrupos visibles"
                      description="Puedes crear un subgrupo desde el detalle del grupo seleccionado para seguir profundizando la estructura."
                    />
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.28)]">
          <div className="px-5 py-5 sm:px-6">
            {!selectedGroup ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  Selecciona un grupo para editarlo.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Aquí verás el contexto del grupo activo y podrás abrir sus
                  detalles cuando necesites ajustar metadata.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                        Grupo seleccionado
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                          {selectedGroup.nombre}
                        </h3>
                        <GroupStateBadge isActive={selectedGroup.isActive} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {selectedPath.map((group) => group.nombre).join(" / ")}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                          {selectedGroup.parentId ? "Subgrupo" : "Grupo raíz"}
                        </span>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
                          {selectedGroup.productCount} producto(s)
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                          Orden {selectedGroup.order}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:max-w-[420px] xl:justify-end">
                      <button
                        type="button"
                        onClick={() => setIsDetailExpanded((current) => !current)}
                        disabled={isBusy}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDetailExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        {isDetailExpanded ? "Ocultar detalles" : "Editar detalles"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openChildCreateForm(selectedGroup.id, selectedGroup.nombre)
                        }
                        disabled={isBusy}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FolderPlus className="h-4 w-4" />
                        Crear subgrupo
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleActive}
                        disabled={isBusy}
                        title={
                          selectedGroup.isActive
                            ? "Desactivar grupo"
                            : "Activar grupo"
                        }
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selectedGroup.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                        {selectedGroup.isActive ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>

                  {detailError && !isDetailExpanded ? (
                    <p className="mt-4 text-sm font-medium text-rose-700">
                      {detailError}
                    </p>
                  ) : null}
                </div>

                {isDetailExpanded ? (
                  <section className="rounded-[28px] border border-slate-200 bg-white px-4 py-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.18)] sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                          Detalle editable
                        </p>
                        <h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                          Metadata del grupo
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Ajusta nombre y descripción con acciones admin seguras.
                          El slug y la jerarquía siguen siendo informativos en esta fase.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.68fr)_minmax(280px,0.32fr)]">
                      <form className="space-y-4" onSubmit={handleSaveGroup}>
                        <div className="space-y-2">
                          <label
                            htmlFor="admin-group-name"
                            className="text-sm font-medium text-slate-800"
                          >
                            Nombre
                          </label>
                          <input
                            id="admin-group-name"
                            type="text"
                            value={detailNombre}
                            onChange={(event) => {
                              setDetailError(null);
                              setDetailNombre(event.target.value);
                            }}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            maxLength={120}
                            disabled={isBusy}
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="admin-group-description"
                            className="text-sm font-medium text-slate-800"
                          >
                            Descripción
                          </label>
                          <textarea
                            id="admin-group-description"
                            value={detailDescription}
                            onChange={(event) => {
                              setDetailError(null);
                              setDetailDescription(event.target.value);
                            }}
                            className="min-h-[132px] w-full resize-none rounded-[22px] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            placeholder="Agrega contexto editorial para este grupo."
                            disabled={isBusy}
                          />
                        </div>

                        {detailError ? (
                          <p className="text-sm font-medium text-rose-700">
                            {detailError}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isBusy}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Guardar cambios
                          </button>
                        </div>
                      </form>

                      <div className="space-y-3">
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Estado actual
                          </p>
                          <div className="mt-2">
                            <GroupStateBadge isActive={selectedGroup.isActive} />
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Slug técnico
                          </p>
                          <p className="mt-2 break-all font-mono text-sm text-slate-700">
                            {selectedGroup.slug}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Orden actual
                            </p>
                            <p className="mt-2 text-lg font-semibold text-slate-950">
                              {selectedGroup.order}
                            </p>
                          </div>
                          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Jerarquía
                            </p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                              {selectedGroup.parentId
                                ? "Subgrupo de una rama existente"
                                : "Grupo raíz"}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Creado
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {formatAdminDate(selectedGroup.createdAt)}
                            </p>
                          </div>
                          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Actualizado
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {formatAdminDate(selectedGroup.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <AdminCatalogGroupProductsPanel
          businessId={businessId}
          expectedSlug={expectedSlug}
          selectedGroupId={selectedGroupId}
          selectedGroupName={selectedGroup?.nombre ?? null}
        />
      </section>
    </section>
  );
}
