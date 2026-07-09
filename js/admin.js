// admin.js
// Handles dashboard user invite creation.

(function(){
  function getStoredCurrentUser(){
    var stored = window.sessionStorage.getItem('befitmeCurrentUser') || window.sessionStorage.getItem('currentUser');
    if(!stored) return null;

    try{
      return JSON.parse(stored);
    }catch(e){
      return null;
    }
  }

  function hasActiveLogin(){
    var user = getStoredCurrentUser();
    return window.sessionStorage.getItem('befitmeLoggedIn') === 'true' && Boolean(user && user.sessionToken);
  }

  function showStatus(message, isError){
    var status = document.getElementById('invite-status');
    if(!status) return;

    status.textContent = message;
    status.hidden = false;
    status.classList.toggle('form-error', Boolean(isError));
    status.classList.toggle('success', !isError);
  }

  function showInstitutionStatus(message, isError){
    var status = document.getElementById('institution-status');
    if(!status) return;

    status.textContent = message;
    status.hidden = false;
    status.classList.toggle('form-error', Boolean(isError));
    status.classList.toggle('success', !isError);
  }

  function showSpecialtyStatus(message, isError){
    var status = document.getElementById('specialty-status');
    if(!status) return;

    status.textContent = message;
    status.hidden = false;
    status.classList.toggle('form-error', Boolean(isError));
    status.classList.toggle('success', !isError);
  }

  function setInstitutionListStatus(message){
    var status = document.getElementById('institution-list-status');
    if(status) status.textContent = message;
  }

  function setUserListStatus(message){
    var status = document.getElementById('user-list-status');
    if(status) status.textContent = message;
  }

  function setActiveUserListStatus(message){
    var status = document.getElementById('active-user-list-status');
    if(status) status.textContent = message;
  }

  function setInactiveUserListStatus(message){
    var status = document.getElementById('inactive-user-list-status');
    if(status) status.textContent = message;
  }

  function setSpecialtyListStatus(message){
    var status = document.getElementById('specialty-list-status');
    if(status) status.textContent = message;
  }

  function getProfileName(value){
    if(!value) return '';
    if(typeof value === 'string') return value.trim();
    if(typeof value.name === 'string') return value.name.trim();
    return '';
  }

  function escapeHtml(value){
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setSuperAdminSectionsVisible(visible){
    // Client visibility mirrors CloudCode enforcement; server permissions remain authoritative.
    document.querySelectorAll('[data-super-admin-section]').forEach(function(section){
      section.hidden = !visible;
    });
  }

  function populateRoleOptions(roles){
    var roleSelect = document.getElementById('invite-role');
    if(!roleSelect) return false;

    roleSelect.textContent = '';

    (roles || []).forEach(function(role){
      var option = document.createElement('option');
      option.value = role.name;
      option.textContent = role.displayName + (role.description ? ' - ' + role.description : '');
      roleSelect.appendChild(option);
    });

    return roleSelect.options.length > 0;
  }

  function populateNamedOptions(selectId, options){
    var select = document.getElementById(selectId);
    if(!select) return false;

    select.textContent = '';

    (options || []).forEach(function(item){
      var option = document.createElement('option');
      option.value = item.objectId;
      option.textContent = item.name;
      option.dataset.name = item.name;
      select.appendChild(option);
    });

    return select.options.length > 0;
  }

  function selectOptionByName(selectId, name){
    var select = document.getElementById(selectId);
    if(!select || !name) return;

    var target = String(name).trim().toLowerCase();
    Array.prototype.some.call(select.options, function(option, index){
      var optionName = option && option.dataset ? option.dataset.name : '';
      if(String(optionName || '').trim().toLowerCase() !== target) return false;
      select.selectedIndex = index;
      return true;
    });
  }

  function setSubmitState(form, saving){
    var submit = form.querySelector('[type="submit"]');
    if(!submit) return;

    submit.disabled = saving;
    submit.textContent = saving ? 'Sending...' : 'Send Invite';
  }

  function setInstitutionSubmitState(form, saving){
    var submit = form.querySelector('[type="submit"]');
    if(!submit) return;

    submit.disabled = saving;
    submit.textContent = saving ? 'Adding...' : 'Add Institution';
  }

  function setSpecialtySubmitState(form, saving){
    var submit = form.querySelector('[type="submit"]');
    if(!submit) return;

    submit.disabled = saving;
    submit.textContent = saving ? 'Adding...' : 'Add Specialty';
  }

  function activationBaseUrl(){
    // CloudCode appends the invite token to this page URL before sending the email.
    return new URL('accept-invite.html', window.location.href).href;
  }

  function loadInviteOptions(){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      return Promise.reject(new Error('Login is not ready. Please refresh and try again.'));
    }

    showStatus('Loading invite options...', false);

    return window.BeFitMeAuth.runCloudFunction('listInviteOptions').then(function(result){
      var hasRoles = populateRoleOptions(result && result.roles);
      var hasInstitutions = populateNamedOptions('invite-institution', result && result.institutions);
      var hasSpecialties = populateNamedOptions('invite-specialty', result && result.specialties);

      if(!hasRoles){
        throw new Error('Your account role cannot invite dashboard users.');
      }

      if(!hasInstitutions || !hasSpecialties){
        throw new Error('Institution and specialty options are required before inviting users.');
      }

      selectOptionByName('invite-institution', 'University of Chicago');
      selectOptionByName('invite-specialty', 'Thoracic Surgery');

      var status = document.getElementById('invite-status');
      if(status && status.textContent === 'Loading invite options...') status.hidden = true;
    });
  }

  function createInstitutionDeleteButton(institution){
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button delete-icon-button';
    button.setAttribute('aria-label', 'Delete institution ' + institution.name);
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>';

    button.addEventListener('click', function(){
      if(!window.confirm('Delete ' + institution.name + '?')){
        return;
      }

      // Delete is a soft delete in CloudCode: Institution.isActive is set to false.
      button.disabled = true;
      window.BeFitMeAuth.runCloudFunction('deactivateInstitution', {
        institutionId: institution.objectId
      }).then(function(){
        setInstitutionListStatus('Institution deleted.');
        loadInstitutions();
        loadInviteOptions().catch(function(error){
          console.log('Unable to refresh invite options:', error);
        });
      }).catch(function(error){
        console.log('Institution delete failed:', error);
        setInstitutionListStatus(error && error.message ? error.message : 'Unable to delete institution.');
        button.disabled = false;
      });
    });

    return button;
  }

  function createUserDeleteButton(user){
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button delete-icon-button';
    button.setAttribute('aria-label', 'Delete user ' + user.name);
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>';

    button.addEventListener('click', function(){
      if(!window.confirm('Delete ' + user.name + '?')){
        return;
      }

      // Delete is a soft delete in CloudCode: _User.isActive is set to false.
      button.disabled = true;
      window.BeFitMeAuth.runCloudFunction('deactivateUser', {
        userId: user.objectId
      }).then(function(){
        setUserListStatus('User deleted.');
        loadUsers();
      }).catch(function(error){
        console.log('User delete failed:', error);
        setUserListStatus(error && error.message ? error.message : 'Unable to delete user.');
        button.disabled = false;
      });
    });

    return button;
  }

  function createSpecialtyDeleteButton(specialty){
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button delete-icon-button';
    button.setAttribute('aria-label', 'Delete specialty ' + specialty.name);
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>';

    button.addEventListener('click', function(){
      if(!window.confirm('Delete ' + specialty.name + '?')){
        return;
      }

      // Delete is a soft delete in CloudCode: Specialty.isActive is set to false.
      button.disabled = true;
      window.BeFitMeAuth.runCloudFunction('deactivateSpecialty', {
        specialtyId: specialty.objectId
      }).then(function(){
        setSpecialtyListStatus('Specialty deleted.');
        loadSpecialties();
        loadInviteOptions().catch(function(error){
          console.log('Unable to refresh invite options:', error);
        });
      }).catch(function(error){
        console.log('Specialty delete failed:', error);
        setSpecialtyListStatus(error && error.message ? error.message : 'Unable to delete specialty.');
        button.disabled = false;
      });
    });

    return button;
  }

  function renderInstitutions(institutions){
    var body = document.getElementById('institutions-list-body');
    var wrap = document.getElementById('institutions-list-wrap');
    if(!body || !wrap) return;

    body.textContent = '';

    institutions.forEach(function(institution){
      var row = document.createElement('tr');
      var nameCell = document.createElement('td');
      var actionCell = document.createElement('td');

      nameCell.textContent = institution.name;
      actionCell.appendChild(createInstitutionDeleteButton(institution));

      row.appendChild(nameCell);
      row.appendChild(actionCell);
      body.appendChild(row);
    });

    wrap.hidden = !institutions.length;
  }

  function renderUsers(users, options){
    var body = document.getElementById(options.bodyId);
    var wrap = document.getElementById(options.wrapId);
    if(!body || !wrap) return;

    body.textContent = '';

    users.forEach(function(user){
      var row = document.createElement('tr');
      var nameCell = document.createElement('td');
      var roleCell = document.createElement('td');
      var institutionCell = document.createElement('td');
      var specialtyCell = document.createElement('td');
      var actionCell = document.createElement('td');

      nameCell.textContent = user.name;
      roleCell.textContent = user.roleDisplayName || user.role || '';
      institutionCell.textContent = user.institutionName || '';
      specialtyCell.textContent = user.specialtyName || '';

      row.appendChild(nameCell);
      if(options.showRole) row.appendChild(roleCell);
      row.appendChild(institutionCell);
      row.appendChild(specialtyCell);
      if(options.showDelete){
        actionCell.appendChild(createUserDeleteButton(user));
        row.appendChild(actionCell);
      }
      body.appendChild(row);
    });

    wrap.hidden = !users.length;
  }

  function renderSpecialties(specialties){
    var body = document.getElementById('specialties-list-body');
    var wrap = document.getElementById('specialties-list-wrap');
    if(!body || !wrap) return;

    body.textContent = '';

    specialties.forEach(function(specialty){
      var row = document.createElement('tr');
      var nameCell = document.createElement('td');
      var actionCell = document.createElement('td');

      nameCell.textContent = specialty.name;
      actionCell.appendChild(createSpecialtyDeleteButton(specialty));

      row.appendChild(nameCell);
      row.appendChild(actionCell);
      body.appendChild(row);
    });

    wrap.hidden = !specialties.length;
  }

  function loadInstitutions(){
    var user = getStoredCurrentUser();
    if(!hasActiveLogin() || !user || user.role !== 'super_admin') return Promise.resolve();
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      setInstitutionListStatus('Login is not ready. Please refresh and try again.');
      return Promise.resolve();
    }

    setInstitutionListStatus('Loading institutions...');

    return window.BeFitMeAuth.runCloudFunction('listInstitutions').then(function(result){
      var institutions = result && result.results ? result.results : [];
      renderInstitutions(institutions);
      setInstitutionListStatus(institutions.length ? '' : 'No active institutions found.');
    }).catch(function(error){
      console.log('Unable to load institutions:', error);
      setInstitutionListStatus(error && error.message ? error.message : 'Unable to load institutions.');
    });
  }

  function loadUsers(){
    var user = getStoredCurrentUser();
    if(!hasActiveLogin() || !user || user.role !== 'super_admin') return Promise.resolve();
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      setUserListStatus('Login is not ready. Please refresh and try again.');
      return Promise.resolve();
    }

    setUserListStatus('Loading users...');

    return window.BeFitMeAuth.runCloudFunction('listUsers').then(function(result){
      var users = result && result.results ? result.results : [];
      var activeUsers = users.filter(function(listUser){
        return listUser.isActive === true;
      });
      var inactiveUsers = users.filter(function(listUser){
        return listUser.isActive !== true;
      });

      renderUsers(activeUsers, {
        bodyId: 'active-users-list-body',
        wrapId: 'active-users-list-wrap',
        showDelete: true,
        showRole: true
      });
      renderUsers(inactiveUsers, {
        bodyId: 'inactive-users-list-body',
        wrapId: 'inactive-users-list-wrap',
        showDelete: false,
        showRole: false
      });

      setUserListStatus(users.length ? '' : 'No users found.');
      setActiveUserListStatus(activeUsers.length ? '' : 'No active users found.');
      setInactiveUserListStatus(inactiveUsers.length ? '' : 'No inactive users found.');
    }).catch(function(error){
      console.log('Unable to load users:', error);
      setUserListStatus(error && error.message ? error.message : 'Unable to load users.');
    });
  }

  function loadSpecialties(){
    var user = getStoredCurrentUser();
    if(!hasActiveLogin() || !user || user.role !== 'super_admin') return Promise.resolve();
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      setSpecialtyListStatus('Login is not ready. Please refresh and try again.');
      return Promise.resolve();
    }

    setSpecialtyListStatus('Loading specialties...');

    return window.BeFitMeAuth.runCloudFunction('listSpecialties').then(function(result){
      var specialties = result && result.results ? result.results : [];
      renderSpecialties(specialties);
      setSpecialtyListStatus(specialties.length ? '' : 'No active specialties found.');
    }).catch(function(error){
      console.log('Unable to load specialties:', error);
      setSpecialtyListStatus(error && error.message ? error.message : 'Unable to load specialties.');
    });
  }

  function setupCollapsibleSections(){
    function closePanel(button, panel){
      window.clearTimeout(panel.hideTimer);
      window.clearTimeout(panel.heightTimer);

      panel.style.height = panel.offsetHeight + 'px';
      panel.offsetHeight;
      button.setAttribute('aria-expanded', 'false');
      panel.classList.remove('is-visible');

      window.requestAnimationFrame(function(){
        panel.style.height = '0px';
        panel.hideTimer = window.setTimeout(function(){
          if(!panel.classList.contains('is-visible')){
            panel.hidden = true;
            panel.style.height = '';
          }
        }, 300);
      });
    }

    function openPanel(button, panel){
      panel.hidden = false;
      panel.classList.remove('is-visible');
      panel.style.height = '0px';
      button.setAttribute('aria-expanded', 'true');

      window.requestAnimationFrame(function(){
        panel.classList.add('is-visible');
        panel.style.height = panel.scrollHeight + 'px';
        panel.heightTimer = window.setTimeout(function(){
          if(panel.classList.contains('is-visible')){
            panel.style.height = 'auto';
          }
        }, 300);
      });
    }

    document.querySelectorAll('[data-collapse-toggle]').forEach(function(button){
      var panel = document.getElementById(button.getAttribute('aria-controls'));
      if(!panel) return;

      button.addEventListener('click', function(){
        var expanded = button.getAttribute('aria-expanded') === 'true';
        window.clearTimeout(panel.hideTimer);
        window.clearTimeout(panel.heightTimer);

        // Animate from measured pixel heights, then release to auto for responsive content.
        if(expanded){
          closePanel(button, panel);
          return;
        }

        document.querySelectorAll('[data-collapse-toggle][aria-expanded="true"]').forEach(function(otherButton){
          var otherPanel = document.getElementById(otherButton.getAttribute('aria-controls'));
          if(otherButton !== button && otherPanel && !otherPanel.hidden){
            closePanel(otherButton, otherPanel);
          }
        });

        openPanel(button, panel);
      });
    });
  }

  function closeMyInfoOverlay(){
    var overlay = document.getElementById('my-info-overlay');
    if(overlay) overlay.remove();
  }

  function showGeneratedPin(pin){
    var result = document.getElementById('my-info-pin-result');
    if(!result) return;

    result.innerHTML = [
      '<p>Your new PIN is:</p>',
      '<div class="pin-display">' + escapeHtml(pin) + '</div>',
      '<p class="pin-reminder">Please remember this PIN. It will be needed for Watch app admin login.</p>'
    ].join('');
    result.hidden = false;
  }

  function setPinSubmitState(form, saving){
    var submit = form.querySelector('[type="submit"]');
    if(!submit) return;

    submit.disabled = saving;
    submit.textContent = saving ? 'Generating...' : 'Generate New PIN';
  }

  function showMyInfoStatus(message, isError){
    var status = document.getElementById('my-info-status');
    if(!status) return;

    status.textContent = message;
    status.hidden = false;
    status.classList.toggle('form-error', Boolean(isError));
    status.classList.toggle('success', !isError);
  }

  function createMyInfoOverlay(){
    var user = getStoredCurrentUser();
    var institutionName = getProfileName(user && user.institution) || 'Not set';
    var specialtyName = getProfileName(user && user.specialty) || 'Not set';
    var username = user && user.username ? user.username : '';
    var overlay = document.createElement('div');

    overlay.id = 'my-info-overlay';
    overlay.className = 'pin-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'my-info-title');
    overlay.innerHTML = [
      '<div class="pin-panel my-info-panel">',
      '<h2 id="my-info-title">My Info</h2>',
      '<dl class="my-info-list">',
      '<div><dt>Institution</dt><dd>' + escapeHtml(institutionName) + '</dd></div>',
      '<div><dt>Specialty</dt><dd>' + escapeHtml(specialtyName) + '</dd></div>',
      '</dl>',
      '<form id="generate-pin-form" class="survey-form pin-credential-form">',
      '<div class="form-row">',
      '<label for="pin-username">Username or Email</label>',
      '<input type="text" id="pin-username" name="username" autocomplete="username" value="' + escapeHtml(username) + '" required />',
      '</div>',
      '<div class="form-row">',
      '<label for="pin-password">Password</label>',
      '<input type="password" id="pin-password" name="password" autocomplete="current-password" required />',
      '</div>',
      '<div class="form-actions pin-form-actions">',
      '<button type="submit" class="btn primary">Generate New PIN</button>',
      '</div>',
      '</form>',
      '<div id="my-info-pin-result" class="pin-result" hidden></div>',
      '<div id="my-info-status" role="status" aria-live="polite" hidden></div>',
      '<button type="button" class="btn" id="close-my-info">Close</button>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
  }

  function setupMyInfoOverlay(){
    var button = document.getElementById('my-info-button');
    if(!button) return;

    button.addEventListener('click', function(){
      if(!hasActiveLogin()){
        window.alert('Please log in to view your information.');
        return;
      }

      createMyInfoOverlay();

      var overlay = document.getElementById('my-info-overlay');
      var form = document.getElementById('generate-pin-form');
      var close = document.getElementById('close-my-info');

      if(close) close.addEventListener('click', closeMyInfoOverlay);
      if(overlay){
        overlay.addEventListener('click', function(ev){
          if(ev.target === overlay) closeMyInfoOverlay();
        });
      }

      if(form){
        form.addEventListener('submit', function(ev){
          ev.preventDefault();

          if(!form.checkValidity()){
            form.reportValidity();
            return;
          }

          var username = document.getElementById('pin-username').value.trim();
          var password = document.getElementById('pin-password').value;
          setPinSubmitState(form, true);

          window.BeFitMeAuth.runCloudFunction('generateDashboardUserPIN', {
            username: username,
            password: password
          }).then(function(result){
            console.log('Dashboard user PIN generated:', result);
            form.reset();
            form.hidden = true;
            showGeneratedPin(result && result.pin);
            var closeButton = document.getElementById('close-my-info');
            if(closeButton) closeButton.focus();
          }).catch(function(error){
            console.log('Dashboard user PIN generation failed:', error);
            showMyInfoStatus(error && error.message ? error.message : 'Unable to generate PIN.', true);
          }).finally(function(){
            setPinSubmitState(form, false);
          });
        });
      }
    });
  }

  function setupInviteForm(){
    var form = document.getElementById('dashboard-user-invite-form');
    var card = form ? form.closest('.admin-tool-card') : null;
    var user = getStoredCurrentUser();
    if(!form) return;

    if(!hasActiveLogin()){
      if(card) card.hidden = true;
      showStatus('Login is required to invite dashboard users.', true);
      return;
    }

    loadInviteOptions().catch(function(error){
      form.hidden = true;
      if(card) card.hidden = true;
      showStatus(error && error.message ? error.message : 'Unable to load invite options.', true);
    });

    form.addEventListener('submit', function(ev){
      ev.preventDefault();

      if(!form.checkValidity()){
        form.reportValidity();
        return;
      }

      var email = document.getElementById('invite-email').value.trim();
      var name = document.getElementById('invite-name').value.trim();
      var role = document.getElementById('invite-role').value;
      var institutionId = document.getElementById('invite-institution').value;
      var specialtyId = document.getElementById('invite-specialty').value;
      setSubmitState(form, true);

      window.BeFitMeAuth.runCloudFunction('createDashboardUserInvite', {
        email: email,
        name: name,
        role: role,
        institutionId: institutionId,
        specialtyId: specialtyId,
        activationBaseUrl: activationBaseUrl()
      }).then(function(result){
        console.log('Dashboard user invite created:', result);
        showStatus('Dashboard user created as inactive and invitation email sent.', false);
        loadUsers();
      }).catch(function(error){
        console.log('Dashboard user invite failed:', error);
        showStatus(error && error.message ? error.message : 'Unable to create dashboard user invite.', true);
      }).finally(function(){
        setSubmitState(form, false);
      });
    });
  }

  function setupInstitutionForm(){
    var form = document.getElementById('add-institution-form');
    var user = getStoredCurrentUser();
    if(!form) return;

    if(!hasActiveLogin() || !user || user.role !== 'super_admin'){
      setSuperAdminSectionsVisible(false);
      return;
    }

    setSuperAdminSectionsVisible(true);

    form.addEventListener('submit', function(ev){
      ev.preventDefault();

      if(!form.checkValidity()){
        form.reportValidity();
        return;
      }

      var name = document.getElementById('institution-name').value.trim();
      setInstitutionSubmitState(form, true);

      window.BeFitMeAuth.runCloudFunction('createInstitution', {
        name: name
      }).then(function(result){
        console.log('Institution created:', result);
        form.reset();
        showInstitutionStatus('Institution added.', false);
        loadInstitutions();
        loadInviteOptions().catch(function(error){
          console.log('Unable to refresh invite options:', error);
        });
      }).catch(function(error){
        console.log('Institution add failed:', error);
        showInstitutionStatus(error && error.message ? error.message : 'Unable to add institution.', true);
      }).finally(function(){
        setInstitutionSubmitState(form, false);
      });
    });
  }

  function setupSpecialtyForm(){
    var form = document.getElementById('add-specialty-form');
    var user = getStoredCurrentUser();
    if(!form) return;

    if(!hasActiveLogin() || !user || user.role !== 'super_admin'){
      setSuperAdminSectionsVisible(false);
      return;
    }

    setSuperAdminSectionsVisible(true);

    form.addEventListener('submit', function(ev){
      ev.preventDefault();

      if(!form.checkValidity()){
        form.reportValidity();
        return;
      }

      var name = document.getElementById('specialty-name').value.trim();
      setSpecialtySubmitState(form, true);

      window.BeFitMeAuth.runCloudFunction('createSpecialty', {
        name: name
      }).then(function(result){
        console.log('Specialty created:', result);
        form.reset();
        showSpecialtyStatus('Specialty added.', false);
        loadSpecialties();
        loadInviteOptions().catch(function(error){
          console.log('Unable to refresh invite options:', error);
        });
      }).catch(function(error){
        console.log('Specialty add failed:', error);
        showSpecialtyStatus(error && error.message ? error.message : 'Unable to add specialty.', true);
      }).finally(function(){
        setSpecialtySubmitState(form, false);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setupCollapsibleSections();
    setupMyInfoOverlay();
    setupInviteForm();
    setupInstitutionForm();
    setupSpecialtyForm();
    loadInstitutions();
    loadUsers();
    loadSpecialties();
  });
})();
