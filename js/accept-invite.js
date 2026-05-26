// accept-invite.js
// Activates a dashboard user invitation.

(function(){
  // This page is public, so it initializes Parse directly instead of using app.js auth state.
  var parseApplicationId = 'CGnMcyXItejbcFQgxtCM2suwgsmfN6oqK7EHg4FJ';
  var parseJavaScriptKey = 'fJSj7mSiQHB8CP1a6n1DWkVhwOEdGYHqsQ8AKvli';
  var parseServerURL = 'https://parseapi.back4app.com/';
  var parseSdkURL = 'https://npmcdn.com/parse/dist/parse.min.js';
  var parseSdkPromise = null;

  function showStatus(message, isError){
    var status = document.getElementById('accept-invite-status');
    if(!status) return;

    status.textContent = message;
    status.hidden = false;
    status.classList.toggle('form-error', Boolean(isError));
    status.classList.toggle('success', !isError);
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

  function setSubmitState(form, saving){
    var submit = form.querySelector('[type="submit"]');
    if(!submit) return;

    submit.disabled = saving;
    submit.textContent = saving ? 'Activating...' : 'Activate Account';
  }

  function runActivation(params){
    // Activation intentionally runs without a session token; the email token authorizes it.
    return loadParseSdk().then(function(){
      if(!initializeParse()) throw new Error('Parse could not be loaded.');
      return window.Parse.Cloud.run('activateDashboardUserInvite', params);
    });
  }

  function showNewUserPinOverlay(pin){
    var overlay = document.createElement('div');
    overlay.className = 'pin-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'new-user-pin-title');
    overlay.innerHTML = [
      '<div class="pin-panel">',
      '<h2 id="new-user-pin-title">New User PIN</h2>',
      '<p>Your watch app PIN is:</p>',
      '<div class="pin-display">' + pin + '</div>',
      '<p class="pin-reminder">Please remember this PIN. It will be needed for Watch app admin login.</p>',
      '<button type="button" class="btn primary" id="new-user-pin-ok">OK</button>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    var okButton = document.getElementById('new-user-pin-ok');
    if(okButton){
      okButton.focus();
      okButton.addEventListener('click', function(){
        overlay.remove();
      });
    }
  }

  function setupInviteForm(){
    var form = document.getElementById('accept-invite-form');
    if(!form) return;

    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');
    if(!token){
      // The invite token is supplied only through the emailed activation link.
      form.hidden = true;
      showStatus('Invitation link is missing or invalid.', true);
      return;
    }

    form.addEventListener('submit', function(ev){
      ev.preventDefault();

      if(!form.checkValidity()){
        form.reportValidity();
        return;
      }

      var username = document.getElementById('invite-username').value.trim();
      var password = document.getElementById('invite-password').value;
      var confirm = document.getElementById('invite-password-confirm').value;

      // Confirm locally before activating so mismatched passwords never reach CloudCode.
      if(password !== confirm){
        showStatus('Passwords do not match.', true);
        return;
      }

      setSubmitState(form, true);

      runActivation({
        token: token,
        username: username,
        password: password
      }).then(function(result){
        console.log('Invitation accepted:', result);
        form.reset();
        form.hidden = true;
        showStatus('Your account has been activated. You can now log in.', false);
        if(result && result.pin) showNewUserPinOverlay(result.pin);
      }).catch(function(error){
        console.log('Invitation activation failed:', error);
        showStatus(error && error.message ? error.message : 'Unable to activate account.', true);
      }).finally(function(){
        setSubmitState(form, false);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', setupInviteForm);
})();
