// DOM layer: floating labels, hint bar, location panels, NPC dialog,
// and the fade used for interior transitions. Keeps all document access
// out of the 3D modules.

const el = (id) => document.getElementById(id);

export function createUI() {
  const label = el('float-label');
  const hint = el('hint');
  const panel = el('panel');
  const dialog = el('dialog');
  const fadeEl = el('fade');

  let dialogState = null; // { npc, index }
  let onModalChange = () => {};

  function modalOpen() {
    return !panel.classList.contains('hidden') || dialogState !== null;
  }

  function closePanel() {
    panel.classList.add('hidden');
    onModalChange();
  }

  function closeDialog() {
    dialogState = null;
    dialog.classList.add('hidden');
    onModalChange();
  }

  el('panel-close').addEventListener('click', closePanel);

  const ui = {
    get modalOpen() { return modalOpen(); },
    set onModalChange(fn) { onModalChange = fn; },

    showLocation(loc) {
      el('panel-name').textContent = loc.name;
      el('panel-blurb').textContent = loc.blurb;
      const body = el('panel-body');
      body.innerHTML = '';
      const section = (title, items, asList) => {
        if (!items || !items.length) return;
        if (title) {
          const h = document.createElement('h4');
          h.textContent = title;
          body.appendChild(h);
        }
        if (asList) {
          const ul = document.createElement('ul');
          for (const item of items) {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
          }
          body.appendChild(ul);
        } else {
          for (const item of items) {
            const p = document.createElement('p');
            p.textContent = item;
            body.appendChild(p);
          }
        }
      };
      section(null, loc.description, false);
      section("Who's here", loc.whoIsHere, true);
      section('Services', loc.services, true);
      section('Rumors & hooks', loc.rumors, true);
      panel.classList.remove('hidden');
      panel.scrollTop = 0;
      onModalChange();
    },

    showDialog(npc) {
      dialogState = { npc, index: 0 };
      el('dialog-name').textContent = npc.name + (npc.role ? ` — ${npc.role}` : '');
      el('dialog-portrait').style.background =
        `radial-gradient(circle at 50% 32%, #${npc.look.head.toString(16).padStart(6, '0')} 0 38%, #${npc.look.body.toString(16).padStart(6, '0')} 42% 100%)`;
      el('dialog-line').textContent = npc.lines[0];
      el('dialog-more').textContent = npc.lines.length > 1 ? 'E ▸' : 'E ✕';
      dialog.classList.remove('hidden');
      onModalChange();
    },

    // returns true while the dialog stays open
    advanceDialog() {
      if (!dialogState) return false;
      dialogState.index += 1;
      const { npc, index } = dialogState;
      if (index >= npc.lines.length) {
        closeDialog();
        return false;
      }
      el('dialog-line').textContent = npc.lines[index];
      el('dialog-more').textContent = index < npc.lines.length - 1 ? 'E ▸' : 'E ✕';
      return true;
    },

    closeModals() {
      if (dialogState) closeDialog();
      if (!panel.classList.contains('hidden')) closePanel();
    },

    // hotspot label + hint; screen = {x, y, visible} from camera projection
    updateTarget(hotspot, name, verb, screen) {
      if (!hotspot || modalOpen()) {
        label.classList.add('hidden');
        hint.classList.add('hidden');
        return;
      }
      hint.innerHTML = `<b>E</b> &nbsp;${verb} — ${name}`;
      hint.classList.remove('hidden');
      if (screen && screen.visible) {
        label.textContent = name;
        label.style.left = `${screen.x}px`;
        label.style.top = `${screen.y}px`;
        label.classList.remove('hidden');
      } else {
        label.classList.add('hidden');
      }
    },

    fade(midpoint) {
      fadeEl.classList.add('dark');
      setTimeout(() => {
        midpoint();
        setTimeout(() => fadeEl.classList.remove('dark'), 60);
      }, 380);
    },
  };

  return ui;
}
