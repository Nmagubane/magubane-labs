(function () {
  var EMAIL = 'hello@magubanelabs.co.za';
  var btn = document.getElementById('copy-email');
  var state = document.getElementById('copy-state');
  function selectFallback() {
    var link = document.querySelector('.addresses a');
    var range = document.createRange();
    range.selectNodeContents(link);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    state.textContent = 'Address selected. Press Ctrl+C to copy it.';
  }
  btn.addEventListener('click', function () {
    try {
      navigator.clipboard.writeText(EMAIL).then(function () {
        state.textContent = 'Copied ' + EMAIL;
      }, selectFallback);
    } catch (e) { selectFallback(); }
  });
})();
