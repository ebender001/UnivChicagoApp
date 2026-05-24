// enrollees.js
// Loads and renders the enrollee table.

(function(){
  function formatDate(value){
    if(!value) return '';

    var date = new Date(value);
    if(Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString();
  }

  function setStatus(message){
    var status = document.getElementById('enrollees-status');
    if(status) status.textContent = message;
  }

  function createCell(text){
    var cell = document.createElement('td');
    cell.textContent = text || '';
    return cell;
  }

  function createActionCell(kind, enrollee){
    var cell = document.createElement('td');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = kind === 'survey' ? 'btn table-action-button' : 'icon-button';

    if(kind === 'survey'){
      button.textContent = 'Survey Results';
      button.setAttribute('aria-label', 'View survey results for enrollee ' + (enrollee.enrolleeNumber || enrollee.objectId));
      button.addEventListener('click', function(){
        window.location.href = 'enrollee-detail.html?enrolleeId=' + encodeURIComponent(enrollee.objectId);
      });
    }else{
      button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"></path><path d="m14 7 3 3"></path></svg>';
      button.setAttribute('aria-label', 'Edit enrollee ' + (enrollee.enrolleeNumber || enrollee.objectId));
      button.addEventListener('click', function(){
        window.location.href = 'enrollee-registration.html?enrolleeId=' + encodeURIComponent(enrollee.objectId);
      });
    }

    cell.appendChild(button);
    return cell;
  }

  function renderRows(enrollees){
    var body = document.getElementById('enrollees-table-body');
    var wrap = document.getElementById('enrollees-table-wrap');
    if(!body || !wrap) return;

    body.textContent = '';

    enrollees.forEach(function(enrollee){
      var row = document.createElement('tr');
      row.appendChild(createCell(enrollee.enrolleeNumber || enrollee.objectId));
      row.appendChild(createCell(formatDate(enrollee.createdAt)));
      row.appendChild(createCell(formatDate(enrollee.startDate)));
      row.appendChild(createCell(formatDate(enrollee.stopDate)));
      row.appendChild(createActionCell('survey', enrollee));
      row.appendChild(createActionCell('edit', enrollee));
      body.appendChild(row);
    });

    wrap.hidden = false;
  }

  function loadEnrollees(){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      setStatus('Login is not ready. Please refresh and try again.');
      return;
    }

    window.BeFitMeAuth.runCloudFunction('listEnrollees', {
      limit: 100
    }).then(function(response){
      var enrollees = response && response.results ? response.results : [];

      if(!enrollees.length){
        setStatus('No enrollees found.');
        return;
      }

      setStatus('');
      renderRows(enrollees);
    }).catch(function(error){
      console.log('Unable to load enrollees:', error);
      setStatus(error && error.message ? error.message : 'Unable to load enrollees.');
    });
  }

  document.addEventListener('DOMContentLoaded', loadEnrollees);
})();
