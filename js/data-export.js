// Handles export downloads from the Data Export page.
(function(){
  function showStatus(message, isError){
    var status = document.getElementById('data-export-status');
    if(!status) return;

    status.textContent = message;
    status.hidden = false;
    status.classList.toggle('form-error', Boolean(isError));
    status.classList.toggle('success', !isError);
  }

  function setButtonState(button, loading){
    button.disabled = loading;
    button.textContent = loading ? 'Preparing...' : 'Survey Data';
  }

  function downloadCsv(filename, csv){
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');

    link.href = url;
    link.download = filename || 'survey-data.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function setupSurveyDownload(){
    var button = document.getElementById('download-survey-data');
    if(!button) return;

    button.addEventListener('click', function(){
      if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
        showStatus('Login is not ready. Please refresh and try again.', true);
        return;
      }

      setButtonState(button, true);

      window.BeFitMeAuth.runCloudFunction('downloadSurveyData').then(function(result){
        downloadCsv(result && result.filename, result && result.csv ? result.csv : '');
        showStatus('Survey data exported.', false);
      }).catch(function(error){
        console.log('Survey data export failed:', error);
        showStatus(error && error.message ? error.message : 'Unable to export survey data.', true);
      }).finally(function(){
        setButtonState(button, false);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', setupSurveyDownload);
})();
