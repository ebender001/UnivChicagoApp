(function(){
  var overlayId = 'survey-qr-overlay';
  var triggerId = 'show-survey-qr-code';
  var printClassName = 'printing-survey-qr';
  var copyResetTimer = null;

  function getSurveyUrl(){
    // Centralize survey URL creation so this can later return a tokenized link such as /survey.html?token=...
    return new URL('survey.html', window.location.href).toString();
  }

  function getQrImageUrl(surveyUrl, format, size){
    var imageFormat = format || 'png';
    var imageSize = size || 360;
    return 'https://api.qrserver.com/v1/create-qr-code/?format=' + encodeURIComponent(imageFormat) + '&size=' + imageSize + 'x' + imageSize + '&data=' + encodeURIComponent(surveyUrl);
  }

  function createOverlay(){
    var overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.className = 'qr-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'survey-qr-title');
    overlay.hidden = true;
    overlay.innerHTML = [
      '<div class="qr-panel">',
      '<h2 id="survey-qr-title">Open Survey on Another Device</h2>',
      '<p class="qr-panel-instructions">Scan this code with the patient iPad or phone to open the BeFitMe survey.</p>',
      '<div class="qr-code-frame">',
      '<img id="survey-qr-image" class="qr-code-image" alt="QR code linking to the BeFitMe survey page" />',
      '<div id="survey-qr-status" class="qr-status" hidden></div>',
      '<div id="survey-qr-url" class="qr-code-url"></div>',
      '</div>',
      '<div class="qr-panel-actions">',
      '<button type="button" class="btn primary" id="print-survey-qr-code">Print QR Code</button>',
      '<button type="button" class="btn" id="download-survey-qr-code">Download QR Code</button>',
      '<button type="button" class="btn" id="copy-survey-link">Copy Survey Link</button>',
      '<button type="button" class="btn" id="close-survey-qr-code">Close</button>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
    return overlay;
  }

  function ensureOverlay(){
    return document.getElementById(overlayId) || createOverlay();
  }

  function getQrElements(){
    return {
      overlay: document.getElementById(overlayId),
      trigger: document.getElementById(triggerId),
      image: document.getElementById('survey-qr-image'),
      url: document.getElementById('survey-qr-url'),
      status: document.getElementById('survey-qr-status'),
      printButton: document.getElementById('print-survey-qr-code'),
      downloadButton: document.getElementById('download-survey-qr-code'),
      copyButton: document.getElementById('copy-survey-link'),
      closeButton: document.getElementById('close-survey-qr-code')
    };
  }

  function showStatus(message, isError){
    var status = document.getElementById('survey-qr-status');
    if(!status) return;

    status.textContent = message || '';
    status.hidden = !message;
    status.classList.toggle('is-error', Boolean(isError));
    status.classList.toggle('is-success', Boolean(message) && !isError);
  }

  function closeOverlay(){
    var elements = getQrElements();
    if(!elements.overlay) return;

    elements.overlay.hidden = true;
    document.body.classList.remove(printClassName);
    showStatus('', false);

    if(elements.trigger) elements.trigger.focus();
  }

  function beginPrintMode(){
    document.body.classList.add(printClassName);
  }

  function endPrintMode(){
    document.body.classList.remove(printClassName);
  }

  function printQrCode(){
    beginPrintMode();
    window.print();
  }

  function downloadBlob(blob, filename){
    var objectUrl = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function(){
      window.URL.revokeObjectURL(objectUrl);
    }, 1000);
  }

  function downloadQrCode(){
    var surveyUrl = getSurveyUrl();
    var downloadUrl = getQrImageUrl(surveyUrl, 'png', 1024);

    showStatus('', false);

    return fetch(downloadUrl).then(function(response){
      if(!response.ok) throw new Error('Unable to download the QR code right now.');
      return response.blob();
    }).then(function(blob){
      downloadBlob(blob, 'befitme-survey-qr.png');
    }).catch(function(){
      showStatus('QR download is unavailable right now. You can still print the code or copy the survey link below.', true);
    });
  }

  function fallbackCopyText(text){
    var input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', 'readonly');
    input.style.position = 'fixed';
    input.style.top = '-9999px';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);

    try{
      return document.execCommand('copy');
    }catch(error){
      return false;
    }finally{
      input.remove();
    }
  }

  function resetCopyButtonLabel(){
    var copyButton = document.getElementById('copy-survey-link');
    if(copyButton) copyButton.textContent = 'Copy Survey Link';
  }

  function setCopyConfirmation(){
    var copyButton = document.getElementById('copy-survey-link');
    if(!copyButton) return;

    window.clearTimeout(copyResetTimer);
    copyButton.textContent = 'Copied';
    copyResetTimer = window.setTimeout(resetCopyButtonLabel, 1800);
  }

  function copySurveyLink(){
    var surveyUrl = getSurveyUrl();

    showStatus('', false);

    if(navigator.clipboard && typeof navigator.clipboard.writeText === 'function'){
      navigator.clipboard.writeText(surveyUrl).then(function(){
        setCopyConfirmation();
      }).catch(function(){
        if(fallbackCopyText(surveyUrl)){
          setCopyConfirmation();
          return;
        }

        showStatus('Copy is unavailable right now. Please copy the survey link shown below.', true);
      });
      return;
    }

    if(fallbackCopyText(surveyUrl)){
      setCopyConfirmation();
      return;
    }

    showStatus('Copy is unavailable right now. Please copy the survey link shown below.', true);
  }

  function handleQrLoadSuccess(){
    var elements = getQrElements();
    if(!elements.image) return;

    elements.image.hidden = false;
    if(elements.downloadButton) elements.downloadButton.disabled = false;
    showStatus('', false);
  }

  function handleQrLoadFailure(){
    var elements = getQrElements();
    if(elements.image) elements.image.hidden = true;
    if(elements.downloadButton) elements.downloadButton.disabled = true;
    showStatus('The QR code could not be loaded. Use the survey link below to open BeFitMe on another device.', true);
  }

  function openOverlay(){
    ensureOverlay();

    var surveyUrl = getSurveyUrl();
    var qrImageUrl = getQrImageUrl(surveyUrl, 'png', 360);
    var elements = getQrElements();

    if(elements.url) elements.url.textContent = surveyUrl;
    if(elements.image){
      elements.image.hidden = false;
      elements.image.src = qrImageUrl;
    }

    if(elements.downloadButton) elements.downloadButton.disabled = false;
    resetCopyButtonLabel();
    showStatus('', false);

    if(elements.overlay) elements.overlay.hidden = false;
    if(elements.printButton) elements.printButton.focus();
  }

  function bindEvents(){
    var elements = getQrElements();
    if(!elements.overlay || elements.overlay.dataset.bound === 'true') return;

    if(elements.image){
      elements.image.addEventListener('load', handleQrLoadSuccess);
      elements.image.addEventListener('error', handleQrLoadFailure);
    }

    if(elements.printButton) elements.printButton.addEventListener('click', printQrCode);
    if(elements.downloadButton) elements.downloadButton.addEventListener('click', downloadQrCode);
    if(elements.copyButton) elements.copyButton.addEventListener('click', copySurveyLink);
    if(elements.closeButton) elements.closeButton.addEventListener('click', closeOverlay);

    elements.overlay.addEventListener('click', function(ev){
      if(ev.target === elements.overlay) closeOverlay();
    });

    document.addEventListener('keydown', function(ev){
      var overlay = document.getElementById(overlayId);
      if(ev.key === 'Escape' && overlay && !overlay.hidden){
        closeOverlay();
      }
    });

    window.addEventListener('afterprint', endPrintMode);
    if(window.matchMedia){
      window.matchMedia('print').addEventListener('change', function(event){
        if(!event.matches) endPrintMode();
      });
    }
    elements.overlay.dataset.bound = 'true';
  }

  document.addEventListener('DOMContentLoaded', function(){
    var trigger = document.getElementById(triggerId);
    if(trigger){
      ensureOverlay();
      bindEvents();
      trigger.addEventListener('click', openOverlay);
    }
  });
})();
