// src/pages/LogActivityPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";

// --- Helper Functions (Tetap Sama) ---
const timeToString = (date) => {
  return [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
    date.getSeconds().toString().padStart(2, "0"),
  ].join(":");
};

const combineDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  return new Date(`${dateStr}T${timeStr}`);
};
// --- Akhir Helper Functions ---

const LogActivityPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk menyimpan opsi dropdown
  const [domains, setDomains] = useState([]);
  const [types, setTypes] = useState([]);
  const [tags, setTags] = useState([]);

  // State untuk menyimpan ID yang dipilih di setiap level (default: string kosong)
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");

  // Default state: Hari ini, waktu sekarang
  const now = new Date();
  const todayDate = now.toISOString().split("T")[0];
  const defaultEndTime = new Date(now.getTime() + 30 * 60000);

  const [form, setForm] = useState({
    startDate: todayDate,
    startTime: timeToString(now),
    endTime: timeToString(defaultEndTime),
    notes: "",
  });

  // --- LOGIKA FETCH DROPDOWN ---

  // 1. Fetch Domains saat mount
  const fetchDomains = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_domains")
      .select("domain_id, name")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching domains:", error);
      toast.error("Gagal memuat Domain Aktivitas.");
    } else {
      setDomains(data);
    }
    setLoading(false);
  }, []);

  // 2. Fetch Types berdasarkan Domain yang dipilih
  const fetchTypes = useCallback(async (domainId) => {
    setTags([]); // Reset Tags
    setSelectedTagId("");
    setTypes([]);
    setSelectedTypeId("");

    if (!domainId) return;

    const { data, error } = await supabase
      .from("activity_types")
      .select("type_id, name")
      .eq("domain_id", domainId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching types:", error);
    } else {
      setTypes(data);
    }
  }, []);

  // 3. Fetch Tags berdasarkan Type yang dipilih
  const fetchTags = useCallback(async (typeId) => {
    setSelectedTagId(""); // Reset Tag
    setTags([]);

    if (!typeId) return;

    const { data, error } = await supabase
      .from("activity_tags")
      .select("tag_id, name")
      .eq("type_id", typeId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching tags:", error);
    } else {
      setTags(data);
      if (data.length > 0) {
        // Biarkan selectedTagId kosong, placeholder yang akan dipilih
      }
    }
  }, []);

  // --- EFFECT DAN HANDLER ---

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (!initialSession) {
        toast("Silakan login untuk mencatat aktivitas.", { icon: "🔒" });
        navigate("/login", { replace: true });
        return;
      }
      fetchDomains(); // Mulai rantai fetch
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          navigate("/login", { replace: true });
        } else {
          fetchDomains();
        }
      }
    );

    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [navigate, fetchDomains]);

  // Effect untuk menjalankan cascading fetch: Domain -> Types
  useEffect(() => {
    // Hanya fetch jika Domain sudah dipilih
    if (selectedDomainId) {
      fetchTypes(selectedDomainId);
    } else {
      setTypes([]);
      setSelectedTypeId("");
    }
  }, [selectedDomainId, fetchTypes]);

  // Effect untuk menjalankan cascading fetch: Types -> Tags
  useEffect(() => {
    // Hanya fetch jika Tipe sudah dipilih
    if (selectedTypeId) {
      fetchTags(selectedTypeId);
    } else {
      setTags([]);
      setSelectedTagId("");
    }
  }, [selectedTypeId, fetchTags]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleDomainChange = (e) => {
    setSelectedDomainId(e.target.value);
    setSelectedTypeId(""); // Reset Type saat Domain berubah
    setSelectedTagId(""); // Reset Tag saat Domain berubah
  };

  const handleTypeChange = (e) => {
    setSelectedTypeId(e.target.value);
    setSelectedTagId(""); // Reset Tag saat Type berubah
  };

  const handleTagChange = (e) => {
    setSelectedTagId(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;

    // Validasi final: Pastikan Tag sudah dipilih
    if (!selectedTagId) {
      toast.error("Mohon pilih Tag Aktivitas (Level 3) yang spesifik.");
      return;
    }

    setIsSubmitting(true);

    const startDateTime = combineDateTime(form.startDate, form.startTime);
    const endDateTime = combineDateTime(form.startDate, form.endTime);

    // Validasi Tanggal/Jam
    if (
      !startDateTime ||
      isNaN(startDateTime.getTime()) ||
      !endDateTime ||
      isNaN(endDateTime.getTime())
    ) {
      toast.error("Format tanggal atau jam tidak valid.");
      setIsSubmitting(false);
      return;
    }

    let duration_seconds = Math.floor(
      (endDateTime.getTime() - startDateTime.getTime()) / 1000
    );

    // Validasi Durasi
    if (duration_seconds <= 0) {
      toast.error(
        "Durasi tidak boleh nol atau negatif. Jam Selesai harus setelah Jam Mulai."
      );
      setIsSubmitting(false);
      return;
    }

    // --- Payload Final ---
    const payload = {
      user_id: session.user.id,
      tag_id: selectedTagId, // MENGGUNAKAN ID TAG FINAL (Level 3)
      duration_seconds: duration_seconds,
      start_time: startDateTime.toISOString(),
      notes: form.notes,
    };

    try {
      const { error } = await supabase.from("activity_logs").insert(payload);

      if (error) throw error;

      const minutes = Math.floor(duration_seconds / 60);
      toast.success(`Aktivitas ${minutes} menit berhasil dicatat!`);

      // Reset hanya notes dan seleksi
      setForm((prev) => ({
        ...prev,
        notes: "",
      }));
      // Set ulang ke kondisi awal (placeholder)
      setSelectedDomainId("");
      setSelectedTypeId("");
      setSelectedTagId("");
      fetchDomains(); // Reload domains untuk refresh dropdowns

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

  // Cek jika tidak ada domain sama sekali (kesalahan konfigurasi)
  if (domains.length === 0 && !loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-xl text-center">
        <h2 className="text-xl font-bold text-red-500 mb-4">
          Konfigurasi Domain Hilang
        </h2>
        <p className="text-gray-600">
          Mohon buat Domain Aktivitas di{" "}
          <Link
            to="/admin/categories"
            className="text-blue-600 hover:underline"
          >
            Panel Admin
          </Link>{" "}
          terlebih dahulu.{" "}
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
          {/* Pemilihan Hierarki Aktivitas (3 Tingkat) */}
          <div className="space-y-4 pt-4 border-b pb-4">
            <h3 className="text-xl font-bold text-gray-700">Pilih Aktivitas</h3>

            {/* 1. Domain */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                1. Domain
              </label>
              <select
                value={selectedDomainId}
                onChange={handleDomainChange}
                className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
                required
              >
                {/* Placeholder */}
                <option value="" disabled>
                  Pilih Domain
                </option>
                {domains.map((d) => (
                  <option key={d.domain_id} value={d.domain_id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Tipe Aktivitas (CONDITIONAL) */}
            {selectedDomainId && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  2. Tipe Aktivitas
                </label>
                <select
                  value={selectedTypeId}
                  onChange={handleTypeChange}
                  className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
                  disabled={types.length === 0}
                  required
                >
                  {/* Placeholder */}
                  <option value="" disabled>
                    Pilih Tipe
                  </option>
                  {types.length === 0 ? (
                    <option value="" disabled>
                      {selectedDomainId
                        ? "Tidak ada Tipe"
                        : "Pilih Domain Dahulu"}
                    </option>
                  ) : (
                    types.map((t) => (
                      <option key={t.type_id} value={t.type_id}>
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* 3. Tag Aktivitas (CONDITIONAL) */}
            {selectedTypeId && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  3. Tag Aktivitas
                </label>
                <select
                  value={selectedTagId}
                  onChange={handleTagChange}
                  className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
                  disabled={tags.length === 0}
                  required
                >
                  {/* Placeholder */}
                  <option value="" disabled>
                    Pilih Tag
                  </option>
                  {tags.length === 0 ? (
                    <option value="" disabled>
                      {selectedTypeId ? "Tidak ada Tag" : "Pilih Tipe Dahulu"}
                    </option>
                  ) : (
                    tags.map((t) => (
                      <option key={t.tag_id} value={t.tag_id}>
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Input Waktu Mulai & Berakhir */}
          <div className="grid grid-cols-3 gap-4">
            {/* Tanggal Mulai */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Tanggal
              </label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            {/* Jam Mulai */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Mulai
              </label>
              <input
                type="time"
                name="startTime"
                step="1"
                value={form.startTime}
                onChange={handleChange}
                className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            {/* Jam Berakhir */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Selesai
              </label>
              <input
                type="time"
                name="endTime"
                step="1"
                value={form.endTime}
                onChange={handleChange}
                className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Input Catatan */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
              rows="3"
              placeholder="Tambahkan detail tentang aktivitas ini."
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-3 text-lg font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isSubmitting || !selectedTagId} // Disable jika belum ada Tag yang dipilih
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
