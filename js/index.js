// index.js
// Handles one-time managed data seeding from the dashboard home page.

(function(){
  function getStoredCurrentUser(){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.getStoredCurrentUser) return null;
    return window.BeFitMeAuth.getStoredCurrentUser();
  }

  function isSuperAdmin(){
    var user = getStoredCurrentUser();
    return Boolean(user && user.role === 'super_admin');
  }

  function setStatus(message, isError){
    var status = document.getElementById('seed-status');
    if(!status) return;

    status.textContent = message || '';
    status.hidden = !message;
    status.classList.toggle('form-error', Boolean(isError));
    status.classList.toggle('success', Boolean(message) && !isError);
  }

  function setButtonState(options){
    var button = document.getElementById('seed-managed-data-button');
    if(!button) return;

    button.disabled = Boolean(options && options.disabled);
    button.textContent = options && options.label ? options.label : 'Seed Managed Data';
  }

  function setDeleteButtonState(options){
    var button = document.getElementById('delete-seeded-data-button');
    if(!button) return;

    button.disabled = Boolean(options && options.disabled);
    button.textContent = options && options.label ? options.label : 'Delete Seeded Data';
  }

  function updateDeleteButtonVisibility(){
    var button = document.querySelector('[data-delete-seed-button]');
    if(button) button.hidden = !isSuperAdmin();
  }

  function setPanelVisibility(visible){
    var panel = document.querySelector('[data-seed-panel]');
    if(panel) panel.hidden = !visible;
  }

  function formatSeedSummary(result){
    if(!result) return 'Managed data was seeded.';

    return [
      'Seeded ',
      result.totalManagedEntries,
      ' managed entries: ',
      result.enrolleeCount,
      ' enrollees, ',
      result.unenrolledSurveyCount,
      ' completed unenrolled surveys, and watch data for ',
      result.watchDataEntries,
      ' entries using watches ',
      (result.watchNumbers || []).map(function(number){ return '#' + number; }).join(', '),
      '.'
    ].join('');
  }

  function loadSeedStatus(){
    if(!window.BeFitMeAuth || !window.BeFitMeAuth.hasActiveLogin || !window.BeFitMeAuth.hasActiveLogin()){
      setPanelVisibility(false);
      setStatus('', false);
      return;
    }

    setPanelVisibility(true);
    updateDeleteButtonVisibility();
    setButtonState({ disabled: true, label: 'Checking Seed Status...' });
    setDeleteButtonState({ disabled: true, label: 'Checking Seed Status...' });
    setStatus('', false);

    window.BeFitMeAuth.runCloudFunction('getManagedDataSeedStatus').then(function(result){
      if(result && result.seeded){
        setButtonState({ disabled: true, label: 'Managed Data Seeded' });
        setDeleteButtonState({ disabled: !isSuperAdmin(), label: 'Delete Seeded Data' });
        setStatus('Managed data was already seeded on ' + new Date(result.seededAt).toLocaleString() + '.', false);
        return;
      }

      setButtonState({ disabled: false, label: 'Seed Managed Data' });
      setDeleteButtonState({ disabled: true, label: 'Delete Seeded Data' });
      setStatus('This will create 14 enrollees, 6 completed unenrolled surveys, and 2 weeks of watch data.', false);
    }).catch(function(error){
      console.log('Unable to load seed status:', error);
      setButtonState({ disabled: true, label: 'Seed Managed Data' });
      setDeleteButtonState({ disabled: true, label: 'Delete Seeded Data' });
      setStatus(error && error.message ? error.message : 'Unable to load seed status.', true);
    });
  }

  function seedManagedData(){
    setButtonState({ disabled: true, label: 'Seeding Data...' });
    setStatus('Creating managed test data for your institution and specialty...', false);

    window.BeFitMeAuth.runCloudFunction('seedManagedData').then(function(result){
      setButtonState({ disabled: true, label: 'Managed Data Seeded' });
      setDeleteButtonState({ disabled: !isSuperAdmin(), label: 'Delete Seeded Data' });
      setStatus(formatSeedSummary(result), false);
    }).catch(function(error){
      console.log('Unable to seed managed data:', error);
      if(error && /already been created/i.test(error.message || '')){
        setButtonState({ disabled: true, label: 'Managed Data Seeded' });
        setDeleteButtonState({ disabled: !isSuperAdmin(), label: 'Delete Seeded Data' });
        setStatus(error.message, false);
      }else{
        setButtonState({ disabled: false, label: 'Seed Managed Data' });
        setDeleteButtonState({ disabled: true, label: 'Delete Seeded Data' });
        setStatus(error && error.message ? error.message : 'Unable to seed managed data.', true);
      }
    });
  }

  function deleteSeededData(){
    setButtonState({ disabled: true, label: 'Seed Managed Data' });
    setDeleteButtonState({ disabled: true, label: 'Deleting Seeded Data...' });
    setStatus('Deleting seeded data...', false);

    window.BeFitMeAuth.runCloudFunction('deleteManagedSeedData', {
      userId: getStoredCurrentUser() && getStoredCurrentUser().objectId
    }).then(function(result){
      var deletedTotal = 0;
      var deleted = result && result.deleted ? result.deleted : {};

      Object.keys(deleted).forEach(function(key){
        deletedTotal += Number(deleted[key]) || 0;
      });

      setButtonState({ disabled: false, label: 'Seed Managed Data' });
      setDeleteButtonState({ disabled: true, label: 'Delete Seeded Data' });
      setStatus('Deleted ' + deletedTotal + ' seeded records for this user. You can seed again now.', false);
    }).catch(function(error){
      console.log('Unable to delete seeded data:', error);
      setDeleteButtonState({ disabled: false, label: 'Delete Seeded Data' });
      loadSeedStatus();
      setStatus(error && error.message ? error.message : 'Unable to delete seeded data.', true);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    var button = document.getElementById('seed-managed-data-button');
    var deleteButton = document.getElementById('delete-seeded-data-button');
    if(!button) return;

    button.addEventListener('click', function(){
      if(!window.BeFitMeAuth || !window.BeFitMeAuth.hasActiveLogin || !window.BeFitMeAuth.hasActiveLogin()){
        setPanelVisibility(false);
        return;
      }

      if(!window.confirm('Seed one-time managed data for your institution and specialty?')){
        return;
      }

      seedManagedData();
    });

    if(deleteButton){
      deleteButton.addEventListener('click', function(){
        if(!window.BeFitMeAuth || !window.BeFitMeAuth.hasActiveLogin || !window.BeFitMeAuth.hasActiveLogin()){
          setPanelVisibility(false);
          return;
        }

        if(!isSuperAdmin()){
          setStatus('Only super_admin users can delete seeded data.', true);
          return;
        }

        if(!window.confirm('Delete all seeded data created for your user? This cannot be undone.')){
          return;
        }

        deleteSeededData();
      });
    }

    document.addEventListener('befitme:authchange', loadSeedStatus);
    loadSeedStatus();
  });
})();
