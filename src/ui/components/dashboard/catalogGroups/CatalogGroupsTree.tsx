"use client";

import React from "react";
import { FaChevronRight, FaTrash, FaPlus } from "react-icons/fa";

interface TreeGroup {
  id: string;
  nombre: string;
  slug: string;
  isActive: boolean;
  order: number;
  children?: TreeGroup[];
}

interface CatalogGroupsTreeProps {
  groups: TreeGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onCreateSubgroup: (parentId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  loading?: boolean;
}

const CatalogGroupsTree: React.FC<CatalogGroupsTreeProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateSubgroup,
  onDeleteGroup,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-200 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const renderGroup = (group: TreeGroup, level: number = 0) => {
    const isSelected = selectedGroupId === group.id;
    const hasChildren = group.children && group.children.length > 0;

    return (
      <div key={group.id} className={`ml-${level * 4}`}>
        <div
          onClick={() => onSelectGroup(group.id)}
          className={`
            flex items-center justify-between p-3 mb-1 rounded-lg cursor-pointer transition-colors
            ${
              isSelected
                ? "bg-blue-100 border-l-4 border-blue-600"
                : "hover:bg-gray-100"
            }
            ${!group.isActive ? "opacity-50" : ""}
          `}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren && (
              <FaChevronRight className="text-gray-400 mr-2 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">
                {group.nombre}
              </p>
              <p className="text-xs text-gray-500">{group.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubgroup(group.id);
              }}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
              title="Crear subgrupo"
            >
              <FaPlus className="text-sm" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (
                  confirm(
                    "¿Estás seguro de que quieres eliminar este grupo y todos sus subgrupos?"
                  )
                ) {
                  onDeleteGroup(group.id);
                }
              }}
              className="p-1 text-red-600 hover:bg-red-100 rounded transition"
              title="Eliminar"
            >
              <FaTrash className="text-sm" />
            </button>
          </div>
        </div>

        {hasChildren && (
          <div className="ml-2 border-l border-gray-200">
            {group.children!.map((child) => renderGroup(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (groups.length === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 rounded-lg">
        <p className="text-gray-600 text-sm">
          No tienes grupos todavía. Crea uno desde el panel derecho.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-96 bg-white rounded-lg border border-gray-200 p-2">
      {groups.map((group) => renderGroup(group))}
    </div>
  );
};

export default CatalogGroupsTree;
