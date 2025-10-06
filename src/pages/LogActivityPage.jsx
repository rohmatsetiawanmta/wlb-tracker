// src/pages/LogActivityPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";

const LogActivityPage = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State untuk menyimpan kategori yang diambil dari database
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    category_id: "",
    duration_minutes: "",
    mood_rating: "5", // Default rating 5 (Netral)
  });

  const navigate = useNavigate();

  // Fungsi untuk mengambil kategori dari Supabase
  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("activity_categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("Gagal memuat kategori aktivitas.");
      return;
    }

    setCategories(data);
    // Atur category_id default ke yang pertama di daftar
    if (data.length > 0) {
      setForm((prev) => ({ ...prev, category_id: data[0].id }));
    }
  }, []);

  useEffect(() => {
    // Memeriksa sesi saat komponen dimuat
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (!initialSession) {
        toast("Silakan login untuk mencatat aktivitas.", { icon: "🔒" });
        navigate("/login", { replace: true });
        return;
      }
      // Ambil kategori setelah sesi dikonfirmasi
      fetchCategories();
      setLoading(false);
    });

    // Listener untuk perubahan sesi (login/logout)
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

    // Validasi sederhana
    const duration = parseInt(form.duration_minutes);
    if (isNaN(duration) || duration <= 0) {
      toast.error("Durasi harus angka positif.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      user_id: session.user.id,
      category_id: form.category_id,
      duration_minutes: duration,
      mood_rating: parseInt(form.mood_rating),
      logged_at: new Date().toISOString(),
    };

    try {
      // Masukkan payload ke tabel activity_logs
      const { error } = await supabase.from("activity_logs").insert(payload);

      if (error) throw error;

      toast.success("Aktivitas berhasil dicatat!");

      // Reset durasi dan arahkan ke dashboard
      setForm((prev) => ({
        ...prev,
        duration_minutes: "",
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
          Mohon isi tabel **`activity_categories`** di Supabase console terlebih
          dahulu untuk dapat mencatat aktivitas.
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
              Kategori Aktivitas
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

          {/* Durasi */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Durasi (dalam Menit)
            </label>
            <input
              type="number"
              name="duration_minutes"
              value={form.duration_minutes}
              onChange={handleChange}
              className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
              placeholder="Contoh: 60 (untuk 1 jam)"
              required
            />
          </div>

          {/* Rating Mood */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Bagaimana perasaan Anda terhadap aktivitas ini? (1=Buruk, 10=Baik)
            </label>
            <input
              type="range"
              name="mood_rating"
              min="1"
              max="10"
              step="1"
              value={form.mood_rating}
              onChange={handleChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
            />
            <div className="flex justify-between text-xs pt-2">
              <span className="text-red-500 font-semibold">1 (Buruk)</span>
              <span>{form.mood_rating}</span>
              <span className="text-green-500 font-semibold">10 (Baik)</span>
            </div>
          </div>

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
