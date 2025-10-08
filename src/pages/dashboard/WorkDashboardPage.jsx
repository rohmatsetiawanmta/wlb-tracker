// src/pages/dashboard/WorkDashboardPage.jsx

import React from "react";
import DomainLogTable from "../../components/DomainLogTable"; // Pastikan path relatif ini benar

const WorkDashboardPage = () => {
  // Ini adalah wrapper spesialisasi untuk Domain 'work'
  return <DomainLogTable domainId="work" />;
};

export default WorkDashboardPage;
