// src/utils/financePrintHelper.js

export const printFinanceStatement = ({
  clubName = "जागेवाला बाबा स्पोर्ट्स क्लब",
  eventTitle = "दीपोत्सव २०२६",
  year = "२०२६",
  transactions = []
}) => {
  if (!transactions || transactions.length === 0) {
    alert("प्रिंट करण्यासाठी कोणतीही नोंद उपलब्ध नाही.");
    return;
  }

  const incomes = transactions.filter((t) => t.type === "income");
  const expenses = transactions.filter((t) => t.type === "expense");

  const totalIncome = incomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const maxRows = Math.max(incomes.length, expenses.length);
  const printDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const printWindow = window.open("", "_blank");

  let tableRowsHtml = "";
  for (let i = 0; i < maxRows; i++) {
    const inc = incomes[i];
    const exp = expenses[i];

    tableRowsHtml += `
      <tr>
        <!-- Income Side -->
        <td style="text-align: center; color: #64748b; width: 18px;">${inc ? i + 1 : ""}</td>
        <td style="font-weight: 600; font-size: 8.5px;">${inc ? inc.category || "-" : ""}</td>
        <td style="color: #475569; font-size: 8px;">${inc ? inc.description || "-" : ""}</td>
        <td style="text-align: right; font-weight: 700; color: #15803d; font-size: 9px; border-right: 2px solid #cbd5e1; width: 65px;">
          ${inc ? "₹" + Number(inc.amount).toLocaleString("en-IN") : ""}
        </td>

        <!-- Expense Side -->
        <td style="text-align: center; color: #64748b; width: 18px;">${exp ? i + 1 : ""}</td>
        <td style="font-weight: 600; font-size: 8.5px;">${exp ? exp.category || "-" : ""}</td>
        <td style="color: #475569; font-size: 8px;">${exp ? exp.description || "-" : ""}</td>
        <td style="text-align: right; font-weight: 700; color: #b91c1c; font-size: 9px; width: 65px;">
          ${exp ? "₹" + Number(exp.amount).toLocaleString("en-IN") : ""}
        </td>
      </tr>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>आर्थिक हिशोब - ${eventTitle}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 8mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 9px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header-container {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .club-title {
            font-size: 16px;
            font-weight: 900;
            margin: 0;
            letter-spacing: -0.3px;
          }
          .event-title {
            font-size: 11.5px;
            font-weight: 800;
            color: #ea580c;
            margin-top: 2px;
          }
          .meta-bar {
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: #64748b;
            margin-top: 2px;
          }
          .summary-bar {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 5px 8px;
            margin-bottom: 6px;
            font-size: 9.5px;
            font-weight: 800;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          th {
            padding: 4px;
            border: 1px solid #cbd5e1;
            font-size: 8.5px;
          }
          th.income-header {
            background-color: #ecfdf5;
            color: #065f46;
          }
          th.expense-header {
            background-color: #fef2f2;
            color: #991b1b;
          }
          td {
            padding: 3.5px 4px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
            word-wrap: break-word;
          }
          tr:nth-child(even) td {
            background-color: #fcfcfc;
          }
          .footer-total td {
            background-color: #f1f5f9 !important;
            font-weight: 900;
            font-size: 9.5px;
            padding: 5px 4px;
            border-top: 2px solid #0f172a;
          }
          .footer-container {
            margin-top: 10px;
            padding-top: 5px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .audit-sign {
            font-size: 8px;
            color: #475569;
            font-weight: bold;
          }
          .dev-credit {
            font-size: 7.5px;
            color: #94a3b8;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <h1 class="club-title">${clubName}</h1>
          <div class="event-title">${eventTitle} • वार्षिक आर्थिक जमा-खर्च पत्रक (${year})</div>
          <div class="meta-bar">
            <span>अधिकृत ऑडिट प्रत</span>
            <span>प्रिंटिंग दिनांक व वेळ: <b>${printDate}</b></span>
          </div>
        </div>

        <div class="summary-bar">
          <div style="color: #15803d;">एकूण जमा: ₹${totalIncome.toLocaleString("en-IN")}</div>
          <div style="color: #b91c1c;">एकूण खर्च: ₹${totalExpense.toLocaleString("en-IN")}</div>
          <div style="color: ${netBalance >= 0 ? "#0f172a" : "#b91c1c"};">
            शिल्लक: ₹${netBalance.toLocaleString("en-IN")}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th colspan="4" class="income-header" style="border-right: 2px solid #cbd5e1;">जमा बाजू (INCOME)</th>
              <th colspan="4" class="expense-header">खर्च बाजू (EXPENSES)</th>
            </tr>
            <tr style="background: #f8fafc; font-size: 8px;">
              <th style="width: 18px;">#</th>
              <th style="width: 25%;">वर्गवारी</th>
              <th>तपशील</th>
              <th style="width: 65px; text-align: right; border-right: 2px solid #cbd5e1;">रक्कम</th>
              <th style="width: 18px;">#</th>
              <th style="width: 25%;">वर्गवारी</th>
              <th>तपशील</th>
              <th style="width: 65px; text-align: right;">रक्कम</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            <tr class="footer-total">
              <td colspan="3" style="text-align: right; color: #15803d;">एकूण जमा:</td>
              <td style="text-align: right; color: #15803d; border-right: 2px solid #cbd5e1;">
                ₹${totalIncome.toLocaleString("en-IN")}
              </td>
              <td colspan="3" style="text-align: right; color: #b91c1c;">एकूण खर्च:</td>
              <td style="text-align: right; color: #b91c1c;">
                ₹${totalExpense.toLocaleString("en-IN")}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="footer-container">
          <div class="audit-sign">खजिनदार / अध्यक्ष स्वाक्षरी: ___________________</div>
          <div class="dev-credit">Printed via JBSC Events App | Developed by Sandesh R. Mahadik</div>
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