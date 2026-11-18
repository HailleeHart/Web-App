/* =========================================================
   b'zliQué Beauty Bar — shared script
   Used by: index.html, service.html
   ========================================================= */

/* ---------- FRESHA BOOKING LINK ----------
   >>> PUT YOUR FRESHA BOOKING LINK HERE (keep the quotes) <<<
   Every "Book" button on the site goes straight to it, in a new tab.
   Find it in Fresha: Marketing > Booking link (or Online booking).
   It looks like https://www.fresha.com/a/your-business-name-ajax-xxxx  */
const FRESHA_URL = "PASTE_YOUR_FRESHA_LINK_HERE";

/* OPTIONAL: send a specific service straight to its own Fresha page.
   Use the service id (the key in SERVICES below) and paste that service's
   Fresha link. Any service not listed here uses FRESHA_URL above.
   Example:  "brow-sculpt": "https://www.fresha.com/...",              */
const FRESHA_SERVICE_LINKS = {
};

/* Until the link above is filled in, Book buttons open Instagram so
   visitors are never sent to a dead end. */
const FALLBACK_URL = "https://www.instagram.com/bzlique.beautybar/";

function freshaLink(serviceId) {
  const own = serviceId && FRESHA_SERVICE_LINKS[serviceId];
  if (own) return own;
  return FRESHA_URL.indexOf('PASTE_YOUR') === 0 ? FALLBACK_URL : FRESHA_URL;
}

/* ---------- SERVICE DATA ----------
   Single source of truth for every service. Edit prices, durations,
   descriptions and photos here — the detail page (service.html) reads
   from this object.

   - The key (e.g. "brow-lamination-sculpt-tint") is the id used in the URL:
     service.html?service=brow-lamination-sculpt-tint
     It must match the link on the matching card in index.html.
   - image: put a file name here (e.g. "brow-lamination.jpg") to show a
     photo on that service's page. Leave it "" to show the placeholder.
   - Optional per-service Fresha links go in FRESHA_SERVICE_LINKS above. */
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

  /* ---------- BOOK BUTTONS (every page) ----------
     Any link with data-fresha opens the Fresha booking page in a new tab. */
  document.querySelectorAll('[data-fresha]').forEach(function (el) {
    el.href = freshaLink();
    el.target = '_blank';
    el.rel = 'noopener';
  });

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
      bookBtn.href = freshaLink(id);
      bookBtn.target = '_blank';
      bookBtn.rel = 'noopener';
      bookBtn.querySelector('.tile-text p').textContent = 'Opens our Fresha booking page';

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
      bookBtn.removeAttribute('target');
      bookBtn.querySelector('.tile-text h4').textContent = 'Back to services';
      bookBtn.querySelector('.tile-text p').textContent = '';
      if (photoBox) photoBox.style.display = 'none';
    }
  }
});