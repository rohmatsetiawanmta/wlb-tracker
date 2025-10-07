// src/pages/admin/AdminPage.jsx

import React from "react";
import { Link } from "react-router-dom";
import { Users, BookOpen, Clock, Tag, Settings } from "lucide-react";

const AdminPage = () => {
  const adminMenu = [
    {
      name: "Kelola Pengguna",
      description: "Lihat dan atur peran (role) pengguna.",
      icon: Users,
      to: "/admin/users",
    },
    {
      name: "Kelola Domain, Tipe, dan Tag Aktivitas",
      description:
        "Atur struktur hierarki aktivitas (Work, Health, Proyek, dll).",
      icon: Tag,
      to: "/admin/categories",
    },
    {
      name: "Lihat Log Waktu Pengguna",
      description:
        "Monitor data log aktivitas yang dicatat oleh semua pengguna.",
      icon: Clock,
      to: "/admin/logs",
    },
    {
      name: "Pengaturan Umum",
      description: "Kelola pengaturan global aplikasi.",
      icon: Settings,
      to: "/admin/settings",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">Panel Admin</h1>
        <p className="text-gray-600 mt-2">
          Selamat datang di Panel Kontrol Administrator.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {adminMenu.map((item) => (
          <Link
            key={item.name}
            to={item.to}
            className="block rounded-xl bg-white p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border border-gray-100"
          >
            <div className="flex items-start">
              <item.icon className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminPage;
