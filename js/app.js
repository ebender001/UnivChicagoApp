// Shared site behavior for BeFitMe
(function(){
  function setYear(elementId){
    var el = document.getElementById(elementId);
    if(el) el.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', function(){
    setYear('year');
    setYear('year-2');

    // Highlight active nav link (simple): adds `active` to matching href
    var links = document.querySelectorAll('.main-nav a');
    links.forEach(function(a){
      try{
        var href = a.getAttribute('href');
        if(href && location.pathname.endsWith(href)){
          a.classList.add('active');
        }
      }catch(e){/* noop */}
    });

    // Future shared behaviors:
    // - global fetch wrapper for authenticated requests
    // - theme toggle, layout preferences, keyboard shortcuts
  });
})();
