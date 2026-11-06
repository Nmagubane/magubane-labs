(function () {
  // ---- 34 in 100: the waffle chart ----
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var waffle = document.getElementById('waffle');
  if (waffle) {
    var html = '';
    for (var i = 0; i < 100; i++) html += i < 34 ? '<i class="on" style="--i:' + i + '"></i>' : '<i></i>';
    waffle.innerHTML = html;
  }

  // ---- reveals: things appear as they scroll into view ----
  var revealed = function (el) {
    el.classList.add('in');
    if (el.classList.contains('why') && waffle) {
      // after the squares have filled in, let them settle back to size
      setTimeout(function () {
        Array.prototype.forEach.call(waffle.querySelectorAll('i.on'), function (sq) { sq.classList.add('settled'); });
      }, 34 * 22 + 700);
    }
  };
  var targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    Array.prototype.forEach.call(targets, revealed);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { revealed(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
  }

  // ---- the table tilts toward the pointer (mouse and pen only, never on touch) ----
  var table = document.querySelector('.table');
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (table && finePointer && !reduceMotion) {
    Array.prototype.forEach.call(table.querySelectorAll('.el'), function (tile) {
      tile.addEventListener('pointermove', function (ev) {
        var r = tile.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width;
        var y = (ev.clientY - r.top) / r.height;
        tile.style.transform = 'perspective(700px) rotateX(' + ((0.5 - y) * 16).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 16).toFixed(2) + 'deg) translateZ(14px)';
        tile.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        tile.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        table.classList.add('tilting');
      });
      tile.addEventListener('pointerleave', function () {
        tile.style.transform = '';
        table.classList.remove('tilting');
      });
    });
  }

  // ---- the header lifts once the page scrolls ----
  var head = document.querySelector('.site-head');
  if (head) {
    var onScroll = function () { head.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---- the worked problem: every wrong answer gets a reason ----
  var choices = Array.prototype.slice.call(document.querySelectorAll('.choice'));
  var feedback = document.getElementById('feedback');
  var steps = document.getElementById('steps');
  var reset = document.getElementById('reset');
  var reasons = {
    '1,6': '1 × 6 = 6, but 1 + 6 = 7, not 5. Try another pair.',
    '-2,-3': '(−2) × (−3) = 6, but −2 + −3 = −5. The signs are flipped. Try another pair.',
  };
  choices.forEach(function (btn) {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-a') + ',' + btn.getAttribute('data-b');
      choices.forEach(function (b) { if (!b.disabled) { b.setAttribute('aria-pressed', 'false'); b.classList.remove('wrong'); } });
      btn.setAttribute('aria-pressed', 'true');
      if (key === '2,3') {
        btn.classList.add('right');
        feedback.className = 'feedback right';
        feedback.textContent = '✓ 2 × 3 = 6 and 2 + 3 = 5. Now the working:';
        choices.forEach(function (b) { b.disabled = true; });
        steps.classList.add('shown');
        reset.hidden = false;
      } else {
        btn.classList.remove('wrong');
        void btn.offsetWidth; // restart the shake if the same wrong answer is pressed again
        btn.classList.add('wrong');
        feedback.className = 'feedback wrong';
        feedback.textContent = '✗ ' + reasons[key];
      }
    });
  });
  if (reset) {
    reset.addEventListener('click', function () {
      choices.forEach(function (b) { b.disabled = false; b.setAttribute('aria-pressed', 'false'); b.classList.remove('wrong', 'right'); });
      feedback.className = 'feedback';
      feedback.textContent = '';
      steps.classList.remove('shown');
      reset.hidden = true;
      if (choices[0]) choices[0].focus();
    });
  }

  // ---- Umzila: switch the maths subject and watch the route ----
  var trip = document.getElementById('trip');
  if (trip) {
    var mathsButtons = Array.prototype.slice.call(trip.querySelectorAll('[data-maths]'));
    mathsButtons.forEach(function (b) {
      b.addEventListener('click', function () {
        trip.classList.toggle('lit', b.getAttribute('data-maths') === 'lit');
        mathsButtons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
  }

  // ---- copy the enquiries address ----
  var EMAIL = 'hello@magubanelabs.co.za';
  var copyBtn = document.getElementById('copy-email');
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
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      try {
        navigator.clipboard.writeText(EMAIL).then(function () { state.textContent = 'Copied ' + EMAIL; }, selectFallback);
      } catch (e) { selectFallback(); }
    });
  }
})();
