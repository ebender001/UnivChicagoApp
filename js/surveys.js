// surveys.js
// Loads survey lists.

(function(){
  var highlightSurveyId = '';

  function isViewerRole(){
    var user = window.BeFitMeAuth && typeof window.BeFitMeAuth.getStoredCurrentUser === 'function'
      ? window.BeFitMeAuth.getStoredCurrentUser()
      : null;
    var role = user && typeof user.role === 'string' ? user.role.trim().toLowerCase() : '';
    return role === 'viewer';
  }

  function formatDateTime(value){
    if(!value) return '';

    var date = new Date(value);
    if(Number.isNaN(date.getTime())) return '';

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function setStatus(elementId, message){
    var status = document.getElementById(elementId);
    if(status) status.textContent = message;
  }

  function createCell(text){
    var cell = document.createElement('td');
    cell.textContent = text || '';
    return cell;
  }

  function getSurveyEnrolleeNumber(survey){
    if(!survey || !survey.enrollee) return 'Not linked';

    if(survey.enrollee.enrolleeNumber) return survey.enrollee.enrolleeNumber;
    if(survey.enrollee.fields && survey.enrollee.fields.enrolleeNumber) return survey.enrollee.fields.enrolleeNumber;

    return 'Not linked';
  }

  function createActionCell(survey){
    var cell = document.createElement('td');
    var button = document.createElement('button');
    var viewerRole = isViewerRole();
    button.type = 'button';
    button.className = 'btn table-action-button continue-enrollment-button';
    button.textContent = 'Continue Enrollment';
    button.setAttribute('aria-label', 'Continue enrollment for survey ' + survey.objectId);
    if(viewerRole){
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.title = 'Your role does not allow continuing enrollment.';
    }else{
      button.addEventListener('click', function(){
        // Continue Enrollment carries the survey id so registration can create both pointers.
        window.location.href = 'enrollee-registration.html?surveyId=' + encodeURIComponent(survey.objectId);
      });
    }
    cell.appendChild(button);
    return cell;
  }

  function emphasizeReturnedSurvey(row, surveyId){
    if(!row || !surveyId) return;

    row.classList.add('highlighted-survey-row');
    row.setAttribute('tabindex', '-1');

    var button = row.querySelector('.continue-enrollment-button');
    if(button){
      button.classList.add('highlighted-continue-enrollment-button');
      button.setAttribute('aria-describedby', 'unenrolled-surveys-status');
    }

    if(isViewerRole()){
      setStatus('unenrolled-surveys-status', 'Survey ' + surveyId + ' needs enrollment registration, but your role cannot continue enrollment.');
    }else{
      setStatus('unenrolled-surveys-status', 'Survey ' + surveyId + ' is ready. Tap Continue Enrollment to finish registration.');
    }

    window.requestAnimationFrame(function(){
      row.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    });
  }

  function renderUnenrolledRows(surveys){
    var body = document.getElementById('unenrolled-surveys-table-body');
    var wrap = document.getElementById('unenrolled-surveys-table-wrap');
    if(!body || !wrap) return;

    body.textContent = '';

    surveys.forEach(function(survey){
      var row = document.createElement('tr');
      row.appendChild(createCell(formatDateTime(survey.createdAt)));
      row.appendChild(createCell(survey.objectId));
      row.appendChild(createActionCell(survey));
      body.appendChild(row);

      if(highlightSurveyId && survey && survey.objectId === highlightSurveyId){
        emphasizeReturnedSurvey(row, survey.objectId);
      }
    });

    wrap.hidden = false;
  }

  function renderAllRows(surveys){
    var body = document.getElementById('all-surveys-table-body');
    var wrap = document.getElementById('all-surveys-table-wrap');
    if(!body || !wrap) return;

    body.textContent = '';

    surveys.forEach(function(survey){
      var row = document.createElement('tr');
      row.appendChild(createCell(formatDateTime(survey.createdAt)));
      row.appendChild(createCell(survey.objectId));
      row.appendChild(createCell(getSurveyEnrolleeNumber(survey)));
      body.appendChild(row);
    });

    wrap.hidden = false;
  }

  function loadUnenrolledSurveys(){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      setStatus('unenrolled-surveys-status', 'Login is not ready. Please refresh and try again.');
      return;
    }

    window.BeFitMeAuth.runCloudFunction('listUnenrolledSurveys', {
      limit: 100
    }).then(function(response){
      var surveys = response && response.results ? response.results : [];

      if(!surveys.length){
        setStatus('unenrolled-surveys-status', 'No surveys need registration.');
        return;
      }

      setStatus('unenrolled-surveys-status', '');
      renderUnenrolledRows(surveys);
    }).catch(function(error){
      console.log('Unable to load surveys needing registration:', error);
      setStatus('unenrolled-surveys-status', error && error.message ? error.message : 'Unable to load surveys.');
    });
  }

  function loadAllSurveys(){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      setStatus('all-surveys-status', 'Login is not ready. Please refresh and try again.');
      return;
    }

    window.BeFitMeAuth.runCloudFunction('listSurveys', {
      limit: 100
    }).then(function(response){
      var surveys = response && response.results ? response.results : [];

      if(!surveys.length){
        setStatus('all-surveys-status', 'No surveys found.');
        return;
      }

      setStatus('all-surveys-status', '');
      renderAllRows(surveys);
    }).catch(function(error){
      console.log('Unable to load all surveys:', error);
      setStatus('all-surveys-status', error && error.message ? error.message : 'Unable to load surveys.');
    });
  }

  function setupCollapsibleSections(){
    document.querySelectorAll('[data-collapse-toggle]').forEach(function(button){
      var panel = document.getElementById(button.getAttribute('aria-controls'));
      if(!panel) return;

      function setExpanded(expanded){
        window.clearTimeout(panel.hideTimer);
        window.clearTimeout(panel.heightTimer);

        // Animate from measured pixel heights, then release to auto for responsive content.
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
      }

      button.addEventListener('click', function(){
        setExpanded(button.getAttribute('aria-expanded') === 'true');
      });

      button._setExpandedState = setExpanded;
    });
  }

  function expandRequestedSections(){
    var params = new URLSearchParams(window.location.search);
    highlightSurveyId = params.get('highlightSurveyId') || '';
    if(params.get('expandUnenrolled') !== '1') return;

    var button = document.querySelector('[aria-controls="unenrolled-surveys-panel"][data-collapse-toggle]');
    if(button && typeof button._setExpandedState === 'function' && button.getAttribute('aria-expanded') !== 'true'){
      button._setExpandedState(false);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    setupCollapsibleSections();
    expandRequestedSections();
    loadUnenrolledSurveys();
    loadAllSurveys();
  });
})();
