"use client";

import { useState } from "react";
import { changeUserRole } from "../actions/changeUserRole";

// Define la interfaz para el tipo de usuario
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

interface ShowUsersInformationProps {
  users: User[];
}

export function ShowUsersInformation({ users }: ShowUsersInformationProps) {
  const [usersData, setUsersData] = useState<User[]>(users);

  const handleChangeRole = async (userId: string, currentRole: "admin" | "user") => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const response = await changeUserRole(userId, newRole);

    if (response.success) {
      alert(response.message);
      setUsersData((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } else {
      alert(response.message);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
        <thead className="bg-[#441752] text-white">
          <tr>
            <th className="py-2 px-4 text-left">Nombre</th>
            <th className="py-2 px-4 text-left">Correo</th>
            <th className="py-2 px-4 text-left">Rol</th>
            <th className="py-2 px-4 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usersData.map((user) => (
            <tr key={user.id} className="border-t hover:bg-gray-100">
              <td className="py-2 px-4">{user.name}</td>
              <td className="py-2 px-4">{user.email}</td>
              <td className="py-2 px-4">
                <span
                  className={`px-2 py-1 rounded-lg ${
                    user.role === "admin" ? "bg-red-200 text-red-700" : "bg-green-200 text-green-700"
                  }`}
                >
                  {user.role}
                </span>
              </td>
              <td className="py-2 px-4">
                <button
                  onClick={() => handleChangeRole(user.id, user.role)}
                  className="px-4 py-2 bg-[#F72C5B] text-white rounded-lg hover:bg-[#FF748B] transition"
                >
                  Cambiar Rol
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
