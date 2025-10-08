// src/pages/UserDashboardPage.jsx (Landing Page Baru)

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";
import {
  Loader,
  LayoutDashboard,
  Briefcase,
  Heart,
  BookOpen,
  User,
} from "lucide-react";

// Definisikan Domain yang tersedia
const DOMAINS = [
  {
    id: "work",
    name: "WORK (Kerja)",
    icon: Briefcase,
    color: "bg-indigo-500",
    url: "/dashboard/work",
  },
  {
    id: "study",
    name: "STUDY (Belajar)",
    icon: BookOpen,
    color: "bg-yellow-500",
    url: "/dashboard/study",
  },
  {
    id: "health",
    name: "HEALTH (Kesehatan)",
    icon: Heart,
    color: "bg-green-500",
    url: "/dashboard/health",
  },
  {
    id: "personal",
    name: "PERSONAL (Pribadi)",
    icon: User,
    color: "bg-red-500",
    url: "/dashboard/personal",
  },
  // Tambahkan domain lain jika diperlukan:
  // { id: 'overhead', name: 'OVERHEAD (Rutin)', icon: Settings, color: 'bg-gray-500', url: '/dashboard/overhead' },
];

const UserDashboardPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (!initialSession) {
        toast("Silakan login untuk melihat Dashboard.", { icon: "🔒" });
        navigate("/login", { replace: true });
        return;
      }
      setLoading(false);
    });

    // Listener untuk perubahan auth state (tetap diperlukan)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!newSession) {
          navigate("/login", { replace: true });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading || !session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg flex justify-center items-center h-64">
        <Loader className="animate-spin mr-2" size={24} /> Memuat Dashboard...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-8 flex items-center gap-3 text-3xl font-bold text-gray-800">
        <LayoutDashboard size={30} /> Pilih Domain Dashboard
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {DOMAINS.map((domain) => (
          <Link
            key={domain.id}
            to={domain.url}
            className={`block p-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 ${domain.color} text-white`}
          >
            <domain.icon size={36} className="mb-4" />
            <h3 className="text-xl font-bold">{domain.name}</h3>
            <p className="text-sm opacity-90 mt-2">
              Lihat log dan statistik {domain.name} Anda.
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default UserDashboardPage;
