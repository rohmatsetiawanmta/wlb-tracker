// src/pages/dashboard/WorkDashboardPage.jsx

import React from "react";
import { TrendingUp, Clock, BarChart } from "lucide-react"; // Import ikon tambahan
import DomainLogTable from "../../components/DomainLogTable";

// --- Komponen Statistik Khusus Kerja (PLACEHOLDER) ---
const WorkStats = () => (
  <div className="space-y-4 mb-8">
    <h3 className="text-2xl font-bold text-gray-800 border-b pb-2">
      Metrik Produktivitas Kerja
    </h3>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Statistik 1: Jam Fokus */}
      <div className="bg-indigo-50 p-6 rounded-xl shadow-md flex items-center gap-4 border-l-4 border-indigo-600">
        <TrendingUp size={30} className="text-indigo-600" />
        <div>
          <p className="text-sm font-semibold text-gray-700">
            Total Jam Kerja Fokus
          </p>
          <p className="text-3xl font-bold text-indigo-900">22 Jam</p>
        </div>
      </div>

      {/* Statistik 2: Rata-rata Komunikasi */}
      <div className="bg-indigo-50 p-6 rounded-xl shadow-md flex items-center gap-4 border-l-4 border-indigo-600">
        <Clock size={30} className="text-indigo-600" />
        <div>
          <p className="text-sm font-semibold text-gray-700">
            Rata-rata Waktu Meeting/Hari
          </p>
          <p className="text-3xl font-bold text-indigo-900">1.5 Jam</p>
        </div>
      </div>

      {/* Statistik 3: Rasio Deep Work */}
      <div className="bg-indigo-50 p-6 rounded-xl shadow-md flex items-center gap-4 border-l-4 border-indigo-600">
        <BarChart size={30} className="text-indigo-600" />
        <div>
          <p className="text-sm font-semibold text-gray-700">
            Rasio Deep Work vs Shallow
          </p>
          <p className="text-3xl font-bold text-indigo-900">75%</p>
        </div>
      </div>
    </div>
  </div>
);

const WorkDashboardPage = () => {
  // Ini adalah wrapper spesialisasi untuk Domain 'work'.

  return (
    <>
      <WorkStats />
    </>
  );
};

export default WorkDashboardPage;
