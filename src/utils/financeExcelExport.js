// src/utils/financeExcelExport.js

export const exportFinanceToExcel = ({
  eventTitle = "दीपोत्सव २०२६",
  transactions = []
}) => {
  if (!transactions || transactions.length === 0) {
    alert("Export करण्यासाठी कोणतीही नोंद उपलब्ध नाही.");
    return;
  }

  const headers = ["तारीख", "इव्हेंट", "प्रकार", "वर्गवारी", "तपशील", "पेमेंट मोड", "रक्कम (₹)"];

  const rows = transactions.map((t) => [
    `"${t.date || t.createdAt?.split("T")[0] || ""}"`,
    `"${t.eventTitle || ""}"`,
    `"${t.type === "income" ? "जमा (Income)" : "खर्च (Expense)"}"`,
    `"${t.category || ""}"`,
    `"${(t.description || "").replace(/"/g, '""')}"`,
    `"${t.paymentMode || "Cash"}"`,
    Number(t.amount) || 0
  ]);

  // UTF-8 BOM (\uFEFF) mule Devanagari/Marathi akshare MS Excel madhye neat distat
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const cleanTitle = eventTitle.replace(/\s+/g, "_");
  link.setAttribute("href", url);
  link.setAttribute("download", `JBSC_Finance_${cleanTitle}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};