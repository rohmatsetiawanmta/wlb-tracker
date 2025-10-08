// src/components/DomainLogTable.jsx

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Loader,
  ChevronDown,
  ChevronRight,
  Calendar,
  Pencil,
  Trash2,
  ClipboardList,
} from "lucide-react";

// --- Helper Functions ---
const formatSecondsDuration = (totalSeconds) => {
  if (totalSeconds < 60) return `${totalSeconds} detik`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}j ${minutes}m`;
  if (hours > 0) return `${hours} jam`;
  return `${minutes} menit`;
};

const formatTimeOnly = (date) => {
  return [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
  ].join(":");
};

const groupLogsByDate = (logs) => {
  const grouped = {};
  logs.forEach((log) => {
    const dateObj = new Date(log.start_time);
    const dateKey = dateObj.toISOString().split("T")[0];

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateObj,
        totalSeconds: 0,
        logs: [],
      };
    }
    grouped[dateKey].totalSeconds += log.duration_seconds;
    grouped[dateKey].logs.push(log);
  });
  return Object.values(grouped).sort((a, b) => b.date - a.date);
};

const domainNameMap = {
  work: "Kerja",
  health: "Kesehatan",
  personal: "Pribadi",
  study: "Belajar",
  overhead: "Rutin",
  unknown: "Lainnya",
};
// --- Akhir Helper Functions ---

const DomainLogTable = ({ domainId }) => {
  // <--- Menerima domainId sebagai prop
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [groupedLogs, setGroupedLogs] = useState([]);
  const [openDays, setOpenDays] = useState(new Set());
  const [totalCount, setTotalCount] = useState(0);

  const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const fetchDashboardData = useCallback(
    async (currentSession) => {
      if (!currentSession || !domainId) {
        setLoading(false);
        return;
      }
      const userId = currentSession.user.id;

      try {
        setLoading(true);

        // Fetch data dengan join
        const { data: logData, error: logError } = await supabase
          .from("activity_logs")
          .select(
            `
                id, duration_seconds, start_time, notes,
                tag:tag_id(
                    tag_id, name,
                    type:type_id(
                        type_id, name,
                        domain:domain_id(domain_id, name)
                    )
                )
            `
          )
          .eq("user_id", userId)
          .order("start_time", { ascending: false });

        if (logError) throw logError;

        // FILTER DATA (Client-Side) berdasarkan domainId yang diterima
        const filteredLogs = logData.filter(
          (log) => log.tag?.type?.domain?.domain_id === domainId
        );

        // Kelompokkan data yang sudah difilter
        const grouped = groupLogsByDate(filteredLogs);
        setGroupedLogs(grouped);
        setTotalCount(filteredLogs.length);

        // Secara default, buka hari pertama (paling baru)
        if (grouped.length > 0) {
          setOpenDays(new Set([grouped[0].date.toISOString().split("T")[0]]));
        }
      } catch (error) {
        console.error("Error fetching domain dashboard data:", error);
        toast.error(`Gagal memuat log untuk ${domainId}.`);
      } finally {
        setLoading(false);
      }
    },
    [domainId]
  );

  // Effect Sesi
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        fetchDashboardData(initialSession);
      } else {
        navigate("/login", { replace: true });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (newSession) {
          fetchDashboardData(newSession);
        }
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchDashboardData, navigate]);

  const toggleDay = (dateKey) => {
    setOpenDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const handleAction = (logId, action) => {
    toast(`Aksi ${action} pada Log ID ${logId} belum diimplementasikan.`);
  };

  const currentDomainName = domainNameMap[domainId] || domainId.toUpperCase();

  if (loading || !session) {
    return (
      <div className="text-center text-lg flex justify-center items-center h-64">
        <Loader className="animate-spin mr-2" size={24} /> Memuat Log{" "}
        {currentDomainName}...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Domain */}
      <header className="flex justify-between items-center mb-6">
        <h2 className="flex items-center gap-3 text-3xl font-bold text-gray-800">
          <ClipboardList size={30} /> Log Aktivitas Domain: {currentDomainName}{" "}
          ({totalCount} Entri)
        </h2>

        <button
          onClick={() => navigate("/logs")}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          Tambah Log Baru
        </button>
      </header>

      {/* Konten Log yang Dikelompokkan */}
      {groupedLogs.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-600 text-center text-gray-500">
          <p>Anda belum mencatat aktivitas dalam domain {currentDomainName}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header Tabel Utama */}
          <div className="grid grid-cols-7 text-xs font-bold uppercase text-gray-100 bg-gray-700 py-3 px-6 sticky top-0 z-10">
            <div className="col-span-1">Waktu</div>
            <div className="col-span-1">Durasi</div>
            <div className="col-span-2">Aktivitas & Catatan</div>
            <div className="col-span-1">Domain</div>
            <div className="col-span-1">Tipe</div>
            <div className="col-span-1 text-right">Aksi</div>
          </div>

          {/* Loop berdasarkan Tanggal */}
          {groupedLogs.map((dayGroup) => {
            const dateKey = dayGroup.date.toISOString().split("T")[0];
            const isDayOpen = openDays.has(dateKey);

            return (
              <div key={dateKey} className="border-b border-gray-200">
                {/* Header Group Tanggal */}
                <button
                  onClick={() => toggleDay(dateKey)}
                  className="w-full flex items-center text-left font-bold bg-gray-100 hover:bg-gray-200 py-3 px-6 transition-colors"
                >
                  <div className="w-1/4 flex items-center gap-2 text-sm text-gray-800">
                    {isDayOpen ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                    <Calendar size={18} className="text-blue-500" />
                    {dateFormatter.format(dayGroup.date)}
                  </div>
                  <div className="w-3/4 text-sm text-right text-gray-600">
                    Total: {formatSecondsDuration(dayGroup.totalSeconds)}
                  </div>
                </button>

                {/* Detail Log Harian */}
                {isDayOpen && (
                  <div className="divide-y divide-gray-100">
                    {dayGroup.logs.map((log) => {
                      const start = new Date(log.start_time);
                      const end = new Date(
                        start.getTime() + log.duration_seconds * 1000
                      );

                      const domainDisplayName =
                        log.tag?.type?.domain?.name || "N/A";
                      const typeName = log.tag?.type?.name || "N/A";
                      const tagName = log.tag?.name || "N/A";

                      return (
                        <div
                          key={log.id}
                          className="grid grid-cols-7 items-center py-4 px-6 hover:bg-blue-50/50 transition-colors"
                        >
                          {/* WAKTU START-END */}
                          <div className="col-span-1 text-sm font-mono text-gray-800">
                            {formatTimeOnly(start)} - {formatTimeOnly(end)}
                          </div>

                          {/* DURASI */}
                          <div className="col-span-1 text-sm font-semibold text-blue-600">
                            {formatSecondsDuration(log.duration_seconds)}
                          </div>

                          {/* AKTIVITAS (TAG) & NOTES */}
                          <div className="col-span-2">
                            <p className="text-sm font-medium text-gray-900">
                              {tagName}
                            </p>
                            <p
                              className="text-xs text-gray-500 truncate"
                              title={log.notes}
                            >
                              {log.notes || "—"}
                            </p>
                          </div>

                          {/* DOMAIN */}
                          <div className="col-span-1 text-xs font-medium text-gray-700">
                            {domainDisplayName}
                          </div>

                          {/* TIPE */}
                          <div className="col-span-1 text-xs text-gray-600">
                            {typeName}
                          </div>

                          {/* ACTION */}
                          <div className="col-span-1 flex justify-end space-x-2">
                            <button
                              onClick={() => handleAction(log.id, "Edit")}
                              className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-gray-200"
                              title="Edit Log"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleAction(log.id, "Delete")}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                              title="Hapus Log"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DomainLogTable;
