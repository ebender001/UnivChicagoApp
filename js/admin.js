// admin.js
// Handles dashboard user invite creation.

(function(){
  var roles = [
    {
      value: 'super_admin',
      label: 'Super Admin',
      description: 'Full system access across all institutions.'
    },
    {
      value: 'study_admin',
      label: 'Study Admin',
      description: 'Full access within one institution/study.'
    },
    {
      value: 'study_coordinator',
      label: 'Study Coordinator',
      description: 'Operational access: patients, surveys, watch registration, uploads.'
    },
    {
      value: 'data_entry',
      label: 'Data Entry',
      description: 'Can enter/edit patient and survey data, but cannot manage users or exports.'
    },
    {
      value: 'viewer',
      label: 'Viewer',
      description: 'Read-only access within their institution/study.'
    }
  ];

  function getStoredCurrentUser(){
    var stored = window.localStorage.getItem('befitmeCurrentUser') || window.localStorage.getItem('currentUser');
    if(!stored) return null;

    try{
      return JSON.parse(stored);
    }catch(e){
      return null;
    }
  }

  function hasActiveLogin(){
    var user = getStoredCurrentUser();
    return window.localStorage.getItem('befitmeLoggedIn') === 'true' && Boolean(user && user.sessionToken);
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

  function setSpecialtyListStatus(message){
    var status = document.getElementById('specialty-list-status');
    if(status) status.textContent = message;
  }

  function hasEmailInvitationAccess(userRole){
    return ['super_admin', 'study_admin', 'study_coordinator'].indexOf(userRole) !== -1;
  }

  function setSuperAdminSectionsVisible(visible){
    document.querySelectorAll('[data-super-admin-section]').forEach(function(section){
      section.hidden = !visible;
    });
  }

  function allowedRolesFor(userRole){
    var currentRoleIndex = roles.findIndex(function(role){
      return role.value === userRole;
    });
    var inviteAccessLimit = roles.findIndex(function(role){
      return role.value === 'study_coordinator';
    });

    if(currentRoleIndex < 0 || currentRoleIndex > inviteAccessLimit) return [];
    return roles.slice(currentRoleIndex);
  }

  function populateRoleOptions(user){
    var roleSelect = document.getElementById('invite-role');
    if(!roleSelect) return false;

    roleSelect.textContent = '';

    var allowedRoles = allowedRolesFor(user && user.role);
    allowedRoles.forEach(function(role){
      var option = document.createElement('option');
      option.value = role.value;
      option.textContent = role.label + ' - ' + role.description;
      roleSelect.appendChild(option);
    });

    return allowedRoles.length > 0;
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
    return new URL('accept-invite.html', window.location.href).href;
  }

  function loadInviteOptions(){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      return Promise.reject(new Error('Login is not ready. Please refresh and try again.'));
    }

    showStatus('Loading invite options...', false);

    return window.BeFitMeAuth.runCloudFunction('listInviteOptions').then(function(result){
      var hasInstitutions = populateNamedOptions('invite-institution', result && result.institutions);
      var hasSpecialties = populateNamedOptions('invite-specialty', result && result.specialties);

      if(!hasInstitutions || !hasSpecialties){
        throw new Error('Institution and specialty options are required before inviting users.');
      }

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

  function renderUsers(users){
    var body = document.getElementById('users-list-body');
    var wrap = document.getElementById('users-list-wrap');
    if(!body || !wrap) return;

    body.textContent = '';

    users.forEach(function(user){
      var row = document.createElement('tr');
      var nameCell = document.createElement('td');
      var institutionCell = document.createElement('td');
      var specialtyCell = document.createElement('td');
      var actionCell = document.createElement('td');

      nameCell.textContent = user.name;
      institutionCell.textContent = user.institutionName || '';
      specialtyCell.textContent = user.specialtyName || '';
      actionCell.appendChild(createUserDeleteButton(user));

      row.appendChild(nameCell);
      row.appendChild(institutionCell);
      row.appendChild(specialtyCell);
      row.appendChild(actionCell);
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
      renderUsers(users);
      setUserListStatus(users.length ? '' : 'No active users found.');
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
    document.querySelectorAll('[data-collapse-toggle]').forEach(function(button){
      var panel = document.getElementById(button.getAttribute('aria-controls'));
      if(!panel) return;

      button.addEventListener('click', function(){
        var expanded = button.getAttribute('aria-expanded') === 'true';
        window.clearTimeout(panel.hideTimer);
        window.clearTimeout(panel.heightTimer);

        if(expanded){
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
          return;
        }

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
      });
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

    if(!hasEmailInvitationAccess(user && user.role)){
      if(card) card.hidden = true;
      return;
    }

    if(!populateRoleOptions(user)){
      if(card) card.hidden = true;
      showStatus(user && user.role === 'viewer'
        ? 'Viewer accounts cannot invite dashboard users.'
        : 'Your account role could not be confirmed. Please log out and log back in before inviting dashboard users.', true);
      return;
    }

    loadInviteOptions().catch(function(error){
      form.hidden = true;
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
    setupInviteForm();
    setupInstitutionForm();
    setupSpecialtyForm();
    loadInstitutions();
    loadUsers();
    loadSpecialties();
  });
})();
