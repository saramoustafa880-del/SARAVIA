window.SaraViaUtils = (function () {
  function getByPath(obj, path) {
    return String(path)
      .split('.')
      .reduce(function (acc, key) {
        return acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined;
      }, obj);
  }

  function encodeBase64Url(input) {
    return btoa(unescape(encodeURIComponent(input)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  function decodeSafe(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function storageGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? decodeSafe(raw, fallback) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function uid(prefix) {
    return [prefix || 'id', Date.now().toString(36), Math.random().toString(36).slice(2, 10)].join('_');
  }

  function fakeJwt(payload) {
    var header = { alg: 'HS256', typ: 'JWT' };
    var body = Object.assign({}, payload, {
      iat: Date.now(),
      iss: 'SaraViaLocalAuth'
    });
    var signature = encodeBase64Url(uid('sig'));
    return [encodeBase64Url(JSON.stringify(header)), encodeBase64Url(JSON.stringify(body)), signature].join('.');
  }

  function escapeHtml(input) {
    return String(input || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeText(input, maxLength) {
    var cleaned = String(input || '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return typeof maxLength === 'number' ? cleaned.slice(0, maxLength) : cleaned;
  }

  function emailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function isFutureDate(dateString) {
    return !Number.isNaN(new Date(dateString).getTime());
  }

  function daysBetween(start, end) {
    var startMs = new Date(start).setHours(0, 0, 0, 0);
    var endMs = new Date(end).setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((endMs - startMs) / 86400000));
  }

  function validateSearch(form, t) {
    if (!sanitizeText(form.destination, 80)) {
      return t('validation.destinationRequired');
    }
    if (!form.checkIn || !form.checkOut || !isFutureDate(form.checkIn) || !isFutureDate(form.checkOut)) {
      return t('validation.datesRequired');
    }
    if (new Date(form.checkOut).getTime() <= new Date(form.checkIn).getTime()) {
      return t('validation.datesOrder');
    }
    if (!form.guests || Number(form.guests) < 1) {
      return t('validation.guestsRequired');
    }
    return '';
  }

  function validateTraveler(form, t) {
    if (!sanitizeText(form.name, 60)) {
      return t('validation.nameRequired');
    }
    if (!emailValid(form.email)) {
      return t('validation.emailRequired');
    }
    return '';
  }

  function formatCurrency(amount, locale, currency) {
    try {
      return new Intl.NumberFormat(locale || 'en', {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: 0
      }).format(Number(amount || 0));
    } catch (error) {
      return '$' + Number(amount || 0).toFixed(0);
    }
  }

  function formatDate(dateString, locale) {
    try {
      return new Intl.DateTimeFormat(locale || 'en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
    } catch (error) {
      return dateString;
    }
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickMany(list, count) {
    var copy = Array.isArray(list) ? list.slice() : [];
    var out = [];
    while (copy.length && out.length < count) {
      out.push(copy.splice(rand(0, copy.length - 1), 1)[0]);
    }
    return out;
  }

  function slug(text) {
    return sanitizeText(text || '', 120)
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\u00C0-\u024F]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function shorten(text, limit) {
    var clean = sanitizeText(text || '', 500);
    if (clean.length <= limit) return clean;
    return clean.slice(0, Math.max(0, limit - 1)).trim() + '…';
  }

  return {
    getByPath: getByPath,
    storageGet: storageGet,
    storageSet: storageSet,
    storageRemove: storageRemove,
    uid: uid,
    fakeJwt: fakeJwt,
    escapeHtml: escapeHtml,
    sanitizeText: sanitizeText,
    emailValid: emailValid,
    validateSearch: validateSearch,
    validateTraveler: validateTraveler,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    wait: wait,
    rand: rand,
    pickMany: pickMany,
    daysBetween: daysBetween,
    slug: slug,
    shorten: shorten
  };
})();
