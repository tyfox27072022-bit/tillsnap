import { createWriteStream } from "node:fs";
import PDFDocument from "pdfkit";

const font = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";
const fontB = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf";
const serif = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf";
const mm = (n) => n * 2.834645669;

function docTo(path, size) {
  const doc = new PDFDocument({ size, margin: 0 });
  doc.pipe(createWriteStream(path));
  doc.registerFont("sans", font);
  doc.registerFont("sansB", fontB);
  doc.registerFont("serif", serif);
  return doc;
}

function card(doc, x, y, w, h) {
  doc.save();
  doc.lineWidth(1.2).rect(x, y, w, h).stroke();
  doc.rect(x, y, w, mm(3.2)).fill("#000");
  doc.fillColor("#000").font("serif").fontSize(16).text("TillSnap", x + mm(4), y + mm(7), { width: w - mm(8) });
  doc.font("sans").fontSize(8.5).text("The till that knows the shelf.", x + mm(4), y + mm(16), { width: w - mm(8) });
  doc.moveTo(x + mm(4), y + mm(24)).lineTo(x + w - mm(4), y + mm(24)).lineWidth(0.6).stroke();
  doc.font("sansB").fontSize(11).text("£5 a month", x + mm(4), y + mm(27));
  doc.font("sans").fontSize(7.5).text("Scan  ·  Stock  ·  Cash or card", x + mm(4), y + mm(34), { width: w - mm(8) });
  doc.font("sans").fontSize(7).text("Phone", x + mm(4), y + mm(44));
  doc.moveTo(x + mm(16), y + mm(47)).lineTo(x + w - mm(5), y + mm(47)).lineWidth(0.7).stroke();
  doc.restore();
}

function cards() {
  const doc = docTo("/workspace/artifacts/tillsnap-business-cards.pdf", "A4");
  const w = mm(85);
  const h = mm(55);
  const ox = mm(20);
  const oy = mm(11);
  doc.font("sans").fontSize(9).fillColor("#000").text("TillSnap business cards  ·  print black and white  ·  cut on the lines  ·  write your phone on each card", mm(12), mm(4), { width: mm(186) });
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 2; col++) {
      card(doc, ox + col * w, oy + row * h, w, h);
    }
  }
  doc.end();
}

function flyer(path, title, sub) {
  const doc = docTo(path, "A4");
  const W = mm(210);
  doc.rect(0, 0, W, mm(28)).fill("#000");
  doc.fillColor("#fff").font("serif").fontSize(28).text("TillSnap", mm(14), mm(6));
  doc.fillColor("#000");
  doc.font("serif").fontSize(26).text(title, mm(14), mm(38), { width: mm(182) });
  doc.font("sans").fontSize(12).text(sub, mm(14), mm(68), { width: mm(182), lineGap: 2 });

  const points = [
    ["1", "Scan", "Point the tablet at a barcode. The name and price appear."],
    ["2", "Sell", "Take cash or card on the same screen. Stock goes down."],
    ["3", "Know", "The manager sees the month’s takings, and when something hits zero."],
  ];
  points.forEach((p, i) => {
    const y = mm(96);
    const x = mm(14 + i * 62);
    doc.circle(x + mm(5), y + mm(5), mm(5)).lineWidth(1.4).stroke();
    doc.font("sansB").fontSize(12).text(p[0], x + mm(2.6), y + mm(2));
    doc.font("sansB").fontSize(13).text(p[1], x, y + mm(14), { width: mm(56) });
    doc.font("sans").fontSize(9).text(p[2], x, y + mm(22), { width: mm(56), lineGap: 1 });
  });

  doc.rect(mm(14), mm(168), mm(182), mm(42)).lineWidth(1.6).stroke();
  doc.font("serif").fontSize(22).text("£5 a month", mm(20), mm(174));
  doc.font("sans").fontSize(11).text("One shop. Staff phones and a counter tablet.\nNo extra kit.", mm(20), mm(186), { width: mm(100) });
  doc.font("sans").fontSize(10).text("Phone", mm(130), mm(180));
  doc.moveTo(mm(148), mm(184)).lineTo(mm(188), mm(184)).stroke();
  doc.font("sans").fontSize(10).text("Name", mm(130), mm(192));
  doc.moveTo(mm(148), mm(196)).lineTo(mm(188), mm(196)).stroke();

  doc.font("sans").fontSize(8).text("Print this page in black and white. It is set in solid black so it stays clear on a normal printer.", mm(14), mm(220), { width: mm(182) });
  doc.end();
}

cards();
flyer(
  "/workspace/artifacts/tillsnap-flyer-a4.pdf",
  "The till that knows the shelf.",
  "For corner shops. Scan a barcode, see the price, take the money, and know what is left.",
);
flyer(
  "/workspace/artifacts/tillsnap-window-poster.pdf",
  "Stop guessing what is on the shelf.",
  "TillSnap is the counter tablet for a corner shop. Big type. Cash or card. £5 a month.",
);
