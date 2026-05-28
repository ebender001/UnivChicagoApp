// enrollee-detail.js
// Displays enrollee details and read-only survey data.

(function(){
  function setStatus(message){
    var status = document.getElementById('enrollee-detail-status');
    if(status) status.textContent = message;
  }

  function formatLabel(key){
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, function(char){ return char.toUpperCase(); });
  }

  function isPresent(value){
    return value !== null && value !== undefined && value !== '';
  }

  function toNumber(value){
    if(!isPresent(value)) return null;
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function maxNumber(values){
    if(!Array.isArray(values)) return null;
    var numbers = values.map(toNumber).filter(function(value){
      return Number.isFinite(value);
    });
    if(!numbers.length) return null;
    return Math.max.apply(null, numbers);
  }

  function assessmentForScore(score){
    if(score === 0) return 'Not frail';
    if(score === 1 || score === 2) return 'Pre-Frail';
    return 'Frail';
  }

  function bmiFromSurvey(fields){
    var currentWeight = toNumber(fields.weightCurrent);
    var heightInches = toNumber(fields.heightInches);
    if(!Number.isFinite(currentWeight) || !Number.isFinite(heightInches) || heightInches <= 0) return null;
    return (703 * currentWeight) / Math.pow(heightInches, 2);
  }

  function calculateWeightLossScore(fields, bmi){
    var currentWeight = toNumber(fields.weightCurrent);
    var pastWeight = fields.weightNoChange === true ? currentWeight : toNumber(fields.weightYearAgo);
    var weightLoss = Number.isFinite(pastWeight) && Number.isFinite(currentWeight) ? pastWeight - currentWeight : 0;
    var weightPercent = Number.isFinite(pastWeight) && pastWeight > 0 ? (weightLoss / pastWeight) * 100 : 0;
    var unintentionalLoss = fields.weightLossIntentional !== true && (weightLoss > 10 || weightPercent > 5);
    return Number(unintentionalLoss || (Number.isFinite(bmi) && bmi < 18.5));
  }

  function calculateExhaustionScore(fields){
    return Number((toNumber(fields.effort) || 0) + (toNumber(fields.getGoing) || 0) > 0);
  }

  function calculateGaitSpeedScore(enrolleeFields, surveyFields){
    var male = surveyFields.male === true;
    var heightThreshold = male ? 68 : 63;
    var speedThreshold = toNumber(surveyFields.heightInches) > heightThreshold ? 0.76 : 0.65;
    var fastestGait = maxNumber(enrolleeFields.gait);

    return Number(enrolleeFields.gaitCompleted !== true || !Number.isFinite(fastestGait) || fastestGait <= speedThreshold);
  }

  function calculateActivitySum(fields){
    var currentWeight = toNumber(fields.weightCurrent);
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

  function calculateActivityScore(fields, activitySum){
    var threshold = fields.male === true ? 148 : 105;
    return Number(activitySum < threshold);
  }

  function calculateGripScore(enrolleeFields, surveyFields, bmi){
    var maxGrip = maxNumber(enrolleeFields.grip);
    if(enrolleeFields.gripCompleted !== true || !Number.isFinite(maxGrip) || !Number.isFinite(bmi)){
      return 1;
    }

    if(surveyFields.male === true){
      if(bmi <= 24) return Number(maxGrip <= 29);
      if(bmi > 28) return Number(maxGrip <= 32);
      return Number(maxGrip <= 30);
    }

    if(bmi <= 23) return Number(maxGrip <= 17);
    if(bmi > 29) return Number(maxGrip <= 21);
    if(bmi > 23 && bmi <= 26) return Number(maxGrip <= 17.3);
    return Number(maxGrip <= 18);
  }

  function calculateFrailty(enrollee, survey){
    if(!enrollee || !survey) return null;

    var enrolleeFields = enrollee.fields || {};
    var surveyFields = survey.fields || {};
    var bmi = bmiFromSurvey(surveyFields);
    var maxGrip = maxNumber(enrolleeFields.grip);
    var fastestGait = maxNumber(enrolleeFields.gait);
    var currentWeight = toNumber(surveyFields.weightCurrent);
    var pastWeight = surveyFields.weightNoChange === true ? currentWeight : toNumber(surveyFields.weightYearAgo);
    var weightLossScore = calculateWeightLossScore(surveyFields, bmi);
    var exhaustionScore = calculateExhaustionScore(surveyFields);
    var gaitSpeedScore = calculateGaitSpeedScore(enrolleeFields, surveyFields);
    var activitySum = calculateActivitySum(surveyFields);
    var activityScore = calculateActivityScore(surveyFields, activitySum);
    var handgripScore = calculateGripScore(enrolleeFields, surveyFields, bmi);
    var frailtyScore = weightLossScore + exhaustionScore + gaitSpeedScore + activityScore + handgripScore;

    return {
      frailtyScore: frailtyScore,
      assessment: assessmentForScore(frailtyScore),
      activitySum: activitySum,
      factors: [
        {
          label: 'Weight Loss Score',
          score: weightLossScore,
          details: [
            { label: 'Current weight', value: Number.isFinite(currentWeight) ? currentWeight + ' lbs' : 'No current weight recorded' },
            { label: 'Weight 1 year ago', value: Number.isFinite(pastWeight) ? pastWeight + ' lbs' : 'No past weight recorded' },
            { label: 'BMI', value: Number.isFinite(bmi) ? bmi.toFixed(2) : 'Unable to calculate BMI' },
            { label: 'Intentional weight loss', value: booleanToAnswer(surveyFields.weightLossIntentional) || 'No' }
          ]
        },
        {
          label: 'Exhaustion Score',
          score: exhaustionScore,
          details: [
            { label: 'Everything you did was an effort', value: effortAnswer(surveyFields.effort) || 'No answer recorded' },
            { label: 'Could not get going', value: effortAnswer(surveyFields.getGoing) || 'No answer recorded' }
          ]
        },
        {
          label: 'Activity Score',
          score: activityScore,
          details: [
            { label: 'Kcals expended per week', value: activitySum.toFixed(2) + ' kcal / week' },
            { label: 'Walked last 2 weeks', value: activitySummary(surveyFields, 'walked', 'walkedTimes', 'walkedMinutes', 'walkedMonths') },
            { label: 'Strenuous chores', value: activitySummary(surveyFields, 'chores', 'choresTimes', 'choresMinutes', 'choresMonths') },
            { label: 'Gardening', value: activitySummary(surveyFields, 'gardening', 'gardeningTimes', 'gardeningMinutes', 'gardeningMonths') },
            { label: 'Exercise', value: activitySummary(surveyFields, 'exercise', 'exerciseTimes', 'exerciseMinutes', 'exerciseMonths') },
            { label: 'Mowed lawn', value: activitySummary(surveyFields, 'mowedLawn', 'mowedLawnTimes', 'mowedLawnMinutes', 'mowedLawnMonths') },
            { label: 'Golf', value: activitySummary(surveyFields, 'golf', 'golfTimes', 'golfMinutes', 'golfMonths') }
          ]
        },
        {
          label: 'Handgrip Score',
          score: handgripScore,
          details: [
            { label: 'Patient was able to complete the hand grip test?', value: booleanToAnswer(enrolleeFields.gripCompleted) || 'No' },
            { label: 'Maximum hand grip score', value: Number.isFinite(maxGrip) ? maxGrip + ' kg' : 'No hand grip recorded' },
            { label: 'Recorded hand grip values', value: Array.isArray(enrolleeFields.grip) && enrolleeFields.grip.length ? enrolleeFields.grip.join(', ') + ' kg' : 'No hand grip recorded' }
          ]
        },
        {
          label: 'Gait Speed Score',
          score: gaitSpeedScore,
          details: [
            { label: 'Patient was able to complete the gait test?', value: booleanToAnswer(enrolleeFields.gaitCompleted) || 'No' },
            { label: 'Fastest walking speed', value: Number.isFinite(fastestGait) ? fastestGait.toFixed(2) + ' m/s' : 'No gait speed recorded' },
            { label: 'Recorded gait speed values', value: Array.isArray(enrolleeFields.gait) && enrolleeFields.gait.length ? enrolleeFields.gait.join(', ') + ' m/s' : 'No gait speed recorded' }
          ]
        }
      ]
    };
  }

  function activitySummary(fields, booleanField, timesField, minutesField, monthsField){
    if(fields[booleanField] !== true) return 'No';

    return [
      (toNumber(fields[timesField]) || 0) + ' times in 2 weeks',
      (toNumber(fields[minutesField]) || 0) + ' minutes/session',
      (toNumber(fields[monthsField]) || 0) + ' months/year'
    ].join(', ');
  }

  function formatValue(value){
    if(value === null || value === undefined || value === '') return '—';
    if(Array.isArray(value)) return value.join(', ');
    if(typeof value === 'object'){
      if(value.objectId) return value.objectId;
      return '—';
    }
    return String(value);
  }

  function addReadonlyField(container, label, value){
    var item = document.createElement('div');
    item.className = 'readonly-field';

    var labelEl = document.createElement('dt');
    labelEl.textContent = label;

    var valueEl = document.createElement('dd');
    valueEl.textContent = formatValue(value);

    item.appendChild(labelEl);
    item.appendChild(valueEl);
    container.appendChild(item);
  }

  function addFrailtyRow(body, label, value, className, details){
    var row = document.createElement('tr');
    if(className) row.className = className;

    var labelCell = document.createElement('th');
    labelCell.scope = 'row';

    var valueCell = document.createElement('td');
    valueCell.textContent = value;

    if(details && details.length){
      var button = document.createElement('button');
      var detailsId = 'frailty-detail-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      button.type = 'button';
      button.className = 'frailty-detail-toggle';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', detailsId);
      button.innerHTML = '<span class="collapse-indicator" aria-hidden="true">+</span><span>' + label + '</span>';
      labelCell.appendChild(button);

      button.addEventListener('click', function(){
        var detailsRow = document.getElementById(detailsId);
        var panel = detailsRow ? detailsRow.querySelector('.frailty-detail-panel') : null;
        var expanded = button.getAttribute('aria-expanded') === 'true';

        button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if(!detailsRow || !panel) return;

        window.clearTimeout(panel.heightTimer);
        detailsRow.classList.toggle('is-visible', !expanded);

        if(expanded){
          panel.style.height = panel.scrollHeight + 'px';
          panel.offsetHeight;
          window.requestAnimationFrame(function(){
            panel.style.height = '0px';
          });
          return;
        }

        panel.style.height = panel.scrollHeight + 'px';
        panel.heightTimer = window.setTimeout(function(){
          if(detailsRow.classList.contains('is-visible')){
            panel.style.height = 'auto';
          }
        }, 280);
      });
    }else{
      labelCell.textContent = label;
    }

    row.appendChild(labelCell);
    row.appendChild(valueCell);
    body.appendChild(row);

    if(details && details.length){
      addFrailtyDetailRow(body, label, details);
    }
  }

  function addFrailtySeparator(body){
    var row = document.createElement('tr');
    row.className = 'frailty-separator-row';

    var cell = document.createElement('td');
    cell.colSpan = 2;
    cell.setAttribute('aria-hidden', 'true');

    row.appendChild(cell);
    body.appendChild(row);
  }

  function addFrailtyDetailRow(body, label, details){
    var row = document.createElement('tr');
    var detailsId = 'frailty-detail-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    var cell = document.createElement('td');
    var panel = document.createElement('div');
    var list = document.createElement('dl');

    row.id = detailsId;
    row.className = 'frailty-detail-row';
    cell.colSpan = 2;
    panel.className = 'frailty-detail-panel';
    list.className = 'frailty-detail-list';

    details.forEach(function(detail){
      var wrap = document.createElement('div');
      var term = document.createElement('dt');
      var description = document.createElement('dd');

      term.textContent = detail.label;
      description.textContent = detail.value;
      wrap.appendChild(term);
      wrap.appendChild(description);
      list.appendChild(wrap);
    });

    panel.appendChild(list);
    cell.appendChild(panel);
    row.appendChild(cell);
    body.appendChild(row);
  }

  function renderFrailty(enrollee, survey){
    var section = document.getElementById('frailty-section');
    var container = document.getElementById('frailty-score-table');
    if(!section || !container) return;

    container.textContent = '';

    if(!survey){
      addReadonlyField(container, 'Frailty Assessment', 'No linked survey');
      section.hidden = false;
      return;
    }

    var scores = calculateFrailty(enrollee, survey);
    if(!scores){
      addReadonlyField(container, 'Frailty Assessment', 'Unable to calculate score');
      section.hidden = false;
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'table-wrap frailty-score-wrap';

    var table = document.createElement('table');
    table.className = 'data-table frailty-score-table';

    var body = document.createElement('tbody');
    addFrailtyRow(body, 'Frailty Assessment', scores.assessment, 'frailty-assessment-row');
    addFrailtyRow(body, 'Frailty Score', String(scores.frailtyScore) + ' / 5', 'frailty-total-row');
    addFrailtyRow(body, 'Assessment Key', 'Score 0: Not frail; Score 1-2: Pre-Frail; Score 3-5: Frail', 'frailty-key-row');
    addFrailtySeparator(body);

    scores.factors.forEach(function(factor){
      addFrailtyRow(body, factor.label, String(factor.score), '', factor.details);
    });

    table.appendChild(body);
    wrap.appendChild(table);
    container.appendChild(wrap);
    section.hidden = false;
  }

  function booleanToAnswer(value){
    if(value === true) return 'Yes';
    if(value === false) return 'No';
    return '';
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
    return '';
  }

  function heightParts(totalInches){
    var parsed = Number(totalInches);
    if(!Number.isFinite(parsed)) return { feet: '', inches: '' };

    return {
      feet: Math.floor(parsed / 12),
      inches: parsed % 12
    };
  }

  function addChoice(container, name, value, selectedValue){
    var label = document.createElement('label');
    label.className = 'choice readonly-choice';

    var input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.disabled = true;
    input.checked = value === selectedValue;

    var text = document.createElement('span');
    text.textContent = value;

    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  }

  function addCheckbox(container, name, value, checked){
    var label = document.createElement('label');
    label.className = 'choice readonly-choice';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.value = value;
    input.disabled = true;
    input.checked = Boolean(checked);

    var text = document.createElement('span');
    text.textContent = value;

    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  }

  function addInputField(container, labelText, value){
    var wrap = document.createElement('div');
    var label = document.createElement('label');
    label.textContent = labelText;

    var input = document.createElement('input');
    input.type = 'text';
    input.value = isPresent(value) ? String(value) : '';
    input.disabled = true;
    input.readOnly = true;

    wrap.appendChild(label);
    wrap.appendChild(input);
    container.appendChild(wrap);
  }

  function addTextInputRow(container, labelText, value){
    var row = document.createElement('div');
    row.className = 'form-row';
    addInputField(row, labelText, value);
    container.appendChild(row);
  }

  function addChoiceQuestion(container, legendText, name, options, selectedValue){
    var fieldset = document.createElement('fieldset');
    fieldset.className = 'form-row';

    var legend = document.createElement('legend');
    legend.textContent = legendText;
    fieldset.appendChild(legend);

    options.forEach(function(option){
      addChoice(fieldset, name, option, selectedValue);
    });

    container.appendChild(fieldset);
  }

  function addHeightQuestion(container, fields){
    var parts = heightParts(fields.heightInches);
    var fieldset = document.createElement('fieldset');
    fieldset.className = 'form-row';

    var legend = document.createElement('legend');
    legend.textContent = 'How tall are you?';

    var grid = document.createElement('div');
    grid.className = 'height-fields';
    addInputField(grid, 'Feet', parts.feet);
    addInputField(grid, 'Inches', parts.inches);

    fieldset.appendChild(legend);
    fieldset.appendChild(grid);
    container.appendChild(fieldset);
  }

  function addWeightQuestion(container, fields){
    var fieldset = document.createElement('fieldset');
    fieldset.className = 'form-row';

    var legend = document.createElement('legend');
    legend.textContent = 'Change in weight';

    var grid = document.createElement('div');
    grid.className = 'weight-fields';
    addInputField(grid, 'Current weight', fields.weightCurrent);
    addInputField(grid, 'Weight 1 year ago', fields.weightYearAgo);

    fieldset.appendChild(legend);
    fieldset.appendChild(grid);
    addCheckbox(fieldset, 'weightNoChange', 'No change in weight', fields.weightNoChange);
    container.appendChild(fieldset);
  }

  function addSliderLikeField(container, labelText, value, unit, maxLabel){
    var row = document.createElement('div');
    row.className = 'form-row slider-row readonly-slider-row';

    var label = document.createElement('label');
    label.textContent = labelText;

    var outputWrap = document.createElement('div');
    outputWrap.className = 'range-value';
    var output = document.createElement('output');
    output.textContent = isPresent(value) ? value + ' ' + unit : '—';
    outputWrap.appendChild(output);

    var range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = unit === 'months' ? '12' : '120';
    range.step = unit === 'months' ? '1' : '5';
    range.value = isPresent(value) ? String(value) : '0';
    range.disabled = true;

    var limits = document.createElement('div');
    limits.className = 'range-limits';
    limits.innerHTML = '<span>0</span><span>' + maxLabel + '</span>';

    row.appendChild(label);
    row.appendChild(outputWrap);
    row.appendChild(range);
    row.appendChild(limits);
    container.appendChild(row);
  }

  function addActivityQuestion(container, config, fields){
    var answer = booleanToAnswer(fields[config.booleanField]);
    addChoiceQuestion(container, config.question, config.booleanField, ['Yes', 'No'], answer);

    if(fields[config.booleanField] !== true) return;

    var followUp = document.createElement('div');
    followUp.className = 'follow-up is-visible readonly-follow-up';

    addTextInputRow(followUp, 'How many times in the past two weeks?', fields[config.timesField]);
    addSliderLikeField(followUp, config.minutesLabel, fields[config.minutesField], 'minutes', '120 or more');
    addSliderLikeField(followUp, config.monthsLabel, fields[config.monthsField], 'months', '12');

    container.appendChild(followUp);
  }

  function renderReadOnlySurveyForm(container, survey){
    var fields = survey.fields || {};
    var form = document.createElement('div');
    form.className = 'survey-form readonly-survey-form';

    // Rebuild the survey in the original form order using CloudCode-normalized field names.
    var metadata = document.createElement('dl');
    metadata.className = 'readonly-grid survey-metadata';
    addReadonlyField(metadata, 'Survey ID', survey.objectId);
    addReadonlyField(metadata, 'Survey Date', survey.createdAt ? new Date(survey.createdAt).toLocaleString() : '');
    form.appendChild(metadata);

    addChoiceQuestion(form, 'What is your gender?', 'male', ['Male', 'Female'], fields.male === true ? 'Male' : fields.male === false ? 'Female' : '');
    addHeightQuestion(form, fields);
    addWeightQuestion(form, fields);
    addChoiceQuestion(form, 'Did you have intentional weight loss, for example due to dieting or exercise?', 'weightLossIntentional', ['Yes', 'No'], booleanToAnswer(fields.weightLossIntentional));
    addChoiceQuestion(form, 'In the last week, how often did you feel that everything you did was an effort?', 'effort', [
      'None of the time',
      'Some or a little of the time (1-2 days)',
      'A moderate amount of the time (3-4 days)',
      'Most of the time (>4 days)'
    ], effortAnswer(fields.effort));
    addChoiceQuestion(form, 'In the last week, how often did you feel that you could not get going?', 'getGoing', [
      'None of the time',
      'Some or a little of the time (1-2 days)',
      'A moderate amount of the time (3-4 days)',
      'Most of the time (>4 days)'
    ], effortAnswer(fields.getGoing));

    [
      {
        question: 'During the past two weeks, have you walked for exercise?',
        booleanField: 'walked',
        timesField: 'walkedTimes',
        minutesField: 'walkedMinutes',
        monthsField: 'walkedMonths',
        minutesLabel: 'How many minutes on average per session do you walk?',
        monthsLabel: 'How many months per year do you walk for exercise?'
      },
      {
        question: 'During the past two weeks, have you done moderately strenuous household chores like scrubbing or vacuuming?',
        booleanField: 'chores',
        timesField: 'choresTimes',
        minutesField: 'choresMinutes',
        monthsField: 'choresMonths',
        minutesLabel: 'How many minutes on average per session do you do moderately strenuous household chores?',
        monthsLabel: 'How many months per year do you do moderately strenuous household chores?'
      },
      {
        question: 'During the past two weeks, have you done any gardening?',
        booleanField: 'gardening',
        timesField: 'gardeningTimes',
        minutesField: 'gardeningMinutes',
        monthsField: 'gardeningMonths',
        minutesLabel: 'How many minutes on average per session do you do gardening?',
        monthsLabel: 'How many months per year do you do gardening?'
      },
      {
        question: 'During the past two weeks, have you done any general exercise, excluding walking?',
        booleanField: 'exercise',
        timesField: 'exerciseTimes',
        minutesField: 'exerciseMinutes',
        monthsField: 'exerciseMonths',
        minutesLabel: 'How many minutes on average per session do you do general exercise?',
        monthsLabel: 'How many months per year do you do general exercise?'
      },
      {
        question: 'During the past two weeks, have you mowed a lawn?',
        booleanField: 'mowedLawn',
        timesField: 'mowedLawnTimes',
        minutesField: 'mowedLawnMinutes',
        monthsField: 'mowedLawnMonths',
        minutesLabel: 'How many minutes on average per session do you mow a lawn?',
        monthsLabel: 'How many months per year do you mow a lawn?'
      },
      {
        question: 'During the past two weeks, have you done any golfing?',
        booleanField: 'golf',
        timesField: 'golfTimes',
        minutesField: 'golfMinutes',
        monthsField: 'golfMonths',
        minutesLabel: 'How many minutes on average per session do you golf?',
        monthsLabel: 'How many months per year do you golf?'
      }
    ].forEach(function(config){
      addActivityQuestion(form, config, fields);
    });

    addChoiceQuestion(form, 'Have you had any recent pain or acute flare-up in your dominant wrist or hand from conditions like arthritis, tendonitis, or carpal tunnel syndrome?', 'handPain', ['Yes', 'No'], booleanToAnswer(fields.handPain));
    addChoiceQuestion(form, 'Have you had any surgery on your dominant hand or arm during the last 3 months?', 'handSurgery', ['Yes', 'No'], booleanToAnswer(fields.handSurgery));

    container.appendChild(form);
  }

  function renderSurvey(survey){
    var section = document.getElementById('survey-readonly-section');
    var fields = document.getElementById('survey-readonly-fields');
    if(!section || !fields) return;

    fields.textContent = '';

    if(!survey){
      addReadonlyField(fields, 'Survey', 'No linked survey');
      section.hidden = false;
      return;
    }

    renderReadOnlySurveyForm(fields, survey);

    section.hidden = false;
  }

  function renderDetails(result){
    var subtitle = document.getElementById('enrollee-detail-subtitle');
    var frailty = document.getElementById('frailty-section');
    var enrollee = result && result.enrollee;

    if(subtitle && enrollee){
      subtitle.textContent = 'Enrollee ' + (enrollee.fields.enrolleeNumber || enrollee.objectId);
    }

    if(frailty) frailty.hidden = false;
    renderFrailty(enrollee, result && result.survey);
    renderSurvey(result && result.survey);
  }

  function loadDetails(){
    var params = new URLSearchParams(window.location.search);
    var enrolleeId = params.get('enrolleeId');

    if(!enrolleeId){
      setStatus('Missing enrollee id.');
      return;
    }

    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      setStatus('Login is not ready. Please refresh and try again.');
      return;
    }

    window.BeFitMeAuth.runCloudFunction('getEnrolleeDetails', {
      enrolleeId: enrolleeId
    }).then(function(result){
      setStatus('');
      renderDetails(result);
    }).catch(function(error){
      console.log('Unable to load enrollee details:', error);
      setStatus(error && error.message ? error.message : 'Unable to load enrollee details.');
    });
  }

  document.addEventListener('DOMContentLoaded', loadDetails);
})();
