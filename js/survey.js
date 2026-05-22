// survey.js
// Handles the simple survey form behavior and collects form values.

(function(){
  function collectForm(form){
    // Build a plain object from form fields; easy to extend with new fields later
    var data = {};
    var fm = new FormData(form);
    fm.forEach(function(value, key){
      // Normalize numeric fields if needed later
      data[key] = value;
    });
    return data;
  }

  function showSuccess(message){
    var box = document.getElementById('survey-success');
    if(!box) return;
    box.textContent = message;
    box.hidden = false;
  }

  function setFollowUpRequired(followUpId, required){
    var followUp = document.getElementById(followUpId);
    if(!followUp) return;

    var fields = followUp.querySelectorAll('input');
    fields.forEach(function(field){
      field.required = required;
      field.disabled = !required;

      if(!required){
        if(field.type === 'range'){
          field.value = field.min || '0';
        }else{
          field.value = '';
        }
      }
    });
  }

  function updateRangeOutput(rangeId, outputId, formatter){
    var range = document.getElementById(rangeId);
    var output = document.getElementById(outputId);
    if(!range || !output) return;

    output.textContent = formatter(range.value);
  }

  function formatMinutes(value){
    return value === '120' ? '120 or more minutes' : value + ' minutes';
  }

  function formatMonths(value){
    return value === '1' ? '1 month' : value + ' months';
  }

  function updateActivityRangeOutputs(config){
    updateRangeOutput(config.minutesRangeId, config.minutesOutputId, function(value){
      return formatMinutes(value);
    });
    updateRangeOutput(config.monthsRangeId, config.monthsOutputId, function(value){
      return formatMonths(value);
    });
  }

  function setupActivityFollowUp(config){
    var followUp = document.getElementById(config.followUpId);
    var choices = document.querySelectorAll('input[name="' + config.choiceName + '"]');
    if(!followUp || !choices.length) return;

    function syncFollowUp(){
      var selected = document.querySelector('input[name="' + config.choiceName + '"]:checked');
      var showFollowUp = selected && selected.value === 'Yes';
      followUp.hidden = !showFollowUp;
      setFollowUpRequired(config.followUpId, Boolean(showFollowUp));
      updateActivityRangeOutputs(config);
    }

    choices.forEach(function(choice){
      choice.addEventListener('change', syncFollowUp);
    });

    [config.minutesRangeId, config.monthsRangeId].forEach(function(rangeId){
      var range = document.getElementById(rangeId);
      if(range) range.addEventListener('input', function(){
        updateActivityRangeOutputs(config);
      });
    });

    syncFollowUp();
  }

  var activitySections = [
    {
      choiceName: 'walkedForExercise',
      followUpId: 'walking-follow-up',
      minutesRangeId: 'walking-minutes',
      minutesOutputId: 'walking-minutes-output',
      monthsRangeId: 'walking-months',
      monthsOutputId: 'walking-months-output'
    },
    {
      choiceName: 'moderatelyStrenuousChores',
      followUpId: 'chores-follow-up',
      minutesRangeId: 'chores-minutes',
      minutesOutputId: 'chores-minutes-output',
      monthsRangeId: 'chores-months',
      monthsOutputId: 'chores-months-output'
    },
    {
      choiceName: 'gardening',
      followUpId: 'gardening-follow-up',
      minutesRangeId: 'gardening-minutes',
      minutesOutputId: 'gardening-minutes-output',
      monthsRangeId: 'gardening-months',
      monthsOutputId: 'gardening-months-output'
    },
    {
      choiceName: 'generalExercise',
      followUpId: 'general-exercise-follow-up',
      minutesRangeId: 'general-exercise-minutes',
      minutesOutputId: 'general-exercise-minutes-output',
      monthsRangeId: 'general-exercise-months',
      monthsOutputId: 'general-exercise-months-output'
    },
    {
      choiceName: 'lawnMowing',
      followUpId: 'lawn-mowing-follow-up',
      minutesRangeId: 'lawn-mowing-minutes',
      minutesOutputId: 'lawn-mowing-minutes-output',
      monthsRangeId: 'lawn-mowing-months',
      monthsOutputId: 'lawn-mowing-months-output'
    },
    {
      choiceName: 'golfing',
      followUpId: 'golfing-follow-up',
      minutesRangeId: 'golfing-minutes',
      minutesOutputId: 'golfing-minutes-output',
      monthsRangeId: 'golfing-months',
      monthsOutputId: 'golfing-months-output'
    }
  ];

  function setupActivityFollowUps(){
    activitySections.forEach(setupActivityFollowUp);
  }

  function resetActivityFollowUps(){
    activitySections.forEach(function(config){
      var followUp = document.getElementById(config.followUpId);
      if(followUp) followUp.hidden = true;
      setFollowUpRequired(config.followUpId, false);
      updateActivityRangeOutputs(config);
    });
  }

  function syncWeightChange(){
    var noChange = document.getElementById('no-weight-change');
    var previousWeightGroup = document.getElementById('previous-weight-group');
    var previousWeight = document.getElementById('previous-weight');
    if(!noChange || !previousWeightGroup || !previousWeight) return;

    var hidePreviousWeight = noChange.checked;
    previousWeightGroup.hidden = hidePreviousWeight;
    previousWeight.disabled = hidePreviousWeight;
    previousWeight.required = !hidePreviousWeight;

    if(hidePreviousWeight){
      previousWeight.value = '';
    }
  }

  function setupWeightChange(){
    var noChange = document.getElementById('no-weight-change');
    if(!noChange) return;

    noChange.addEventListener('change', syncWeightChange);
    syncWeightChange();
  }

  document.addEventListener('DOMContentLoaded', function(){
    var form = document.getElementById('survey-form');
    if(!form) return;

    setupWeightChange();
    setupActivityFollowUps();

    form.addEventListener('reset', function(){
      window.setTimeout(function(){
        syncWeightChange();
        resetActivityFollowUps();
      }, 0);
    });

    form.addEventListener('submit', function(ev){
      ev.preventDefault();

      var payload = collectForm(form);

      // Temporary: log the collected object to the console
      console.log('Survey payload:', payload);

      // TODO: Replace with actual submission logic to Back4App / Parse
      // Example placeholder:
      // Parse.initialize("APPLICATION_ID", "JAVASCRIPT_KEY");
      // var Survey = Parse.Object.extend('Survey');
      // var s = new Survey();
      // s.save(payload).then(...)

      showSuccess('Survey saved locally (placeholder). See console for payload.');

      // Future: show validation errors, send to server, handle auth, show loading state
    });
  });

})();
