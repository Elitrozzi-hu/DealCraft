// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TEMPLATE_ID      = "1EYXfVuUHROON0iHklQj001zuKqwBTCGYPICNKYqaeMQ";
const PARENT_FOLDER_ID = "1rLm_BjNS4OYwCWP_howTLZPZwU4ItSHd";
const SPREADSHEET_ID   = "1usk5_kJKArQs2PtKqoUG3yxc3t6yftFPBo4L_PaGaQ0";
const SHEET_NAME       = "";
const SLIDE_TOGGLE_PREFIX = "show_slide_";
const LOGO_COLUMN = "logo";
// ─────────────────────────────────────────────────────────────────────────────

const BRIEFS_CACHE_SHEET = "Briefs Cache";
const BRIEFS_MAX         = 10;

// ─── ENTRY POINT GET — leer briefs cacheados ──────────────────────────────────
function doGet(e) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet   = ss.getSheetByName(BRIEFS_CACHE_SHEET);
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ entries: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ entries: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const key = e?.parameter?.key || null;
    const entries = rows.slice(1).map(row => ({
      key:          row[0],
      company_name: row[1],
      domain:       row[2],
      industry:     row[3],
      employee_count: row[4],
      created_at:   row[5],
      updated_at:   row[6],
      brief:        key && row[0] === key ? JSON.parse(row[7] || "null") : undefined,
      enrichment:   key && row[0] === key ? JSON.parse(row[8] || "null") : undefined,
    })).filter(e => e.key);

    if (key) {
      const found = entries.find(e => e.key === key);
      if (!found) return ContentService
        .createTextOutput(JSON.stringify({ error: "Not found" }))
        .setMimeType(ContentService.MimeType.JSON);
      return ContentService
        .createTextOutput(JSON.stringify({ brief: found.brief, enrichment: found.enrichment, updated_at: found.updated_at }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // List view — strip heavy fields
    const list = entries.map(({ brief, enrichment, ...meta }) => meta);
    return ContentService
      .createTextOutput(JSON.stringify({ entries: list }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── ENTRY POINT POST ─────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // ── Brief cache action ────────────────────────────────────────────────────
    if (payload.action === "save_brief") {
      return saveBriefToSheet(payload);
    }

    // ── Deck generation (existing flow) ──────────────────────────────────────
    const dealId  = payload.hubspot_deal_id;

    if (!dealId) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: "hubspot_deal_id required" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Escribir datos al sheet ───────────────────────────────────────────────
    const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet   = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
    const rows    = sheet.getDataRange().getValues();
    const headers = rows[0].map(h => h.toString().trim().toLowerCase());

    const dealColIdx = headers.indexOf("hubspot_deal_id");
    let targetRow = -1;

    if (dealColIdx >= 0) {
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][dealColIdx]).trim() === String(dealId).trim()) {
          targetRow = i + 1; // 1-indexed
          break;
        }
      }
    }

    if (targetRow === -1) targetRow = rows.length + 1;

    // Escribir valores en el orden exacto de los headers del sheet
    const values = headers.map(h => {
      const val = payload[h];
      return val !== undefined && val !== null ? val : "";
    });

    sheet.getRange(targetRow, 1, 1, values.length).setValues([values]);
    Logger.log(`✅ Datos escritos en fila ${targetRow} para deal: ${dealId}`);

    // ── Generar presentación ──────────────────────────────────────────────────
    const { headers: h2, row } = findRow(dealId);

    if (!row) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: "Row not found after write" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const normalize = val => {
      if (val === null || val === undefined) return "";
      if (typeof val === "number") return String(Math.round(val));
      return val.toString().trim();
    };

    const client       = normalize(row[h2.indexOf("client_name")]) || normalize(row[h2.indexOf("client")]) || normalize(row[h2.indexOf("company")]) || String(dealId);
    const instanceId   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
    const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    const subFolder    = parentFolder.createFolder(`${client}-${instanceId}`);
    const newFile      = DriveApp.getFileById(TEMPLATE_ID).makeCopy(client, subFolder);
    const presentation = SlidesApp.openById(newFile.getId());

    // Reemplazar variables de texto
    const textVars = {};
    h2.forEach((header, i) => {
      const col = header.toString().trim().toLowerCase();
      if (!col) return;
      if (col === "hubspot_deal_id") return;
      if (col === LOGO_COLUMN) return;
      if (col.startsWith(SLIDE_TOGGLE_PREFIX)) return;
      const value = normalize(row[i]);
      if (value) textVars[`{{${col}}}`] = value;
    });

    Object.entries(textVars).forEach(([placeholder, value]) => {
      presentation.replaceAllText(placeholder, value);
      Logger.log(`✏️  ${placeholder} → "${value.substring(0, 80)}"`);
    });

    // Slides condicionales y logo
    const logoUrl = normalize(row[h2.indexOf(LOGO_COLUMN)]);
    presentation.getSlides().forEach(slide => {
      manageSlidesVisibility(slide, h2, row, normalize);
      if (logoUrl) replaceLogoVariable(slide, logoUrl, client);
    });

    presentation.saveAndClose();

    Logger.log(`🎉 Listo! Carpeta: ${subFolder.getUrl()}`);
    Logger.log(`🔗 Presentación: ${newFile.getUrl()}`);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        folderUrl: subFolder.getUrl(),
        deckUrl: newFile.getUrl(),
        client: client
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(`❌ Error en doPost: ${err.message}`);
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── EJECUCIÓN MANUAL (con HUBSPOT_DEAL_ID hardcodeado) ──────────────────────
// Usá esto solo para pruebas desde el editor de Apps Script.
const HUBSPOT_DEAL_ID = "10001";

function updateSlideTemplate() {
  const { headers, row } = findRow(HUBSPOT_DEAL_ID);
  if (!row) {
    Logger.log(`❌ Deal "${HUBSPOT_DEAL_ID}" no encontrado. Corré diagnosticar() para ver el estado del sheet.`);
    return;
  }

  const normalize = val => {
    if (val === null || val === undefined) return "";
    if (typeof val === "number") return String(Math.round(val));
    return val.toString().trim();
  };

  const client = normalize(row[headers.indexOf("client_name")]) || normalize(row[headers.indexOf("client")]) || normalize(row[headers.indexOf("company")]) || HUBSPOT_DEAL_ID;
  Logger.log(`✅ Deal encontrado: ${client}`);

  const instanceId   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  const subFolder    = parentFolder.createFolder(`${client}-${instanceId}`);
  const newFile      = DriveApp.getFileById(TEMPLATE_ID).makeCopy(client, subFolder);
  const presentation = SlidesApp.openById(newFile.getId());

  const textVars = {};
  headers.forEach((header, i) => {
    const col = header.toString().trim().toLowerCase();
    if (!col) return;
    if (col === "hubspot_deal_id") return;
    if (col === LOGO_COLUMN) return;
    if (col.startsWith(SLIDE_TOGGLE_PREFIX)) return;
    const value = normalize(row[i]);
    if (value) textVars[`{{${col}}}`] = value;
  });

  Object.entries(textVars).forEach(([placeholder, value]) => {
    presentation.replaceAllText(placeholder, value);
    Logger.log(`✏️  ${placeholder} → "${value.substring(0, 80)}"`);
  });

  const logoUrl = normalize(row[headers.indexOf(LOGO_COLUMN)]);
  presentation.getSlides().forEach(slide => {
    manageSlidesVisibility(slide, headers, row, normalize);
    if (logoUrl) replaceLogoVariable(slide, logoUrl, client);
  });

  presentation.saveAndClose();
  Logger.log(`🎉 Listo! Carpeta: ${subFolder.getUrl()}`);
  Logger.log(`🔗 Presentación: ${newFile.getUrl()}`);
}

// ─── SLIDES CONDICIONALES ────────────────────────────────────────────────────
function manageSlidesVisibility(slide, headers, row, normalize) {
  try {
    const notes = slide.getNotesPage().getSpeakerNotesShape().getText().asString().trim();
    if (!notes) return;

    headers.forEach((header, i) => {
      const col = header.toString().trim().toLowerCase();
      if (!col.startsWith(SLIDE_TOGGLE_PREFIX)) return;

      const tag = `{{${col}}}`;
      if (!notes.includes(tag)) return;

      const shouldShow = normalize(row[i]).toUpperCase() === "TRUE";
      slide.setSkipped(!shouldShow);
      Logger.log(`${shouldShow ? "👁 Mostrando" : "🙈 Ocultando"} slide con tag: ${tag}`);
    });
  } catch (e) {
    Logger.log(`⚠️ Speaker notes error: ${e.message}`);
  }
}

// ─── REEMPLAZAR LOGO ─────────────────────────────────────────────────────────
function replaceLogoVariable(slide, logoUrl, clientName) {
  slide.getShapes().forEach(shape => {
    try {
      if (shape.getText().asString().trim() !== "{{logo}}") return;

      const boxLeft   = shape.getLeft();
      const boxTop    = shape.getTop();
      const boxWidth  = shape.getWidth();
      const boxHeight = shape.getHeight();

      try {
        const blob = DriveApp.getFileById(extractDriveFileId(logoUrl)).getBlob();

        const tempImg = slide.insertImage(blob);
        const imgW    = tempImg.getWidth();
        const imgH    = tempImg.getHeight();
        tempImg.remove();

        const maxW  = boxWidth  * 0.80;
        const maxH  = boxHeight * 0.80;
        const scale = Math.min(maxW / imgW, maxH / imgH);
        const finalW = imgW * scale;
        const finalH = imgH * scale;

        const finalLeft = boxLeft + (boxWidth  - finalW) / 2;
        const finalTop  = boxTop  + (boxHeight - finalH) / 2;

        const img = slide.insertImage(blob, finalLeft, finalTop, finalW, finalH);
        img.setTitle(clientName + " Logo");
        shape.remove();
        Logger.log(`✅ Logo insertado: ${Math.round(finalW)}x${Math.round(finalH)}px`);
      } catch (e) {
        Logger.log(`⚠️ Logo error: ${e.message}`);
      }
    } catch (e) {}
  });
}

// ─── BUSCAR FILA POR HUBSPOT_DEAL_ID ─────────────────────────────────────────
function findRow(hubspotDealId) {
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet   = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().trim().toLowerCase());

  const normalize = val => {
    if (val === null || val === undefined) return "";
    if (typeof val === "number") return String(Math.round(val));
    return val.toString().trim();
  };

  const dealColIdx = headers.indexOf("hubspot_deal_id");
  if (dealColIdx < 0) {
    Logger.log(`❌ Columna "hubspot_deal_id" no encontrada en el sheet.`);
    return { headers, row: null };
  }

  const targetId = normalize(hubspotDealId);
  for (let i = 1; i < rows.length; i++) {
    if (normalize(rows[i][dealColIdx]) === targetId) {
      return { headers, row: rows[i] };
    }
  }
  return { headers, row: null };
}

// ─── DIAGNÓSTICO ─────────────────────────────────────────────────────────────
function diagnosticar() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.getSheets().forEach(s => Logger.log(`📋 Hoja: "${s.getName()}"`));

  const sheet   = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log(`Headers (${headers.length}): ${headers.join(" | ")}`);

  const dealColIdx = headers.map(h => h.toString().trim().toLowerCase()).indexOf("hubspot_deal_id");
  if (dealColIdx >= 0) {
    const val = sheet.getRange(2, dealColIdx + 1).getValue();
    Logger.log(`✅ Columna hubspot_deal_id en posición ${dealColIdx + 1}. Valor fila 2: "${val}" (${typeof val})`);
  } else {
    Logger.log(`❌ Columna hubspot_deal_id NO encontrada.`);
  }
}

// ─── BRIEF CACHE ─────────────────────────────────────────────────────────────
function saveBriefToSheet(payload) {
  try {
    const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(BRIEFS_CACHE_SHEET);

    // Create sheet + headers if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(BRIEFS_CACHE_SHEET);
      sheet.getRange(1, 1, 1, 9).setValues([[
        "key", "company_name", "domain", "industry", "employee_count",
        "created_at", "updated_at", "brief_json", "enrichment_json"
      ]]);
      sheet.setFrozenRows(1);
    }

    const key        = (payload.company_name || "").toLowerCase().trim();
    const now        = new Date().toISOString();
    const briefJson  = JSON.stringify(payload.brief || {});
    const enrichJson = JSON.stringify(payload.enrichment || {});

    // Check if key already exists
    const rows    = sheet.getDataRange().getValues();
    let targetRow = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === key) { targetRow = i + 1; break; }
    }

    const createdAt = targetRow > 0 ? rows[targetRow - 1][5] : now;
    const newRow    = [key, payload.company_name, payload.domain || "", payload.industry || "",
                       payload.employee_count || "", createdAt, now, briefJson, enrichJson];

    if (targetRow > 0) {
      sheet.getRange(targetRow, 1, 1, 9).setValues([newRow]);
    } else {
      // Insert after header, keep max BRIEFS_MAX rows
      sheet.insertRowAfter(1);
      sheet.getRange(2, 1, 1, 9).setValues([newRow]);
      // Trim excess rows
      const total = sheet.getLastRow();
      if (total > BRIEFS_MAX + 1) {
        sheet.deleteRows(BRIEFS_MAX + 2, total - BRIEFS_MAX - 1);
      }
    }

    Logger.log(`✅ Brief cacheado para: ${payload.company_name}`);
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(`❌ Error guardando brief: ${err.message}`);
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function extractDriveFileId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  throw new Error(`No se pudo extraer el file ID de la URL: ${url}`);
}
