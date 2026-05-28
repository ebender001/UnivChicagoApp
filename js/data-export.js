// Handles export downloads from the Data Export page.
(function(){
  var crcTable = null;

  function showStatus(message, isError){
    var status = document.getElementById('data-export-status');
    if(!status) return;

    status.textContent = message;
    status.hidden = false;
    status.classList.toggle('form-error', Boolean(isError));
    status.classList.toggle('success', !isError);
  }

  function setButtonState(button, loading, label){
    button.disabled = loading;
    button.textContent = loading ? 'Preparing...' : label;
  }

  function downloadBlob(filename, blob){
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCsv(filename, csv){
    downloadBlob(filename || 'data.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }

  function downloadContent(filename, content, contentType){
    downloadBlob(filename || 'data.txt', new Blob([content || ''], { type: (contentType || 'text/plain') + ';charset=utf-8' }));
  }

  function getSelectedFormat(){
    var selected = document.querySelector('input[name="exportFormat"]:checked');
    return selected ? selected.value : 'csv';
  }

  function makeCrcTable(){
    var table = [];

    for(var n = 0; n < 256; n += 1){
      var c = n;
      for(var k = 0; k < 8; k += 1){
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }

    return table;
  }

  function crc32(bytes){
    if(!crcTable) crcTable = makeCrcTable();

    var crc = 0 ^ -1;
    for(var i = 0; i < bytes.length; i += 1){
      crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
    }

    return (crc ^ -1) >>> 0;
  }

  function pushUint16(parts, value){
    parts.push(value & 0xff, (value >>> 8) & 0xff);
  }

  function pushUint32(parts, value){
    parts.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  function createZipBlob(files){
    var encoder = new TextEncoder();
    var fileParts = [];
    var centralParts = [];
    var offset = 0;

    files.forEach(function(file){
      var nameBytes = encoder.encode(file.filename);
      var dataBytes = encoder.encode(file.content || file.csv || '');
      var checksum = crc32(dataBytes);
      var localHeader = [];

      pushUint32(localHeader, 0x04034b50);
      pushUint16(localHeader, 20);
      pushUint16(localHeader, 0);
      pushUint16(localHeader, 0);
      pushUint16(localHeader, 0);
      pushUint16(localHeader, 0);
      pushUint32(localHeader, checksum);
      pushUint32(localHeader, dataBytes.length);
      pushUint32(localHeader, dataBytes.length);
      pushUint16(localHeader, nameBytes.length);
      pushUint16(localHeader, 0);

      fileParts.push(new Uint8Array(localHeader), nameBytes, dataBytes);

      var centralHeader = [];
      pushUint32(centralHeader, 0x02014b50);
      pushUint16(centralHeader, 20);
      pushUint16(centralHeader, 20);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint32(centralHeader, checksum);
      pushUint32(centralHeader, dataBytes.length);
      pushUint32(centralHeader, dataBytes.length);
      pushUint16(centralHeader, nameBytes.length);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint32(centralHeader, 0);
      pushUint32(centralHeader, offset);
      centralParts.push(new Uint8Array(centralHeader), nameBytes);

      offset += localHeader.length + nameBytes.length + dataBytes.length;
    });

    var centralSize = centralParts.reduce(function(total, part){ return total + part.length; }, 0);
    var endRecord = [];
    pushUint32(endRecord, 0x06054b50);
    pushUint16(endRecord, 0);
    pushUint16(endRecord, 0);
    pushUint16(endRecord, files.length);
    pushUint16(endRecord, files.length);
    pushUint32(endRecord, centralSize);
    pushUint32(endRecord, offset);
    pushUint16(endRecord, 0);

    return new Blob(fileParts.concat(centralParts, [new Uint8Array(endRecord)]), { type: 'application/zip' });
  }

  function runExport(button, functionName, label, params, successMessage, defaultFilename){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.runCloudFunction){
      showStatus('Login is not ready. Please refresh and try again.', true);
      return;
    }

    setButtonState(button, true, label);

    window.BeFitMeAuth.runCloudFunction(functionName, params || {}).then(function(result){
      if(result && Array.isArray(result.files)){
        downloadBlob(result.filename || 'activity-data-files.zip', createZipBlob(result.files));
      }else{
        downloadContent(
          result && result.filename ? result.filename : defaultFilename,
          result && result.content !== undefined ? result.content : result && result.csv ? result.csv : '',
          result && result.contentType ? result.contentType : 'text/csv'
        );
      }
      if(params && params.exportType) closeActivityOptions();
      showStatus(successMessage, false);
    }).catch(function(error){
      console.log(label + ' export failed:', error);
      showStatus(error && error.message ? error.message : 'Unable to export ' + label.toLowerCase() + '.', true);
    }).finally(function(){
      setButtonState(button, false, label);
    });
  }

  function setupDownload(buttonId, functionName, label, successMessage, defaultFilename){
    var button = document.getElementById(buttonId);
    if(!button) return;

    button.addEventListener('click', function(){
      closeActivityOptions();
      runExport(button, functionName, label, { format: getSelectedFormat() }, successMessage, defaultFilename);
    });
  }

  function closeActivityOptions(){
    var panel = document.getElementById('activity-export-options');
    if(panel) panel.hidden = true;
  }

  function setupActivityOptions(){
    var toggle = document.getElementById('show-activity-options');
    var panel = document.getElementById('activity-export-options');
    if(!toggle || !panel) return;

    toggle.addEventListener('click', function(){
      panel.hidden = !panel.hidden;
    });

    panel.querySelectorAll('[data-activity-export]').forEach(function(button){
      var exportType = button.getAttribute('data-activity-export');
      var label = button.textContent;

      button.addEventListener('click', function(){
        runExport(button, 'downloadActivityData', label, {
          exportType: exportType,
          format: getSelectedFormat()
        }, 'Activity data exported.', 'activity-data.csv');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setupDownload('download-survey-data', 'downloadSurveyData', 'Survey Data', 'Survey data exported.', 'survey-data.csv');
    setupDownload('download-frailty-scores', 'downloadFrailtyScores', 'Frailty Scores', 'Frailty scores exported.', 'frailty-scores.csv');
    setupActivityOptions();
  });
})();
