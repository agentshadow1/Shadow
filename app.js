const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

const CARDS = [
  { id: "c1", name: "Carte 1" },
  { id: "c2", name: "Carte 2" }
];

const STORAGE_KEY = "suivi-achats-data";

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDateKey = null;

function loadData() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    let migrated = false;
    for (const [key, entry] of Object.entries(raw)) {
      if (entry && typeof entry.count === "number") {
        raw[key] = { c1: { count: entry.count, amount: entry.amount }, c2: null };
        migrated = true;
      }
    }
    if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    return raw;
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatAmount(value) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " €";
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const label = document.getElementById("monthLabel");
  grid.innerHTML = "";

  label.textContent = `${MONTHS_FR[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const offset = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < offset; i++) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    grid.appendChild(empty);
  }

  const data = loadData();
  const today = new Date();

  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(currentYear, currentMonth, day);
    const entry = data[key];
    const cell = document.createElement("div");
    cell.className = "day";

    if (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === day
    ) {
      cell.classList.add("today");
    }

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    cell.appendChild(number);

    if (entry) {
      for (const card of CARDS) {
        const cardEntry = entry[card.id];
        if (!cardEntry) continue;
        const line = document.createElement("span");
        line.className = `day-card ${card.id}`;
        line.textContent = `${card.name} : ${cardEntry.count} — ${formatAmount(cardEntry.amount)}`;
        cell.appendChild(line);
      }
    }

    cell.addEventListener("click", () => openModal(key, day));
    grid.appendChild(cell);
  }

  renderSummary(data);
}

function renderSummary(data) {
  const totals = { c1: { count: 0, amount: 0 }, c2: { count: 0, amount: 0 } };
  let activeDays = 0;

  const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-`;

  for (const [key, entry] of Object.entries(data)) {
    if (!key.startsWith(prefix)) continue;
    let hasActivity = false;
    for (const card of CARDS) {
      const cardEntry = entry[card.id];
      if (cardEntry) {
        totals[card.id].count += cardEntry.count;
        totals[card.id].amount += cardEntry.amount;
        if (cardEntry.count > 0 || cardEntry.amount > 0) hasActivity = true;
      }
    }
    if (hasActivity) activeDays++;
  }

  const totalAmount = totals.c1.amount + totals.c2.amount;

  document.getElementById("totalC1").textContent = formatAmount(totals.c1.amount);
  document.getElementById("purchasesC1").textContent =
    `Carte 1 — ${totals.c1.count} achat${totals.c1.count > 1 ? "s" : ""}`;
  document.getElementById("totalC2").textContent = formatAmount(totals.c2.amount);
  document.getElementById("purchasesC2").textContent =
    `Carte 2 — ${totals.c2.count} achat${totals.c2.count > 1 ? "s" : ""}`;
  document.getElementById("totalAmount").textContent = formatAmount(totalAmount);
  document.getElementById("activeDays").textContent = activeDays;
}

function openModal(key, day) {
  selectedDateKey = key;
  const data = loadData();
  const entry = data[key] || {};

  document.getElementById("modalDate").textContent =
    `${day} ${MONTHS_FR[currentMonth]} ${currentYear}`;

  for (const card of CARDS) {
    const cardEntry = entry[card.id];
    document.getElementById(`count${card.id.slice(1)}`).value = cardEntry ? cardEntry.count : "";
    document.getElementById(`amount${card.id.slice(1)}`).value = cardEntry ? cardEntry.amount : "";
  }

  document.getElementById("deleteEntry").classList.toggle("hidden", !entry);

  document.getElementById("modalOverlay").classList.remove("hidden");
  document.getElementById("count1").focus();
}

function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  selectedDateKey = null;
}

function readCardInput(cardId) {
  const count = parseInt(document.getElementById(`count${cardId.slice(1)}`).value, 10);
  const amount = parseFloat(document.getElementById(`amount${cardId.slice(1)}`).value);

  if ((isNaN(count) || count <= 0) && (isNaN(amount) || amount <= 0)) return null;
  return {
    count: isNaN(count) || count < 0 ? 0 : count,
    amount: isNaN(amount) || amount < 0 ? 0 : amount
  };
}

document.getElementById("entryForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!selectedDateKey) return;

  const data = loadData();
  const newEntry = {};

  for (const card of CARDS) {
    const cardEntry = readCardInput(card.id);
    if (cardEntry) newEntry[card.id] = cardEntry;
  }

  if (Object.keys(newEntry).length === 0) {
    delete data[selectedDateKey];
  } else {
    data[selectedDateKey] = newEntry;
  }
  saveData(data);
  closeModal();
  renderCalendar();
});

document.getElementById("deleteEntry").addEventListener("click", () => {
  if (!selectedDateKey) return;
  const data = loadData();
  delete data[selectedDateKey];
  saveData(data);
  closeModal();
  renderCalendar();
});

document.getElementById("cancelEntry").addEventListener("click", closeModal);

document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
});

document.getElementById("clearMonthBtn").addEventListener("click", () => {
  const monthLabel = `${MONTHS_FR[currentMonth]} ${currentYear}`;
  if (!confirm(`Supprimer toutes les entrées de ${monthLabel} ?`)) return;

  const data = loadData();
  const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-`;
  for (const key of Object.keys(data)) {
    if (key.startsWith(prefix)) delete data[key];
  }
  saveData(data);
  renderCalendar();
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const data = loadData();
  const rows = [["Date", "Carte", "Nombre d'achats", "Montant (€)"]];

  const sortedKeys = Object.keys(data).sort();
  for (const key of sortedKeys) {
    const [y, m, d] = key.split("-");
    for (const card of CARDS) {
      const cardEntry = data[key][card.id];
      if (cardEntry) {
        rows.push([`${d}/${m}/${y}`, card.name, cardEntry.count, cardEntry.amount.toFixed(2)]);
      }
    }
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${cell}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "suivi-achats.csv";
  link.click();
  URL.revokeObjectURL(url);
});

renderCalendar();
