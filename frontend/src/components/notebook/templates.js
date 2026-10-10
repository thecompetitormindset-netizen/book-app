// Page templates for nursing school. Each inserts a little structure into the page.
const H = (t, color = "#b23b3b") => `<div><u style="color: ${color}">${t}</u></div>`;
const blank = "<div><br></div>";
const section = (...titles) => titles.map((t) => H(t) + blank).join("");

export const TEMPLATES = [
  {
    id: "lecture", icon: "🎧", name: "Lecture (Cornell)",
    title: "Lecture",
    html: section("Key terms / questions", "Notes", "❓ Didn't understand", "Summary in my own words"),
  },
  {
    id: "med", icon: "💊", name: "Medication card",
    title: "Drug: ",
    html: section("Generic / brand name", "Class", "Action (how it works)", "Indications", "Dose & route",
      "Side effects / adverse effects", "Contraindications", "Nursing considerations (assess before / monitor)", "Patient teaching"),
  },
  {
    id: "disease", icon: "🫀", name: "Disease / condition",
    title: "Condition: ",
    html: section("Pathophysiology", "Risk factors", "Signs & symptoms (s/s)", "Diagnostics / labs",
      "Treatment (Tx) & meds", "Nursing interventions & priorities", "Complications / red flags", "Patient teaching"),
  },
  {
    id: "skill", icon: "🩺", name: "Skill / procedure",
    title: "Skill: ",
    html: section("Purpose", "Supplies", "Steps") +
      "<ul><li>Hand hygiene, identify patient (2 identifiers), explain procedure</li><li><br></li></ul>" +
      section("Safety points", "Documentation"),
  },
  {
    id: "clinical", icon: "🏥", name: "Clinical day (SBAR)",
    title: "Clinical: ",
    html: section("S — Situation", "B — Background", "A — Assessment (VS, findings)", "R — Recommendation", "Meds given", "What I learned today"),
  },
  {
    id: "labs", icon: "🧪", name: "Common lab values",
    title: "Normal lab values",
    html: H("Typical adult ranges — always check your school's / lab's values", "#6b7290") +
      "<ul>" + [
        "Sodium (Na) 135–145 mEq/L", "Potassium (K) 3.5–5.0 mEq/L", "Chloride (Cl) 98–106 mEq/L",
        "Calcium (Ca) 9.0–10.5 mg/dL", "Magnesium (Mg) 1.3–2.1 mEq/L", "Glucose (fasting) 70–99 mg/dL",
        "BUN 10–20 mg/dL", "Creatinine 0.6–1.2 mg/dL", "Hgb ♂ 14–18 / ♀ 12–16 g/dL", "Hct ♂ 42–52% / ♀ 37–47%",
        "WBC 5,000–10,000 /mm³", "Platelets 150,000–400,000 /mm³", "INR 0.8–1.1 (on warfarin 2–3)",
        "ABG: pH 7.35–7.45 · PaCO₂ 35–45 · HCO₃ 22–26 · PaO₂ 80–100", "SpO₂ 95–100%",
      ].map((x) => `<li>${x}</li>`).join("") + "</ul>",
  },
];

// One-tap symbols & nursing shorthand (or just draw them with the pen).
export const SYMBOLS = ["↑", "↓", "→", "←", "↔", "Δ", "°", "±", "≈", "≠", "≤", "≥", "µ", "♀", "♂", "✓", "✗", "∴", "½", "c̄", "s̄", "p̄", "ā", "q̄", "×"];
export const SHORTHAND = ["PRN", "NPO", "BID", "TID", "QID", "q4h", "STAT", "PO", "IV", "IM", "SubQ", "Hx", "Dx", "Tx", "Rx", "Sx", "s/s", "Pt", "VS", "BP", "HR", "RR", "SpO₂", "I&O", "ADLs", "LOC", "ROM", "N/V"];

export const PENS = [
  { name: "Blue pen", color: "#1e40af" },
  { name: "Black pen", color: "#1f2937" },
  { name: "Red pen", color: "#c62828" },
  { name: "Green pen", color: "#2e7d32" },
  { name: "Purple pen", color: "#6d28d9" },
];
export const QUESTION_COLOR = "#e9d5ff";
export const HIGHLIGHTERS = [
  { name: "Yellow", color: "#ffe14d" },
  { name: "Green", color: "#a7f3a0" },
  { name: "Pink", color: "#f9a8d4" },
  { name: "Blue", color: "#93c5fd" },
  { name: "Orange", color: "#fdba74" },
  { name: "❓ Didn't understand", color: QUESTION_COLOR },
];

