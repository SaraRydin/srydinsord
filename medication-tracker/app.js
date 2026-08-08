'use strict';

const STORAGE_KEY = 'medtracker.v1';

const DEFAULT_SETTINGS = {
  pickupThresholdDays: 14,
  doctorThresholdDays: 21,
};

/** @typedef {{id:string, name:string, home:number, pharmacy:number, dose:number}} Medication */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { medications: [], settings: { ...DEFAULT_SETTINGS } };
    const parsed = JSON.parse(raw);
    return {
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch (e) {
    console.error('Kunde inte läsa sparad data', e);
    return { medications: [], settings: { ...DEFAULT_SETTINGS } };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function daysRemaining(count, dose) {
  if (!dose || dose <= 0) return Infinity;
  return count / dose;
}

function formatDays(days) {
  if (!isFinite(days)) return '–';
  const rounded = Math.floor(days);
  return rounded === 1 ? '1 dag' : `${rounded} dagar`;
}

function estimatedDate(days) {
  if (!isFinite(days)) return '';
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(days));
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

/**
 * @param {Medication} med
 */
function getStatus(med) {
  const homeDays = daysRemaining(med.home, med.dose);
  const totalDays = daysRemaining(med.home + med.pharmacy, med.dose);
  const needsPickup = med.pharmacy > 0 && homeDays <= state.settings.pickupThresholdDays;
  const needsDoctor = totalDays <= state.settings.doctorThresholdDays;
  const isEmpty = med.home <= 0;

  let level = 'ok';
  if (isEmpty) level = 'critical';
  else if (needsDoctor) level = 'doctor';
  else if (needsPickup) level = 'pickup';

  return { homeDays, totalDays, needsPickup, needsDoctor, isEmpty, level };
}

const LEVEL_ORDER = { critical: 0, doctor: 1, pickup: 2, ok: 3 };

function sortedMedications() {
  return [...state.medications].sort((a, b) => {
    const sa = getStatus(a);
    const sb = getStatus(b);
    const orderDiff = LEVEL_ORDER[sa.level] - LEVEL_ORDER[sb.level];
    if (orderDiff !== 0) return orderDiff;
    return sa.totalDays - sb.totalDays;
  });
}

// ---- Rendering ----

const medListEl = document.getElementById('medList');
const emptyStateEl = document.getElementById('emptyState');

function statusBadge(level) {
  switch (level) {
    case 'critical':
      return { text: '⛔ Slut hemma', cls: 'status-critical' };
    case 'doctor':
      return { text: '🩺 Kontakta läkare', cls: 'status-doctor' };
    case 'pickup':
      return { text: '💊 Hämta ut', cls: 'status-pickup' };
    default:
      return { text: '✓ OK', cls: 'status-ok' };
  }
}

function render() {
  const meds = sortedMedications();
  emptyStateEl.classList.toggle('hidden', meds.length > 0);
  medListEl.innerHTML = '';

  for (const med of meds) {
    const status = getStatus(med);
    const badge = statusBadge(status.level);

    const li = document.createElement('li');
    li.className = 'med-card';

    const banners = [];
    if (status.isEmpty) {
      banners.push(
        `<div class="med-banner critical">Det finns inga tabletter hemma längre. ${
          med.pharmacy > 0 ? 'Hämta ut de som väntar på apoteket direkt.' : 'Kontakta läkaren för nytt recept snarast.'
        }</div>`
      );
    } else {
      if (status.needsDoctor) {
        banners.push(
          `<div class="med-banner doctor">Totalt räcker det bara ${formatDays(status.totalDays)} till (hemma + apotek). Dags att kontakta läkaren för nytt recept.</div>`
        );
      }
      if (status.needsPickup) {
        banners.push(
          `<div class="med-banner pickup">Räcker ${formatDays(status.homeDays)} till hemma. Dags att hämta ut de ${med.pharmacy} som väntar på apoteket.</div>`
        );
      }
    }

    li.innerHTML = `
      <div class="med-card-head" data-action="edit" data-id="${med.id}">
        <div>
          <p class="med-name">${escapeHtml(med.name)}</p>
          <p class="med-sub">${med.dose} tabl/dag · beräknat slut ${estimatedDate(status.homeDays) || '–'}</p>
        </div>
        <span class="status-badge ${badge.cls}">${badge.text}</span>
      </div>
      <div class="med-stats">
        <div class="stat">
          <span class="value">${med.home}</span>
          <span class="label">hemma</span>
        </div>
        <div class="stat">
          <span class="value">${med.pharmacy}</span>
          <span class="label">på apoteket</span>
        </div>
        <div class="stat">
          <span class="value">${formatDays(status.homeDays)}</span>
          <span class="label">räcker hemma</span>
        </div>
      </div>
      ${banners.join('')}
      <div class="med-actions">
        ${
          med.pharmacy > 0
            ? `<button class="btn btn-secondary" data-action="pickup" data-id="${med.id}">Hämtade ut alla ${med.pharmacy}</button>`
            : ''
        }
        <button class="btn btn-secondary" data-action="edit" data-id="${med.id}">Uppdatera antal</button>
      </div>
    `;

    medListEl.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Medication dialog ----

const medDialog = document.getElementById('medDialog');
const medForm = document.getElementById('medForm');
const medDialogTitle = document.getElementById('medDialogTitle');
const medIdInput = document.getElementById('medId');
const medNameInput = document.getElementById('medName');
const medHomeInput = document.getElementById('medHome');
const medPharmacyInput = document.getElementById('medPharmacy');
const medDoseInput = document.getElementById('medDose');
const deleteMedBtn = document.getElementById('deleteMedBtn');

document.getElementById('addBtn').addEventListener('click', () => openMedDialog());
document.getElementById('cancelMedBtn').addEventListener('click', () => medDialog.close());

function openMedDialog(med) {
  medForm.reset();
  if (med) {
    medDialogTitle.textContent = 'Redigera läkemedel';
    medIdInput.value = med.id;
    medNameInput.value = med.name;
    medHomeInput.value = med.home;
    medPharmacyInput.value = med.pharmacy;
    medDoseInput.value = med.dose;
    deleteMedBtn.classList.remove('hidden');
  } else {
    medDialogTitle.textContent = 'Nytt läkemedel';
    medIdInput.value = '';
    medPharmacyInput.value = 0;
    medDoseInput.value = 1;
    deleteMedBtn.classList.add('hidden');
  }
  medDialog.showModal();
}

medForm.addEventListener('submit', (e) => {
  const id = medIdInput.value;
  const med = {
    id: id || uid(),
    name: medNameInput.value.trim(),
    home: Math.max(0, Number(medHomeInput.value) || 0),
    pharmacy: Math.max(0, Number(medPharmacyInput.value) || 0),
    dose: Math.max(0.1, Number(medDoseInput.value) || 1),
  };
  if (!med.name) return;

  if (id) {
    const idx = state.medications.findIndex((m) => m.id === id);
    if (idx >= 0) state.medications[idx] = med;
  } else {
    state.medications.push(med);
  }
  saveState();
  render();
});

deleteMedBtn.addEventListener('click', () => {
  const id = medIdInput.value;
  if (!id) return;
  const med = state.medications.find((m) => m.id === id);
  if (med && confirm(`Ta bort ${med.name}?`)) {
    state.medications = state.medications.filter((m) => m.id !== id);
    saveState();
    render();
    medDialog.close();
  }
});

medListEl.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const id = target.dataset.id;
  const med = state.medications.find((m) => m.id === id);
  if (!med) return;

  if (target.dataset.action === 'edit') {
    openMedDialog(med);
  } else if (target.dataset.action === 'pickup') {
    med.home += med.pharmacy;
    med.pharmacy = 0;
    saveState();
    render();
  }
});

// ---- Settings dialog ----

const settingsDialog = document.getElementById('settingsDialog');
const settingsForm = document.getElementById('settingsForm');
const pickupThresholdInput = document.getElementById('pickupThreshold');
const doctorThresholdInput = document.getElementById('doctorThreshold');

document.getElementById('settingsBtn').addEventListener('click', () => {
  pickupThresholdInput.value = state.settings.pickupThresholdDays;
  doctorThresholdInput.value = state.settings.doctorThresholdDays;
  settingsDialog.showModal();
});

document.getElementById('cancelSettingsBtn').addEventListener('click', () => settingsDialog.close());

settingsForm.addEventListener('submit', () => {
  state.settings.pickupThresholdDays = Math.max(1, Number(pickupThresholdInput.value) || DEFAULT_SETTINGS.pickupThresholdDays);
  state.settings.doctorThresholdDays = Math.max(1, Number(doctorThresholdInput.value) || DEFAULT_SETTINGS.doctorThresholdDays);
  saveState();
  render();
});

// ---- Service worker ----

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.error('SW-registrering misslyckades', err));
  });
}

render();
