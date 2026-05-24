// surveys.js
// Loads survey lists.

(function(){
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

  function createActionCell(survey){
    var cell = document.createElement('td');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn table-action-button continue-enrollment-button';
    button.textContent = 'Continue Enrollment';
    button.setAttribute('aria-label', 'Continue enrollment for survey ' + survey.objectId);
    button.addEventListener('click', function(){
      window.location.href = 'enrollee-registration.html?surveyId=' + encodeURIComponent(survey.objectId);
    });
    cell.appendChild(button);
    return cell;
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
      row.appendChild(createCell(survey.enrollee && survey.enrollee.objectId ? survey.enrollee.objectId : 'Not linked'));
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

  document.addEventListener('DOMContentLoaded', function(){
    setupCollapsibleSections();
    loadUnenrolledSurveys();
    loadAllSurveys();
  });
})();
