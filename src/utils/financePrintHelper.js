// src/utils/financePrintHelper.js
import { getAllEvents } from "../services/eventService";

export const printFinanceStatement = async ({
  clubName = "जागेवाला बाबा स्पोर्ट्स क्लब",
  eventTitle = "दीपोत्सव २०२६",
  year = "२०२०",
  transactions = [],
  selectedEventId = "ALL"
}) => {
  if (!transactions || transactions.length === 0) {
    alert("प्रिंट करण्यासाठी कोणतीही नोंद उपलब्ध नाही.");
    return;
  }

  let sheetMembers = [];
  let baseFee = 0;

  // जर एखादा विशिष्ट इव्हेंट निवडलेला असेल, तर Google Sheet मधून मेंबर यादी आणावी
  if (selectedEventId && selectedEventId !== "ALL") {
    try {
      const allEvents = await getAllEvents();
      const matchedEv = allEvents.find(e => e.id === selectedEventId || e.slug === selectedEventId);
      if (matchedEv) {
        baseFee = Number(matchedEv.baseAmount) || 0;
        const scriptUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
        if (scriptUrl) {
          const res = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(matchedEv.title)}`);
          const result = await res.json();
          if (result && result.status === "success") {
            sheetMembers = result.data || [];
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch Google Sheet members for Annexure:", e);
    }
  }

  // शीटमधील सदस्यांचे सॉर्टिंग (तुमच्या नियमानुसार: Max First -> A-Z -> Pending at End Highlighted)
  const processedMembers = sheetMembers.map((m) => {
    const amt = Number(m["Amount"] || m["amount"] || baseFee) || 0;
    const name = String(m["Full_Name"] || m["fullName"] || m["पूर्ण नाव (Full Name)"] || m["नाव"] || "सदस्य").trim();
    const regId = String(m["Reg_ID"] || m["regId"] || "-");
    const mobile = String(m["Mobile"] || m["mobile"] || m["व्हॉट्सॲप नंबर (WhatsApp No)"] || "-");
    const status = String(m["Payment_Status"] || m["paymentStatus"] || "").toLowerCase();
    const isPaid = status === "paid" || status === "यशस्वी" || status === "free";

    return { name, regId, mobile, amount: amt, isPaid, status };
  });

  // ३-टप्प्यांचे सॉर्टिंग लॉजिक
  processedMembers.sort((a, b) => {
    // जर एकाचे पेमेंट Pending असेल आणि दुसऱ्याचे Paid/Free, तर Pending नेहमी खाली जाईल
    if (a.isPaid !== b.isPaid) {
      return a.isPaid ? -1 : 1; // Paid वर, Pending खाली
    }

    // जर दोघेही Paid असतील, तर Extra Contributors (Amount > baseFee) सर्वात वर (Max First)
    if (a.isPaid && b.isPaid) {
      if (a.amount !== b.amount) {
        return b.amount - a.amount; // उतरता क्रम (जास्त रक्कम आधी)
      }
    }

    // रक्कम सारखी असेल किंवा दोघेही Pending असतील, तर नावाप्रमाणे A to Z क्रम
    return a.name.localeCompare(b.name, "mr");
  });

  const incomes = [...transactions.filter((t) => t.type === "income")];
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
        <td style="text-align: center; color: #64748b; width: 18px;">${inc ? i + 1 : ""}</td>
        <td style="font-weight: 600; font-size: 8.5px;">${inc ? inc.category || "-" : ""}</td>
        <td style="color: #475569; font-size: 8px;">${inc ? inc.description || "-" : ""}</td>
        <td style="text-align: right; font-weight: 700; color: #15803d; font-size: 9px; border-right: 2px solid #cbd5e1; width: 65px;">
          ${inc ? "₹" + Number(inc.amount).toLocaleString("en-IN") : ""}
        </td>

        <td style="text-align: center; color: #64748b; width: 18px;">${exp ? i + 1 : ""}</td>
        <td style="font-weight: 600; font-size: 8.5px;">${exp ? exp.category || "-" : ""}</td>
        <td style="color: #475569; font-size: 8px;">${exp ? exp.description || "-" : ""}</td>
        <td style="text-align: right; font-weight: 700; color: #b91c1c; font-size: 9px; width: 65px;">
          ${exp ? "₹" + Number(exp.amount).toLocaleString("en-IN") : ""}
        </td>
      </tr>
    `;
  }

  // जर Google Sheet मेंबर यादी असेल, तर Annexure चे HTML तयार करणे
  let annexureHtml = "";
  if (processedMembers.length > 0) {
    let memberRows = "";
    let annexureTotalPaid = 0;

    processedMembers.forEach((m, idx) => {
      if (m.isPaid) annexureTotalPaid += m.amount;

      // Pending लोकांसाठी खास हाईलाईटेड बॅकग्राउंड (Amber/Red Tint)
      const rowBg = !m.isPaid ? "background-color: #fef3c7 !important; font-weight: bold;" : (idx % 2 === 0 ? "#fcfcfc" : "#ffffff");
      const statusBadge = m.isPaid 
        ? `<span style="color: #15803d; background: #ecfdf5; padding: 1px 4px; border-radius: 4px; font-size: 7.5px;">Paid</span>` 
        : `<span style="color: #b91c1c; background: #fee2e2; padding: 1px 4px; border-radius: 4px; font-size: 7.5px;">PENDING</span>`;

      memberRows += `
        <tr style="${rowBg}">
          <td style="text-align: center; width: 25px;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold; text-align: center; width: 65px;">${m.regId}</td>
          <td>${m.name}</td>
          
          <td style="text-align: center; width: 55px;">${statusBadge}</td>
          <td style="text-align: right; font-weight: bold; width: 70px;">₹${m.amount.toLocaleString("en-IN")}</td>
        </tr>
      `;
    });

    annexureHtml = `
      <div class="page-break"></div>
      <div class="header-container" style="margin-top: 15px;">
        <h1 class="club-title">${clubName}</h1>
        <div class="event-title">जोडपत्र (Annexure) : ${eventTitle} - नोंदणी व वर्गणीदार सविस्तर यादी</div>
      </div>
      <table>
        <thead>
          <tr style="background: #f1f5f9; font-size: 8.5px;">
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 65px; text-align: center;">Reg ID</th>
            <th>सदस्याचे पूर्ण नाव</th>
            <th style="width: 55px; text-align: center;">स्थिती</th>
            <th style="width: 70px; text-align: right;">रक्कम</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows}
          <tr class="footer-total">
            <td colspan="5" style="text-align: right; color: #15803d;">एकूण जमा वर्गणी (Paid):</td>
            <td style="text-align: right; color: #15803d;">₹${annexureTotalPaid.toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>
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
          .page-break {
            page-break-before: always;
            break-before: page;
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

        ${annexureHtml}

        <div class="footer-container">
          <div class="audit-sign">खजिनदार / अध्यक्ष स्वाक्षरी: ___________________</div>
          <div class="dev-credit">Printed via JBSC Events App | Developed by Sandesh R. Mahadik</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};