// src/utils/squadExportHelper.js

const BG_THEME_COLORS = {
  "studio-dark": ["#1e293b", "#020617"],
  "warm-amber": ["#78350f", "#090d16"],
  "clean-slate": ["#e2e8f0", "#cbd5e1"]
};

function loadImageSafe(src, fallbackSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (!fallbackSrc || img.src === fallbackSrc) {
        resolve(null);
        return;
      }
      const fb = new Image();
      fb.crossOrigin = "anonymous";
      fb.onload = () => resolve(fb);
      fb.onerror = () => resolve(null);
      fb.src = fallbackSrc;
    };
    img.src = src;
  });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * निवडलेल्या संघाचे आकर्षक Squad Image Card (.png) तयार करून डाउनलोड करणे
 */
export async function downloadTeamSquadImageCard({
  auction,
  team,
  squadPlayers,
  dummyPlayerPhoto,
  hidePurse = false
}) {
  const playersList = Array.isArray(squadPlayers) ? squadPlayers : [];
  const cols = 2;
  const rows = Math.max(1, Math.ceil(playersList.length / cols));

  const width = 1080;
  const headerHeight = 230;
  const rowHeight = 148;
  const footerHeight = 76;
  const height = headerHeight + rows * rowHeight + footerHeight + 36;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#090d16");
  bgGrad.addColorStop(0.5, "#0f172a");
  bgGrad.addColorStop(1, "#020617");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const accentGrad = ctx.createLinearGradient(0, 0, width, 0);
  accentGrad.addColorStop(0, "#ea580c");
  accentGrad.addColorStop(0.5, "#f59e0b");
  accentGrad.addColorStop(1, "#10b981");
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, width, 10);

  const logoImg = team?.logoUrl
    ? await loadImageSafe(team.logoUrl, dummyPlayerPhoto)
    : null;

  const logoSize = 112;
  const logoX = 48;
  const logoY = 44;

  drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 22);
  ctx.fillStyle = "#020617";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#334155";
  ctx.stroke();

  if (logoImg) {
    ctx.save();
    drawRoundedRect(ctx, logoX + 6, logoY + 6, logoSize - 12, logoSize - 12, 16);
    ctx.clip();
    ctx.drawImage(logoImg, logoX + 6, logoY + 6, logoSize - 12, logoSize - 12);
    ctx.restore();
  } else {
    ctx.fillStyle = "#fb923c";
    ctx.font = "900 34px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      (team?.shortName || team?.name || "TM").slice(0, 3).toUpperCase(),
      logoX + logoSize / 2,
      logoY + logoSize / 2
    );
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#f59e0b";
  ctx.font = "800 18px sans-serif";
  ctx.fillText(
    `${auction?.title || "CRICKET AUCTION"} • ${auction?.organizer || "JBSC"}`,
    182,
    46
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 42px sans-serif";
  ctx.fillText(team?.name || "Team Squad", 182, 76);

  const totalPurse = Number(team?.totalPurse ?? auction?.purseAmount ?? 0);
  const remaining = Number(team?.remainingPurse ?? 0);
  const spent = Math.max(0, totalPurse - remaining);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "700 20px sans-serif";
  const summaryText = hidePurse
    ? `Squad: ${playersList.length}/${auction?.maxPlayers || 12} • Purse & Prices: PIN Only`
    : `Players: ${playersList.length}/${auction?.maxPlayers || 12}  |  Spent: ₹${spent.toLocaleString()}  |  Remaining: ₹${remaining.toLocaleString()}`;
  ctx.fillText(summaryText, 182, 128);

  const startY = headerHeight;
  const cardGapX = 24;
  const cardGapY = 18;
  const sideMargin = 48;
  const cardWidth = (width - sideMargin * 2 - cardGapX) / cols;
  const cardHeight = rowHeight - cardGapY;

  for (let i = 0; i < playersList.length; i++) {
    const p = playersList[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = sideMargin + col * (cardWidth + cardGapX);
    const y = startY + row * rowHeight;

    drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 20);
    ctx.fillStyle = "#111827";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#1f2937";
    ctx.stroke();

    const photoSize = 96;
    const photoX = x + 16;
    const photoY = y + (cardHeight - photoSize) / 2;
    const [bgTop, bgBot] =
      BG_THEME_COLORS[p.photoBgTheme || "studio-dark"] ||
      BG_THEME_COLORS["studio-dark"];

    const pGrad = ctx.createLinearGradient(
      photoX,
      photoY,
      photoX,
      photoY + photoSize
    );
    pGrad.addColorStop(0, bgTop);
    pGrad.addColorStop(1, bgBot);

    drawRoundedRect(ctx, photoX, photoY, photoSize, photoSize, 14);
    ctx.fillStyle = pGrad;
    ctx.fill();

    const pImg = await loadImageSafe(
      (p.photoUrl || "").trim() || dummyPlayerPhoto,
      dummyPlayerPhoto
    );
    if (pImg) {
      ctx.save();
      drawRoundedRect(ctx, photoX, photoY, photoSize, photoSize, 14);
      ctx.clip();
      ctx.drawImage(pImg, photoX, photoY, photoSize, photoSize);
      ctx.restore();
    }

    const textX = photoX + photoSize + 16;
    const maxTextW = cardWidth - (photoSize + 40);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 22px sans-serif";
    ctx.fillText(
      `${i + 1}. ${p.name || "Player"}`,
      textX,
      y + 18,
      maxTextW
    );

    ctx.fillStyle = "#fbbf24";
    ctx.font = "700 16px sans-serif";
    ctx.fillText(
      `${p.role || "All-rounder"} • Pool ${p.pool || "A"}`,
      textX,
      y + 48,
      maxTextW
    );

    ctx.fillStyle = hidePurse ? "#94a3b8" : "#34d399";
    ctx.font = hidePurse ? "800 18px sans-serif" : "900 22px sans-serif";
    ctx.fillText(
      hidePurse
        ? "Price: PIN Only"
        : `₹${Number(p.soldPrice || 0).toLocaleString()}`,
      textX,
      y + 78,
      maxTextW
    );
  }

  if (playersList.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "या संघाने अद्याप कोणताही खेळाडू खरेदी केलेला नाही.",
      width / 2,
      startY + 45
    );
  }

  ctx.fillStyle = "#64748b";
  ctx.font = "700 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `${auction?.organizer || "JBSC"} • Official Auction Squad Card`,
    width / 2,
    height - 42
  );

  const dataUrl = canvas.toDataURL("image/png");
  const safeTeamName = (team?.name || "Team_Squad")
    .replace(/[^a-zA-Z0-9\u0900-\u097F_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const link = document.createElement("a");
  link.download = `${safeTeamName}_Squad_Card.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * निवडलेल्या संघाचे किंवा सर्व संघांचे Printable Squad PDF Sheet उघडणे
 */
export function printTeamSquadPdf({
  auction,
  teams,
  players,
  selectedTeamId = null,
  hidePurse = false
}) {
  const targetTeams = selectedTeamId
    ? (teams || []).filter((t) => t.id === selectedTeamId)
    : teams || [];

  const sectionsHtml = targetTeams
    .map((team) => {
      const squad = (players || []).filter((p) => p.soldToTeamId === team.id);
      const totalPurse = Number(team.totalPurse ?? auction?.purseAmount ?? 0);
      const remaining = Number(team.remainingPurse ?? 0);
      const spent = Math.max(0, totalPurse - remaining);

      const rowsHtml =
        squad.length > 0
          ? squad
              .map(
                (sp, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>
                  <div class="player-cell">
                    ${
                      sp.photoUrl
                        ? `<img src="${sp.photoUrl}" alt="${sp.name}" class="p-photo" />`
                        : ""
                    }
                    <span>${sp.name || "-"}</span>
                  </div>
                </td>
                <td>Pool ${sp.pool || "A"}</td>
                <td>${sp.role || "-"}</td>
                <td class="num">${
                  hidePurse
                    ? "PIN Only"
                    : `₹${Number(sp.soldPrice || 0).toLocaleString()}`
                }</td>
              </tr>`
              )
              .join("")
          : `<tr><td colspan="5" class="empty">अद्याप कोणताही खेळाडू खरेदी केलेला नाही.</td></tr>`;

      return `
        <section class="team-block">
          <div class="team-header">
            <div>
              <h2>${team.name}</h2>
              <p>प्रतिनिधी: ${team.ownerName || "-"} • खेळाडू: ${squad.length}/${
        auction?.maxPlayers || 12
      }</p>
            </div>
            <div class="purse-box">
              ${
                hidePurse
                  ? `<span>बजेट व किंमत: PIN Only</span>`
                  : `<span>खर्च: ₹${spent.toLocaleString()}</span> • <strong>शिल्लक: ₹${remaining.toLocaleString()}</strong>`
              }
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:45px">#</th>
                <th>Player Name</th>
                <th style="width:110px">Pool</th>
                <th style="width:170px">Role</th>
                <th style="width:130px;text-align:right">Sold Price</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </section>
      `;
    })
    .join("");

  const win = window.open("", "_blank", "width=960,height=780");
  if (!win) return;

  win.document.write(`
    <!doctype html>
    <html lang="mr">
      <head>
        <meta charset="utf-8" />
        <title>${auction?.title || "Auction Squad"} - PDF</title>
        <style>
          body {
            font-family: "Noto Sans Devanagari", "Segoe UI", Arial, sans-serif;
            margin: 24px;
            color: #0f172a;
            background: #ffffff;
          }
          .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #ea580c;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .top-bar h1 {
            margin: 0;
            font-size: 22px;
          }
          .top-bar p {
            margin: 4px 0 0;
            font-size: 12px;
            color: #475569;
          }
          .print-btn {
            background: #ea580c;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
          }
          .team-block {
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 22px;
            page-break-inside: avoid;
          }
          .team-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 12px;
            background: #f8fafc;
            padding: 10px 14px;
            border-radius: 8px;
          }
          .team-header h2 {
            margin: 0;
            font-size: 18px;
          }
          .team-header p {
            margin: 2px 0 0;
            font-size: 12px;
            color: #475569;
          }
          .purse-box {
            font-size: 13px;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 10px;
            text-align: left;
          }
          th {
            background: #0f172a;
            color: #fff;
            font-size: 12px;
          }
          .player-cell {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
          }
          .p-photo {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            object-fit: cover;
            object-position: top;
          }
          .num {
            text-align: right;
            font-weight: 800;
            color: #059669;
          }
          .empty {
            text-align: center;
            color: #64748b;
            padding: 16px;
          }
          @media print {
            .print-btn { display: none; }
            body { margin: 12px; }
          }
        </style>
      </head>
      <body>
        <div class="top-bar">
          <div>
            <h1>${auction?.title || "Cricket Auction Squads"}</h1>
            <p>${auction?.organizer || "JBSC"} • Squad Summary Report</p>
          </div>
          <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        </div>
        ${sectionsHtml}
      </body>
    </html>
  `);
  win.document.close();
}