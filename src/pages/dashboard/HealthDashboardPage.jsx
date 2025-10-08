// src/pages/dashboard/HealthDashboardPage.jsx

import React from "react";
import DomainLogTable from "../../components/DomainLogTable";

const HealthDashboardPage = () => {
  // Komponen ini mengikat logika tampilan log dasar ke Domain 'health'.
  return <DomainLogTable domainId="health" />;
};

export default HealthDashboardPage;
