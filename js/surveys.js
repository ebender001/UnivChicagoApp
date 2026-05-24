// surveys.js
// Loads surveys that still need enrollee registration.

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

  function setStatus(message){
    var status = document.getElementById('surveys-status');
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

  function renderRows(surveys){
    var body = document.getElementById('surveys-table-body');
    var wrap = document.getElementById('surveys-table-wrap');
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

  function loadSurveys(){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      setStatus('Login is not ready. Please refresh and try again.');
      return;
    }

    window.BeFitMeAuth.runCloudFunction('listUnenrolledSurveys', {
      limit: 100
    }).then(function(response){
      var surveys = response && response.results ? response.results : [];

      if(!surveys.length){
        setStatus('No surveys need registration.');
        return;
      }

      setStatus('');
      renderRows(surveys);
    }).catch(function(error){
      console.log('Unable to load surveys:', error);
      setStatus(error && error.message ? error.message : 'Unable to load surveys.');
    });
  }

  document.addEventListener('DOMContentLoaded', loadSurveys);
})();
