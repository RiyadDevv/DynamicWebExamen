const apiURL = 'https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/espaces-sportifs-publics-vbx/records?limit=100';
let allLocations = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  setupObserver();
});

// data ophalen van de API
async function fetchData() {
  try {
    const response = await fetch(apiURL);
    const data = await response.json();
    allLocations = data.results;

    populateFilters(allLocations);
    renderLocations(allLocations);
  } catch (error) {
    console.error('Fout bij het ophalen van data:', error);
  }
}

// filters invullen op basis van unieke waarden in de data
function populateFilters(locations) {
  const filterPostal = document.getElementById('filterPostal');
  const filterActivity = document.getElementById('filterActivity');

  const uniquePostcodes = [...new Set(locations.map(loc => loc.postalcode))].sort();
  const uniqueActivities = [...new Set(locations.map(loc => loc.activities_nl))].sort();

  uniquePostcodes.forEach(postcode => {
    const opt = document.createElement('option');
    opt.value = postcode;
    opt.textContent = postcode;
    filterPostal.appendChild(opt);
  });

  uniqueActivities.forEach(activity => {
    const opt = document.createElement('option');
    opt.value = activity;
    opt.textContent = activity;
    filterActivity.appendChild(opt);
  });

  filterPostal.addEventListener('change', filterData);
  filterActivity.addEventListener('change', filterData);
  document.getElementById('search').addEventListener('input', filterData);
  document.getElementById('sortOrder').addEventListener('change', filterData);
}

// locaties tonen op de pagina
function renderLocations(locations) {
  const container = document.getElementById('results');
  container.innerHTML = '';

  if (locations.length === 0) {
    container.innerHTML = '<p>Geen resultaten gevonden.</p>';
    return;
  }

  locations.forEach(loc => {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <h3>${loc.name_nl}</h3>
      <p><strong>Activiteit:</strong> ${loc.activities_nl}</p>
      <p><strong>Adres:</strong> ${loc.address_nl ?? 'Onbekend'}</p>
      <p><strong>Postcode:</strong> ${loc.postalcode}</p>
      <p><strong>Gemeente:</strong> ${loc.municipality_nl ?? 'Onbekend'}</p>
      <a href="${loc.google_maps}" target="_blank">📍 Bekijk op Google Maps</a>
    `;

    container.appendChild(card);
  });
}

// filtering toepassen
function filterData() {
  const postal = document.getElementById('filterPostal').value;
  const activity = document.getElementById('filterActivity').value;
  const search = document.getElementById('search').value.trim().toLowerCase();
  const sort = document.getElementById('sortOrder').value;

  let filtered = allLocations.filter(loc => {
    const matchPostcode = postal === 'all' || loc.postalcode === postal;
    const matchActivity = activity === 'all' || loc.activities_nl === activity;
    const matchSearch = loc.name_nl.toLowerCase().includes(search) || (loc.address_nl ?? '').toLowerCase().includes(search);
    return matchPostcode && matchActivity && matchSearch;
  });

  if (sort === 'name') {
    filtered.sort((a, b) => a.name_nl.localeCompare(b.name_nl));
  } else if (sort === 'nameDesc') {
    filtered.sort((a, b) => b.name_nl.localeCompare(a.name_nl));
  }

  renderLocations(filtered);
}

// bericht tonen als gebruiker onderaan komt
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