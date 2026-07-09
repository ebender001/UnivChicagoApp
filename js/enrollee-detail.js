// enrollee-detail.js
// Displays enrollee details and read-only survey data.

(function(){
  function setStatus(message){
    var status = document.getElementById('enrollee-detail-status');
    if(status) status.textContent = message;
  }

  function renderDetails(result){
    var subtitle = document.getElementById('enrollee-detail-subtitle');
    var frailty = document.getElementById('frailty-section');
    var frailtyContainer = document.getElementById('frailty-score-table');
    var surveySection = document.getElementById('survey-readonly-section');
    var surveyContainer = document.getElementById('survey-readonly-fields');
    var enrollee = result && result.enrollee;
    var survey = result && result.survey;
    var detailRenderer = window.BeFitMeEnrolleeDetail;

    if(!detailRenderer) return;

    if(subtitle && enrollee){
      subtitle.textContent = 'Enrollee ' + ((enrollee.fields && enrollee.fields.enrolleeNumber) || enrollee.objectId);
    }

    if(frailty) frailty.hidden = false;
    if(surveySection) surveySection.hidden = false;
    detailRenderer.renderFrailty(frailtyContainer, enrollee, survey, { expandDetails: true });
    detailRenderer.renderSurvey(surveyContainer, survey);
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
