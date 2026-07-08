// enrollees.js
// Loads and renders the enrollee table.

(function(){
  var summaryOverlayId = 'enrollee-summary-overlay';
  var lastTrigger = null;
  var activeSummaryEnrolleeId = null;

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

  function closeSummaryOverlay(){
    var overlay = document.getElementById(summaryOverlayId);
    if(!overlay) return;

    overlay.hidden = true;
    activeSummaryEnrolleeId = null;
    if(lastTrigger && typeof lastTrigger.focus === 'function'){
      lastTrigger.focus();
    }
  }

  function ensureSummaryOverlay(){
    var existing = document.getElementById(summaryOverlayId);
    if(existing) return existing;

    var overlay = document.createElement('div');
    overlay.id = summaryOverlayId;
    overlay.className = 'pin-overlay enrollee-summary-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'enrollee-summary-title');
    overlay.hidden = true;
    overlay.innerHTML = [
      '<div class="pin-panel enrollee-summary-panel">',
      '<div class="enrollee-summary-header">',
      '<h2 id="enrollee-summary-title">Enrollee Summary</h2>',
      '<button type="button" class="icon-button enrollee-summary-close" id="close-enrollee-summary" aria-label="Dismiss enrollee summary">',
      '<span aria-hidden="true">&times;</span>',
      '</button>',
      '</div>',
      '<div class="enrollee-summary-content">',
      '<div id="enrollee-summary-text">',
      '<p class="muted">Loading enrollee details...</p>',
      '</div>',
      '<section class="detail-section" id="enrollee-summary-frailty-section">',
      '<h3>Frailty Assessment Score</h3>',
      '<div id="enrollee-summary-frailty"></div>',
      '</section>',
      '<section class="detail-section" id="enrollee-summary-survey-section">',
      '<h3>Survey Form</h3>',
      '<div id="enrollee-summary-survey"></div>',
      '</section>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay) closeSummaryOverlay();
    });

    overlay.addEventListener('keydown', function(ev){
      if(ev.key === 'Escape') closeSummaryOverlay();
    });

    var closeButton = document.getElementById('close-enrollee-summary');
    if(closeButton){
      closeButton.addEventListener('click', closeSummaryOverlay);
    }

    return overlay;
  }

  function renderLoadingSummaryTable(){
    var content = document.getElementById('enrollee-summary-text');
    var frailty = document.getElementById('enrollee-summary-frailty');
    var survey = document.getElementById('enrollee-summary-survey');

    if(content) content.innerHTML = '<p class="muted">Loading enrollee details...</p>';
    if(frailty) frailty.innerHTML = '<p class="muted">Loading frailty assessment...</p>';
    if(survey) survey.innerHTML = '<p class="muted">Loading survey form...</p>';
  }

  function openSummaryOverlay(enrollee, trigger){
    var overlay = ensureSummaryOverlay();
    var detailRenderer = window.BeFitMeEnrolleeDetail;

    lastTrigger = trigger || null;
    activeSummaryEnrolleeId = enrollee.objectId;

    renderLoadingSummaryTable();

    overlay.hidden = false;

    var closeButton = document.getElementById('close-enrollee-summary');
    if(closeButton) closeButton.focus();

    if(window.BeFitMeAuth && window.BeFitMeAuth.runCloudFunction && detailRenderer){
      window.BeFitMeAuth.runCloudFunction('getEnrolleeDetails', {
        enrolleeId: enrollee.objectId
      }).then(function(result){
        var summaryText = document.getElementById('enrollee-summary-text');
        var frailtyContainer = document.getElementById('enrollee-summary-frailty');
        var surveyContainer = document.getElementById('enrollee-summary-survey');
        if(activeSummaryEnrolleeId !== enrollee.objectId) return;
        detailRenderer.renderSummaryText(summaryText, result && result.enrollee, result && result.survey);
        detailRenderer.renderFrailty(frailtyContainer, result && result.enrollee, result && result.survey);
        detailRenderer.renderSurvey(surveyContainer, result && result.survey);
      }).catch(function(error){
        console.log('Unable to load enrollee summary details:', error);
        var content = document.getElementById('enrollee-summary-text');
        var frailty = document.getElementById('enrollee-summary-frailty');
        var survey = document.getElementById('enrollee-summary-survey');
        if(activeSummaryEnrolleeId !== enrollee.objectId) return;
        if(content){
          content.innerHTML = '<p class="muted">Unable to load enrollee details.</p>';
        }
        if(frailty){
          frailty.innerHTML = '<p class="muted">' + (error && error.message ? error.message : 'Please try again.') + '</p>';
        }
        if(survey){
          survey.textContent = '';
        }
      });
    }
  }

  function createActionCell(kind, enrollee){
    var cell = document.createElement('td');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = kind === 'survey' ? 'btn table-action-button' : 'icon-button';

    if(kind === 'survey'){
      // Linked enrollees show results; unlinked enrollees start a survey with their id in the URL.
      if(enrollee.fields && enrollee.fields.survey && enrollee.fields.survey.objectId){
        button.textContent = 'Survey Results';
        button.setAttribute('aria-label', 'View survey results for enrollee ' + (enrollee.enrolleeNumber || enrollee.objectId));
        button.addEventListener('click', function(event){
          event.stopPropagation();
          window.location.href = 'enrollee-detail.html?enrolleeId=' + encodeURIComponent(enrollee.objectId);
        });
      }else{
        button.textContent = 'Start Survey';
        button.classList.add('start-survey-button');
        button.setAttribute('aria-label', 'Start survey for enrollee ' + (enrollee.enrolleeNumber || enrollee.objectId));
        button.addEventListener('click', function(event){
          event.stopPropagation();
          window.location.href = 'survey.html?enrolleeId=' + encodeURIComponent(enrollee.objectId);
        });
      }
    }else{
      button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"></path><path d="m14 7 3 3"></path></svg>';
      button.setAttribute('aria-label', 'Edit enrollee ' + (enrollee.enrolleeNumber || enrollee.objectId));
      button.addEventListener('click', function(event){
        event.stopPropagation();
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
      row.className = 'clickable-enrollee-row';
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'Open enrollee summary for enrollee ' + (enrollee.enrolleeNumber || enrollee.objectId));
      row.addEventListener('click', function(){
        openSummaryOverlay(enrollee, row);
      });
      row.addEventListener('keydown', function(event){
        if(event.key === 'Enter' || event.key === ' '){
          event.preventDefault();
          openSummaryOverlay(enrollee, row);
        }
      });
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
