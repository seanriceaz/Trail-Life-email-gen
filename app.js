/* ===== TRAIL LIFE PA-0002 EMAIL GENERATOR ===== */

// Brand colors mirrored here for inline email HTML
const COLORS = {
  navy:        '#1C3557',
  brown:       '#835D32',
  red:         '#CC2029',
  gold:        '#C8922A',
  tanLight:    '#F5EDD6',
  green:       '#4A7A3C',
  blue:        '#2B5FA1',
  orange:      '#C85A1F',
  white:       '#FFFFFF',
  textDark:    '#1a1a1a',
  textMuted:   '#555555',
  borderLight: '#DDD5C8',
};

const TAG_COLORS = {
  'Woodlands Trails': { bg: COLORS.green,  text: '#fff' },
  'Navigators':       { bg: COLORS.blue,   text: '#fff' },
  'Adventurers':      { bg: COLORS.orange, text: '#fff' },
};

let sections = [];
let nextId = 1;

// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-section-btn').addEventListener('click', addSection);
  document.getElementById('copy-html-btn').addEventListener('click', copyHtml);

  // Live update on settings change
  ['email-subject', 'email-intro', 'email-closing'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderPreview);
  });

  // Drag-and-drop on section list
  Sortable.create(document.getElementById('section-list'), {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: syncSectionOrder,
  });

  // Start with two example sections
  addSection('Upcoming Meeting', 'Join us for our regular troop meeting! We\'ll be working on badge requirements and planning our next campout.', 'Thursday, April 3 · 6:30 PM · First Baptist Church, Fellowship Hall', ['Woodlands Trails', 'Navigators', 'Adventurers']);
  addSection('Spring Campout', 'Don\'t miss our annual spring campout! Activities include orienteering, fire-starting, and shelter building. Permission slips due by April 7th.', 'April 18–20 · Blue Knob State Park · Bring full gear', ['Navigators', 'Adventurers']);

  renderPreview();
});

// ===== SECTION MANAGEMENT =====

function addSection(title = '', desc = '', detail = '', tags = []) {
  const id = nextId++;
  const tmpl = document.getElementById('section-template').content.cloneNode(true);
  const card = tmpl.querySelector('.section-card');

  card.dataset.id = id;
  card.querySelector('.section-title-input').value = title;
  card.querySelector('.section-desc').value = desc;
  card.querySelector('.section-detail').value = detail;

  // Pre-check tags
  card.querySelectorAll('.tag-check').forEach(cb => {
    if (tags.includes(cb.value)) cb.checked = true;
  });

  // Wire up live update events
  card.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', renderPreview);
    el.addEventListener('change', renderPreview);
  });

  // Delete button
  card.querySelector('.section-delete-btn').addEventListener('click', () => {
    card.remove();
    sections = sections.filter(s => s.id !== id);
    renderPreview();
  });

  document.getElementById('section-list').appendChild(card);

  sections.push({ id, card });
  renderPreview();
  return card;
}

function syncSectionOrder() {
  // Re-order `sections` array to match DOM order
  const cards = [...document.querySelectorAll('.section-card')];
  sections = cards.map(card => {
    const id = parseInt(card.dataset.id, 10);
    return { id, card };
  });
  renderPreview();
}

function getSectionData(card) {
  const tags = [...card.querySelectorAll('.tag-check:checked')].map(cb => cb.value);
  return {
    title:  card.querySelector('.section-title-input').value.trim(),
    desc:   card.querySelector('.section-desc').value.trim(),
    detail: card.querySelector('.section-detail').value.trim(),
    tags,
  };
}

// ===== EMAIL HTML GENERATION =====

function buildEmailHtml(forClipboard = false) {
  const subject = document.getElementById('email-subject').value.trim();
  const intro   = document.getElementById('email-intro').value.trim();
  const closing = document.getElementById('email-closing').value.trim();

  const domSections = [...document.querySelectorAll('.section-card')];
  const sectionBlocks = domSections.map(card => buildSectionBlock(getSectionData(card))).join('\n');

  const introHtml = intro
    ? intro.split('\n').filter(l => l.trim()).map(l => `
        <tr><td style="padding:0 0 10px; font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:${COLORS.textDark}; line-height:1.6;">${escHtml(l)}</td></tr>`).join('')
    : '';

  const closingHtml = closing
    ? closing.split('\n').filter(l => l.trim()).map(l => `
        <tr><td style="padding:0 0 8px; font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:${COLORS.textDark}; line-height:1.6;">${escHtml(l)}</td></tr>`).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#e8e3dc;">
<!-- Email wrapper -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#e8e3dc;">
<tr><td align="center" style="padding:24px 12px;">

  <!-- Email container -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:4px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.12);">

    <!-- ===== HEADER ===== -->
    <tr>
      <td style="background-color:${COLORS.navy}; padding:0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding:28px 32px 22px;">
              <!-- Logo row -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:14px; vertical-align:middle;">
                    <!-- Trail Life triangle logo mark -->
                    <div style="width:52px; height:52px; background-color:${COLORS.red}; clip-path:polygon(50% 4%, 97% 92%, 3% 92%); display:inline-block;"></div>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-family:'Open Sans',Arial,sans-serif; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:${COLORS.gold}; margin-bottom:4px;">Trail Life USA</div>
                    <div style="font-family:'Open Sans',Arial,sans-serif; font-size:22px; font-weight:700; color:#ffffff; letter-spacing:0.5px; line-height:1.2;">Troop PA-0002</div>
                  </td>
                </tr>
              </table>
              <!-- Subject line -->
              <div style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:rgba(255,255,255,0.65); margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.15);">${escHtml(subject)}</div>
            </td>
          </tr>
          <!-- Gold accent stripe -->
          <tr><td style="background-color:${COLORS.gold}; height:5px;"></td></tr>
        </table>
      </td>
    </tr>

    <!-- ===== INTRO ===== -->
    ${intro ? `<tr>
      <td style="padding:28px 32px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${introHtml}
        </table>
      </td>
    </tr>` : ''}

    <!-- ===== SECTIONS ===== -->
    ${sectionBlocks}

    <!-- ===== CLOSING ===== -->
    ${closing ? `<tr>
      <td style="padding:24px 32px 28px; border-top:1px solid ${COLORS.borderLight};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${closingHtml}
        </table>
      </td>
    </tr>` : ''}

    <!-- ===== FOOTER ===== -->
    <tr>
      <td style="background-color:${COLORS.navy}; padding:0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <!-- Brown/tan accent stripe -->
          <tr><td style="background-color:${COLORS.brown}; height:4px;"></td></tr>
          <tr>
            <td style="padding:20px 32px; text-align:center;">
              <div style="font-family:'Open Sans',Arial,sans-serif; font-size:12px; font-weight:700; color:${COLORS.gold}; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">Trail Life USA · Troop PA-0002</div>
              <div style="font-family:'Open Sans',Arial,sans-serif; font-size:11px; color:rgba(255,255,255,0.5); line-height:1.6;">You are receiving this email as a member of Troop PA-0002.</div>
              <div style="font-family:'Open Sans',Arial,sans-serif; font-size:11px; color:rgba(255,255,255,0.5); margin-top:4px;">
                <a href="https://traillifeusa.com" style="color:${COLORS.gold}; text-decoration:none;">traillifeusa.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

function buildSectionBlock(section) {
  if (!section.title && !section.desc && !section.detail) return '';

  const tagsHtml = section.tags.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr>${
        section.tags.map(tag => {
          const c = TAG_COLORS[tag] || { bg: COLORS.brown, text: '#fff' };
          return `<td style="padding-right:6px;"><span style="display:inline-block; padding:3px 10px; background-color:${c.bg}; color:${c.text}; font-family:'Open Sans',Arial,sans-serif; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; border-radius:30px;">${escHtml(tag)}</span></td>`;
        }).join('')
      }</tr></table>`
    : '';

  const detailHtml = section.detail
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:10px 0;">
        <tr>
          <td style="padding:10px 14px; background-color:${COLORS.tanLight}; border-left:3px solid ${COLORS.gold}; border-radius:2px; font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:${COLORS.brown}; font-weight:700;">
            ${escHtml(section.detail)}
          </td>
        </tr>
      </table>`
    : '';

  const descLines = section.desc
    ? section.desc.split('\n').filter(l => l.trim()).map(l =>
        `<tr><td style="padding:0 0 8px; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:${COLORS.textDark}; line-height:1.6;">${escHtml(l)}</td></tr>`
      ).join('')
    : '';

  return `
    <!-- Section: ${escHtml(section.title)} -->
    <tr>
      <td style="padding:0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0; border-radius:3px; overflow:hidden; border:1px solid ${COLORS.borderLight};">
          <!-- Section header -->
          <tr>
            <td style="background-color:${COLORS.brown}; padding:10px 16px;">
              <span style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; font-weight:700; color:#ffffff; letter-spacing:0.4px; text-transform:uppercase;">${escHtml(section.title)}</span>
            </td>
          </tr>
          <!-- Section body -->
          <tr>
            <td style="padding:16px 16px 12px; background-color:#ffffff;">
              ${detailHtml}
              ${descLines ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${descLines}</table>` : ''}
              ${tagsHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ===== PREVIEW RENDERING =====

function renderPreview() {
  const html = buildEmailHtml(false);
  document.getElementById('email-preview').innerHTML = html;
}

// ===== COPY HTML =====

function copyHtml() {
  const html = buildEmailHtml(true);
  navigator.clipboard.writeText(html).then(() => {
    const toast = document.getElementById('copy-toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = html;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const toast = document.getElementById('copy-toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  });
}

// ===== UTILITIES =====

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
