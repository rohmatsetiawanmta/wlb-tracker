// src/pages/DomainDashboardPage.jsx

import React from "react";
import { useParams } from "react-router-dom";
import DomainLogTable from "../components/DomainLogTable"; // Komponen Log Table Generik (Fallback)

// Impor komponen spesialisasi
import WorkDashboardPage from "./dashboard/WorkDashboardPage";
import StudyDashboardPage from "./dashboard/StudyDashboardPage";
import HealthDashboardPage from "./dashboard/HealthDashboardPage";
import PersonalDashboardPage from "./dashboard/PersonalDashboardPage";

// Map yang menghubungkan domainId dari URL ke Komponen Dashboard Spesialisasi
const DOMAIN_COMPONENTS = {
  work: WorkDashboardPage,
  study: StudyDashboardPage,
  health: HealthDashboardPage,
  personal: PersonalDashboardPage,
};

const DomainDashboardPage = () => {
  const { domainId } = useParams();
  const normalizedDomainId = domainId.toLowerCase();

  // Dapatkan komponen spesifik, atau fallback ke DomainLogTable generik
  const SpecificDashboard = DOMAIN_COMPONENTS[normalizedDomainId];

  // Jika domainId tidak memiliki komponen spesialisasi yang terdaftar
  if (!SpecificDashboard) {
    // Gunakan DomainLogTable generik sebagai fallback, pass domainId
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h3 className="text-xl text-yellow-600">
          Menggunakan Tampilan Generik untuk '{domainId}'
        </h3>
        <DomainLogTable domainId={normalizedDomainId} />
      </div>
    );
  }

  // Render komponen spesialisasi yang telah diimpor
  return <SpecificDashboard />;
};

export default DomainDashboardPage;
