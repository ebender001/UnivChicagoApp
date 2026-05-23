// Shared site behavior for BeFitMe
(function(){
  var loginStorageKey = 'befitmeLoggedIn';
  var currentUserStorageKey = 'befitmeCurrentUser';
  var legacyCurrentUserStorageKey = 'currentUser';

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

  function applyLoginResult(result){
    if(!result) return;

    window.localStorage.setItem(loginStorageKey, 'true');
    window.localStorage.setItem(currentUserStorageKey, JSON.stringify(result));
    window.localStorage.setItem(legacyCurrentUserStorageKey, JSON.stringify(result));
    updateHeaderProfile(result);
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

  function setupLoginGate(){
    var overlay = document.getElementById('login-overlay');
    var form = document.getElementById('login-form');
    var email = document.getElementById('login-email');
    if(!overlay || !form) return;

    function showLogin(){
      overlay.hidden = false;
      document.body.classList.add('login-required');
      if(email) email.focus();
    }

    function hideLogin(){
      overlay.hidden = true;
      document.body.classList.remove('login-required');
    }

    if(window.localStorage.getItem(loginStorageKey) === 'true'){
      hideLogin();
    }else{
      showLogin();
    }

    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      if(!form.checkValidity()){
        form.reportValidity();
        return;
      }

      window.localStorage.setItem(loginStorageKey, 'true');
      updateHeaderProfile(getStoredCurrentUser());
      hideLogin();
    });
  }

  window.BeFitMeAuth = {
    applyLoginResult: applyLoginResult,
    updateHeaderProfile: updateHeaderProfile
  };

  document.addEventListener('DOMContentLoaded', function(){
    setYear('year');
    setYear('year-2');
    setYear('year-3');
    setupLoginGate();
    loadSiteHeader().then(function(){
      setupActiveNav();
      updateHeaderProfile(getStoredCurrentUser());
    });

    // Future shared behaviors:
    // - global fetch wrapper for authenticated requests
    // - theme toggle, layout preferences, keyboard shortcuts
  });
})();
