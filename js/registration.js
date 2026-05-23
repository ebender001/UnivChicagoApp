// registration.js
// Handles enrollee registration page behavior.

(function(){
  function generateEnrolleeNumber(){
    return String(Math.floor(Math.random() * 90000000) + 10000000);
  }

  var gaitTimers = {};

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

  function formatGaitTime(elapsedMs){
    var tenths = Math.floor(elapsedMs / 100);
    var seconds = Math.floor(tenths / 10);
    var tenth = tenths % 10;
    return String(seconds).padStart(2, '0') + ':' + tenth + ' m/sec';
  }

  function updateGaitTimer(timerId){
    var timer = gaitTimers[timerId];
    if(!timer) return;

    var elapsed = timer.elapsedMs;
    if(timer.status === 'running'){
      elapsed += performance.now() - timer.startedAt;
    }

    if(timer.display) timer.display.textContent = formatGaitTime(elapsed);
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
      if(!timerId || !display) return;

      gaitTimers[timerId] = {
        button: button,
        display: display,
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

  document.addEventListener('DOMContentLoaded', function(){
    var form = document.querySelector('.registration-page form');
    var input = document.getElementById('enrollee-number');
    var button = document.getElementById('generate-enrollee-number');

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

    if(form){
      form.addEventListener('reset', function(){
        window.setTimeout(function(){
          syncGripTestFollowUp();
          syncGaitTestFollowUp();
        }, 0);
      });
    }
  });
})();
