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

  function setYear(elementId){
    var el = document.getElementById(elementId);
    if(el) el.textContent = new Date().getFullYear();
  }

  function loadSiteHeader(){
    var target = document.querySelector('[data-site-header]');
    if(!target) return Promise.resolve();

    return fetch('partials/site-header.html')
      .then(function(response){
        if(!response.ok) throw new Error('Unable to load site header.');
        return response.text();
      })
      .then(function(html){
        target.innerHTML = html;
      })
      .catch(function(error){
        console.error(error);
      });
  }

  function getStoredCurrentUser(){
    var stored = window.localStorage.getItem(currentUserStorageKey) || window.localStorage.getItem(legacyCurrentUserStorageKey);
    if(!stored) return null;

    try{
      return JSON.parse(stored);
    }catch(e){
      return null;
    }
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
    window.localStorage.removeItem(loginStorageKey);
    window.localStorage.removeItem(currentUserStorageKey);
    window.localStorage.removeItem(legacyCurrentUserStorageKey);
    updateHeaderProfile(null);
  }

  function applyLoginResult(result){
    if(!result) return;

    window.localStorage.setItem(loginStorageKey, 'true');
    window.localStorage.setItem(currentUserStorageKey, JSON.stringify(result));
    window.localStorage.setItem(legacyCurrentUserStorageKey, JSON.stringify(result));
    updateHeaderProfile(result);
    updateAuthState();
  }

  function hasActiveLogin(){
    var user = getStoredCurrentUser();
    return window.localStorage.getItem(loginStorageKey) === 'true' && !!(user && user.sessionToken);
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

  function runCloudFunction(functionName, params){
    var user = getStoredCurrentUser();
    if(!user || !user.sessionToken){
      return Promise.reject(new Error('Login is required.'));
    }

    return loadParseSdk().then(function(){
      if(!initializeParse()) throw new Error('Parse could not be loaded.');

      return window.Parse.Cloud.run(functionName, params || {}, {
        sessionToken: user.sessionToken
      });
    });
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
      '<label for="login-username">Username</label>',
      '<input type="text" id="login-username" name="username" autocomplete="username" required />',
      '</div>',
      '<div class="form-row">',
      '<label for="login-password">Password</label>',
      '<input type="password" id="login-password" name="password" autocomplete="current-password" required />',
      '</div>',
      '<div id="login-error" class="form-error" role="alert" hidden></div>',
      '<button type="submit" class="btn primary">Log in</button>',
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

    if(error){
      error.textContent = '';
      error.hidden = true;
    }

    overlay.hidden = false;
    document.body.classList.add('login-required');
    if(username) username.focus();
  }

  function closeLogin(){
    var overlay = document.getElementById('login-overlay');
    if(overlay) overlay.hidden = true;
    document.body.classList.remove('login-required');
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

  function updateHeaderVisibility(){
    var mainNav = document.querySelector('.main-nav');
    var authButton = document.querySelector('[data-auth-button]');
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
      link.classList.toggle('is-disabled', !isLoggedIn);
      link.setAttribute('aria-disabled', String(!isLoggedIn));
      link.tabIndex = isLoggedIn ? 0 : -1;
    });
  }

  function setupHeaderAuth(){
    var authButton = document.querySelector('[data-auth-button]');
    if(!authButton) return;

    authButton.addEventListener('click', function(){
      if(hasActiveLogin()){
        clearLoginState();
        closeLogin();
        updateAuthState();
        console.log('Logout successful');
        return;
      }

      openLogin();
    });

    updateAuthState();
  }

  function setupNavigationGate(){
    document.addEventListener('click', function(ev){
      var link = ev.target.closest('a[href]');
      if(!link || hasActiveLogin()) return;

      ev.preventDefault();
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
    var submit = form ? form.querySelector('[type="submit"]') : null;
    if(!overlay || !form) return;

    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      if(!form.checkValidity()){
        form.reportValidity();
        return;
      }

      if(error){
        error.textContent = '';
        error.hidden = true;
      }

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
        if(error){
          error.textContent = getErrorMessage(loginError);
          error.hidden = false;
        }
      }).finally(function(){
        if(submit){
          submit.disabled = false;
          submit.textContent = 'Log in';
        }
      });
    });
  }

  window.BeFitMeAuth = {
    applyLoginResult: applyLoginResult,
    updateHeaderProfile: updateHeaderProfile,
    clearLoginState: clearLoginState,
    runCloudFunction: runCloudFunction
  };

  document.addEventListener('DOMContentLoaded', function(){
    setYear('year');
    setYear('year-2');
    setYear('year-3');
    setupNavigationGate();
    setupLoginGate();
    loadSiteHeader().then(function(){
      setupActiveNav();
      updateHeaderProfile(getStoredCurrentUser());
      updateHeaderVisibility();
      setupHeaderAuth();
    });

    // Future shared behaviors:
    // - global fetch wrapper for authenticated requests
    // - theme toggle, layout preferences, keyboard shortcuts
  });
})();
