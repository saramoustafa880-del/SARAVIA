(function (config, utils, api, payments) {
  var state = {
    locale: config.app.defaultLanguage,
    user: null,
    heroSlides: [],
    heroIndex: 0,
    ui: {
      langMenuOpen: false,
      authOpen: false,
      typing: false
    },
    search: {
      destination: '',
      checkIn: '',
      checkOut: '',
      guests: 2
    },
    booking: {
      step: 'search',
      loading: false,
      results: [],
      selectedDestination: null,
      destinationDetails: null,
      selectedStay: null,
      traveler: {
        name: '',
        email: '',
        notes: ''
      },
      paymentVisible: false,
      paymentState: null,
      confirmation: null
    },
    transactions: [],
    chat: []
  };

  var refs = {};
  var heroTimer = null;

  function t(path) {
    var current = config.i18n[state.locale] || config.i18n[config.app.defaultLanguage];
    return utils.getByPath(current, path) || utils.getByPath(config.i18n.en, path) || path;
  }

  function isRTL() {
    return config.app.rtlLanguages.indexOf(state.locale) !== -1;
  }

  function setDocumentLanguage() {
    document.documentElement.lang = state.locale;
    document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
  }

  function persist() {
    utils.storageSet(config.app.storageKeys.language, state.locale);
    utils.storageSet(config.app.storageKeys.booking, state.booking);
    utils.storageSet(config.app.storageKeys.transactions, state.transactions);
    utils.storageSet(config.app.storageKeys.conversations, state.chat);
    if (state.user) {
      utils.storageSet(config.app.storageKeys.session, state.user);
    } else {
      utils.storageRemove(config.app.storageKeys.session);
    }
  }

  function withDefaultDates() {
    if (!state.search.checkIn || !state.search.checkOut) {
      var checkIn = new Date(Date.now() + 86400000 * 14);
      var checkOut = new Date(Date.now() + 86400000 * 18);
      state.search.checkIn = checkIn.toISOString().slice(0, 10);
      state.search.checkOut = checkOut.toISOString().slice(0, 10);
    }
  }

  function hydrate() {
    state.locale = utils.storageGet(config.app.storageKeys.language, config.app.defaultLanguage);
    if (config.app.supportedLanguages.indexOf(state.locale) === -1) {
      state.locale = config.app.defaultLanguage;
    }
    state.user = utils.storageGet(config.app.storageKeys.session, null);
    state.booking = Object.assign({}, state.booking, utils.storageGet(config.app.storageKeys.booking, {}));
    state.transactions = utils.storageGet(config.app.storageKeys.transactions, []);
    state.search = Object.assign({}, state.search, {
      destination: state.booking.results && state.booking.results.length ? state.search.destination : state.search.destination,
      checkIn: state.search.checkIn,
      checkOut: state.search.checkOut,
      guests: state.search.guests
    });
    var savedChat = utils.storageGet(config.app.storageKeys.conversations, []);
    state.chat = Array.isArray(savedChat) && savedChat.length ? savedChat : [{ role: 'assistant', html: renderAssistantIntro() }];
    if (state.user && !state.booking.traveler.email) {
      state.booking.traveler.email = state.user.email;
      state.booking.traveler.name = state.user.name;
    }
    withDefaultDates();
  }

  function showToast(type, message) {
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.innerHTML = '<div class="toast-icon">' + (type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ') + '</div><div class="toast-text">' + utils.escapeHtml(message) + '</div>';
    refs.toastHost.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 260);
    }, 2800);
  }

  function renderAssistantIntro() {
    return '<p class="msg-text">' + utils.escapeHtml(t('concierge.greeting')) + '</p>';
  }

  function destinationLabel(item) {
    return item.name + (item.country ? ', ' + item.country : '');
  }

  function heroBadgesMarkup() {
    var badges = [t('nav.explore'), t('nav.concierge'), t('common.secure')];
    return '<div class="hero-badges">' + badges.map(function (badge) {
      return '<span class="hero-badge">' + utils.escapeHtml(badge) + '</span>';
    }).join('') + '</div>';
  }

  function renderTopbar() {
    var languageButtons = config.app.supportedLanguages.map(function (lang) {
      return '<button type="button" data-action="set-language" data-lang="' + lang + '">' + utils.escapeHtml(config.i18n[lang].languageName) + '</button>';
    }).join('');

    var accountHtml = state.user
      ? '<button type="button" class="user-menu" data-action="logout"><span>✦</span><span>' + utils.escapeHtml(state.user.name) + '</span></button>'
      : '<button type="button" class="btn-auth" data-action="open-auth">' + utils.escapeHtml(t('common.login')) + '</button>';

    refs.topbar.innerHTML = [
      '<div class="topbar-inner">',
      '  <a href="#heroSection" class="brand">',
      '    <div class="brand-logo">S</div>',
      '    <div class="brand-text">' + utils.escapeHtml(t('common.appName')) + '</div>',
      '  </a>',
      '  <div></div>',
      '  <div class="topbar-controls">',
      '    <div class="lang-picker">',
      '      <button type="button" class="lang-btn" data-action="toggle-language-menu">🌐 ' + utils.escapeHtml(config.i18n[state.locale].languageName) + '</button>',
      '      <div class="lang-menu ' + (state.ui.langMenuOpen ? 'is-open' : '') + '">' + languageButtons + '</div>',
      '    </div>',
      '    ' + accountHtml,
      '  </div>',
      '</div>'
    ].join('');
  }

  function renderHeroRail() {
    if (!state.heroSlides.length) return '';
    return '<div class="hero-rail">' + state.heroSlides.map(function (slide, index) {
      var active = index === state.heroIndex ? ' is-active' : '';
      return [
        '<button type="button" class="hero-rail-card' + active + '" data-action="hero-destination" data-index="' + index + '" data-destination="' + utils.escapeHtml(slide.title) + '">',
        '  <img src="' + utils.escapeHtml(slide.image) + '" alt="' + utils.escapeHtml(slide.title) + '" loading="lazy" />',
        '  <span class="hero-rail-title">' + utils.escapeHtml(slide.title) + '</span>',
        '  <span class="hero-rail-meta">' + utils.escapeHtml(String(slide.score)) + '/100</span>',
        '</button>'
      ].join('');
    }).join('') + '</div>';
  }

  function renderHero() {
    var slide = state.heroSlides[state.heroIndex] || {
      title: 'Sara Via',
      image: api.buildImageUrl('luxury travel world', 1600, 900, 88),
      score: 97
    };

    refs.heroSection.innerHTML = [
      '<div class="hero-bg"><img src="' + utils.escapeHtml(slide.image) + '" alt="' + utils.escapeHtml(slide.title) + '" loading="eager" /></div>',
      '<div class="hero-overlay"></div>',
      '<div class="hero-content">',
      '  <p class="hero-kicker">' + utils.escapeHtml(t('hero.rotatingPrefix')) + ': ' + utils.escapeHtml(slide.title) + '</p>',
      '  <h1 class="hero-title">' + utils.escapeHtml(t('hero.title')) + '</h1>',
      '  <p class="hero-subtitle">' + utils.escapeHtml(t('hero.subtitle')) + '</p>',
      heroBadgesMarkup(),
      '  <div class="hero-actions">',
      '    <button type="button" class="hero-cta" data-action="focus-booking">' + utils.escapeHtml(t('hero.cta')) + '</button>',
      '    <button type="button" class="btn-back hero-secondary" style="margin:0;" data-action="apply-destination" data-destination="' + utils.escapeHtml(slide.title) + '">' + utils.escapeHtml(t('common.search')) + '</button>',
      '  </div>',
      '  <div class="hero-stats">',
      '    <div class="hero-stat"><strong>' + utils.escapeHtml(String(slide.score)) + '/100</strong><span>' + utils.escapeHtml(t('booking.resultsTitle')) + '</span></div>',
      '    <div class="hero-stat"><strong>24/7</strong><span>' + utils.escapeHtml(t('nav.concierge')) + '</span></div>',
      '    <div class="hero-stat"><strong>Stripe</strong><span>' + utils.escapeHtml(t('payment.secureCheckout')) + '</span></div>',
      '  </div>',
      '</div>',
      renderHeroRail()
    ].join('');
  }

  function renderStepPills() {
    var steps = ['search', 'results', 'details', 'confirm'];
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px;">' + steps.map(function (step) {
      var key = 'booking.step' + step.charAt(0).toUpperCase() + step.slice(1);
      var active = state.booking.step === step ? ' style="background:rgba(79,209,197,.16);border-color:rgba(79,209,197,.32);color:var(--aqua);"' : '';
      return '<span class="booking-status"' + active + '>' + utils.escapeHtml(t(key)) + '</span>';
    }).join('') + '</div>';
  }

  function renderFeaturedChips() {
    return '<div class="quick-destination-row">' + config.featuredDestinations.map(function (item) {
      var label = item.city + ', ' + item.country;
      return '<button type="button" class="destination-chip" data-action="apply-destination" data-destination="' + utils.escapeHtml(label) + '">' + utils.escapeHtml(label) + '</button>';
    }).join('') + '</div>';
  }

  function renderLoadingSkeleton() {
    return [
      '<div class="results-grid">',
      '  <div class="skeleton-card"></div>',
      '  <div class="skeleton-card"></div>',
      '  <div class="skeleton-card"></div>',
      '</div>'
    ].join('');
  }

  function renderSearchView() {
    return [
      '<div>',
      '  <h2 class="panel-title"><span class="panel-icon">✧</span>' + utils.escapeHtml(t('booking.title')) + '</h2>',
      '  <p style="color:var(--text-muted);margin-top:-8px;">' + utils.escapeHtml(t('booking.subtitle')) + '</p>',
      renderStepPills(),
      renderFeaturedChips(),
      '  <form id="bookingSearchForm" class="search-form" novalidate>',
      '    <label>' + utils.escapeHtml(t('booking.destinationLabel')) + '<input class="search-input" type="text" name="destination" maxlength="80" placeholder="' + utils.escapeHtml(t('booking.destinationPlaceholder')) + '" value="' + utils.escapeHtml(state.search.destination) + '" required /></label>',
      '    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">',
      '      <label>' + utils.escapeHtml(t('booking.checkInLabel')) + '<input type="date" name="checkIn" value="' + utils.escapeHtml(state.search.checkIn) + '" required /></label>',
      '      <label>' + utils.escapeHtml(t('booking.checkOutLabel')) + '<input type="date" name="checkOut" value="' + utils.escapeHtml(state.search.checkOut) + '" required /></label>',
      '      <label>' + utils.escapeHtml(t('booking.guestsLabel')) + '<input type="number" name="guests" min="1" max="12" value="' + utils.escapeHtml(state.search.guests) + '" placeholder="' + utils.escapeHtml(t('booking.guestsPlaceholder')) + '" required /></label>',
      '    </div>',
      '    <button type="submit" class="btn-search">' + utils.escapeHtml(state.booking.loading ? t('common.searching') : t('booking.searchButton')) + '</button>',
      '  </form>',
      '</div>'
    ].join('');
  }

  function renderResultsView() {
    var content = state.booking.loading
      ? renderLoadingSkeleton()
      : state.booking.results.length
        ? '<div class="results-grid">' + state.booking.results.map(function (item) {
            return [
              '<article class="result-card" data-action="choose-destination" data-id="' + utils.escapeHtml(String(item.id)) + '">',
              '  <img class="result-img" src="' + utils.escapeHtml(item.image) + '" alt="' + utils.escapeHtml(item.name) + '" loading="lazy" />',
              '  <div class="result-body">',
              '    <div class="result-topline"><span class="booking-status">Score</span><span class="result-score">' + utils.escapeHtml(String(item.score)) + '/100</span></div>',
              '    <h3 class="result-name">' + utils.escapeHtml(destinationLabel(item)) + '</h3>',
              '    <p class="result-desc">' + utils.escapeHtml(item.description) + '</p>',
              '    <div class="result-actions">',
              '      <button type="button" class="btn-back" style="margin:0;" data-action="apply-destination" data-destination="' + utils.escapeHtml(destinationLabel(item)) + '">' + utils.escapeHtml(t('common.search')) + '</button>',
              '      <button type="button" class="btn-search" style="padding:10px 16px;" data-action="choose-destination" data-id="' + utils.escapeHtml(String(item.id)) + '">' + utils.escapeHtml(t('common.details')) + '</button>',
              '    </div>',
              '  </div>',
              '</article>'
            ].join('');
          }).join('') + '</div>'
        : '<div class="empty-state"><div class="empty-icon">✈</div><div class="empty-text">' + utils.escapeHtml(t('booking.noResults')) + '</div></div>';

    return [
      '<div>',
      '  <button type="button" class="btn-back" data-action="go-search">← ' + utils.escapeHtml(t('booking.editSearch')) + '</button>',
      '  <h2 class="panel-title"><span class="panel-icon">🌍</span>' + utils.escapeHtml(t('booking.resultsTitle')) + '</h2>',
      renderStepPills(),
      content,
      '</div>'
    ].join('');
  }

  function renderHotelCards(hotels) {
    return '<div class="results-grid">' + hotels.map(function (hotel) {
      return [
        '<article class="result-card">',
        '  <img class="result-img" src="' + utils.escapeHtml(hotel.image) + '" alt="' + utils.escapeHtml(hotel.name) + '" loading="lazy" />',
        '  <div class="result-body">',
        '    <div class="result-topline"><span class="booking-status">★ ' + utils.escapeHtml(String(hotel.rating)) + '</span><span class="result-score">' + utils.escapeHtml(utils.formatCurrency(hotel.nightlyRate, state.locale, config.app.currency)) + ' ' + utils.escapeHtml(t('booking.fromNight')) + '</span></div>',
        '    <h3 class="result-name">' + utils.escapeHtml(hotel.name) + '</h3>',
        '    <div class="chip-list">' + hotel.amenities.map(function (amenity) {
          return '<span class="mini-chip">' + utils.escapeHtml(amenity) + '</span>';
        }).join('') + '</div>',
        '    <p class="result-desc"><strong>' + utils.escapeHtml(t('booking.itinerary')) + ':</strong> ' + utils.escapeHtml(hotel.itinerary.join(' • ')) + '</p>',
        '    <div class="result-actions">',
        '      <span class="result-price">' + utils.escapeHtml(utils.formatCurrency(hotel.total, state.locale, config.app.currency)) + '</span>',
        '      <button type="button" class="btn-search" style="padding:10px 16px;" data-action="select-stay" data-id="' + utils.escapeHtml(hotel.id) + '">' + utils.escapeHtml(t('booking.pickStay')) + '</button>',
        '    </div>',
        '  </div>',
        '</article>'
      ].join('');
    }).join('') + '</div>';
  }

  function renderDetailsView() {
    var details = state.booking.destinationDetails;
    if (!details || !state.booking.selectedDestination) return renderResultsView();

    var destination = state.booking.selectedDestination;
    return [
      '<div>',
      '  <button type="button" class="btn-back" data-action="go-results">← ' + utils.escapeHtml(t('common.back')) + '</button>',
      '  <h2 class="panel-title"><span class="panel-icon">🏨</span>' + utils.escapeHtml(t('booking.detailsTitle')) + '</h2>',
      renderStepPills(),
      '  <div class="destination-hero-card">',
      '    <img class="destination-hero-image" src="' + utils.escapeHtml(destination.heroImage || destination.image) + '" alt="' + utils.escapeHtml(destinationLabel(destination)) + '" loading="lazy" />',
      '    <div class="destination-hero-copy">',
      '      <div class="result-topline"><span class="booking-status">Destination</span><span class="result-score">' + utils.escapeHtml(String(destination.score)) + '/100</span></div>',
      '      <h3 class="result-name">' + utils.escapeHtml(destinationLabel(destination)) + '</h3>',
      '      <p class="result-desc" style="font-size:15px;">' + utils.escapeHtml(details.summary) + '</p>',
      '      <button type="button" class="btn-back" style="margin:0;" data-action="apply-destination" data-destination="' + utils.escapeHtml(destinationLabel(destination)) + '">' + utils.escapeHtml(t('common.search')) + '</button>',
      '    </div>',
      '  </div>',
      renderHotelCards(details.hotels),
      '</div>'
    ].join('');
  }

  function renderPaymentState() {
    var payState = state.booking.paymentState;
    if (!payState) return '';
    var statusClass = payState.status === 'success' ? 'status-confirmed' : payState.status === 'failed' ? 'status-failed' : 'status-pending';
    return '<div class="booking-details" id="paymentState"><span class="booking-status ' + statusClass + '">' + utils.escapeHtml(payState.status) + '</span><p style="margin:10px 0 0;color:var(--text-soft);">' + utils.escapeHtml(payState.message || '') + '</p></div>';
  }

  function renderConfirmationCard() {
    var confirmation = state.booking.confirmation;
    if (!confirmation) return '';
    var ok = confirmation.status === 'success';
    return [
      '<div class="booking-details" style="border-color:' + (ok ? 'rgba(79,209,197,.35)' : 'rgba(255,107,133,.35)') + ';">',
      '  <div class="detail-row"><span class="detail-label">' + utils.escapeHtml(t('common.status')) + '</span><span class="booking-status ' + (ok ? 'status-confirmed' : 'status-failed') + '">' + utils.escapeHtml(ok ? t('common.success') : t('common.failed')) + '</span></div>',
      '  <div class="detail-row"><span class="detail-label">' + utils.escapeHtml(t('common.amount')) + '</span><strong class="detail-value">' + utils.escapeHtml(utils.formatCurrency(confirmation.amount, state.locale, config.app.currency)) + '</strong></div>',
      '  <div class="detail-row"><span class="detail-label">Transaction</span><strong class="detail-value">' + utils.escapeHtml(confirmation.id) + '</strong></div>',
      '  <p style="margin:12px 0 0;color:var(--text-soft);">' + utils.escapeHtml(ok ? t('booking.confirmed') : t('payment.failed')) + '</p>',
      '</div>'
    ].join('');
  }

  function renderConfirmView() {
    if (!state.booking.selectedStay || !state.booking.selectedDestination) return renderDetailsView();

    var stay = state.booking.selectedStay;
    var destination = state.booking.selectedDestination;
    var traveler = state.booking.traveler;
    var userLocked = !state.user;

    return [
      '<div>',
      '  <button type="button" class="btn-back" data-action="go-details">← ' + utils.escapeHtml(t('common.back')) + '</button>',
      '  <h2 class="panel-title"><span class="panel-icon">💳</span>' + utils.escapeHtml(t('booking.confirmTitle')) + '</h2>',
      renderStepPills(),
      renderConfirmationCard(),
      '  <div class="booking-summary-grid">',
      '    <div class="booking-details">',
      '      <div class="detail-row"><span class="detail-label">' + utils.escapeHtml(t('booking.summary')) + '</span><strong class="detail-value">' + utils.escapeHtml(stay.name) + '</strong></div>',
      '      <div class="detail-row"><span class="detail-label">Destination</span><strong class="detail-value">' + utils.escapeHtml(destinationLabel(destination)) + '</strong></div>',
      '      <div class="detail-row"><span class="detail-label">' + utils.escapeHtml(t('booking.total')) + '</span><strong class="detail-value">' + utils.escapeHtml(utils.formatCurrency(stay.total, state.locale, config.app.currency)) + '</strong></div>',
      '      <div class="chip-list">' + stay.amenities.map(function (amenity) { return '<span class="mini-chip">' + utils.escapeHtml(amenity) + '</span>'; }).join('') + '</div>',
      '    </div>',
      '    <div class="booking-details">',
      '      <p style="margin:0;color:var(--text-soft);">' + utils.escapeHtml(t('booking.paymentSubtitle')) + '</p>',
      '      <p style="margin:12px 0 0;color:var(--text-muted);font-size:13px;">' + utils.escapeHtml(t('payment.secureCheckout')) + '</p>',
      '    </div>',
      '  </div>',
      '  <form id="travelerForm" class="search-form" novalidate>',
      '    <label>' + utils.escapeHtml(t('booking.travelerName')) + '<input type="text" name="name" maxlength="60" value="' + utils.escapeHtml(traveler.name) + '" required /></label>',
      '    <label>' + utils.escapeHtml(t('booking.travelerEmail')) + '<input type="email" name="email" maxlength="120" value="' + utils.escapeHtml(traveler.email || (state.user && state.user.email) || '') + '" required /></label>',
      '    <label>' + utils.escapeHtml(t('booking.travelerNotes')) + '<textarea name="notes" rows="3" maxlength="300" placeholder="' + utils.escapeHtml(t('booking.travelerNotesPlaceholder')) + '">' + utils.escapeHtml(traveler.notes) + '</textarea></label>',
      '    <button type="submit" class="btn-confirm">' + utils.escapeHtml(t('booking.continueToPay')) + '</button>',
      '  </form>',
      userLocked ? '<div class="booking-details"><p style="margin:0 0 14px;color:var(--text-soft);">' + utils.escapeHtml(t('booking.protectedMessage')) + '</p><button type="button" class="btn-auth" data-action="open-auth">' + utils.escapeHtml(t('common.login')) + '</button></div>' : '',
      state.booking.paymentVisible && state.user ? '<div id="paymentMount"></div>' : '',
      renderPaymentState(),
      '</div>'
    ].join('');
  }

  function renderBooking() {
    var html = renderSearchView();
    if (state.booking.step === 'results') html = renderResultsView();
    if (state.booking.step === 'details') html = renderDetailsView();
    if (state.booking.step === 'confirm') html = renderConfirmView();
    refs.bookingSection.innerHTML = html;

    if (state.booking.step === 'confirm' && state.booking.paymentVisible && state.user && state.booking.selectedStay && !state.booking.confirmation) {
      mountPayment();
    } else {
      payments.destroy();
    }
  }

  function renderChatMessage(message) {
    if (message.role === 'assistant') {
      return '<div class="chat-msg assistant"><div class="msg-avatar">SV</div><div class="msg-content">' + message.html + '</div></div>';
    }
    return '<div class="chat-msg user"><div class="msg-avatar">U</div><div class="msg-content"><p class="msg-text">' + utils.escapeHtml(message.text) + '</p></div></div>';
  }

  function renderQuickQueries() {
    var list = config.mock.quickQueries[state.locale] || config.mock.quickQueries.en;
    return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;">' + list.map(function (entry) {
      return '<button type="button" class="btn-back" style="margin:0;" data-action="use-quick-query" data-query="' + utils.escapeHtml(entry) + '">' + utils.escapeHtml(entry) + '</button>';
    }).join('') + '</div>';
  }

  function renderConcierge() {
    var typingBlock = state.ui.typing ? '<div class="chat-msg assistant"><div class="msg-avatar">SV</div><div class="msg-content"><p class="msg-text">' + utils.escapeHtml(t('concierge.typing')) + '</p></div></div>' : '';
    refs.conciergeSection.innerHTML = [
      '<div class="chat-container">',
      '  <h2 class="panel-title"><span class="panel-icon">🧠</span>' + utils.escapeHtml(t('concierge.title')) + '</h2>',
      '  <p style="color:var(--text-muted);margin-top:-8px;">' + utils.escapeHtml(t('concierge.subtitle')) + '</p>',
      renderQuickQueries(),
      '  <div class="chat-messages" id="chatMessages">' + state.chat.map(renderChatMessage).join('') + typingBlock + '</div>',
      '  <form id="chatForm" class="chat-input-area" novalidate>',
      '    <input class="chat-input" type="text" name="query" maxlength="180" placeholder="' + utils.escapeHtml(t('concierge.placeholder')) + '" />',
      '    <button type="submit" class="btn-send">' + utils.escapeHtml(t('concierge.send')) + '</button>',
      '  </form>',
      '</div>'
    ].join('');

    var chatMessages = refs.conciergeSection.querySelector('#chatMessages');
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderTransactionList() {
    if (!state.transactions.length) {
      return '<div class="empty-state" style="padding:24px 12px;"><div class="empty-text">' + utils.escapeHtml(t('dashboard.noTransactions')) + '</div></div>';
    }

    return '<div class="bookings-list">' + state.transactions.slice(0, 4).map(function (txn) {
      return '<div class="booking-card"><div class="booking-info" style="grid-column:1 / -1;"><h4>' + utils.escapeHtml(txn.id) + '</h4><p>' + utils.escapeHtml(utils.formatCurrency(txn.amount, state.locale, config.app.currency)) + '</p><p>' + utils.escapeHtml(new Date(txn.timestamp).toLocaleString(state.locale)) + '</p><span class="booking-status ' + (txn.status === 'success' ? 'status-confirmed' : txn.status === 'failed' ? 'status-failed' : 'status-pending') + '">' + utils.escapeHtml(txn.status) + '</span></div></div>';
    }).join('') + '</div>';
  }

  function renderDashboard() {
    var currentBooking = state.booking.selectedStay
      ? '<div class="booking-card"><img class="booking-thumb" src="' + utils.escapeHtml(state.booking.selectedStay.image) + '" alt="' + utils.escapeHtml(state.booking.selectedStay.name) + '" loading="lazy" /><div class="booking-info"><h4>' + utils.escapeHtml(state.booking.selectedStay.name) + '</h4><p>' + utils.escapeHtml((state.booking.selectedDestination && destinationLabel(state.booking.selectedDestination)) || '') + '</p><p>' + utils.escapeHtml(utils.formatCurrency(state.booking.selectedStay.total, state.locale, config.app.currency)) + '</p><span class="booking-status ' + (state.booking.confirmation && state.booking.confirmation.status === 'success' ? 'status-confirmed' : 'status-pending') + '">' + utils.escapeHtml((state.booking.confirmation && state.booking.confirmation.status) || t('common.pending')) + '</span></div></div>'
      : '<div class="empty-state" style="padding:24px 12px;"><div class="empty-text">' + utils.escapeHtml(t('dashboard.liveBooking')) + ': ' + utils.escapeHtml(t('common.guest')) + '</div></div>';

    refs.dashboardSection.className = 'glass-panel dashboard-panel is-visible';
    refs.dashboardSection.innerHTML = [
      '<h2 class="panel-title"><span class="panel-icon">🔐</span>' + utils.escapeHtml(t('dashboard.title')) + '</h2>',
      '<p style="color:var(--text-muted);margin-top:-8px;">' + utils.escapeHtml(t('dashboard.subtitle')) + '</p>',
      state.user
        ? '<div class="booking-details"><div class="detail-row"><span class="detail-label">' + utils.escapeHtml(t('dashboard.signedInAs')) + '</span><strong class="detail-value">' + utils.escapeHtml(state.user.email) + '</strong></div><div class="detail-row"><span class="detail-label">' + utils.escapeHtml(t('dashboard.token')) + '</span><strong class="detail-value">' + utils.escapeHtml(utils.shorten(state.user.token, 42)) + '</strong></div></div>'
        : '<div class="booking-details"><p style="margin:0 0 14px;color:var(--text-soft);">' + utils.escapeHtml(t('dashboard.notSignedIn')) + '</p><button type="button" class="btn-auth" data-action="open-auth">' + utils.escapeHtml(t('common.login')) + '</button></div>',
      '<div class="metrics-grid">',
      '  <div class="metric-card"><strong>' + utils.escapeHtml(String(state.heroSlides.length || config.featuredDestinations.length)) + '</strong><span>' + utils.escapeHtml(t('nav.explore')) + '</span></div>',
      '  <div class="metric-card"><strong>' + utils.escapeHtml(String(state.transactions.filter(function (item) { return item.status === 'success'; }).length)) + '</strong><span>' + utils.escapeHtml(t('dashboard.transactions')) + '</span></div>',
      '  <div class="metric-card"><strong>' + utils.escapeHtml(state.user ? '100%' : '0%') + '</strong><span>' + utils.escapeHtml(t('common.secure')) + '</span></div>',
      '</div>',
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;">',
      '  <div><h3 style="margin:0 0 14px;">' + utils.escapeHtml(t('dashboard.liveBooking')) + '</h3>' + currentBooking + '</div>',
      '  <div><h3 style="margin:0 0 14px;">' + utils.escapeHtml(t('dashboard.transactions')) + '</h3>' + renderTransactionList() + '</div>',
      '</div>'
    ].join('');
  }

  function renderAuthModal() {
    refs.authModal.className = 'modal-root' + (state.ui.authOpen ? ' is-open' : '');
    refs.authModal.setAttribute('aria-hidden', state.ui.authOpen ? 'false' : 'true');
    refs.authModal.innerHTML = state.ui.authOpen
      ? [
          '<div class="modal-box" role="dialog" aria-modal="true" aria-label="' + utils.escapeHtml(t('auth.title')) + '">',
          '  <div class="modal-header">',
          '    <h2 class="modal-title">' + utils.escapeHtml(t('auth.title')) + '</h2>',
          '    <button type="button" class="modal-close" data-action="close-auth">×</button>',
          '  </div>',
          '  <p style="color:var(--text-muted);margin-top:-8px;">' + utils.escapeHtml(t('auth.subtitle')) + '</p>',
          '  <form id="authForm" class="auth-form" novalidate>',
          '    <label>' + utils.escapeHtml(t('auth.email')) + '<input type="email" name="email" maxlength="120" required /></label>',
          '    <label>' + utils.escapeHtml(t('auth.password')) + '<input type="password" name="password" minlength="6" maxlength="60" required /></label>',
          '    <p style="margin:0;color:var(--text-muted);font-size:13px;">' + utils.escapeHtml(t('auth.helper')) + '</p>',
          '    <button type="submit" class="btn-submit">' + utils.escapeHtml(t('auth.submit')) + '</button>',
          '  </form>',
          '</div>'
        ].join('')
      : '';
  }

  function renderAll() {
    setDocumentLanguage();
    renderTopbar();
    renderHero();
    renderBooking();
    renderConcierge();
    renderDashboard();
    renderAuthModal();
    persist();
  }

  function mountPayment() {
    var mountNode = refs.bookingSection.querySelector('#paymentMount');
    if (!mountNode || !state.booking.selectedStay) return;

    payments.render(mountNode, {
      amount: state.booking.selectedStay.total,
      locale: state.locale,
      customer: state.booking.traveler,
      t: t,
      onStateChange: function (paymentState) {
        state.booking.paymentState = paymentState;
        persist();
        var statusNode = refs.bookingSection.querySelector('#paymentState');
        if (statusNode) {
          statusNode.outerHTML = renderPaymentState();
        } else if (paymentState) {
          mountNode.insertAdjacentHTML('afterend', renderPaymentState());
        }
      },
      onComplete: function (transaction) {
        state.transactions.unshift(transaction);
        state.booking.paymentState = {
          status: transaction.status,
          message: transaction.status === 'success' ? t('payment.success') : t('payment.failed')
        };
        state.booking.confirmation = transaction;
        if (transaction.status === 'success') {
          state.booking.paymentVisible = false;
        }
        persist();
        renderBooking();
        renderDashboard();
        showToast(transaction.status === 'success' ? 'success' : 'error', transaction.status === 'success' ? t('payment.success') : t('payment.failed'));
      }
    });
  }

  async function handleSearchSubmit(formData) {
    var payload = {
      destination: utils.sanitizeText(formData.get('destination'), 80),
      checkIn: formData.get('checkIn'),
      checkOut: formData.get('checkOut'),
      guests: Number(formData.get('guests') || 1)
    };
    var validationMessage = utils.validateSearch(payload, t);
    if (validationMessage) {
      showToast('error', validationMessage || t('toast.searchInvalid'));
      return;
    }

    state.search = payload;
    state.booking.loading = true;
    state.booking.step = 'results';
    state.booking.results = [];
    state.booking.selectedDestination = null;
    state.booking.destinationDetails = null;
    state.booking.selectedStay = null;
    state.booking.paymentVisible = false;
    state.booking.paymentState = null;
    state.booking.confirmation = null;
    renderBooking();

    try {
      var results = await api.searchDestinations(payload.destination, state.locale);
      state.booking.loading = false;
      state.booking.results = results;
      renderBooking();
    } catch (error) {
      state.booking.loading = false;
      state.booking.results = [];
      renderBooking();
      showToast('error', t('booking.noResults'));
    }
  }

  async function chooseDestination(id) {
    var selected = state.booking.results.find(function (item) {
      return String(item.id) === String(id);
    });
    if (!selected) return;

    state.booking.selectedDestination = selected;
    state.booking.destinationDetails = null;
    state.booking.step = 'details';
    refs.bookingSection.innerHTML = '<div><h2 class="panel-title"><span class="panel-icon">🏨</span>' + utils.escapeHtml(t('booking.detailsTitle')) + '</h2>' + renderLoadingSkeleton() + '</div>';
    var details = await api.getDestinationDetails(selected, state.locale, state.search);
    state.booking.destinationDetails = details;
    renderBooking();
  }

  function selectStay(id) {
    var hotels = (state.booking.destinationDetails && state.booking.destinationDetails.hotels) || [];
    var selected = hotels.find(function (item) {
      return String(item.id) === String(id);
    });
    if (!selected) {
      showToast('error', t('toast.chooseStay'));
      return;
    }

    state.booking.selectedStay = selected;
    state.booking.step = 'confirm';
    state.booking.paymentVisible = false;
    state.booking.paymentState = null;
    state.booking.confirmation = null;
    if (state.user && !state.booking.traveler.email) {
      state.booking.traveler.email = state.user.email;
      state.booking.traveler.name = state.user.name;
    }
    renderBooking();
  }

  async function handleTravelerSubmit(formData) {
    state.booking.traveler = {
      name: utils.sanitizeText(formData.get('name'), 60),
      email: utils.sanitizeText(formData.get('email'), 120),
      notes: utils.sanitizeText(formData.get('notes'), 300)
    };
    var validationMessage = utils.validateTraveler(state.booking.traveler, t);
    if (validationMessage) {
      showToast('error', validationMessage || t('toast.travelerInvalid'));
      return;
    }
    if (!state.user) {
      state.ui.authOpen = true;
      renderAuthModal();
      showToast('info', t('toast.loginRequired'));
      return;
    }
    state.booking.paymentVisible = true;
    state.booking.paymentState = null;
    state.booking.confirmation = null;
    renderBooking();
  }

  async function handleAuthSubmit(formData) {
    var email = utils.sanitizeText(formData.get('email'), 120);
    var password = String(formData.get('password') || '');
    try {
      var profile = await api.login(email, password);
      state.user = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        token: utils.fakeJwt({ sub: profile.id, email: profile.email })
      };
      state.ui.authOpen = false;
      if (!state.booking.traveler.email) {
        state.booking.traveler.email = profile.email;
        state.booking.traveler.name = profile.name;
      }
      renderAll();
      showToast('success', t('auth.signedIn'));
    } catch (error) {
      showToast('error', t('auth.helper'));
    }
  }

  function logout() {
    state.user = null;
    state.booking.paymentVisible = false;
    state.booking.paymentState = null;
    renderAll();
    showToast('info', t('auth.signedOut'));
  }

  function openAuth() {
    state.ui.authOpen = true;
    renderAuthModal();
  }

  function closeAuth() {
    state.ui.authOpen = false;
    renderAuthModal();
  }

  function setLanguage(lang) {
    if (config.app.supportedLanguages.indexOf(lang) === -1) return;
    state.locale = lang;
    state.ui.langMenuOpen = false;
    if (!state.chat.length) state.chat = [{ role: 'assistant', html: renderAssistantIntro() }];
    renderAll();
    showToast('success', t('toast.languageChanged'));
  }

  function toggleLanguageMenu() {
    state.ui.langMenuOpen = !state.ui.langMenuOpen;
    renderTopbar();
  }

  function focusBooking() {
    refs.bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function applyDestination(destination) {
    var clean = utils.sanitizeText(destination, 80);
    if (!clean) return;
    state.search.destination = clean;
    state.booking.step = 'search';
    renderBooking();
    var input = refs.bookingSection.querySelector('input[name="destination"]');
    if (input) {
      input.focus();
      input.value = clean;
    }
    focusBooking();
  }

  function parseQueryLocation(query) {
    var clean = utils.sanitizeText(query, 180);
    var lower = clean.toLowerCase();
    var markers = ['best places in ', 'luxury hotels in ', 'weekend in ', 'stay in ', 'in ', 'à ', 'في ', 'de ', 'da '];
    for (var i = 0; i < markers.length; i += 1) {
      var idx = lower.lastIndexOf(markers[i]);
      if (idx !== -1) {
        var extracted = clean.slice(idx + markers[i].length).trim();
        if (extracted.length >= 2) return extracted;
      }
    }
    return clean;
  }

  async function buildAssistantResponse(query) {
    var location = parseQueryLocation(query) || t('ai.fallbackLocation');
    var matches = await api.searchDestinations(location, state.locale);
    var picks = matches.slice(0, 3);
    var primary = picks[0] || {
      name: location,
      country: '',
      score: 92,
      description: location,
      image: api.buildImageUrl(location + ' luxury travel', 1200, 800, 66),
      heroImage: api.buildImageUrl(location + ' luxury skyline', 1600, 900, 67)
    };
    var details = await api.getDestinationDetails(primary, state.locale, {
      checkIn: state.search.checkIn,
      checkOut: state.search.checkOut,
      guests: state.search.guests || 2
    });
    var hotels = details.hotels.slice(0, 2);

    return [
      '<p class="msg-text">' + utils.escapeHtml(t('ai.intro')) + '</p>',
      '<p class="msg-text"><strong>' + utils.escapeHtml(t('concierge.sectionMatches')) + '</strong></p>',
      '<ul style="margin:8px 0 14px 18px;padding:0;">' + picks.map(function (item) {
        return '<li>' + utils.escapeHtml(destinationLabel(item)) + ' · ' + utils.escapeHtml(item.description) + '</li>';
      }).join('') + '</ul>',
      '<div class="chip-list">' + picks.map(function (item) {
        return '<button type="button" class="mini-chip mini-chip-action" data-action="apply-destination" data-destination="' + utils.escapeHtml(destinationLabel(item)) + '">' + utils.escapeHtml(destinationLabel(item)) + '</button>';
      }).join('') + '</div>',
      '<p class="msg-text"><strong>' + utils.escapeHtml(t('concierge.sectionHotels')) + '</strong></p>',
      '<ul style="margin:8px 0 14px 18px;padding:0;">' + hotels.map(function (hotel) {
        return '<li>' + utils.escapeHtml(hotel.name + ' — ' + utils.formatCurrency(hotel.total, state.locale, config.app.currency)) + '</li>';
      }).join('') + '</ul>',
      '<p class="msg-text"><strong>' + utils.escapeHtml(t('concierge.sectionMoment')) + '</strong>: ' + utils.escapeHtml(primary.name + ' offers a polished balance of access, style, and memorable pacing for a premium stay.') + '</p>',
      '<p class="msg-text"><strong>' + utils.escapeHtml(t('concierge.sectionAdvice')) + '</strong>: ' + utils.escapeHtml(t('ai.note')) + '</p>'
    ].join('');
  }

  async function handleChatSubmit(formData) {
    var query = utils.sanitizeText(formData.get('query'), 180);
    if (!query) return;

    state.chat.push({ role: 'user', text: query });
    state.ui.typing = true;
    renderConcierge();
    persist();

    await utils.wait(utils.rand(config.app.typingMinMs, config.app.typingMaxMs));
    var html = await buildAssistantResponse(query);
    state.chat.push({ role: 'assistant', html: html });
    state.ui.typing = false;
    renderConcierge();
    persist();
  }

  function handleDocumentClick(event) {
    var actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) {
      if (!event.target.closest('.lang-picker')) {
        state.ui.langMenuOpen = false;
        renderTopbar();
      }
      if (event.target === refs.authModal) closeAuth();
      return;
    }

    var action = actionTarget.getAttribute('data-action');
    if (action === 'toggle-language-menu') toggleLanguageMenu();
    if (action === 'set-language') setLanguage(actionTarget.getAttribute('data-lang'));
    if (action === 'open-auth') openAuth();
    if (action === 'close-auth') closeAuth();
    if (action === 'logout') logout();
    if (action === 'focus-booking') focusBooking();
    if (action === 'go-search') {
      state.booking.step = 'search';
      renderBooking();
    }
    if (action === 'go-results') {
      state.booking.step = 'results';
      renderBooking();
    }
    if (action === 'go-details') {
      state.booking.step = 'details';
      state.booking.paymentVisible = false;
      renderBooking();
    }
    if (action === 'choose-destination') chooseDestination(actionTarget.getAttribute('data-id'));
    if (action === 'select-stay') selectStay(actionTarget.getAttribute('data-id'));
    if (action === 'use-quick-query') {
      var query = actionTarget.getAttribute('data-query');
      var chatInput = refs.conciergeSection.querySelector('input[name="query"]');
      if (chatInput) {
        chatInput.value = query;
        chatInput.focus();
      }
    }
    if (action === 'apply-destination') applyDestination(actionTarget.getAttribute('data-destination'));
    if (action === 'hero-destination') {
      var index = Number(actionTarget.getAttribute('data-index') || 0);
      if (!Number.isNaN(index)) {
        state.heroIndex = index;
        renderHero();
      }
      applyDestination(actionTarget.getAttribute('data-destination'));
    }
  }

  function handleDocumentSubmit(event) {
    if (event.target.id === 'bookingSearchForm') {
      event.preventDefault();
      handleSearchSubmit(new FormData(event.target));
    }
    if (event.target.id === 'travelerForm') {
      event.preventDefault();
      handleTravelerSubmit(new FormData(event.target));
    }
    if (event.target.id === 'authForm') {
      event.preventDefault();
      handleAuthSubmit(new FormData(event.target));
    }
    if (event.target.id === 'chatForm') {
      event.preventDefault();
      handleChatSubmit(new FormData(event.target));
      event.target.reset();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      if (state.ui.authOpen) closeAuth();
      if (state.ui.langMenuOpen) {
        state.ui.langMenuOpen = false;
        renderTopbar();
      }
    }
  }

  async function loadHero() {
    state.heroSlides = await api.getHeroDestinations();
    renderHero();
  }

  function startHeroRotation() {
    clearInterval(heroTimer);
    heroTimer = setInterval(function () {
      if (!state.heroSlides.length) return;
      state.heroIndex = (state.heroIndex + 1) % state.heroSlides.length;
      renderHero();
    }, config.app.heroRotateMs);
  }

  function cacheRefs() {
    refs.topbar = document.getElementById('topbar');
    refs.heroSection = document.getElementById('heroSection');
    refs.bookingSection = document.getElementById('bookingSection');
    refs.conciergeSection = document.getElementById('conciergeSection');
    refs.dashboardSection = document.getElementById('dashboardSection');
    refs.authModal = document.getElementById('authModal');
    refs.toastHost = document.getElementById('toastHost');
  }

  async function init() {
    cacheRefs();
    hydrate();
    renderAll();
    await loadHero();
    startHeroRotation();
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('submit', handleDocumentSubmit);
    document.addEventListener('keydown', handleKeydown);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.SaraViaConfig, window.SaraViaUtils, window.SaraViaAPI, window.SaraViaPayments);
