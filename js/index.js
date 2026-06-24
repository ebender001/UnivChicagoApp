(function(){
  var overlayId = 'survey-qr-overlay';
  var triggerId = 'show-survey-qr-code';

  function getSurveyUrl(){
    return new URL('survey.html', window.location.href).toString();
  }

  function getQrImageUrl(surveyUrl){
    return 'https://api.qrserver.com/v1/create-qr-code/?format=svg&size=320x320&data=' + encodeURIComponent(surveyUrl);
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
      '<h2 id="survey-qr-title">Survey QR Code</h2>',
      '<p>Scan this code to open the BeFitMe survey page on another device.</p>',
      '<div class="qr-code-frame">',
      '<img id="survey-qr-image" class="qr-code-image" alt="QR code linking to the BeFitMe survey page" />',
      '<div id="survey-qr-url" class="qr-code-url"></div>',
      '</div>',
      '<div class="qr-panel-actions">',
      '<button type="button" class="btn primary" id="print-survey-qr-code">Print QR Code</button>',
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

  function closeOverlay(){
    var overlay = document.getElementById(overlayId);
    var trigger = document.getElementById(triggerId);
    if(!overlay) return;

    overlay.hidden = true;
    if(trigger) trigger.focus();
  }

  function printQrCode(){
    var surveyUrl = getSurveyUrl();
    var qrImageUrl = getQrImageUrl(surveyUrl);
    var printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');

    if(!printWindow){
      window.alert('Please allow pop-ups to print the survey QR code.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write([
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      '<title>Survey QR Code</title>',
      '<style>',
      'body{margin:0;padding:32px;font-family:Arial,sans-serif;color:#111;text-align:center;}',
      'h1{margin:0 0 12px;color:#800000;font-size:28px;}',
      'p{margin:0 0 20px;font-size:16px;line-height:1.5;}',
      'img{display:block;width:320px;max-width:100%;margin:0 auto 20px;}',
      '.url{font-size:14px;font-weight:700;word-break:break-all;}',
      '@media print{body{padding:24px;}}',
      '</style>',
      '</head>',
      '<body>',
      '<h1>BeFitMe Survey QR Code</h1>',
      '<p>Scan this code to open the survey page.</p>',
      '<img src="', qrImageUrl, '" alt="QR code linking to the BeFitMe survey page" />',
      '<div class="url">', surveyUrl, '</div>',
      '</body>',
      '</html>'
    ].join(''));
    printWindow.document.close();

    printWindow.onload = function(){
      printWindow.focus();
      printWindow.print();
    };
  }

  function openOverlay(){
    var overlay = ensureOverlay();
    var surveyUrl = getSurveyUrl();
    var qrImage = document.getElementById('survey-qr-image');
    var qrUrl = document.getElementById('survey-qr-url');
    var printButton = document.getElementById('print-survey-qr-code');
    var closeButton = document.getElementById('close-survey-qr-code');

    if(qrImage) qrImage.src = getQrImageUrl(surveyUrl);
    if(qrUrl) qrUrl.textContent = surveyUrl;

    overlay.hidden = false;

    if(printButton && !printButton.dataset.bound){
      printButton.addEventListener('click', printQrCode);
      printButton.dataset.bound = 'true';
    }

    if(closeButton && !closeButton.dataset.bound){
      closeButton.addEventListener('click', closeOverlay);
      closeButton.dataset.bound = 'true';
    }

    if(!overlay.dataset.bound){
      overlay.addEventListener('click', function(ev){
        if(ev.target === overlay) closeOverlay();
      });

      document.addEventListener('keydown', function(ev){
        var activeOverlay = document.getElementById(overlayId);
        if(ev.key === 'Escape' && activeOverlay && !activeOverlay.hidden){
          closeOverlay();
        }
      });

      overlay.dataset.bound = 'true';
    }

    if(printButton) printButton.focus();
  }

  document.addEventListener('DOMContentLoaded', function(){
    var trigger = document.getElementById(triggerId);
    if(!trigger) return;

    trigger.addEventListener('click', openOverlay);
  });
})();
