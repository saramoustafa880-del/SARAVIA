window.SaraViaAPI = (function (config, utils) {
  var featuredCache = null;

  function buildImageUrl(query, width, height, seed) {
    var size = (width || 1600) + 'x' + (height || 900);
    var randomSeed = typeof seed === 'number' ? seed : utils.rand(1, 9999);
    return 'https://source.unsplash.com/featured/' + size + '/?' + encodeURIComponent(query + ',luxury,travel') + '&sig=' + randomSeed;
  }

  function normalisePlace(item, query) {
    var address = item.address || {};
    var city = item.name || address.city || address.town || address.village || address.state || address.country || query;
    var country = address.country || '';
    var type = item.type || item.addresstype || 'destination';
    var label = city + (country && city.toLowerCase() !== country.toLowerCase() ? ', ' + country : '');
    return {
      id: item.place_id || utils.uid('place'),
      name: city,
      country: country,
      type: type,
      lat: Number(item.lat || 0),
      lon: Number(item.lon || 0),
      score: Math.max(78, 98 - (item.place_rank || 10)),
      description: utils.shorten(item.display_name || label, 118),
      image: buildImageUrl(label + ' luxury skyline', 1200, 800, Number(item.place_id || utils.rand(1, 1000)) % 1000),
      heroImage: buildImageUrl(label + ' luxury hotel aerial', 1600, 900, Number(item.place_id || utils.rand(1, 1000)) % 1000),
      sourceName: label
    };
  }

  async function searchDestinations(query, locale) {
    var cleanedQuery = utils.sanitizeText(query, 80);
    if (!cleanedQuery) {
      return [];
    }

    try {
      var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=' + encodeURIComponent(cleanedQuery) + '&accept-language=' + encodeURIComponent(locale || 'en');
      var response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Nominatim request failed');
      }
      var data = await response.json();
      var mapped = (Array.isArray(data) ? data : []).map(function (item) {
        return normalisePlace(item, cleanedQuery);
      });
      var unique = [];
      var seen = {};
      mapped.forEach(function (item) {
        var key = (item.name + '|' + item.country).toLowerCase();
        if (!seen[key]) {
          seen[key] = true;
          unique.push(item);
        }
      });
      if (unique.length) {
        return unique;
      }
    } catch (error) {
      console.warn('Destination search fallback engaged', error);
    }

    return config.featuredDestinations
      .filter(function (item) {
        return (item.city + ' ' + item.country + ' ' + item.query).toLowerCase().indexOf(cleanedQuery.toLowerCase()) !== -1;
      })
      .map(function (item, index) {
        return {
          id: item.id,
          name: item.city,
          country: item.country,
          type: 'featured',
          lat: 0,
          lon: 0,
          score: item.score,
          description: item.city + ', ' + item.country,
          image: buildImageUrl(item.query, 1200, 800, index + 1),
          heroImage: buildImageUrl(item.query + ' panoramic', 1600, 900, index + 11),
          sourceName: item.city + ', ' + item.country
        };
      });
  }

  async function fetchWikipediaSummary(title, locale) {
    if (!title) return '';
    var candidates = [locale || 'en', 'en'];
    for (var i = 0; i < candidates.length; i += 1) {
      try {
        var wikiUrl = 'https://' + candidates[i] + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title);
        var response = await fetch(wikiUrl, {
          headers: {
            'Accept': 'application/json'
          }
        });
        if (!response.ok) continue;
        var data = await response.json();
        if (data && data.extract) {
          return utils.shorten(data.extract, 240);
        }
      } catch (error) {
        console.warn('Wikipedia summary lookup failed', error);
      }
    }
    return '';
  }

  function generateHotels(destination, searchState) {
    var nights = utils.daysBetween(searchState.checkIn, searchState.checkOut);
    var base = 420 + utils.rand(40, 140) + Math.round((destination.score || 90) * 5.2);

    return [0, 1, 2].map(function (index) {
      var prefix = config.mock.hotelPrefixes[(index + destination.name.length) % config.mock.hotelPrefixes.length];
      var suffix = config.mock.hotelSuffixes[(index + destination.country.length) % config.mock.hotelSuffixes.length];
      var nightlyRate = base + index * 110 + utils.rand(18, 68);
      var name = prefix + ' ' + destination.name + ' ' + suffix;
      var amenities = utils.pickMany(config.mock.perks, 3);
      var themes = utils.pickMany(config.mock.themes, 2);
      return {
        id: utils.slug(name) || utils.uid('hotel'),
        name: name,
        rating: (4.7 + index * 0.08).toFixed(1),
        nightlyRate: nightlyRate,
        total: nightlyRate * nights,
        nights: nights,
        image: buildImageUrl(destination.name + ' luxury hotel suite', 1200, 800, index + 100),
        amenities: amenities,
        itinerary: [
          'Arrival transfer and priority check-in',
          'Tailored ' + themes[0] + ' experience in ' + destination.name,
          'Private evening arranged around ' + themes[1]
        ]
      };
    });
  }

  async function getDestinationDetails(destination, locale, searchState) {
    var summary = await fetchWikipediaSummary(destination.name, locale);
    return {
      destination: destination,
      summary: summary || destination.name + ' offers a compelling blend of prestige stays, polished service, and access to high-value experiences for discerning travelers.',
      hotels: generateHotels(destination, searchState)
    };
  }

  async function getHeroDestinations() {
    if (featuredCache) return featuredCache;
    featuredCache = config.featuredDestinations.map(function (item, index) {
      return {
        id: item.id,
        title: item.city + ', ' + item.country,
        score: item.score,
        image: buildImageUrl(item.query, 1600, 900, index + 20)
      };
    });
    return featuredCache;
  }

  async function login(email, password) {
    var safeEmail = utils.sanitizeText(email, 120);
    var safePassword = String(password || '');
    if (!utils.emailValid(safeEmail) || safePassword.length < 6) {
      throw new Error('invalid_credentials');
    }
    await utils.wait(utils.rand(450, 950));
    var namePart = safeEmail.split('@')[0].replace(/[._-]/g, ' ');
    return {
      id: utils.uid('user'),
      email: safeEmail,
      name: namePart.replace(/\b\w/g, function (char) {
        return char.toUpperCase();
      })
    };
  }

  return {
    searchDestinations: searchDestinations,
    getDestinationDetails: getDestinationDetails,
    getHeroDestinations: getHeroDestinations,
    login: login,
    buildImageUrl: buildImageUrl
  };
})(window.SaraViaConfig, window.SaraViaUtils);
