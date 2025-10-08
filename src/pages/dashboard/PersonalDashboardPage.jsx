// src/pages/dashboard/PersonalDashboardPage.jsx

import React from "react";
import DomainLogTable from "../../components/DomainLogTable";

const PersonalDashboardPage = () => {
  // Komponen ini mengikat logika tampilan log dasar ke Domain 'personal'.
  return <DomainLogTable domainId="personal" />;
};

export default PersonalDashboardPage;
