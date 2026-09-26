(function () {
  const DEFAULT_SERVICES = [
    {
      id: "dubai-resort",
      category: "stays",
      title: "Marina Grand Reserve",
      location: "Dubai, United Arab Emirates",
      description: "Ultra-luxury penthouse suite with private sea terrace, 24/7 concierge, and airport limousine transfer.",
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
    {
      id: "tokyo-skyline",
      category: "stays",
      title: "Shinjuku Skyline Retreat",
      location: "Tokyo, Japan",
      description: "Panoramic executive suite with private tea master experience and station meet-and-greet.",
      deposit: 0.1,
      badge: "VIP Stay"
    },
    {
      id: "jet-charter",
      category: "flights",
      title: "Gulfstream G650 Private Charter",
      location: "Transcontinental (London - Dubai - Tokyo)",
      description: "Private jet booking deposit. Exclusive private terminal clearance, chef catering, and instant dispatch.",
      deposit: 0.1,
      badge: "Private Jet"
    },
    {
      id: "first-class-sky",
      category: "flights",
      title: "First Class Sky Suites",
      location: "Global Commercial Airlines",
      description: "First-class cabin reservation deposit with private flatbed suites and VIP tarmac transport.",
      deposit: 0.1,
      badge: "Aviation"
    },
    {
      id: "armored-fleet",
      category: "logistics",
      title: "Armored VIP Executive Transport",
      location: "Global Metropolitan Hubs",
      description: "B6 level executive armored Mercedes Maybach fleet with certified close protection drivers.",
      deposit: 0.1,
      badge: "VIP Fleet"
    },
    {
      id: "express-cargo",
      category: "logistics",
      title: "Pi Express Air Freight & Logistics",
      location: "Worldwide Freight Corridors",
      description: "Secure priority logistics deposit for high-value assets, artwork, and express courier freight.",
      deposit: 0.1,
      badge: "Global Logistics"
    }
  ];

  function getStoredListings() {
    try {
      const stored = localStorage.getItem("saravia_partner_listings");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function getAllServices() {
    return [...DEFAULT_SERVICES, ...getStoredListings()];
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
      grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-muted); padding: 3rem;">No services found matching your criteria.</p>';
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
            <span class="price-label">Booking Deposit</span>
            <span class="price-value">${item.deposit} π</span>
          </div>
          <button class="btn btn-reserve" data-id="${item.id}" data-deposit="${item.deposit}" data-title="${item.title}">
            Reserve with Pi
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
      throw new Error("Please open SARAVIA inside Pi Browser and authenticate first.");
    }

    await window.saraviaPay(
      deposit,
      `SARAVIA: ${title}`,
      { serviceId: serviceId, title: title, action: "reservation" }
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
          id: "custom-" + Date.now(),
          category: document.getElementById("p-category").value,
          title: document.getElementById("p-title").value.trim(),
          location: document.getElementById("p-location").value.trim(),
          description: document.getElementById("p-desc").value.trim(),
          deposit: parseFloat(document.getElementById("p-deposit").value) || 0.1,
          badge: "Partner Merchant"
        };

        const existing = getStoredListings();
        existing.unshift(newListing);
        localStorage.setItem("saravia_partner_listings", JSON.stringify(existing));

        renderServices();
        document.getElementById("partner-modal").style.display = "none";
        partnerForm.reset();

        if (window.saraviaToast) {
          window.saraviaToast("Listing published to SARAVIA catalog!", "success");
        }
      });
    }
  });
})();
