(function () {
  const TESTNET_CATALOG = [
    // Stays
    {
      id: "dubai-resort",
      category: "stays",
      title: "Marina Grand Reserve Suite",
      location: "Dubai, United Arab Emirates",
      description: "Ultra-luxury penthouse with private sea terrace, 24/7 concierge, and airport limousine transfer.",
      deposit: 0.1,
      badge: "5-Star Palace"
    },
    {
      id: "paris-suite",
      category: "stays",
      title: "Left Bank Signature Suites",
      location: "Paris, France",
      description: "Historic Seine-view apartments with private sommelier service and priority museum access.",
      deposit: 0.1,
      badge: "Signature Collection"
    },
    // Flights
    {
      id: "jet-charter",
      category: "flights",
      title: "Gulfstream G650 Private Charter",
      location: "Transcontinental (London - Dubai - Tokyo)",
      description: "Exclusive private terminal clearance, Michelin-inspired catering, and instant aircraft dispatch.",
      deposit: 0.1,
      badge: "Private Jet"
    },
    {
      id: "first-class-sky",
      category: "flights",
      title: "First Class Sky Suites",
      location: "Global Commercial Airlines",
      description: "Private first-class flatbed cabin with VIP tarmac lounge transit and bespoke catering.",
      deposit: 0.1,
      badge: "Commercial Flight"
    },
    // Curated Tours & Expeditions
    {
      id: "desert-safari",
      category: "tours",
      title: "Arabian Royal Desert Safari Expedition",
      location: "Dubai Conservation Reserve",
      description: "Private vintage 4x4 expedition, falconry presentation, stargazing astronomer, and royal dune dinner.",
      deposit: 0.1,
      badge: "Curated Tour"
    },
    {
      id: "yacht-cruise",
      category: "tours",
      title: "Monaco & French Riviera Superyacht Cruise",
      location: "Monaco - Nice - Cannes",
      description: "Full-day chartered catamaran cruise with private chef, jet skis, and champagne sunset deck.",
      deposit: 0.1,
      badge: "Yacht Charter"
    },
    {
      id: "alpine-expedition",
      category: "tours",
      title: "Swiss Alps Helicopter & Glacier Trek",
      location: "Zermatt, Switzerland",
      description: "Scenic Matterhorn helicopter flight followed by certified mountain guide glacier exploration.",
      deposit: 0.1,
      badge: "Adventure Tour"
    },
    // Logistics & VIP Fleet
    {
      id: "armored-fleet",
      category: "logistics",
      title: "Armored VIP Executive Limousine",
      location: "Global Metropolitan Hubs",
      description: "B6 level executive armored Mercedes Maybach fleet with certified close protection security driver.",
      deposit: 0.1,
      badge: "VIP Fleet"
    },
    {
      id: "express-cargo",
      category: "logistics",
      title: "Pi Express Air Freight & High-Value Cargo",
      location: "Worldwide Freight Corridors",
      description: "Secure priority logistics deposit for high-value assets, luxury goods, and diplomatic courier cargo.",
      deposit: 0.1,
      badge: "Global Logistics"
    }
  ];

  function getStoredListings() {
    try {
      const stored = localStorage.getItem("saravia_testnet_listings");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function getAllServices() {
    return [...TESTNET_CATALOG, ...getStoredListings()];
  }

  let currentCategory = "all";
  let currentSearch = "";

  function renderServices() {
    const grid = document.getElementById("services-catalog");
    if (!grid) return;

    let items = getAllServices();

    if (currentCategory !== "all") {
      items = items.filter(s => s.category === currentCategory);
    }

    if (currentSearch.trim() !== "") {
      const query = currentSearch.toLowerCase();
      items = items.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.location.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    if (items.length === 0) {
      grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-muted); padding: 3rem;">No services match your search criteria.</p>';
      return;
    }

    grid.innerHTML = items.map(item => `
      <article class="service-card" data-category="${item.category}">
        <div class="card-header">
          <span class="card-category">${item.category}</span>
          <span class="card-badge">${item.badge || "Verified Partner"}</span>
        </div>
        <h3>${item.title}</h3>
        <div class="service-location">📍 ${item.location}</div>
        <p class="service-desc">${item.description}</p>
        <div class="card-footer">
          <div class="price-box">
            <span class="price-label">Testnet Deposit</span>
            <span class="price-value">${item.deposit} Test-π</span>
          </div>
          <button class="btn btn-reserve" data-id="${item.id}" data-deposit="${item.deposit}" data-title="${item.title}">
            Reserve (Test-π)
          </button>
        </div>
      </article>
    `).join("");
  }

  async function handleReservation(btn) {
    const serviceId = btn.getAttribute("data-id");
    const deposit = parseFloat(btn.getAttribute("data-deposit")) || 0.1;
    const title = btn.getAttribute("data-title");

    if (typeof window.saraviaPay !== "function") {
      throw new Error("Please open SARAVIA inside Pi Browser and sign in first.");
    }

    await window.saraviaPay(
      deposit,
      `SARAVIA Testnet: ${title}`,
      { serviceId: serviceId, title: title, network: "testnet" }
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderServices();

    document.querySelectorAll(".tab-btn").forEach(tab => {
      tab.addEventListener("click", (e) => {
        document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        currentCategory = e.target.getAttribute("data-filter");
        renderServices();
      });
    });

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        currentSearch = e.target.value;
        renderServices();
      });
    }

    const catalog = document.getElementById("services-catalog");
    if (catalog) {
      catalog.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-reserve");
        if (!btn) return;
        handleReservation(btn).catch(err => {
          if (window.saraviaToast) {
            window.saraviaToast(err.message || "Reservation initiation failed.", "error");
          }
        });
      });
    }

    const partnerForm = document.getElementById("partner-form");
    if (partnerForm) {
      partnerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newListing = {
          id: "testnet-" + Date.now(),
          category: document.getElementById("p-category").value,
          title: document.getElementById("p-title").value.trim(),
          location: document.getElementById("p-location").value.trim(),
          description: document.getElementById("p-desc").value.trim(),
          deposit: parseFloat(document.getElementById("p-deposit").value) || 0.1,
          badge: "Testnet Merchant"
        };

        const existing = getStoredListings();
        existing.unshift(newListing);
        localStorage.setItem("saravia_testnet_listings", JSON.stringify(existing));

        renderServices();
        document.getElementById("partner-modal").style.display = "none";
        partnerForm.reset();

        if (window.saraviaToast) {
          window.saraviaToast("Listing added to Testnet directory!", "success");
        }
      });
    }
  });
})();
