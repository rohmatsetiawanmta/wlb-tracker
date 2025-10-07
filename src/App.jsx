// src/App.jsx

import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient.js";
import Navbar from "./components/Navbar";
import { Loader } from "lucide-react";

import LogActivityPage from "./pages/LogActivityPage.jsx";
import MainPage from "./pages/MainPage";
import LoginPage from "./pages/LoginPage.jsx";
import AdminPage from "./pages/Admin/AdminPage.jsx";
import ActivityCategoryManager from "./pages/admin/ActivityCategoryManager.jsx";

// Komponen Pembatas Akses untuk Rute Admin
const ProtectedRoute = ({ children, userRole, isLoading }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Jika tidak sedang loading dan peran bukan 'admin', arahkan ke login
    if (!isLoading && userRole !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [isLoading, userRole, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-lg">
        <Loader className="animate-spin mr-2" size={24} /> Memuat akses...
      </div>
    );
  }

  // Hanya render children jika peran adalah 'admin'
  return userRole === "admin" ? children : null;
};

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndRole = async () => {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
      }

      setSession(currentSession);
      if (currentSession) {
        // Ambil peran (role) dari tabel 'users'
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
      }
      setIsLoading(false);
    };

    fetchSessionAndRole();

    // Listener untuk perubahan status otentikasi
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setIsLoading(true); // Mulai loading lagi saat sesi berubah
        if (newSession) {
          // Ambil peran lagi jika sesi baru dibuat
          supabase
            .from("users")
            .select("role")
            .eq("id", newSession.user.id)
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error("Error fetching user role:", error);
                setUserRole(null);
              } else {
                setUserRole(data.role);
              }
              setIsLoading(false);
            });
        } else {
          setUserRole(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        userRole={userRole}
        session={session}
        handleLogout={() => supabase.auth.signOut()}
        isLoading={isLoading}
      />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* --- RUTE WLB TRACKER --- */}
        {/* <Route path="/dashboard" element={<UserDashboardPage />} /> */}
        <Route path="/logs" element={<LogActivityPage />} />
        {/* <Route path="/goals" element={<ComingSoon />} /> */}

        {/* --- RUTE ADMIN (Dilindungi) --- */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute userRole={userRole} isLoading={isLoading}>
              {/* Nested Routes untuk Admin */}
              <Routes>
                <Route path="/" element={<AdminPage />} />
                {/* <Route path="users" element={<UserManagementPage />} /> */}
                <Route
                  path="categories"
                  element={<ActivityCategoryManager />}
                />
                {/* <Route path="logs" element={<ComingSoon />} />{" "} */}
                {/* <Route path="settings" element={<ComingSoon />} />{" "} */}
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
