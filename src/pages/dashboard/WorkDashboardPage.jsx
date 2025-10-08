// src/pages/dashboard/WorkDashboardPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Briefcase, Clock, Loader } from "lucide-react";

// Identifier untuk Work, sesuai dengan yang ada di UserDashboardPage.jsx dan seharusnya di activity_domains
const WORK_DOMAIN_NAME = "Work";

/**
 * Helper: Mengonversi detik menjadi string jam:menit
 * @param {number} totalSeconds
 * @returns {string}
 */
const formatDuration = (totalSeconds) => {
  if (typeof totalSeconds !== "number" || totalSeconds < 0)
    return "0 jam 0 menit";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours} jam ${minutes} menit`;
};

const WorkDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [totalWorkSeconds, setTotalWorkSeconds] = useState(0);

  const fetchWorkData = useCallback(async () => {
    setLoading(true);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      toast.error("Sesi tidak ditemukan. Harap login kembali.");
      setLoading(false);
      return;
    }
    const userId = sessionData.session.user.id;

    // --- Langkah 1: Ambil ID Domain dari activity_domains ---
    const { data: domainData, error: domainError } = await supabase
      .from("activity_domains")
      .select("id")
      .eq("name", WORK_DOMAIN_NAME) // Mencocokkan dengan nama domain
      .single();

    if (domainError || !domainData) {
      console.error(
        `Error fetching work domain ID for name "${WORK_DOMAIN_NAME}":`,
        domainError
      );
      toast.error(
        `Gagal menemukan ID Domain untuk "${WORK_DOMAIN_NAME}". Pastikan nama domain sudah ada di tabel activity_domains.`
      );
      setLoading(false);
      return;
    }

    const fetchedDomainId = domainData.id;

    // --- Langkah 2: Ambil log aktivitas menggunakan ID Domain yang ditemukan ---
    const { data: logs, error: logsError } = await supabase
      .from("activity_logs")
      .select(
        `
        duration_seconds,
        tag:tag_id (
          name,
          type:type_id (
            domain_id
          )
        )
      `
      )
      .eq("user_id", userId)
      .eq("tag.type.domain_id", fetchedDomainId) // Gunakan ID Domain yang ditemukan
      .limit(1000); // Batasi untuk performa

    if (logsError) {
      console.error("Error fetching work logs:", logsError);
      toast.error("Gagal memuat log kerja.");
      setLoading(false);
      return;
    }

    // --- Langkah 3: Olah data (Sama seperti sebelumnya) ---
    let totalSeconds = 0;
    const tagDurationMap = {};

    logs.forEach((log) => {
      const seconds = log.duration_seconds || 0;
      totalSeconds += seconds;

      const tagName = log.tag?.name || "Tag Lain";
      tagDurationMap[tagName] = (tagDurationMap[tagName] || 0) + seconds;
    });

    const processedChartData = Object.keys(tagDurationMap).map((tagName) => ({
      name: tagName,
      duration: Math.round((tagDurationMap[tagName] / 3600) * 10) / 10, // Konversi ke jam, 1 desimal
    }));

    setTotalWorkSeconds(totalSeconds);
    setChartData(processedChartData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkData();
  }, [fetchWorkData]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg flex justify-center items-center h-64">
        <Loader className="animate-spin mr-2" size={24} /> Memuat Work
        Dashboard...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-8 flex items-center gap-3 text-3xl font-bold text-indigo-700">
        <Briefcase size={30} /> Work Dashboard ({WORK_DOMAIN_NAME})
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Ringkasan Durasi Kerja */}
        <div className="rounded-xl bg-white p-6 shadow-lg border-l-4 border-indigo-500">
          <p className="text-sm font-medium text-gray-500">
            Total Durasi Kerja
          </p>
          <div className="flex items-center mt-2">
            <Clock size={24} className="text-indigo-500 mr-3" />
            <span className="text-3xl font-extrabold text-gray-900">
              {formatDuration(totalWorkSeconds)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Data mencakup semua log kerja yang tercatat.
          </p>
        </div>

        {/* Placeholder Card 2 */}
        <div className="rounded-xl bg-white p-6 shadow-lg border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-gray-500">
            Pekerjaan Produktif
          </p>
          <span className="text-3xl font-extrabold text-gray-900">...</span>
          <p className="text-xs text-gray-400 mt-2">
            (Implementasi filter Tipe 'Produktif' di sini)
          </p>
        </div>

        {/* Placeholder Card 3 */}
        <div className="rounded-xl bg-white p-6 shadow-lg border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-500">Waktu Overhead</p>
          <span className="text-3xl font-extrabold text-gray-900">...</span>
          <p className="text-xs text-gray-400 mt-2">
            (Implementasi filter Tipe 'Rutin/Overhead' di sini)
          </p>
        </div>
      </div>

      {/* Grafik Waktu per Tag Aktivitas */}
      <div className="mt-8 rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Waktu Kerja Berdasarkan Tag (Jam)
        </h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(value) => [`${value} jam`, "Durasi"]} />
              <Bar dataKey="duration" fill="#4f46e5" name="Durasi (Jam)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">
            Belum ada log aktivitas kerja yang dicatat.
          </p>
        )}
      </div>

      {/* Komponen Log Table Generik bisa ditambahkan di sini jika perlu */}
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Log Terakhir (Work)
        </h3>
        <div className="p-4 bg-gray-100 rounded-lg text-gray-600">
          Tabel log rinci akan ditampilkan di sini (membutuhkan implementasi
          DomainLogTable).
        </div>
      </div>
    </div>
  );
};

export default WorkDashboardPage;
