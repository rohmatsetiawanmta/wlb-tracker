// src/components/Navbar.jsx

import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Zap,
  Target, // Zap/Target untuk Log Waktu/Tujuan
} from "lucide-react";
import toast from "react-hot-toast";

const navItems = [
  // Navigasi Inti WLB Tracker
  { name: "Log Waktu", to: "/logs", icon: Zap },
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { name: "Tujuan", to: "/goals", icon: Target },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Memuat sesi dan peran pengguna saat mount
  useEffect(() => {
    const fetchSessionAndRole = async (currentSession) => {
      if (currentSession) {
        setSession(currentSession);
        // Ambil peran (role) pengguna dari tabel 'users'
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", currentSession.user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setUserRole(null);
        } else {
          setUserRole(data.role);
        }
      } else {
        setSession(null);
        setUserRole(null);
      }
      setIsLoading(false);
    };

    // Mengambil sesi awal
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      fetchSessionAndRole(initialSession);
    });

    // Mengamati perubahan status otentikasi
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        fetchSessionAndRole(newSession);
      }
    );

    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsProfileDropdownOpen(false);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Gagal logout: " + error.message);
    } else {
      toast.success("Anda berhasil logout.");
    }
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
    navigate("/login");
  };

  const handleDropdownClick = () => {
    setIsProfileDropdownOpen(false);
    setIsMenuOpen(false);
  };

  const userEmail = session?.user?.email;

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        {/* Logo/Nama Proyek Baru */}
        <Link to="/">
          <span className="text-xl font-bold text-blue-600">WLB Tracker</span>
        </Link>

        {/* Tombol Menu Mobile */}
        <div className="md:hidden">
          <button onClick={toggleMenu} className="focus:outline-none">
            {isMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Menu Navigasi (Desktop dan Mobile) */}
        <div
          className={`
            absolute left-0 right-0 top-16 z-10 flex-col bg-white px-4 py-2 shadow-lg md:static md:flex md:flex-row md:items-center md:justify-end md:gap-x-6 md:p-0 md:shadow-none
            ${isMenuOpen ? "flex" : "hidden"}
          `}
        >
          {/* Item Navigasi Utama */}
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `py-2 text-lg font-medium md:py-0 ${
                  isActive
                    ? "font-bold text-blue-600"
                    : "text-gray-700 hover:text-blue-600"
                } flex items-center gap-2 transition-colors`
              }
              onClick={() => setIsMenuOpen(false)}
            >
              <item.icon className="h-4 w-4 md:hidden" /> {item.name}
            </NavLink>
          ))}

          {/* Profil/Auth */}
          {!isLoading && (
            <div className="relative py-2 md:py-0">
              {session ? (
                // Dropdown Menu Pengguna
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center gap-2 rounded-lg py-2 px-3 text-lg font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none"
                >
                  <User className="h-5 w-5" />
                  <span className="truncate max-w-28 text-sm md:text-base">
                    {userEmail || "Pengguna"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transform transition-transform ${
                      isProfileDropdownOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>
              ) : (
                // Tautan Login
                <Link
                  to="/login"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Masuk
                </Link>
              )}

              {/* Konten Dropdown */}
              {session && isProfileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-md bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    {/* Tautan Admin (Hanya jika peran adalah 'admin') */}
                    {userRole === "admin" && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={handleDropdownClick}
                      >
                        <LayoutDashboard className="h-4 w-4" /> Panel Admin
                      </Link>
                    )}

                    {/* Tautan Logout */}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4" /> Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
