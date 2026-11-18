/* =========================================================
   b'zliQué Beauty Bar — shared script
   Used by: index.html, service.html
   ========================================================= */

/* ---------- GOOGLE SHEETS CONNECTION ----------
   Paste the Web app URL you get after deploying Code.gs
   (Apps Script > Deploy > New deployment > Web app).
   It looks like https://script.google.com/macros/s/AKfy.../exec        */
const BOOKING_ENDPOINT = "https://script.google.com/macros/s/AKfycbylE-NYgaWMzsaX-JKYeK9m8Qd8Pj__vheKVVc8cdIdPxERotWJvhj-oZqW2RnO39V2/exec";
const DEPOSIT_AMOUNT = 10; // keep in sync with CONFIG.DEPOSIT_AMOUNT in Code.gs

/* ---------- SERVICE DATA ----------
   Single source of truth for every service. Edit prices, durations,
   descriptions and photos here — the booking dropdown and the detail
   page (service.html) both read from this object.

   - The key (e.g. "brow-lamination-sculpt-tint") is the id used in the URL:
     service.html?service=brow-lamination-sculpt-tint
     It must match the link on the matching card in index.html.
   - image: put a file name here (e.g. "brow-lamination.jpg") to show a
     photo on that service's page. Leave it "" to show the placeholder.
   - If you rename a service ("name"), also rename it in Code.gs
     (SERVICE_INFO) so the sheet accepts it.                          */
const SERVICES = {
  "brow-lamination-sculpt-tint": {
    name: "Brow Lamination + Sculpt + Tint",
    category: "Brow Services",
    price: "$50",
    duration: "1 hr 30 mins",
    image: "",
    description:
      "Smooth, lift and set your natural brow hairs into a fuller, more defined shape. Finished with a custom tint to enhance colour and definition for a polished and sleek look. Includes brow mapping and shaping with wax/razor clean-up.\n\n" +
      "Hybrid tint stains skin up to 7–10 days; hairs are stained up to 4–6 weeks.\n" +
      "Lamination results last 4–6 weeks.\n" +
      "Results may vary based on skin type, aftercare and lifestyle.\n\n" +
      "*PPD-free tint also available for clients with allergies/sensitive skin."
  },
  "brow-lamination-sculpt": {
    name: "Brow Lamination + Sculpt (No Tint)",
    category: "Brow Services",
    price: "$50",
    duration: "1 hr 30 mins",
    image: "",
    description:
      "Smooth, lift and set your natural brow hairs for a fuller look. Includes brow mapping and shaping with wax/razor clean-up to refine the brows and create a beautifully defined shape.\n\n" +
      "Lamination results last 4–6 weeks."
  },
  "brow-lamination-maintenance": {
    name: "Brow Lamination Maintenance",
    category: "Brow Services",
    price: "$35",
    duration: "1 hr 30 mins",
    image: "",
    description:
      "This maintenance service is designed to refresh and nourish your brows while maintaining their shape and appearance. Includes a conditioning treatment, relaxing hot towel, brow sculpting, and tint if required to refresh your colour and definition.\n\n" +
      "Recommended 3–6 weeks after your last brow lamination."
  },
  "brow-henna-sculpt": {
    name: "Henna Brows + Brow Sculpt",
    category: "Brow Services",
    price: "$30",
    duration: "1 hr 30 mins",
    image: "",
    description:
      "A complete brow transformation featuring mapping and shaping to create a flattering brow design, followed by henna to stain both the brow hairs and skin. Ideal for adding definition and creating a fuller, more structured appearance.\n\n" +
      "*Henna lasts up to 10–14 days on the skin and up to 6 weeks on the hairs."
  },
  "brow-sculpt-tint": {
    name: "Brow Sculpt + Tint",
    category: "Brow Services",
    price: "$30",
    duration: "1 hr 30 mins",
    image: "",
    description:
      "Refresh and define your natural brows with a wax and/or razor clean-up to remove unwanted hair and refine the shape, followed by a custom tint to enhance the colour and create a fuller appearance.\n\n" +
      "Hybrid tint stains skin up to 7–10 days; hairs are stained up to 4–6 weeks.\n" +
      "*PPD-free tint also available for clients with allergies/sensitive skin."
  },
  "brow-sculpt": {
    name: "Brow Sculpt",
    category: "Brow Services",
    price: "$25",
    duration: "1 hr",
    image: "",
    description:
      "This treatment includes detailed brow mapping to create the most flattering shape for your facial features, followed by expert shaping and clean-up using wax and/or a precision razor."
  },
  "brow-extensions": {
    name: "Brow Extensions (Add-On)",
    category: "Brow Services",
    price: "$20",
    duration: "30 mins",
    image: "",
    description:
      "Individual brow fibres are carefully applied to help fill sparse areas and add realistic-looking fullness and definition. A great add-on for clients wanting to enhance areas where natural brow hair is thin or missing."
  },
  "lash-natural-clusters": {
    name: "Natural Clusters",
    category: "Lash Services",
    price: "$25",
    duration: "45 mins",
    image: "",
    description:
      "A soft, lightweight cluster lash set designed to complement your eye shape using subtle lengths and fullness. Perfect for an effortless everyday look that still gives your eyes a beautiful lift.\n\n" +
      "Cluster lash sets are designed for short-term wear. Proper aftercare is essential to help protect your natural lashes."
  },
  "lash-hybrid-wispy": {
    name: "Hybrid Wispy Clusters",
    category: "Lash Services",
    price: "$25",
    duration: "45 mins",
    image: "",
    description:
      "A fuller, more textured cluster lash set combining varying lengths to create a soft, wispy finish. Perfect for clients who want more definition and dimension while still keeping the look wearable and flattering.\n\n" +
      "Cluster lash sets are designed for short-term wear. Proper aftercare is essential to help protect your natural lashes."
  }
};

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- NAV DROPDOWN (every page) ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const dropdown = document.getElementById('dropdown');
  if (menuToggle && dropdown) {
    menuToggle.addEventListener('click', function () {
      const isOpen = dropdown.classList.toggle('open');
      menuToggle.classList.toggle('open', isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
    dropdown.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        dropdown.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- SERVICE DETAIL PAGE (service.html) ---------- */
  const detail = document.getElementById('serviceDetail');
  if (detail) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('service');
    const data = SERVICES[id];
    const bookBtn = document.getElementById('detailBookBtn');
    const photoBox = document.getElementById('detailPhoto');

    if (data) {
      document.title = data.name + " — b'zliQué Beauty Bar";
      document.getElementById('detailCategory').textContent = data.category;
      document.getElementById('detailName').textContent = data.name;
      document.getElementById('detailPrice').textContent =
        data.price + (data.duration ? '  ·  ' + data.duration : '');
      document.getElementById('detailDesc').textContent = data.description;
      bookBtn.href = 'index.html?service=' + encodeURIComponent(id) + '#book';
      bookBtn.querySelector('.tile-text p').textContent =
        'Reserve your spot with a $' + DEPOSIT_AMOUNT + ' deposit';

      // Show the service photo if one has been set, otherwise keep the placeholder
      if (data.image && photoBox) {
        photoBox.textContent = '';
        const img = document.createElement('img');
        img.src = data.image;
        img.alt = data.name;
        photoBox.appendChild(img);
        photoBox.classList.add('has-image');
      }
    } else {
      // No valid ?service= id in the URL — show a friendly fallback.
      document.getElementById('detailCategory').textContent = 'Service not found';
      document.getElementById('detailName').textContent = 'Please choose a service from the menu';
      document.getElementById('detailPrice').textContent = '';
      document.getElementById('detailDesc').textContent =
        "We couldn't find that service. Head back to the menu and pick one to see its details.";
      bookBtn.href = 'index.html#services';
      bookBtn.querySelector('.tile-text h4').textContent = 'Back to services';
      bookBtn.querySelector('.tile-text p').textContent = '';
      if (photoBox) photoBox.style.display = 'none';
    }
  }

  /* ---------- BOOKING / DEPOSIT FORM (index.html) ---------- */
  const form = document.getElementById('bookingForm');
  if (form) {
    // Build the service dropdown from the SERVICES list above
    const select = document.getElementById('service');
    const groups = {};
    Object.keys(SERVICES).forEach(function (key) {
      const s = SERVICES[key];
      if (!groups[s.category]) {
        const og = document.createElement('optgroup');
        og.label = s.category;
        select.appendChild(og);
        groups[s.category] = og;
      }
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name + ' — ' + s.price;
      groups[s.category].appendChild(opt);
    });

    // Don't allow picking dates in the past
    const dateInput = document.getElementById('date');
    if (dateInput) {
      const t = new Date();
      dateInput.min = t.getFullYear() + '-' +
        String(t.getMonth() + 1).padStart(2, '0') + '-' +
        String(t.getDate()).padStart(2, '0');
    }

    // If arriving from a service detail page (index.html?service=id#book),
    // preselect that service in the dropdown and jump straight to the form.
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get('service');
    if (incoming && SERVICES[incoming]) {
      select.value = SERVICES[incoming].name;
      document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const errorBox = document.getElementById('formError');
      const submitBtn = form.querySelector('button[type=submit]');
      errorBox.style.display = 'none';

      if (BOOKING_ENDPOINT.indexOf('PASTE_YOUR') === 0) {
        errorBox.textContent = 'Booking is not connected yet. Paste your Google Apps Script URL into script.js.';
        errorBox.style.display = 'block';
        return;
      }

      // Reads a field safely: a missing field gives '' instead of crashing the form
      const val = function (id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
      };

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      try {
        const payload = {
          service: val('service'),
          date: val('date'),
          time: val('time'),
          name: val('name'),
          email: val('email'),
          phone: val('phone'),
          notes: val('notes'),
          // Hidden spam trap: a checkbox real visitors never see or tick. Only an
          // actual tick counts, so browser autofill can't trigger it.
          trap: (function () {
            const el = document.getElementById('bz_trap');
            return !!(el && el.type === 'checkbox' && el.checked);
          })()
        };

        // text/plain avoids a CORS preflight, which Apps Script doesn't support
        const res = await fetch(BOOKING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (!result.ok || !result.bookingId) throw new Error(result.error || 'Your booking was not saved. Please try again.');

        const box = document.getElementById('confirmBox');
        document.getElementById('confirmText').textContent =
          'Thanks, ' + payload.name + '! Your ' + payload.service + ' request for ' + payload.date +
          ' at ' + payload.time + ' is saved (ref ' + result.bookingId + '). ' +
          'Check your email for how to send your $' + DEPOSIT_AMOUNT + ' deposit and confirm your spot.';
        box.style.display = 'block';
        form.querySelectorAll('input, select, textarea, button[type=submit], label, .row2, .deposit-line, .disclaimer')
          .forEach(function (el) { el.style.display = 'none'; });
        errorBox.style.display = 'none';
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        errorBox.textContent = err.message || 'Something went wrong. Please try again.';
        errorBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }
});

/* Jump straight to the booking section for the nav "Book Now" button. */
function scrollToBook() {
  const book = document.getElementById('book');
  if (book) book.scrollIntoView({ behavior: 'smooth' });
}