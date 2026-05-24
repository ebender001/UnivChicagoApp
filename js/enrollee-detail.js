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
