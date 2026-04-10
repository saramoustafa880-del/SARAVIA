window.SaraViaPayments = (function (config, utils) {
  var stripeInstance = null;
  var active = {
    elements: null,
    card: null,
    paymentRequest: null,
    mountedContainer: null,
    onComplete: null,
    onStateChange: null,
    amount: 0,
    locale: 'en'
  };

  function getStripe(locale) {
    if (!window.Stripe || !config.app.stripePublishableKey) {
      return null;
    }
    if (!stripeInstance) {
      stripeInstance = window.Stripe(config.app.stripePublishableKey, {
        locale: locale || 'auto'
      });
    }
    return stripeInstance;
  }

  function destroy() {
    try {
      if (active.card) active.card.unmount();
    } catch (error) {
      console.warn('Card unmount failed', error);
    }
    active.elements = null;
    active.card = null;
    active.paymentRequest = null;
    active.mountedContainer = null;
    active.onComplete = null;
    active.onStateChange = null;
  }

  function emitState(status, message) {
    if (typeof active.onStateChange === 'function') {
      active.onStateChange({ status: status, message: message });
    }
  }

  async function simulateFinalize(paymentRef, amount) {
    emitState('pending', 'processing');
    await utils.wait(utils.rand(1200, 2200));
    var success = Math.random() <= config.app.paymentSuccessRate;
    return {
      id: paymentRef || utils.uid('txn'),
      amount: amount,
      status: success ? 'success' : 'failed',
      timestamp: new Date().toISOString(),
      provider: 'stripe-test'
    };
  }

  async function handleCardSubmit(event, refs, options) {
    event.preventDefault();
    if (!active.card || !options || options.disabled) return;

    if (refs && refs.payButton) {
      refs.payButton.disabled = true;
      refs.payButton.innerHTML = '<span class="spinner"></span>';
    }

    var stripe = getStripe(active.locale);
    if (!stripe) {
      emitState('failed', options.t('payment.gatewayUnavailable'));
      return;
    }

    emitState('pending', options.t('payment.processing'));
    var billingName = utils.sanitizeText(options.customer && options.customer.name, 60);
    var billingEmail = utils.sanitizeText(options.customer && options.customer.email, 120);

    try {
      var result = await stripe.createPaymentMethod({
        type: 'card',
        card: active.card,
        billing_details: {
          name: billingName,
          email: billingEmail
        }
      });

      if (result.error) {
        emitState('failed', result.error.message || options.t('payment.failed'));
        if (refs && refs.payButton) {
          refs.payButton.disabled = false;
          refs.payButton.textContent = options.t('payment.payNow') + ' · ' + utils.formatCurrency(options.amount, options.locale, config.app.currency);
        }
        return;
      }

      var transaction = await simulateFinalize(result.paymentMethod && result.paymentMethod.id, options.amount);
      if (transaction.status === 'success') {
        emitState('success', options.t('payment.success'));
      } else {
        emitState('failed', options.t('payment.failed'));
      }
      if (typeof active.onComplete === 'function') {
        active.onComplete(transaction);
      }
      if (transaction.status !== 'success' && refs && refs.payButton) {
        refs.payButton.disabled = false;
        refs.payButton.textContent = options.t('payment.payNow') + ' · ' + utils.formatCurrency(options.amount, options.locale, config.app.currency);
      }
    } catch (error) {
      console.error('Stripe card flow error', error);
      emitState('failed', options.t('payment.failed'));
      if (refs && refs.payButton) {
        refs.payButton.disabled = false;
        refs.payButton.textContent = options.t('payment.payNow') + ' · ' + utils.formatCurrency(options.amount, options.locale, config.app.currency);
      }
    }
  }

  async function mountWalletIfAvailable(target, options, stripe) {
    if (!window.isSecureContext || !stripe || !target) {
      return false;
    }
    try {
      var paymentRequest = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Sara Via Booking',
          amount: Math.round(Number(options.amount || 0) * 100)
        },
        requestPayerName: true,
        requestPayerEmail: true
      });

      var canMakePayment = await paymentRequest.canMakePayment();
      if (!canMakePayment) {
        return false;
      }

      active.paymentRequest = paymentRequest;
      var elements = stripe.elements();
      var prButton = elements.create('paymentRequestButton', {
        paymentRequest: paymentRequest,
        style: {
          paymentRequestButton: {
            type: 'default',
            theme: 'dark',
            height: '46px'
          }
        }
      });
      prButton.mount(target);

      paymentRequest.on('paymentmethod', async function (ev) {
        emitState('pending', options.t('payment.processing'));
        var transaction = await simulateFinalize(ev.paymentMethod && ev.paymentMethod.id, options.amount);
        ev.complete(transaction.status === 'success' ? 'success' : 'fail');
        if (transaction.status === 'success') {
          emitState('success', options.t('payment.success'));
        } else {
          emitState('failed', options.t('payment.failed'));
        }
        if (typeof active.onComplete === 'function') {
          active.onComplete(transaction);
        }
      });

      return true;
    } catch (error) {
      console.warn('Wallet mount failed', error);
      return false;
    }
  }

  async function render(container, options) {
    destroy();
    active.mountedContainer = container;
    active.onComplete = options.onComplete;
    active.onStateChange = options.onStateChange;
    active.amount = options.amount;
    active.locale = options.locale || 'en';

    var payLabel = options.t('payment.payNow') + ' · ' + utils.formatCurrency(options.amount, options.locale, config.app.currency);
    container.innerHTML = [
      '<div class="payment-shell">',
      '  <div class="booking-details">',
      '    <div class="detail-row"><span class="detail-label">' + utils.escapeHtml(options.t('common.amount')) + '</span><strong class="detail-value">' + utils.escapeHtml(utils.formatCurrency(options.amount, options.locale, config.app.currency)) + '</strong></div>',
      '    <div class="detail-row"><span class="detail-label">Stripe</span><span class="detail-value">' + utils.escapeHtml(options.t('payment.secureCheckout')) + '</span></div>',
      '  </div>',
      '  <div id="walletMount" class="booking-details" style="margin-bottom:16px;"></div>',
      '  <div class="booking-details">',
      '    <div class="detail-row"><span class="detail-label">' + utils.escapeHtml(options.t('payment.cardLabel')) + '</span><span class="detail-value">' + utils.escapeHtml(options.t('common.secure')) + '</span></div>',
      '    <form id="stripeCardForm" novalidate>',
      '      <div id="stripeCardElement" style="padding:14px 0 10px;"></div>',
      '      <button type="submit" class="btn-confirm" id="payNowBtn">' + utils.escapeHtml(payLabel) + '</button>',
      '    </form>',
      '    <p style="margin:12px 0 0;color:var(--text-muted);font-size:13px;">' + utils.escapeHtml(options.t('payment.secureCheckout')) + '</p>',
      '  </div>',
      '  <div id="paymentFeedback" class="empty-state" style="padding:18px 8px 0;">' + utils.escapeHtml(options.t('payment.walletUnavailable')) + '</div>',
      '</div>'
    ].join('');

    var feedbackNode = container.querySelector('#paymentFeedback');
    var walletMount = container.querySelector('#walletMount');
    var cardForm = container.querySelector('#stripeCardForm');
    var payNowBtn = container.querySelector('#payNowBtn');
    var stripe = getStripe(active.locale);

    if (!stripe) {
      feedbackNode.textContent = options.t('payment.gatewayUnavailable');
      var btn = container.querySelector('#payNowBtn');
      if (btn) btn.disabled = true;
      return;
    }

    var walletReady = await mountWalletIfAvailable(walletMount, options, stripe);
    feedbackNode.textContent = walletReady ? options.t('payment.walletReady') : options.t('payment.walletUnavailable');

    active.elements = stripe.elements({
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#4fd1c5',
          colorBackground: '#0f1b2d',
          colorText: '#f0f4fa',
          colorDanger: '#ff6b85',
          borderRadius: '14px'
        }
      }
    });

    active.card = active.elements.create('card', {
      hidePostalCode: true,
      style: {
        base: {
          fontSize: '16px',
          color: '#f0f4fa',
          '::placeholder': {
            color: '#8ea2c4'
          }
        }
      }
    });
    active.card.mount(container.querySelector('#stripeCardElement'));

    active.card.on('change', function (event) {
      if (event.error) {
        feedbackNode.textContent = event.error.message;
      } else if (walletReady) {
        feedbackNode.textContent = options.t('payment.walletReady');
      } else {
        feedbackNode.textContent = options.t('payment.walletUnavailable');
      }
    });

    cardForm.addEventListener('submit', function (event) {
      handleCardSubmit(event, { feedbackNode: feedbackNode, payButton: payNowBtn }, options);
    });
  }

  return {
    render: render,
    destroy: destroy
  };
})(window.SaraViaConfig, window.SaraViaUtils);
