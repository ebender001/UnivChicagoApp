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

  function formatDateTime(value){
    if(!value) return 'Not Available';

    var date = new Date(value);
    if(Number.isNaN(date.getTime())) return 'Not Available';

    return date.toLocaleString();
  }

  function isPresent(value){
    return value !== null && value !== undefined && value !== '';
  }

  function toNumber(value){
    if(!isPresent(value)) return null;
    value = Number(value);
    return Number.isFinite(value) ? value : null;
  }

  function maxNumber(values){
    if(!Array.isArray(values)) return null;

    var numbers = values.map(toNumber).filter(function(value){
      return Number.isFinite(value);
    });

    if(!numbers.length) return null;
    return Math.max.apply(null, numbers);
  }

  function booleanToAnswer(value){
    if(value === true) return 'Yes';
    if(value === false) return 'No';
    return 'Not Available';
  }

  function effortAnswer(value){
    var answers = [
      'None of the time',
      'Some or a little of the time (1-2 days)',
      'A moderate amount of the time (3-4 days)',
      'Most of the time (>4 days)'
    ];

    if(typeof value === 'number' && answers[value]) return answers[value];
    if(typeof value === 'string' && answers.indexOf(value) !== -1) return value;
    return 'Not Available';
  }

  function bmiFromSurvey(fields){
    var currentWeight = toNumber(fields && fields.weightCurrent);
    var heightInches = toNumber(fields && fields.heightInches);
    if(!Number.isFinite(currentWeight) || !Number.isFinite(heightInches) || heightInches <= 0) return null;
    return (703 * currentWeight) / Math.pow(heightInches, 2);
  }

  function calculateActivitySum(fields){
    var currentWeight = toNumber(fields && fields.weightCurrent);
    if(!Number.isFinite(currentWeight)) return 0;

    var weightKg = currentWeight / 2.20462;
    var activityWeights = [
      { booleanField: 'walked', timesField: 'walkedTimes', minutesField: 'walkedMinutes', monthsField: 'walkedMonths', weight: 3.5 },
      { booleanField: 'chores', timesField: 'choresTimes', minutesField: 'choresMinutes', monthsField: 'choresMonths', weight: 4.0 },
      { booleanField: 'gardening', timesField: 'gardeningTimes', minutesField: 'gardeningMinutes', monthsField: 'gardeningMonths', weight: 5.0 },
      { booleanField: 'exercise', timesField: 'exerciseTimes', minutesField: 'exerciseMinutes', monthsField: 'exerciseMonths', weight: 4.5 },
      { booleanField: 'mowedLawn', timesField: 'mowedLawnTimes', minutesField: 'mowedLawnMinutes', monthsField: 'mowedLawnMonths', weight: 4.5 },
      { booleanField: 'golf', timesField: 'golfTimes', minutesField: 'golfMinutes', monthsField: 'golfMonths', weight: 4.5 }
    ];

    return activityWeights.reduce(function(total, activity){
      if(fields[activity.booleanField] !== true) return total;

      return total +
        ((toNumber(fields[activity.timesField]) || 0) / 2) *
        ((toNumber(fields[activity.minutesField]) || 0) / 60) *
        ((toNumber(fields[activity.monthsField]) || 0) / 12) *
        weightKg *
        activity.weight;
    }, 0);
  }

  function formatValue(value, fallback){
    return isPresent(value) ? value : (fallback || 'Not Available');
  }

  function formatNumber(value, digits, suffix, fallback){
    if(!Number.isFinite(value)) return fallback || 'Not Available';
    return value.toFixed(digits) + (suffix || '');
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
      '<p class="muted">Summary contents will be added here.</p>',
      '</div>',
      '<div class="table-wrap enrollee-summary-table-wrap">',
      '<table class="data-table enrollee-summary-table">',
      '<tbody id="enrollee-summary-table-body"></tbody>',
      '</table>',
      '</div>',
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

  function renderSummaryRows(rows){
    var body = document.getElementById('enrollee-summary-table-body');
    if(!body) return;

    body.textContent = '';

    rows.forEach(function(row){
      var tr = document.createElement('tr');
      var labelCell;
      var valueCell;

      if(row.className) tr.className = row.className;

      if(row.colSpan === 2){
        valueCell = document.createElement('td');
        valueCell.colSpan = 2;
        valueCell.textContent = row.label;
        tr.appendChild(valueCell);
      }else{
        labelCell = document.createElement('th');
        valueCell = document.createElement('td');
        labelCell.scope = 'row';
        labelCell.textContent = row.label;
        valueCell.textContent = row.value;
        tr.appendChild(labelCell);
        tr.appendChild(valueCell);
      }

      body.appendChild(tr);
    });
  }

  function renderSummaryContent(enrollee, surveyCompletedAt){
    var content = document.getElementById('enrollee-summary-text');
    var enrolleeNumber = enrollee.enrolleeNumber || enrollee.objectId;

    if(!content) return;

    content.innerHTML = [
      '<p><strong>Enrollee Registration #' + enrolleeNumber + '</strong></p>',
      '<p>Enrolled - ' + formatDateTime(enrollee.createdAt) + '</p>',
      '<p>Frailty Assessment - ' + formatDateTime(surveyCompletedAt) + '</p>'
    ].join('');
  }

  function renderLoadingSummaryTable(){
    renderSummaryRows([
      { label: 'Loading summary details...', value: '' }
    ]);
  }

  function renderSummaryTable(result){
    var enrollee = result && result.enrollee;
    var survey = result && result.survey;
    var enrolleeFields = enrollee && enrollee.fields ? enrollee.fields : {};
    var surveyFields = survey && survey.fields ? survey.fields : {};
    var currentWeight = toNumber(surveyFields.weightCurrent);
    var pastWeight = surveyFields.weightNoChange === true ? currentWeight : toNumber(surveyFields.weightYearAgo);
    var bmi = bmiFromSurvey(surveyFields);
    var fastestGait = maxNumber(enrolleeFields.gait);
    var maxGrip = maxNumber(enrolleeFields.grip);
    var activitySum = calculateActivitySum(surveyFields);

    renderSummaryRows([
      { label: '1. Weight Loss Score', value: '0', className: 'enrollee-summary-section-row' },
      { label: 'Current Weight', value: formatNumber(currentWeight, 0, ' lbs') },
      { label: 'Past Weight', value: formatNumber(pastWeight, 0, ' lbs') },
      { label: 'BMI', value: formatNumber(bmi, 2, '') },
      { label: '2. Exhaustion Score', value: '0', className: 'enrollee-summary-section-row' },
      { label: 'In the last week, how often did you feel that everything you did was an effort?', value: effortAnswer(surveyFields.effort) },
      { label: 'In the last week, how often did you feel that you could not get going?', value: effortAnswer(surveyFields.getGoing) },
      { label: '3. Gait Speed Score', value: '0', className: 'enrollee-summary-section-row' },
      { label: 'Patient was able to complete the gait test?', value: booleanToAnswer(enrolleeFields.gaitCompleted) },
      { label: 'Fastest walking speed', value: formatNumber(fastestGait, 2, ' m/s') },
      { label: '4. Activity Score', value: '0', className: 'enrollee-summary-section-row' },
      { label: 'Kcals expended per week', value: formatNumber(activitySum, 2, ' kcal / week', '0.00 kcal / week') },
      { label: '5. Weakness/Hand Grip Score', value: '0', className: 'enrollee-summary-section-row' },
      { label: 'Patient was able to complete the hand grip test?', value: booleanToAnswer(enrolleeFields.gripCompleted) },
      { label: 'Maximum hand grip score', value: formatNumber(maxGrip, 0, ' kg') },
      { label: 'Frailty Score', value: '0', className: 'frailty-total-row' },
      { label: 'Frailty Assessment', value: 'Not frail', className: 'frailty-assessment-row' },
      { label: '(Score 0: Not frail; Score 1,2: Pre-frail; Score 3,4,5: Frail)', value: '', className: 'frailty-key-row', colSpan: 2 }
    ]);
  }

  function openSummaryOverlay(enrollee, trigger){
    var overlay = ensureSummaryOverlay();

    lastTrigger = trigger || null;
    activeSummaryEnrolleeId = enrollee.objectId;

    renderSummaryContent(enrollee, null);
    renderLoadingSummaryTable();

    overlay.hidden = false;

    var closeButton = document.getElementById('close-enrollee-summary');
    if(closeButton) closeButton.focus();

    if(window.BeFitMeAuth && window.BeFitMeAuth.runCloudFunction){
      window.BeFitMeAuth.runCloudFunction('getEnrolleeDetails', {
        enrolleeId: enrollee.objectId
      }).then(function(result){
        if(activeSummaryEnrolleeId !== enrollee.objectId) return;
        renderSummaryContent(enrollee, result && result.survey && result.survey.createdAt);
        renderSummaryTable(result);
      }).catch(function(error){
        console.log('Unable to load enrollee summary details:', error);
        if(activeSummaryEnrolleeId !== enrollee.objectId) return;
        renderSummaryRows([
          { label: 'Unable to load summary details.', value: error && error.message ? error.message : 'Please try again.' }
        ]);
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
