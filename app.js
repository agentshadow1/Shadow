const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

const STORAGE_KEY = "suivi-achats-data";

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDateKey = null;

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
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

  let offset = (firstDay.getDay() + 6) % 7;

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
    cell.dataset.key = key;

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
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = entry.count;
      cell.appendChild(badge);

      const info = document.createElement("span");
      info.className = "day-info";
      info.innerHTML =
        `${entry.count} achat${entry.count > 1 ? "s" : ""}<br>` +
        `<span class="amount">${formatAmount(entry.amount)}</span>`;
      cell.appendChild(info);
    }

    cell.addEventListener("click", () => openModal(key, day));
    grid.appendChild(cell);
  }

  renderSummary(data);
}

function renderSummary(data) {
  let totalCount = 0;
  let totalAmount = 0;
  let activeDays = 0;

  const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-`;

  for (const [key, entry] of Object.entries(data)) {
    if (key.startsWith(prefix)) {
      totalCount += entry.count;
      totalAmount += entry.amount;
      if (entry.count > 0 || entry.amount > 0) activeDays++;
    }
  }

  document.getElementById("totalPurchases").textContent = totalCount;
  document.getElementById("totalAmount").textContent = formatAmount(totalAmount);
  document.getElementById("avgAmount").textContent =
    formatAmount(totalCount > 0 ? totalAmount / totalCount : 0);
  document.getElementById("activeDays").textContent = activeDays;
}

function openModal(key, day) {
  selectedDateKey = key;
  const data = loadData();
  const entry = data[key];

  document.getElementById("modalDate").textContent =
    `${day} ${MONTHS_FR[currentMonth]} ${currentYear}`;
  document.getElementById("purchaseCount").value = entry ? entry.count : "";
  document.getElementById("purchaseAmount").value = entry ? entry.amount : "";
  document.getElementById("deleteEntry").classList.toggle("hidden", !entry);

  document.getElementById("modalOverlay").classList.remove("hidden");
  document.getElementById("purchaseCount").focus();
}

function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  selectedDateKey = null;
}

document.getElementById("entryForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!selectedDateKey) return;

  const count = parseInt(document.getElementById("purchaseCount").value, 10);
  const amount = parseFloat(document.getElementById("purchaseAmount").value);

  if (isNaN(count) || isNaN(amount) || count < 0 || amount < 0) return;

  const data = loadData();
  if (count === 0 && amount === 0) {
    delete data[selectedDateKey];
  } else {
    data[selectedDateKey] = { count, amount };
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
  const rows = [["Date", "Nombre d'achats", "Montant (€)"]];
  const sortedKeys = Object.keys(data).sort();

  for (const key of sortedKeys) {
    const [y, m, d] = key.split("-");
    rows.push([`${d}/${m}/${y}`, data[key].count, data[key].amount.toFixed(2)]);
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
