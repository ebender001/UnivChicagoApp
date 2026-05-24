// registration.js
// Handles enrollee registration page behavior.

(function(){
  function generateEnrolleeNumber(){
    return String(Math.floor(Math.random() * 90000000) + 10000000);
  }

  var gaitTimers = {};
  var editingEnrolleeId = null;
  // Edit mode preserves original measurement values because grip and gait are read-only later.
  var existingGaitValues = [];
  var existingGripValues = [];
  var existingGripCompleted = null;
  var existingGaitCompleted = null;

  function setSectionVisibility(section, visible){
    if(!section) return;
    window.clearTimeout(section.hideTimer);
    window.clearTimeout(section.heightTimer);

    if(visible){
      if(section.hidden){
        section.hidden = false;
        section.classList.remove('is-visible');
      }

      section.style.height = '0px';
      window.requestAnimationFrame(function(){
        section.classList.add('is-visible');
        section.style.height = section.scrollHeight + 'px';
        section.heightTimer = window.setTimeout(function(){
          if(section.classList.contains('is-visible')){
            section.style.height = 'auto';
          }
        }, 340);
      });
      return;
    }

    if(section.hidden) return;

    section.style.height = section.offsetHeight + 'px';
    section.offsetHeight;
    section.classList.remove('is-visible');
    window.requestAnimationFrame(function(){
      section.style.height = '0px';
      section.hideTimer = window.setTimeout(function(){
        if(!section.classList.contains('is-visible')){
          section.hidden = true;
          section.style.height = '';
        }
      }, 340);
    });
  }

  function getGaitElapsedMs(timer){
    if(!timer) return 0;

    var elapsed = timer.elapsedMs;
    if(timer.status === 'running'){
      elapsed += performance.now() - timer.startedAt;
    }

    return elapsed;
  }

  function formatGaitTime(elapsedMs){
    var seconds = elapsedMs / 1000;
    return seconds.toFixed(1) + ' sec';
  }

  function formatGaitSpeed(elapsedMs){
    if(elapsedMs <= 0) return '';

    var seconds = elapsedMs / 1000;
    var metersPerSecond = 4 / seconds;
    return 'Gait speed: ' + metersPerSecond.toFixed(2) + ' m/sec';
  }

  function getGaitSpeedValue(elapsedMs){
    if(elapsedMs <= 0) return null;

    var seconds = elapsedMs / 1000;
    // Store gait speed, not elapsed time: 4 meters divided by elapsed seconds.
    return Number((4 / seconds).toPrecision(2));
  }

  function updateGaitTimer(timerId){
    var timer = gaitTimers[timerId];
    if(!timer) return;

    var elapsed = getGaitElapsedMs(timer);
    if(timer.display) timer.display.textContent = formatGaitTime(elapsed);

    if(timer.speedDisplay){
      var showSpeed = timer.status === 'stopped' && elapsed > 0;
      timer.speedDisplay.textContent = showSpeed ? formatGaitSpeed(elapsed) : '';
      timer.speedDisplay.hidden = !showSpeed;
    }
  }

  function setGaitTimerButton(timer){
    if(!timer || !timer.button) return;

    timer.button.classList.remove('timer-start', 'timer-stop', 'timer-reset');

    if(timer.status === 'running'){
      timer.button.textContent = 'Stop';
      timer.button.classList.add('timer-stop');
    }else if(timer.elapsedMs > 0){
      timer.button.textContent = 'Reset';
      timer.button.classList.add('timer-reset');
    }else{
      timer.button.textContent = 'Start';
      timer.button.classList.add('timer-start');
    }
  }

  function resetGaitTimer(timerId){
    var timer = gaitTimers[timerId];
    if(!timer) return;

    if(timer.intervalId){
      window.clearInterval(timer.intervalId);
    }

    timer.status = 'idle';
    timer.elapsedMs = 0;
    timer.startedAt = 0;
    timer.intervalId = null;
    updateGaitTimer(timerId);
    setGaitTimerButton(timer);
  }

  function resetGaitTimers(){
    Object.keys(gaitTimers).forEach(resetGaitTimer);
  }

  function getGaitValues(){
    return ['gait-trial-1', 'gait-trial-2'].map(function(timerId){
      var timer = gaitTimers[timerId];
      if(!timer || getGaitElapsedMs(timer) <= 0) return null;
      return getGaitSpeedValue(getGaitElapsedMs(timer));
    }).filter(function(value){
      return value !== null;
    });
  }

  function toggleGaitTimer(timerId){
    var timer = gaitTimers[timerId];
    if(!timer) return;

    if(timer.status === 'running'){
      timer.elapsedMs += performance.now() - timer.startedAt;
      timer.status = 'stopped';
      if(timer.intervalId) window.clearInterval(timer.intervalId);
      timer.intervalId = null;
    }else if(timer.elapsedMs > 0){
      resetGaitTimer(timerId);
      return;
    }else{
      timer.status = 'running';
      timer.startedAt = performance.now();
      timer.intervalId = window.setInterval(function(){
        updateGaitTimer(timerId);
      }, 100);
    }

    updateGaitTimer(timerId);
    setGaitTimerButton(timer);
  }

  function setupGaitTimers(){
    document.querySelectorAll('[data-timer-button]').forEach(function(button){
      var timerId = button.getAttribute('data-timer-id');
      var display = document.getElementById(timerId + '-display');
      var speedDisplay = document.getElementById(timerId + '-speed');
      if(!timerId || !display) return;

      gaitTimers[timerId] = {
        button: button,
        display: display,
        speedDisplay: speedDisplay,
        elapsedMs: 0,
        intervalId: null,
        startedAt: 0,
        status: 'idle'
      };

      button.addEventListener('click', function(){
        toggleGaitTimer(timerId);
      });

      updateGaitTimer(timerId);
      setGaitTimerButton(gaitTimers[timerId]);
    });
  }

  function syncGripTestFollowUp(){
    var selected = document.querySelector('input[name="canCompleteGripTest"]:checked');
    var followUp = document.getElementById('grip-test-follow-up');
    var helpButton = document.getElementById('grip-test-help');
    var popover = document.getElementById('grip-test-help-popover');
    if(!followUp) return;

    var showFollowUp = selected && selected.value === 'Yes';
    var fields = followUp.querySelectorAll('input');
    setSectionVisibility(followUp, Boolean(showFollowUp));

    fields.forEach(function(field){
      field.disabled = !showFollowUp;

      if(!showFollowUp){
        field.value = '';
      }
    });

    if(!showFollowUp && popover){
      popover.hidden = true;
      if(helpButton) helpButton.setAttribute('aria-expanded', 'false');
    }

  }

  function syncGaitTestFollowUp(){
    var selected = document.querySelector('input[name="canCompleteGaitTest"]:checked');
    var followUp = document.getElementById('gait-test-follow-up');
    var helpButton = document.getElementById('gait-test-help');
    var popover = document.getElementById('gait-test-help-popover');
    if(!followUp) return;

    var showFollowUp = selected && selected.value === 'Yes';
    setSectionVisibility(followUp, Boolean(showFollowUp));

    if(!showFollowUp && popover){
      popover.hidden = true;
      if(helpButton) helpButton.setAttribute('aria-expanded', 'false');
    }

    if(!showFollowUp){
      resetGaitTimers();
    }
  }

  function setupHelpPopover(helpButtonId, closeButtonId, popoverId){
    var helpButton = document.getElementById(helpButtonId);
    var closeButton = document.getElementById(closeButtonId);
    var popover = document.getElementById(popoverId);
    if(!helpButton || !popover) return;

    // Move popovers to body so fixed positioning is not clipped by form sections.
    document.body.appendChild(popover);

    function setPopover(open){
      document.querySelectorAll('.help-popover').forEach(function(otherPopover){
        if(otherPopover !== popover) otherPopover.hidden = true;
      });

      document.querySelectorAll('.help-btn[aria-expanded="true"]').forEach(function(otherButton){
        if(otherButton !== helpButton) otherButton.setAttribute('aria-expanded', 'false');
      });

      popover.hidden = !open;
      helpButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    helpButton.addEventListener('click', function(){
      setPopover(popover.hidden);
    });

    if(closeButton){
      closeButton.addEventListener('click', function(){
        setPopover(false);
        helpButton.focus();
      });
    }

    popover.addEventListener('keydown', function(ev){
      if(ev.key === 'Escape'){
        setPopover(false);
        helpButton.focus();
      }
    });
  }

  function collectRegistrationForm(form){
    var data = {};
    var fm = new FormData(form);

    fm.forEach(function(value, key){
      data[key] = value;
    });

    data.grip = [
      data.handGrip1,
      data.handGrip2,
      data.handGrip3
    ];
    data.gait = getGaitValues();

    if(editingEnrolleeId){
      if(existingGripCompleted === true || existingGripCompleted === false){
        data.canCompleteGripTest = existingGripCompleted ? 'Yes' : 'No';
      }

      if(existingGaitCompleted === true || existingGaitCompleted === false){
        data.canCompleteGaitTest = existingGaitCompleted ? 'Yes' : 'No';
      }
    }

    if(editingEnrolleeId && existingGripValues.length){
      // Disabled measurement inputs are omitted from FormData, so keep loaded originals.
      data.grip = existingGripValues.slice();
    }

    if(editingEnrolleeId && existingGaitValues.length){
      // Gait values remain the original stored speeds during enrollee edits.
      data.gait = existingGaitValues.slice();
    }

    var params = new URLSearchParams(window.location.search);
    var surveyId = params.get('surveyId');
    // Continue Enrollment arrives with a surveyId so CloudCode can link both records.
    if(surveyId) data.surveyId = surveyId;
    if(editingEnrolleeId) data.enrolleeId = editingEnrolleeId;

    return data;
  }

  function setSubmitState(form, saving){
    var submit = form.querySelector('[type="submit"]');
    if(!submit) return;

    submit.disabled = saving;
    submit.textContent = saving ? 'Saving...' : editingEnrolleeId ? 'Update' : 'Submit';
  }

  function showRegistrationStatus(message, isError){
    var status = document.getElementById('registration-status');
    if(!status) return;

    status.textContent = message;
    status.hidden = false;
    status.classList.toggle('form-error', Boolean(isError));
    status.classList.toggle('success', !isError);
  }

  function setFieldValue(id, value){
    var field = document.getElementById(id);
    if(!field) return;
    field.value = value === null || value === undefined ? '' : String(value);
  }

  function formatDateInput(value){
    if(!value) return '';

    var date = new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  function setRadioValue(name, booleanValue){
    var value = booleanValue === true ? 'Yes' : 'No';
    var field = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if(field) field.checked = true;
  }

  function setFieldsetDisabled(name, disabled){
    document.querySelectorAll('input[name="' + name + '"]').forEach(function(field){
      field.disabled = disabled;
    });
  }

  function setFieldsDisabled(ids, disabled){
    ids.forEach(function(id){
      var field = document.getElementById(id);
      if(field) field.disabled = disabled;
    });
  }

  function setGaitControlsReadonly(){
    Object.keys(gaitTimers).forEach(function(timerId, index){
      var timer = gaitTimers[timerId];
      var speed = existingGaitValues[index];

      if(timer && timer.button){
        timer.button.disabled = true;
        timer.button.textContent = 'Recorded';
      }

      if(timer && timer.display){
        timer.display.textContent = 'Original value';
      }

      if(timer && timer.speedDisplay){
        timer.speedDisplay.textContent = speed !== undefined ? 'Gait speed: ' + speed + ' m/sec' : 'No gait speed recorded';
        timer.speedDisplay.hidden = false;
      }
    });
  }

  function setMeasurementsReadonly(){
    setFieldsetDisabled('canCompleteGripTest', true);
    setFieldsetDisabled('canCompleteGaitTest', true);
    setFieldsDisabled(['hand-grip-1', 'hand-grip-2', 'hand-grip-3'], true);
    setGaitControlsReadonly();
  }

  function populateRegistrationForm(enrollee){
    var fields = enrollee && enrollee.fields ? enrollee.fields : {};
    var title = document.querySelector('.registration-page .page-title');
    var lead = document.querySelector('.registration-page .lead');
    var submit = document.querySelector('.registration-page form [type="submit"]');
    var generateButton = document.getElementById('generate-enrollee-number');

    if(title) title.textContent = 'Edit Enrollee Registration';
    if(lead) lead.textContent = 'Update the enrollee registration details below.';
    if(submit) submit.textContent = 'Update';
    if(generateButton) generateButton.disabled = true;

    // Existing enrollees can update registration details but not original test measurements.
    setFieldValue('enrollee-number', fields.enrolleeNumber);
    setFieldValue('start-date', formatDateInput(fields.startDate));
    setFieldValue('stop-date', formatDateInput(fields.stopDate));

    existingGripCompleted = fields.gripCompleted === true ? true : fields.gripCompleted === false ? false : null;
    existingGaitCompleted = fields.gaitCompleted === true ? true : fields.gaitCompleted === false ? false : null;

    setRadioValue('canCompleteGripTest', fields.gripCompleted);
    syncGripTestFollowUp();

    if(Array.isArray(fields.grip)){
      existingGripValues = fields.grip.slice();
      setFieldValue('hand-grip-1', fields.grip[0]);
      setFieldValue('hand-grip-2', fields.grip[1]);
      setFieldValue('hand-grip-3', fields.grip[2]);
    }

    setRadioValue('canCompleteGaitTest', fields.gaitCompleted);
    syncGaitTestFollowUp();

    existingGaitValues = Array.isArray(fields.gait) ? fields.gait.slice() : [];

    setMeasurementsReadonly();
  }

  function loadEnrolleeForEditing(enrolleeId){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      showRegistrationStatus('Login is not ready. Please refresh and try again.', true);
      return;
    }

    showRegistrationStatus('Loading enrollee registration...', false);

    window.BeFitMeAuth.runCloudFunction('getEnrolleeDetails', {
      enrolleeId: enrolleeId
    }).then(function(result){
      populateRegistrationForm(result && result.enrollee);
      var status = document.getElementById('registration-status');
      if(status && !status.textContent.indexOf('Loading')) status.hidden = true;
    }).catch(function(error){
      console.log('Unable to load enrollee for editing:', error);
      showRegistrationStatus(error && error.message ? error.message : 'Unable to load enrollee registration.', true);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    var form = document.querySelector('.registration-page form');
    var input = document.getElementById('enrollee-number');
    var button = document.getElementById('generate-enrollee-number');
    var params = new URLSearchParams(window.location.search);
    editingEnrolleeId = params.get('enrolleeId');

    if(input && button){
      button.addEventListener('click', function(){
        input.value = generateEnrolleeNumber();
        input.focus();
      });
    }

    document.querySelectorAll('input[name="canCompleteGripTest"]').forEach(function(choice){
      choice.addEventListener('change', syncGripTestFollowUp);
    });

    document.querySelectorAll('input[name="canCompleteGaitTest"]').forEach(function(choice){
      choice.addEventListener('change', syncGaitTestFollowUp);
    });

    setupHelpPopover('grip-test-help', 'close-grip-test-help', 'grip-test-help-popover');
    setupHelpPopover('gait-test-help', 'close-gait-test-help', 'gait-test-help-popover');
    setupGaitTimers();
    syncGripTestFollowUp();
    syncGaitTestFollowUp();

    if(editingEnrolleeId){
      loadEnrolleeForEditing(editingEnrolleeId);
    }

    if(form){
      form.addEventListener('reset', function(){
        window.setTimeout(function(){
          syncGripTestFollowUp();
          syncGaitTestFollowUp();
        }, 0);
      });

      form.addEventListener('submit', function(ev){
        ev.preventDefault();

        if(!form.checkValidity()){
          form.reportValidity();
          return;
        }

        if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
          showRegistrationStatus('Login is not ready. Please refresh and try again.', true);
          return;
        }

        var payload = collectRegistrationForm(form);
        console.log('Registration payload:', payload);
        setSubmitState(form, true);

        window.BeFitMeAuth.runCloudFunction('saveEnrollee', {
          enrollee: payload
        }).then(function(result){
          console.log('Enrollee saved:', result);
          showRegistrationStatus('Registration saved.', false);
        }).catch(function(error){
          console.log('Enrollee save failed:', error);
          showRegistrationStatus(error && error.message ? error.message : 'Unable to save registration.', true);
        }).finally(function(){
          setSubmitState(form, false);
        });
      });
    }
  });
})();
