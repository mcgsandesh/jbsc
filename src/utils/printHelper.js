// src/utils/printHelper.js

export const printReport = ({
  clubName = "जागेवाला बाबा स्पोर्ट्स क्लब",
  eventTitle = "दीपोत्सव २०२६",
  subtitle = "Master Attendance & Food Checklist (Confidential)",
  stats = [],
  columns = [],
  data = [],
  sortFn = null,
  footerNote = "अधिकृत कमिटी प्रत • गोपनीयता कारणास्तव मोबाईल नंबर वगळण्यात आला आहे"
}) => {
  if (!data || data.length === 0) {
    alert("Print karnyasaathi data nahi.");
    return;
  }

  // 1. 100% Accurate Marathi & English Alphabetical Sorting (Intl.Collator)
  let sortedData = [...data];
  if (typeof sortFn === "function") {
    const collator = new Intl.Collator(["mr", "en"], {
      sensitivity: "base",
      numeric: true,
      ignorePunctuation: true
    });

    sortedData.sort((a, b) => {
      const valA = String(sortFn(a) || "").trim();
      const valB = String(sortFn(b) || "").trim();
      return collator.compare(valA, valB);
    });
  }

  const printDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const printWindow = window.open("", "_blank");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${eventTitle} - ${clubName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 11px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .club-header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          /* 1st Main Heading */
          .club-title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
          }
          /* 2nd Heading: Event Title */
          .event-heading {
            font-size: 14px;
            font-weight: 900;
            color: #ea580c;
            margin-top: 2px;
          }
          /* Subtitle: Small font confidential checklist */
          .event-subtitle {
            font-size: 9.5px;
            font-weight: 600;
            color: #64748b;
            margin-top: 1px;
          }
          .meta-row {
            display: flex;
            justify-content: flex-end;
            margin-top: 4px;
            font-size: 9px;
            color: #64748b;
          }
          .stats-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 5px 10px;
            margin-bottom: 8px;
            font-size: 10px;
            font-weight: 700;
          }
          .stats-item span {
            color: #ea580c;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 800;
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            font-size: 9.5px;
            text-transform: uppercase;
          }
          td {
            padding: 5px 8px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer-container {
            margin-top: 12px;
            padding-top: 6px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8.5px;
          }
          .footer-note {
            color: #64748b;
            font-weight: 600;
          }
          .dev-credit {
            color: #94a3b8;
            font-weight: 500;
            letter-spacing: 0.2px;
          }
        </style>
      </head>
      <body>
        <!-- Top Header Block -->
        <div class="club-header">
          <h1 class="club-title">${clubName}</h1>
          <div class="event-heading">${eventTitle}</div>
          <div class="event-subtitle">${subtitle}</div>
          <div class="meta-row">
            <span>प्रिंट वेळ: <b>${printDate}</b></span>
          </div>
        </div>

        ${stats && stats.length > 0 ? `
          <div class="stats-bar">
            ${stats.map(s => `<div class="stats-item">${s.label}: <span>${s.value}</span></div>`).join("")}
          </div>
        ` : ""}

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              ${columns.map(col => `
                <th style="${col.width ? `width: ${col.width};` : ""} ${col.align ? `text-align: ${col.align};` : "text-align: left;"}">
                  ${col.header}
                </th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${sortedData.map((row, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
                ${columns.map(col => {
                  const content = col.render ? col.render(row, idx) : (row[col.key] ?? "-");
                  const alignStyle = col.align ? `text-align: ${col.align};` : "text-align: left;";
                  return `<td style="${alignStyle}">${content}</td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- Footer With Developer Branding -->
        <div class="footer-container">
          <span class="footer-note">${footerNote}</span>
          <span class="dev-credit">JBSC Event App | Developed by Sandesh Mahadik</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};