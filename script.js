const apiURL = 'https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/espaces-sportifs-publics-vbx/records?limit=100';
let allLocations = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  setupTheme();
  setupObserver();
  setupSearchValidation(); // ✅ validatie toegevoegd
});

// data ophalen via API
async function fetchData() {
  try {
    const res = await fetch(apiURL);
    const data = await res.json();
    allLocations = data.results;
    populateFilters(allLocations);
    renderLocations(allLocations);
    renderFavorites();
    initMap(allLocations); // kaart genereren na data ophalen
  } catch (e) {
    console.error("API-fout:", e);
  }
}

// unieke waarden in de filters
function populateFilters(locations) {
  const filterPostal = document.getElementById('filterPostal');
  const filterActivity = document.getElementById('filterActivity');

  const postcodes = [...new Set(locations.map(l => l.postalcode))].sort();
  const activiteiten = [...new Set(locations.map(l => l.activities_nl))].sort();

  postcodes.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    filterPostal.appendChild(opt);
  });

  activiteiten.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    filterActivity.appendChild(opt);
  });

  // filters activeren
  filterPostal.addEventListener('change', applyFilters);
  filterActivity.addEventListener('change', applyFilters);
  document.getElementById('search').addEventListener('input', applyFilters);
  document.getElementById('sortOrder').addEventListener('change', applyFilters);
}

// toon locaties in cards
function renderLocations(locations) {
  const container = document.getElementById('results');
  container.innerHTML = '';
  const favorites = getFavorites();

  locations.forEach(loc => {
    const card = document.createElement('div');
    card.className = 'card';
    const id = `${loc.name_nl}__${loc.activities_nl}`;

    card.innerHTML = `
      <h3>${loc.name_nl}</h3>
      <p><strong>Activiteit:</strong> ${loc.activities_nl}</p>
      <p><strong>Adres:</strong> ${loc.address_nl ?? 'Onbekend'}</p>
      <p><strong>Postcode:</strong> ${loc.postalcode}</p>
      <p><strong>Gemeente:</strong> ${loc.municipality_nl ?? 'Onbekend'}</p>
      <a href="${loc.google_maps}" target="_blank">📍 Bekijk op Google Maps</a>
    `;

    // favorietenknop toevoegen
    const favBtn = document.createElement('button');
    favBtn.className = 'favorite-btn';
    favBtn.textContent = favorites.includes(id) ? '❌ Verwijderen' : '❤️ Favoriet';
    favBtn.addEventListener('click', () => {
      toggleFavorite(id);
      renderFavorites();
      applyFilters();
    });

    card.appendChild(favBtn);
    container.appendChild(card);
  });
}

// filterdata op basis van invoer
function applyFilters() {
  const postal = document.getElementById('filterPostal').value;
  const activity = document.getElementById('filterActivity').value;
  const search = document.getElementById('search').value.toLowerCase();
  const sort = document.getElementById('sortOrder').value;

  let filtered = allLocations.filter(loc => {
    const matchPostal = postal === 'all' || loc.postalcode === postal;
    const matchAct = activity === 'all' || loc.activities_nl === activity;
    const matchSearch = search.length < 2 || loc.name_nl.toLowerCase().includes(search) || (loc.address_nl ?? '').toLowerCase().includes(search);
    return matchPostal && matchAct && matchSearch;
  });

  if (sort === 'name') filtered.sort((a, b) => a.name_nl.localeCompare(b.name_nl));
  if (sort === 'nameDesc') filtered.sort((a, b) => b.name_nl.localeCompare(a.name_nl));

  renderLocations(filtered);
}

// zoekveld validatie
function setupSearchValidation() {
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', e => {
    const value = e.target.value;
    if (value.length > 0 && value.length < 2) {
      e.target.setCustomValidity("Typ minstens 2 tekens");
      e.target.reportValidity();
    } else {
      e.target.setCustomValidity("");
    }
  });
}

// favorietenlogica (localStorage)
function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites') || '[]');
}

function saveFavorites(favs) {
  localStorage.setItem('favorites', JSON.stringify(favs));
}

function toggleFavorite(id) {
  let favs = getFavorites();
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
  } else {
    favs.push(id);
  }
  saveFavorites(favs);
}

// favorieten opnieuw tonen
function renderFavorites() {
  const favDiv = document.getElementById('favorites');
  favDiv.innerHTML = '';
  const favs = getFavorites();
  const data = allLocations.filter(loc => favs.includes(`${loc.name_nl}__${loc.activities_nl}`));

  data.forEach(loc => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${loc.name_nl}</h3>
      <p><strong>Activiteit:</strong> ${loc.activities_nl}</p>
      <p><strong>Adres:</strong> ${loc.address_nl ?? 'Onbekend'}</p>
      <p><strong>Postcode:</strong> ${loc.postalcode}</p>
      <p><strong>Gemeente:</strong> ${loc.municipality_nl ?? 'Onbekend'}</p>
    `;
    favDiv.appendChild(card);
  });
}

// melding tonen onderaan de pagina (Observer API)
function setupObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const msg = document.createElement('div');
        msg.id = 'bottomMessage';
        msg.textContent = 'Je bent helemaal onderaan gekomen! 📍';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
      }
    });
  });
  observer.observe(document.getElementById('bottomObserver'));
}

// donker/licht thema instellen + bewaren
function setupTheme() {
  const checkbox = document.getElementById('themeSwitch');
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') {
    document.body.classList.add('dark');
    checkbox.checked = true;
  }
  checkbox.addEventListener('change', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
}

// leaflet kaart tonen met markers (gebaseerd op loc.geo_point_2d)
function initMap(locations) {
  const map = L.map('map').setView([50.8503, 4.3517], 12); // centrum Brussel

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap-bijdragers'
  }).addTo(map);

  const markerGroup = [];

  locations.forEach(loc => {
    if (loc.geo_point_2d) {
      const { lat, lon } = loc.geo_point_2d;
      const marker = L.marker([lat, lon]).addTo(map);
      marker.bindPopup(`<strong>${loc.name_nl}</strong><br>${loc.activities_nl}`);
      markerGroup.push([lat, lon]);
    }
  });
}