// Shared site behavior for BeFitMe
(function(){
  var loginStorageKey = 'befitmeLoggedIn';
  var currentUserStorageKey = 'befitmeCurrentUser';
  var legacyCurrentUserStorageKey = 'currentUser';
  var parseApplicationId = 'CGnMcyXItejbcFQgxtCM2suwgsmfN6oqK7EHg4FJ';
  var parseJavaScriptKey = 'fJSj7mSiQHB8CP1a6n1DWkVhwOEdGYHqsQ8AKvli';
  var parseServerURL = 'https://parseapi.back4app.com/';
  var parseSdkURL = 'https://npmcdn.com/parse/dist/parse.min.js';
  var parseSdkPromise = null;
  var sessionExpiredMessage = 'Your session has expired. Please log in again.';
  var inactivityWarningDelayMs = 20 * 60 * 1000;
  var inactivityLogoutGraceMs = 60 * 1000;
  var CONNECTIVITY_CHECK_INTERVAL_MS = 30000;
  var CONNECTIVITY_CHECK_URL = '/partials/site-header.html';
  var CONNECTIVITY_CHECK_TIMEOUT_MS = 5000;
  var CONNECTIVITY_SLOW_THRESHOLD_MS = 2000;
  var CONNECTIVITY_SLOW_CONFIRM_COUNT = 2;
  var CONNECTIVITY_FAILURE_CONFIRM_COUNT = 2;
  var connectivitySlowCount = 0;
  var connectivityFailureCount = 0;
  var connectivityRequestSequence = 0;
  var inactivityTimer = null;
  var inactivityLogoutTimer = null;
  var inactivityEvents = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'];

  function setYear(elementId){
    var el = document.getElementById(elementId);
    if(el) el.textContent = new Date().getFullYear();
  }

  function getConnectivityStatusElement(){
    return document.getElementById('connectivity-status');
  }

  function setConnectivityStatus(text, state){
    var status = getConnectivityStatusElement();
    if(!status) return;

    status.textContent = text;
    status.classList.remove('status-online', 'status-offline', 'status-checking', 'status-poor');

    if(state){
      status.classList.add('status-' + state);
    }
  }

  function markConnectivityOnline(){
    connectivitySlowCount = 0;
    connectivityFailureCount = 0;
    setConnectivityStatus('Online', 'online');
  }

  function markConnectivityPoor(){
    setConnectivityStatus('Poor connection', 'poor');
  }

  function markConnectivityOffline(){
    setConnectivityStatus('Offline', 'offline');
  }

  function verifyConnectivity(){
    var requestId = ++connectivityRequestSequence;
    var startedAt = window.performance && typeof window.performance.now === 'function'
      ? window.performance.now()
      : Date.now();
    var controller = typeof window.AbortController === 'function'
      ? new AbortController()
      : null;
    var timeoutId = null;

    setConnectivityStatus('Checking...', 'checking');

    if(controller){
      timeoutId = window.setTimeout(function(){
        controller.abort();
      }, CONNECTIVITY_CHECK_TIMEOUT_MS);
    }

    return fetch(CONNECTIVITY_CHECK_URL, {
      cache: 'no-store',
      method: 'HEAD',
      signal: controller ? controller.signal : undefined
    }).then(function(response){
      var elapsedMs;
      if(!response.ok) throw new Error('Connectivity check failed.');

      elapsedMs = (window.performance && typeof window.performance.now === 'function'
        ? window.performance.now()
        : Date.now()) - startedAt;

      if(requestId !== connectivityRequestSequence) return;

      connectivityFailureCount = 0;
      if(elapsedMs >= CONNECTIVITY_SLOW_THRESHOLD_MS){
        connectivitySlowCount += 1;
        if(connectivitySlowCount >= CONNECTIVITY_SLOW_CONFIRM_COUNT){
          markConnectivityPoor();
          return;
        }
      }else{
        markConnectivityOnline();
        return;
      }

      setConnectivityStatus('Online', 'online');
    }).catch(function(){
      if(requestId !== connectivityRequestSequence) return;

      connectivitySlowCount = 0;
      connectivityFailureCount += 1;

      if(connectivityFailureCount >= CONNECTIVITY_FAILURE_CONFIRM_COUNT){
        markConnectivityOffline();
        return;
      }

      markConnectivityPoor();
    }).finally(function(){
      if(timeoutId){
        window.clearTimeout(timeoutId);
      }
    });
  }

  function updateOfflineState(){
    document.body.classList.toggle('offline', !navigator.onLine);

    if(!navigator.onLine){
      connectivitySlowCount = 0;
      connectivityFailureCount = 0;
      markConnectivityOffline();
      return;
    }

    verifyConnectivity();
  }

  function getBreadcrumbItems(){
    var path = location.pathname.split('/').pop() || 'index.html';
    var params = new URLSearchParams(location.search);
    var definitions = {
      'index.html': [
        { label: 'Dashboard' }
      ],
      'surveys.html': [
        { label: 'Dashboard', href: 'index.html' },
        { label: 'Surveys' }
      ],
      'survey.html': params.get('enrolleeId')
        ? [
          { label: 'Dashboard', href: 'index.html' },
          { label: 'Enrollees', href: 'enrollees.html' },
          { label: 'Survey' }
        ]
        : [
          { label: 'Dashboard', href: 'index.html' },
          { label: 'Survey' }
        ],
      'enrollees.html': [
        { label: 'Dashboard', href: 'index.html' },
        { label: 'Enrollees' }
      ],
      'enrollee-detail.html': [
        { label: 'Dashboard', href: 'index.html' },
        { label: 'Enrollees', href: 'enrollees.html' },
        { label: 'Enrollee Detail' }
      ],
      'enrollee-registration.html': params.get('surveyId')
        ? [
          { label: 'Dashboard', href: 'index.html' },
          { label: 'Surveys', href: 'surveys.html' },
          { label: 'Register Enrollee' }
        ]
        : params.get('enrolleeId')
          ? [
            { label: 'Dashboard', href: 'index.html' },
            { label: 'Enrollees', href: 'enrollees.html' },
            { label: 'Edit Enrollee' }
          ]
          : [
            { label: 'Dashboard', href: 'index.html' },
            { label: 'Enrollees', href: 'enrollees.html' },
            { label: 'Register Enrollee' }
          ],
      'data-export.html': [
        { label: 'Dashboard', href: 'index.html' },
        { label: 'Data Export' }
      ],
      'admin.html': [
        { label: 'Dashboard', href: 'index.html' },
        { label: 'Admin' }
      ],
      'accept-invite.html': [
        { label: 'Dashboard', href: 'index.html' },
        { label: 'Accept Invitation' }
      ]
    };

    return definitions[path] || [{ label: 'Dashboard', href: 'index.html' }];
  }

  function renderBreadcrumbs(){
    var main = document.getElementById('main-content');
    if(!main) return;

    var existing = document.getElementById('page-breadcrumbs');
    if(existing) existing.remove();

    var items = getBreadcrumbItems();
    if(!items || !items.length) return;

    var nav = document.createElement('nav');
    nav.id = 'page-breadcrumbs';
    nav.className = 'breadcrumbs';
    nav.setAttribute('aria-label', 'Breadcrumb');

    var list = document.createElement('ol');
    list.className = 'breadcrumbs-list';

    items.forEach(function(item, index){
      var li = document.createElement('li');
      li.className = 'breadcrumbs-item';
      var isCurrent = index === items.length - 1;

      if(item.href && !isCurrent){
        var link = document.createElement('a');
        link.href = item.href;
        link.className = 'breadcrumbs-link';
        link.textContent = item.label;
        li.appendChild(link);
      }else{
        var span = document.createElement('span');
        span.className = 'breadcrumbs-current';
        span.textContent = item.label;
        if(isCurrent) span.setAttribute('aria-current', 'page');
        li.appendChild(span);
      }

      list.appendChild(li);
    });

    nav.appendChild(list);
    main.insertBefore(nav, main.firstChild);
  }

  function loadSiteHeader(){
    var target = document.querySelector('[data-site-header]');
    if(!target) return Promise.resolve();

    // Header markup is shared so page-specific files do not duplicate navigation/auth controls.
    return fetch('partials/site-header.html')
      .then(function(response){
        if(!response.ok) throw new Error('Unable to load site header.');
        return response.text();
      })
      .then(function(html){
        target.innerHTML = html;
        updateOfflineState();
      })
      .catch(function(error){
        console.error(error);
      });
  }

  function getStoredCurrentUser(){
    var stored = window.sessionStorage.getItem(currentUserStorageKey) || window.sessionStorage.getItem(legacyCurrentUserStorageKey);
    if(!stored) return null;

    try{
      return JSON.parse(stored);
    }catch(e){
      return null;
    }
  }

  function getStoredUserRole(){
    var user = getStoredCurrentUser();
    return user && typeof user.role === 'string' ? user.role.trim().toLowerCase() : '';
  }

  function createAuthNotice(){
    var notice = document.createElement('div');
    notice.id = 'auth-status-notice';
    notice.className = 'auth-status-notice form-error';
    notice.setAttribute('role', 'alert');
    notice.setAttribute('aria-live', 'assertive');
    notice.hidden = true;
    document.body.appendChild(notice);
  }

  function ensureAuthNotice(){
    if(!document.getElementById('auth-status-notice')) createAuthNotice();
  }

  function hideAuthNotice(){
    var notice = document.getElementById('auth-status-notice');
    if(!notice) return;

    notice.textContent = '';
    notice.hidden = true;
  }

  function showAuthNotice(message){
    if(!message) return;

    ensureAuthNotice();

    var notice = document.getElementById('auth-status-notice');
    if(!notice) return;

    notice.textContent = message;
    notice.hidden = false;
  }

  function isViewerRole(){
    return getStoredUserRole() === 'viewer';
  }

  function getProfileName(value){
    if(!value) return '';
    if(typeof value === 'string') return value.trim();
    if(typeof value.name === 'string') return value.name.trim();
    return '';
  }

  function updateHeaderProfile(profile){
    var wrapper = document.querySelector('[data-header-profile]');
    var specialty = document.querySelector('[data-header-specialty]');
    var institution = document.querySelector('[data-header-institution]');
    if(!wrapper || !specialty || !institution) return;

    var specialtyName = getProfileName(profile && (profile.specialty || profile.specialtyName));
    var institutionName = getProfileName(profile && (profile.institution || profile.institutionName));

    specialty.textContent = specialtyName;
    specialty.hidden = !specialtyName;

    institution.textContent = institutionName;
    institution.hidden = !institutionName;

    wrapper.hidden = !specialtyName && !institutionName;
  }

  function clearLoginState(){
    window.sessionStorage.removeItem(loginStorageKey);
    window.sessionStorage.removeItem(currentUserStorageKey);
    window.sessionStorage.removeItem(legacyCurrentUserStorageKey);
    window.localStorage.removeItem(loginStorageKey);
    window.localStorage.removeItem(currentUserStorageKey);
    window.localStorage.removeItem(legacyCurrentUserStorageKey);
    stopInactivityTimer();
    closeSessionTimeoutOverlay();
    updateHeaderProfile(null);
    dispatchAuthStateChange();
  }

  function dispatchAuthStateChange(){
    document.dispatchEvent(new CustomEvent('befitme:authchange', {
      detail: {
        isLoggedIn: hasActiveLogin(),
        user: getStoredCurrentUser()
      }
    }));
  }

  function applyLoginResult(result){
    if(!result) return;

    window.sessionStorage.setItem(loginStorageKey, 'true');
    window.sessionStorage.setItem(currentUserStorageKey, JSON.stringify(result));
    window.sessionStorage.setItem(legacyCurrentUserStorageKey, JSON.stringify(result));
    window.localStorage.removeItem(loginStorageKey);
    window.localStorage.removeItem(currentUserStorageKey);
    window.localStorage.removeItem(legacyCurrentUserStorageKey);
    updateHeaderProfile(result);
    updateAuthState();
    resetInactivityTimer();
    hideAuthNotice();
    dispatchAuthStateChange();
  }

  function hasActiveLogin(){
    var user = getStoredCurrentUser();
    return window.sessionStorage.getItem(loginStorageKey) === 'true' && !!(user && user.sessionToken);
  }

  function loadParseSdk(){
    if(window.Parse) return Promise.resolve();
    if(parseSdkPromise) return parseSdkPromise;

    parseSdkPromise = new Promise(function(resolve, reject){
      var script = document.createElement('script');
      script.src = parseSdkURL;
      script.onload = resolve;
      script.onerror = function(){
        reject(new Error('Parse could not be loaded.'));
      };
      document.head.appendChild(script);
    });

    return parseSdkPromise;
  }

  function initializeParse(){
    if(!window.Parse) return false;
    if(window.Parse.applicationId === parseApplicationId) return true;

    window.Parse.initialize(parseApplicationId, parseJavaScriptKey);
    window.Parse.serverURL = parseServerURL;
    return true;
  }

  function getErrorMessage(error){
    if(error && error.message) return error.message;
    return 'Unable to log in. Please check your username and password.';
  }

  function getParseErrorCode(errorName, fallback){
    if(window.Parse && window.Parse.Error && typeof window.Parse.Error[errorName] === 'number'){
      return window.Parse.Error[errorName];
    }

    return fallback;
  }

  function isSessionInvalidError(error){
    var code = error && typeof error.code === 'number' ? error.code : null;
    var message = error && typeof error.message === 'string' ? error.message.toLowerCase() : '';

    return code === getParseErrorCode('INVALID_SESSION_TOKEN', 209)
      || code === getParseErrorCode('SESSION_MISSING', 206)
      || message.indexOf('invalid session token') !== -1
      || message.indexOf('session missing') !== -1
      || message.indexOf('session token is invalid') !== -1;
  }

  function createSessionExpiredError(error){
    var authError = new Error(sessionExpiredMessage);
    authError.name = 'SessionExpiredError';
    authError.code = error && error.code;
    authError.isSessionExpired = true;
    authError.originalError = error || null;
    return authError;
  }

  function handleAuthenticatedRequestError(error){
    var authError;
    if(!isSessionInvalidError(error)) return Promise.reject(error);

    authError = createSessionExpiredError(error);

    clearLoginState();
    stopInactivityTimer();
    closeSessionTimeoutOverlay();
    closeLogin();
    showAuthNotice(authError.message);

    document.dispatchEvent(new CustomEvent('befitme:sessionexpired', {
      detail: {
        message: authError.message,
        error: authError
      }
    }));

    return Promise.reject(authError);
  }

  function runCloudFunction(functionName, params){
    var user = getStoredCurrentUser();
    if(!user || !user.sessionToken){
      return Promise.reject(new Error('Login is required.'));
    }

    // Authenticated CloudCode calls must include the stored Parse session token.
    return loadParseSdk().then(function(){
      if(!initializeParse()) throw new Error('Parse could not be loaded.');

      return window.Parse.Cloud.run(functionName, params || {}, {
        sessionToken: user.sessionToken
      });
    }).catch(handleAuthenticatedRequestError);
  }

  function runPublicCloudFunction(functionName, params){
    return loadParseSdk().then(function(){
      if(!initializeParse()) throw new Error('Parse could not be loaded.');
      return window.Parse.Cloud.run(functionName, params || {});
    });
  }

  function setLoginFieldError(input, hasError){
    if(!input) return;
    input.classList.toggle('input-error', Boolean(hasError));
    input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
  }

  function hideLoginMessage(message){
    if(!message) return;
    message.textContent = '';
    message.hidden = true;
    message.classList.remove('success');
    message.classList.add('form-error');
  }

  function showLoginError(message){
    var error = document.getElementById('login-error');
    if(!error) return;

    error.textContent = message;
    error.hidden = false;
    error.classList.remove('success');
    error.classList.add('form-error');
  }

  function showLoginSuccess(message){
    var error = document.getElementById('login-error');
    if(!error) return;

    error.textContent = message;
    error.hidden = false;
    error.classList.remove('form-error');
    error.classList.add('success');
  }

  function createLoginOverlay(){
    var wrapper = document.createElement('div');
    wrapper.id = 'login-overlay';
    wrapper.className = 'login-overlay';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');
    wrapper.setAttribute('aria-labelledby', 'login-title');
    wrapper.hidden = true;
    wrapper.innerHTML = [
      '<form id="login-form" class="login-panel">',
      '<h2 id="login-title">Log in to BeFitMe</h2>',
      '<div class="form-row">',
      '<label for="login-username">Username or Email</label>',
      '<input type="text" id="login-username" name="username" autocomplete="username" required />',
      '</div>',
      '<div class="form-row">',
      '<label for="login-password">Password</label>',
      '<input type="password" id="login-password" name="password" autocomplete="current-password" required />',
      '</div>',
      '<button type="button" class="login-link-button" id="forgot-password-link">Forgot password?</button>',
      '<div id="login-error" class="form-error" role="alert" hidden></div>',
      '<div class="login-actions">',
      '<button type="submit" class="btn primary">Log in</button>',
      '<button type="button" class="btn" data-login-cancel>Cancel</button>',
      '</div>',
      '</form>'
    ].join('');
    document.body.appendChild(wrapper);
  }

  function ensureLoginOverlay(){
    if(!document.getElementById('login-overlay')) createLoginOverlay();
  }

  function openLogin(){
    ensureLoginOverlay();

    var overlay = document.getElementById('login-overlay');
    var username = document.getElementById('login-username');
    var error = document.getElementById('login-error');
    if(!overlay) return;

    hideLoginMessage(error);
    setLoginFieldError(username, false);

    overlay.hidden = false;
    document.body.classList.add('login-required');
    if(username) username.focus();
  }

  function closeLogin(){
    var overlay = document.getElementById('login-overlay');
    if(overlay) overlay.hidden = true;
    document.body.classList.remove('login-required');
  }

  function redirectAfterLogout(){
    if(!location.pathname.endsWith('index.html') && !location.pathname.endsWith('/')){
      window.location.href = 'index.html';
    }
  }

  function logoutUser(options){
    clearLoginState();
    closeLogin();
    hideAuthNotice();
    updateAuthState();
    console.log('Logout successful');
    if(options && options.redirect) redirectAfterLogout();
  }

  function createSessionTimeoutOverlay(){
    var wrapper = document.createElement('div');
    wrapper.id = 'session-timeout-overlay';
    wrapper.className = 'login-overlay session-timeout-overlay';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');
    wrapper.setAttribute('aria-labelledby', 'session-timeout-title');
    wrapper.hidden = true;
    wrapper.innerHTML = [
      '<div class="login-panel session-timeout-panel">',
      '<h2 id="session-timeout-title">Session timeout</h2>',
      '<p>Your session will time out and you will be logged out.</p>',
      '<div class="login-actions">',
      '<button type="button" class="btn primary" data-stay-connected>Stay Connected</button>',
      '<button type="button" class="btn" data-timeout-logout>Log Out</button>',
      '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrapper);
  }

  function ensureSessionTimeoutOverlay(){
    if(!document.getElementById('session-timeout-overlay')) createSessionTimeoutOverlay();
  }

  function closeSessionTimeoutOverlay(){
    var overlay = document.getElementById('session-timeout-overlay');
    if(overlay) overlay.hidden = true;
    window.clearTimeout(inactivityLogoutTimer);
    inactivityLogoutTimer = null;
  }

  function showSessionTimeoutOverlay(){
    if(!hasActiveLogin()) return;
    ensureSessionTimeoutOverlay();

    var overlay = document.getElementById('session-timeout-overlay');
    var stayConnected = overlay ? overlay.querySelector('[data-stay-connected]') : null;
    if(!overlay) return;

    overlay.hidden = false;
    if(stayConnected) stayConnected.focus();

    window.clearTimeout(inactivityLogoutTimer);
    inactivityLogoutTimer = window.setTimeout(function(){
      logoutUser({ redirect: true });
    }, inactivityLogoutGraceMs);
  }

  function stopInactivityTimer(){
    window.clearTimeout(inactivityTimer);
    window.clearTimeout(inactivityLogoutTimer);
    inactivityTimer = null;
    inactivityLogoutTimer = null;
  }

  function resetInactivityTimer(){
    if(!hasActiveLogin()){
      stopInactivityTimer();
      return;
    }

    closeSessionTimeoutOverlay();
    window.clearTimeout(inactivityTimer);
    inactivityTimer = window.setTimeout(showSessionTimeoutOverlay, inactivityWarningDelayMs);
  }

  function setupActiveNav(){
    var links = document.querySelectorAll('.main-nav a');
    var path = location.pathname;

    links.forEach(function(a){
      try{
        var href = a.getAttribute('href');
        a.classList.remove('active');
        if(href && (path.endsWith(href) || (href === 'index.html' && path.endsWith('/')))){
          a.classList.add('active');
        }
      }catch(e){/* noop */}
    });
  }

  function isSurveyPage(){
    return location.pathname.endsWith('survey.html');
  }

  function isSurveyHref(href){
    if(!href) return false;
    return href === 'survey.html' || href.endsWith('/survey.html');
  }

  function isPublicHref(href){
    if(!href) return false;
    return href === 'index.html'
      || href === './'
      || href === '/'
      || href.endsWith('/index.html')
      || href === 'survey.html'
      || href.endsWith('/survey.html')
      || href === 'accept-invite.html'
      || href.endsWith('/accept-invite.html');
  }

  function canAccessHref(href){
    if(isPublicHref(href)) return true;
    if(!hasActiveLogin()) return false;
    if(isSurveyHref(href) && isViewerRole()) return false;
    return true;
  }

  function getLinkAccessMessage(link){
    var href = link && link.getAttribute ? link.getAttribute('href') : '';
    if(isSurveyHref(href) && isViewerRole()){
      return 'Your role does not allow starting a new survey.';
    }

    if(link && link.dataset && link.dataset.loginAlert){
      return link.dataset.loginAlert;
    }

    return '';
  }

  function enforcePageAccess(){
    if(!isSurveyPage()) return;
    if(hasActiveLogin() && isViewerRole()){
      window.alert('Your role does not allow starting a new survey.');
      window.location.href = 'index.html';
    }
  }

  function updateHeaderVisibility(){
    var mainNav = document.querySelector('.main-nav');
    var authButton = document.querySelector('[data-auth-button]');
    // Survey is a patient-facing flow, so dashboard navigation stays out of view there.
    var hideControls = isSurveyPage();

    if(mainNav) mainNav.hidden = hideControls;
    if(authButton) authButton.hidden = hideControls;
  }

  function updateAuthState(){
    var isLoggedIn = hasActiveLogin();
    var authButton = document.querySelector('[data-auth-button]');
    var links = document.querySelectorAll('a[href]');

    if(authButton) authButton.textContent = isLoggedIn ? 'Log Out' : 'Login';

    links.forEach(function(link){
      var href = link.getAttribute('href');
      var isDisabled = !canAccessHref(href);
      link.classList.toggle('is-disabled', isDisabled);
      link.setAttribute('aria-disabled', String(isDisabled));
      link.tabIndex = isDisabled ? -1 : 0;
    });
  }

  function setupHeaderAuth(){
    var authButton = document.querySelector('[data-auth-button]');
    if(!authButton) return;

    authButton.addEventListener('click', function(){
      if(hasActiveLogin()){
        if(!window.confirm('Log out of BeFitMe?')){
          return;
        }

        logoutUser({ redirect: true });
        return;
      }

      openLogin();
    });

    updateAuthState();
  }

  function setupNavigationGate(){
    document.addEventListener('click', function(ev){
      var link = ev.target.closest('a[href]');
      if(link && link.hasAttribute('download')) return;
      if(!link || canAccessHref(link.getAttribute('href'))) return;

      ev.preventDefault();
      var accessMessage = getLinkAccessMessage(link);
      if(hasActiveLogin()){
        if(accessMessage){
          window.alert(accessMessage);
        }
        return;
      }

      if(accessMessage){
        // Some actions warn without opening the login dialog automatically.
        window.alert(accessMessage);
        return;
      }

      openLogin();
    });
  }

  function setupLoginGate(){
    ensureLoginOverlay();

    var overlay = document.getElementById('login-overlay');
    var form = document.getElementById('login-form');
    var username = document.getElementById('login-username');
    var password = document.getElementById('login-password');
    var error = document.getElementById('login-error');
    var cancel = form ? form.querySelector('[data-login-cancel]') : null;
    var submit = form ? form.querySelector('[type="submit"]') : null;
    var forgotPassword = document.getElementById('forgot-password-link');
    if(!overlay || !form) return;

    if(cancel){
      cancel.addEventListener('click', function(){
        closeLogin();
      });
    }

    if(username){
      username.addEventListener('input', function(){
        if(username.value.trim()){
          setLoginFieldError(username, false);
          hideLoginMessage(error);
        }
      });
    }

    if(forgotPassword){
      forgotPassword.addEventListener('click', function(){
        var loginName = username ? username.value.trim() : '';

        if(!loginName){
          setLoginFieldError(username, true);
          showLoginError('Enter your username or email to reset your password.');
          if(username) username.focus();
          return;
        }

        forgotPassword.disabled = true;
        setLoginFieldError(username, false);
        hideLoginMessage(error);

        runPublicCloudFunction('requestDashboardPasswordReset', {
          username: loginName
        }).then(function(){
          showLoginSuccess('If that account exists, a password reset email has been sent.');
        }).catch(function(resetError){
          console.log('Password reset request failed:', resetError);
          showLoginError(resetError && resetError.message ? resetError.message : 'Unable to request a password reset right now.');
        }).finally(function(){
          forgotPassword.disabled = false;
        });
      });
    }

    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      if(!form.checkValidity()){
        form.reportValidity();
        return;
      }

      hideLoginMessage(error);
      setLoginFieldError(username, false);

      if(submit){
        submit.disabled = true;
        submit.textContent = 'Logging in...';
      }

      loadParseSdk().then(function(){
        if(!initializeParse()) throw new Error('Login is unavailable. Parse could not be loaded.');

        return window.Parse.Cloud.run('login', {
          username: username.value,
          password: password.value
        });
      }).then(function(result){
        console.log('Login successful', result);
        applyLoginResult(result);
        closeLogin();
        form.reset();
      }).catch(function(loginError){
        console.log('Login failed', loginError);
        showLoginError(getErrorMessage(loginError));
      }).finally(function(){
        if(submit){
          submit.disabled = false;
          submit.textContent = 'Log in';
        }
      });
    });
  }

  function setupInactivityLogout(){
    ensureSessionTimeoutOverlay();

    inactivityEvents.forEach(function(eventName){
      document.addEventListener(eventName, function(){
        var overlay = document.getElementById('session-timeout-overlay');
        if(overlay && !overlay.hidden) return;
        resetInactivityTimer();
      }, { passive: true });
    });

    document.addEventListener('click', function(ev){
      var stayConnected = ev.target.closest('[data-stay-connected]');
      var timeoutLogout = ev.target.closest('[data-timeout-logout]');

      if(stayConnected){
        resetInactivityTimer();
        return;
      }

      if(timeoutLogout){
        logoutUser({ redirect: true });
      }
    });

    resetInactivityTimer();
  }

  window.BeFitMeAuth = {
    applyLoginResult: applyLoginResult,
    updateHeaderProfile: updateHeaderProfile,
    clearLoginState: clearLoginState,
    runCloudFunction: runCloudFunction,
    runPublicCloudFunction: runPublicCloudFunction,
    hasActiveLogin: hasActiveLogin,
    getStoredCurrentUser: getStoredCurrentUser
  };

  document.addEventListener('DOMContentLoaded', function(){
    window.localStorage.removeItem(loginStorageKey);
    window.localStorage.removeItem(currentUserStorageKey);
    window.localStorage.removeItem(legacyCurrentUserStorageKey);
    updateOfflineState();
    setYear('year');
    setYear('year-2');
    setYear('year-3');
    enforcePageAccess();
    renderBreadcrumbs();
    setupNavigationGate();
    setupLoginGate();
    setupInactivityLogout();
    loadSiteHeader().then(function(){
      setupActiveNav();
      updateHeaderProfile(getStoredCurrentUser());
      updateHeaderVisibility();
      setupHeaderAuth();
      dispatchAuthStateChange();
    });

    window.addEventListener('online', updateOfflineState);
    window.addEventListener('offline', updateOfflineState);
    window.setInterval(function(){
      if(navigator.onLine) verifyConnectivity();
    }, CONNECTIVITY_CHECK_INTERVAL_MS);

    // Future shared behaviors:
    // - global fetch wrapper for authenticated requests
    // - theme toggle, layout preferences, keyboard shortcuts
  });
})();
