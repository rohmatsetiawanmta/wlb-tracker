// src/pages/dashboard/StudyDashboardPage.jsx

import React from "react";
import DomainLogTable from "../../components/DomainLogTable";

const StudyDashboardPage = () => {
  // Komponen ini mengikat logika tampilan log dasar ke Domain 'study'.
  return <DomainLogTable domainId="study" />;
};

export default StudyDashboardPage;
