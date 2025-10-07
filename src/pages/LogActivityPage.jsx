// src/pages/LogActivityPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";

// Fungsi Helper untuk konversi HH:MM:SS ke Detik
const hmsToSeconds = (hms) => {
  // Memisahkan H:M:S dan mengkonversinya ke integer.
  // Jika input hanya M:S atau S, ini akan tetap bekerja.
  const parts = hms.split(":").map((p) => parseInt(p) || 0);

  let seconds = 0;
  if (parts.length === 3) {
    // Format HH:MM:SS
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // Format MM:SS (jika pengguna hanya memasukkan dua bagian)
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    // Format SS saja
    seconds = parts[0];
  }

  return seconds;
};

const LogActivityPage = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    category_id: "",
    duration_hms: "00:00:00", // <-- State baru untuk input HH:MM:SS
  });

  const navigate = useNavigate();

  // Fungsi untuk mengambil kategori dari Supabase
  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("activity_domains") // Mengambil dari tabel Domain (Level 1)
      .select("domain_id, name") // Alias ke id dan name untuk dropdown
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("Gagal memuat kategori aktivitas.");
      return;
    }

    setCategories(data);
    if (data.length > 0) {
      setForm((prev) => ({ ...prev, category_id: data[0].id }));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (!initialSession) {
        toast("Silakan login untuk mencatat aktivitas.", { icon: "🔒" });
        navigate("/login", { replace: true });
        return;
      }
      fetchCategories();
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          navigate("/login", { replace: true });
        } else {
          fetchCategories();
        }
      }
    );

    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [navigate, fetchCategories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;

    // 1. KONVERSI DURASI HH:MM:SS KE DETIK
    const duration_seconds = hmsToSeconds(form.duration_hms);

    // 2. Validasi Durasi (total detik)
    if (duration_seconds <= 0) {
      toast.error("Durasi harus lebih besar dari 0 detik.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      user_id: session.user.id,
      tag_id: form.category_id, // Menggunakan Domain ID sebagai Tag ID sementara
      duration_seconds: duration_seconds, // <-- MENGGUNAKAN HASIL KONVERSI
      // mood_rating dihapus dari payload
      logged_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("activity_logs").insert(payload);

      if (error) throw error;

      toast.success("Aktivitas berhasil dicatat!");

      // Reset durasi dan arahkan ke dashboard
      setForm((prev) => ({
        ...prev,
        duration_hms: "00:00:00", // <-- RESET FORMAT HMS
      }));
      navigate("/dashboard");
    } catch (error) {
      console.error("Error logging activity:", error);
      toast.error(`Gagal mencatat: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg flex justify-center items-center h-64">
        <Loader className="animate-spin mr-2" size={24} /> Memuat...
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-xl text-center">
        <h2 className="text-xl font-bold text-red-500 mb-4">
          Kesalahan Konfigurasi
        </h2>
        <p className="text-gray-600">
          Mohon isi tabel **`activity_domains`** di Supabase console terlebih
          dahulu (atau cek RLS policy).{" "}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <h2 className="mb-6 text-3xl font-bold text-gray-800">
        Catat Aktivitas Anda
      </h2>

      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-600">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Kategori Aktivitas */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Domain Aktivitas
            </label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Durasi (HH:MM:SS) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Durasi (HH:MM:SS)
            </label>
            <input
              type="text"
              name="duration_hms" // <-- NAME FIELD BARU
              value={form.duration_hms}
              onChange={handleChange}
              className="w-full rounded-md border p-3 font-mono text-lg focus:border-blue-500 focus:outline-none"
              placeholder="Contoh: 01:30:00 (1 jam 30 menit)"
              pattern="\d{2}:\d{2}:\d{2}"
              title="Gunakan format HH:MM:SS, misalnya 01:30:00"
              required
            />
          </div>

          {/* Rating Mood Dihapus */}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-3 text-lg font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader size={24} className="animate-spin" />}
            <span>{isSubmitting ? "Mencatat..." : "Catat Aktivitas"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LogActivityPage;
