const LEVEL_COLORS = ['#9e9e9e', '#4caf50', '#ffc107', '#fb8c00', '#e53935'];

const ALLERGEN_ICONS = {
  birch: 'mdi:tree-outline',
  alder: 'mdi:tree',
  hazel: 'mdi:tree',
  ash: 'mdi:tree-outline',
  beech: 'mdi:tree',
  oak: 'mdi:tree',
  grass: 'mdi:grass',
  rye: 'mdi:grass',
  mugwort: 'mdi:flower-outline',
  wormwood: 'mdi:flower-outline',
  ragweed: 'mdi:flower-pollen',
  ambrosia: 'mdi:flower-pollen',
  plane: 'mdi:tree',
  olive: 'mdi:tree',
  cypress: 'mdi:pine-tree',
  linden: 'mdi:tree',
  lime: 'mdi:tree',
  chestnut: 'mdi:tree',
  nettle: 'mdi:flower-outline',
  plantain: 'mdi:flower-outline',
  dock: 'mdi:flower-outline',
  sorrel: 'mdi:flower-outline',
  fungal: 'mdi:mushroom-outline',
  mold: 'mdi:mushroom-outline',
  spore: 'mdi:mushroom-outline',
};

function iconForAllergen(key) {
  const normalized = (key || '').toLowerCase();
  for (const [needle, icon] of Object.entries(ALLERGEN_ICONS)) {
    if (normalized.includes(needle)) return icon;
  }
  return 'mdi:flower-pollen';
}

function colorForLevel(level, maxLevel) {
  if (level === null || level === undefined || Number.isNaN(level)) return LEVEL_COLORS[0];
  const ratio = maxLevel > 0 ? level / maxLevel : 0;
  const index = Math.max(0, Math.min(LEVEL_COLORS.length - 1, Math.round(ratio * (LEVEL_COLORS.length - 1))));
  return LEVEL_COLORS[index];
}

// Different pollen integrations expose the severity level in different
// places: as the entity's primary state (plain number), or as one of a
// handful of common attribute names. Checked in order of specificity.
function readLevel(stateObj) {
  const attrs = stateObj.attributes || {};
  const numericKeys = ['numeric_state', 'level', 'pollen_level', 'index', 'value'];
  for (const key of numericKeys) {
    const raw = attrs[key];
    if (raw !== undefined && raw !== null && raw !== '' && !Number.isNaN(Number(raw))) {
      return Number(raw);
    }
  }
  if (!Number.isNaN(Number(stateObj.state))) {
    return Number(stateObj.state);
  }
  return null;
}

function readLevelLabel(stateObj) {
  const attrs = stateObj.attributes || {};
  const textKeys = ['named_state', 'level_name', 'state_text'];
  for (const key of textKeys) {
    if (attrs[key]) return attrs[key];
  }
  if (Number.isNaN(Number(stateObj.state)) && stateObj.state !== 'unknown' && stateObj.state !== 'unavailable') {
    return stateObj.state;
  }
  return null;
}

function readAllergenName(stateObj, override) {
  if (override) return override;
  const attrs = stateObj.attributes || {};
  return attrs.friendly_name || attrs.allergen || attrs.name_en || stateObj.entity_id;
}

function readAllergenKey(stateObj) {
  const attrs = stateObj.attributes || {};
  return attrs.allergen_slug || attrs.name_en || attrs.friendly_name || stateObj.entity_id;
}

function normalizeEntities(list) {
  return (list || []).map((item) => (typeof item === 'string' ? { entity: item } : item));
}

class PollenCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities || !config.entities.length) {
      throw new Error('At least one entity is required');
    }
    this._config = {
      title: 'Pollen',
      show_title: true,
      hide_zero: true,
      sort_by_level: true,
      max_level: 4,
      ...config,
      entities: normalizeEntities(config.entities),
    };
    this._built = false;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 2;
  }

  _buildDom() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          padding: 12px 16px 16px;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 10px;
          color: var(--primary-text-color);
        }
        .header ha-icon { color: var(--primary-color); }
        .rows { display: flex; flex-direction: column; gap: 6px; }
        .row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 4px;
          border-radius: 10px;
          cursor: pointer;
        }
        .row:hover { background: var(--secondary-background-color, rgba(127,127,127,.08)); }
        .row-name {
          flex: 1;
          font-size: .92rem;
          color: var(--primary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .row-level-icon {
          width: 30px; height: 30px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .row-level-icon ha-icon { --mdc-icon-size: 17px; color: #fff; }
        .empty { font-size: .9rem; color: var(--secondary-text-color); padding: 8px 4px; }
      </style>
      <ha-card>
        <div class="header">
          <ha-icon icon="mdi:flower-pollen"></ha-icon>
          <span class="header-title"></span>
        </div>
        <div class="rows"></div>
      </ha-card>
    `;
    this._el = {
      header: this.shadowRoot.querySelector('.header'),
      headerTitle: this.shadowRoot.querySelector('.header-title'),
      rows: this.shadowRoot.querySelector('.rows'),
    };
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this._built) {
      this._buildDom();
      this._built = true;
    }
    const cfg = this._config;
    const hass = this._hass;

    this._el.header.style.display = cfg.show_title ? 'flex' : 'none';
    this._el.headerTitle.textContent = cfg.title;

    let entries = cfg.entities
      .map((item) => {
        const stateObj = hass.states[item.entity];
        if (!stateObj) return null;
        return {
          entity: item.entity,
          level: readLevel(stateObj),
          label: readLevelLabel(stateObj),
          name: readAllergenName(stateObj, item.name),
          icon: item.icon || iconForAllergen(readAllergenKey(stateObj)),
        };
      })
      .filter(Boolean);

    if (cfg.hide_zero) {
      entries = entries.filter((entry) => (entry.level || 0) > 0);
    }
    if (cfg.sort_by_level) {
      entries.sort((a, b) => (b.level || 0) - (a.level || 0));
    }

    this._el.rows.innerHTML = '';
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = cfg.empty_text || 'No elevated pollen levels right now';
      this._el.rows.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.addEventListener('click', () => {
        row.dispatchEvent(
          new CustomEvent('hass-more-info', {
            detail: { entityId: entry.entity },
            bubbles: true,
            composed: true,
          })
        );
      });

      const name = document.createElement('div');
      name.className = 'row-name';
      name.textContent = entry.name;

      const levelIcon = document.createElement('div');
      levelIcon.className = 'row-level-icon';
      levelIcon.style.background = colorForLevel(entry.level, cfg.max_level);
      levelIcon.title = entry.label || (entry.level !== null ? String(entry.level) : '?');
      const icon = document.createElement('ha-icon');
      icon.setAttribute('icon', entry.icon);
      levelIcon.appendChild(icon);

      row.appendChild(name);
      row.appendChild(levelIcon);
      this._el.rows.appendChild(row);
    });
  }

  static getStubConfig() {
    return { entities: [], title: 'Pollen' };
  }
}

class PollenCardBadge extends HTMLElement {
  setConfig(config) {
    if (!config.entities || !config.entities.length) {
      throw new Error('At least one entity is required');
    }
    this._config = { max_level: 4, ...config, entities: normalizeEntities(config.entities) };
    this._built = false;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 1;
  }

  _buildDom() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .badge {
          width: 22px; height: 22px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 2px var(--card-background-color, #fff);
          cursor: pointer;
        }
        .badge ha-icon { --mdc-icon-size: 13px; color: #fff; }
      </style>
      <div class="badge"><ha-icon icon="mdi:flower-pollen"></ha-icon></div>
    `;
    this._el = {
      badge: this.shadowRoot.querySelector('.badge'),
      icon: this.shadowRoot.querySelector('ha-icon'),
    };
    this._el.badge.addEventListener('click', () => {
      if (!this._topEntry) return;
      this.dispatchEvent(
        new CustomEvent('hass-more-info', {
          detail: { entityId: this._topEntry.entity },
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this._built) {
      this._buildDom();
      this._built = true;
    }
    const cfg = this._config;
    const hass = this._hass;

    const entries = cfg.entities
      .map((item) => {
        const stateObj = hass.states[item.entity];
        if (!stateObj) return null;
        return {
          entity: item.entity,
          level: readLevel(stateObj),
          icon: item.icon || iconForAllergen(readAllergenKey(stateObj)),
        };
      })
      .filter((entry) => entry && (entry.level || 0) > 0)
      .sort((a, b) => (b.level || 0) - (a.level || 0));

    this._topEntry = entries[0] || null;
    this.style.display = this._topEntry ? 'inline-flex' : 'none';
    if (!this._topEntry) return;

    this._el.badge.style.background = colorForLevel(this._topEntry.level, cfg.max_level);
    this._el.icon.setAttribute('icon', this._topEntry.icon);
  }

  static getStubConfig() {
    return { entities: [] };
  }
}

customElements.define('pollen-card', PollenCard);
customElements.define('pollen-card-badge', PollenCardBadge);

window.customCards = window.customCards || [];
window.customCards.push(
  {
    type: 'pollen-card',
    name: 'Pollen Card',
    description: 'Shows current pollen exposure levels from any integration that exposes a numeric severity level.',
  },
  {
    type: 'pollen-card-badge',
    name: 'Pollen Card Badge',
    description: 'Compact badge showing the worst currently active pollen level from a set of sensors.',
  }
);
