/**
 * Luca Pixel - First-Party Attribution Tracking
 * Version: 1.0.0
 *
 * This script captures click IDs from ad platforms and stores them in
 * first-party cookies to enable accurate attribution tracking.
 *
 * Installation:
 * <script src="https://pixel.luca.sa/v1/p.js" data-store-id="YOUR_STORE_ID"></script>
 */
(function() {
  'use strict';

  // Configuration
  var PIXEL_VERSION = '1.0.0';
  var COOKIE_EXPIRY_DAYS = 7;
  var SESSION_EXPIRY_MINUTES = 30;
  var API_ENDPOINT = '/api/pixel/events';

  // Click ID parameters by platform
  var CLICK_ID_PARAMS = {
    meta: 'fbclid',
    snapchat: 'sccid',
    tiktok: 'ttclid',
    google: 'gclid'
  };

  // Get store ID from script tag
  var scriptTag = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('p.js') > -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  var storeId = scriptTag ? scriptTag.getAttribute('data-store-id') : null;

  if (!storeId) {
    console.warn('[Luca Pixel] Missing data-store-id attribute');
    return;
  }

  // Utility functions
  function generateId() {
    return 'lp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(JSON.stringify(value)) + expires + '; path=/; SameSite=Lax';
  }

  function getCookie(name) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        try {
          return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  function getUrlParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function getUtmParams() {
    var utms = {};
    var params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    params.forEach(function(param) {
      var value = getUrlParam(param);
      if (value) {
        utms[param] = value;
      }
    });
    return Object.keys(utms).length > 0 ? utms : null;
  }

  function detectPlatformFromReferrer() {
    var referrer = document.referrer || '';
    if (referrer.indexOf('facebook.com') > -1 || referrer.indexOf('instagram.com') > -1) {
      return 'meta';
    }
    if (referrer.indexOf('snapchat.com') > -1) {
      return 'snapchat';
    }
    if (referrer.indexOf('tiktok.com') > -1) {
      return 'tiktok';
    }
    if (referrer.indexOf('google.') > -1) {
      return 'google';
    }
    return null;
  }

  // Initialize or retrieve session
  function getSession() {
    var session = getCookie('luca_session');
    if (!session) {
      session = {
        id: generateId(),
        started_at: Date.now(),
        page_views: 0
      };
    }
    // Update session timestamp
    session.last_activity = Date.now();
    setCookie('luca_session', session, SESSION_EXPIRY_MINUTES / (24 * 60));
    return session;
  }

  // Capture click IDs from URL
  function captureClickIds() {
    var click = getCookie('luca_click');

    // Check each platform's click ID parameter
    for (var platform in CLICK_ID_PARAMS) {
      var paramName = CLICK_ID_PARAMS[platform];
      var clickId = getUrlParam(paramName);

      if (clickId) {
        // Found a click ID - store it
        click = {
          platform: platform,
          click_id: clickId,
          timestamp: Date.now(),
          landing_page: window.location.pathname,
          referrer: document.referrer
        };
        setCookie('luca_click', click, COOKIE_EXPIRY_DAYS);
        break;
      }
    }

    // If no click ID but we have UTMs, try to attribute
    if (!click) {
      var utms = getUtmParams();
      if (utms) {
        click = {
          platform: utms.utm_source || 'unknown',
          click_id: null,
          timestamp: Date.now(),
          landing_page: window.location.pathname,
          referrer: document.referrer,
          utms: utms
        };
        setCookie('luca_click', click, COOKIE_EXPIRY_DAYS);
      }
    }

    // If still no click, check referrer for platform
    if (!click) {
      var platform = detectPlatformFromReferrer();
      if (platform) {
        click = {
          platform: platform,
          click_id: null,
          timestamp: Date.now(),
          landing_page: window.location.pathname,
          referrer: document.referrer,
          attribution_method: 'referrer'
        };
        setCookie('luca_click', click, COOKIE_EXPIRY_DAYS);
      }
    }

    return click;
  }

  // Send event to API
  function sendEvent(eventType, eventData) {
    var session = getSession();
    var click = getCookie('luca_click');

    var payload = {
      store_id: storeId,
      event_type: eventType,
      timestamp: Date.now(),
      session: session,
      click: click,
      page: {
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        title: document.title
      },
      data: eventData || {},
      pixel_version: PIXEL_VERSION
    };

    // Send using Beacon API if available (non-blocking)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API_ENDPOINT, JSON.stringify(payload));
    } else {
      // Fallback to fetch
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function(err) {
        console.warn('[Luca Pixel] Failed to send event:', err);
      });
    }
  }

  // Public API
  var LucaPixel = {
    // Track page view
    pageView: function() {
      var session = getSession();
      session.page_views++;
      setCookie('luca_session', session, SESSION_EXPIRY_MINUTES / (24 * 60));
      sendEvent('page_view');
    },

    // Track add to cart
    addToCart: function(product) {
      sendEvent('add_to_cart', {
        product_id: product.id,
        product_name: product.name,
        quantity: product.quantity || 1,
        price: product.price,
        currency: product.currency || 'SAR'
      });
    },

    // Track checkout initiation
    beginCheckout: function(cart) {
      sendEvent('begin_checkout', {
        cart_value: cart.value,
        item_count: cart.items ? cart.items.length : 0,
        currency: cart.currency || 'SAR'
      });
    },

    // Track purchase
    purchase: function(order) {
      sendEvent('purchase', {
        order_id: order.id,
        value: order.value,
        items: order.items || [],
        currency: order.currency || 'SAR',
        customer_email: order.email,
        is_new_customer: order.is_new_customer
      });
    },

    // Generic event tracking
    track: function(eventName, eventData) {
      sendEvent(eventName, eventData);
    },

    // Get current attribution data (for debugging)
    getAttribution: function() {
      return {
        click: getCookie('luca_click'),
        session: getCookie('luca_session')
      };
    }
  };

  // Initialize on load
  function init() {
    // Capture any click IDs from URL
    captureClickIds();

    // Auto-track page view
    LucaPixel.pageView();
  }

  // Expose global API
  window.LucaPixel = LucaPixel;
  window.luca = LucaPixel; // Shorthand

  // Initialize when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
