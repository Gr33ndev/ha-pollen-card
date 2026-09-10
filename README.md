# Pollen Card

A Home Assistant Lovelace card for displaying pollen exposure levels. Instead of
targeting one specific integration, it reads whichever severity level a sensor
exposes — as its primary state, or in one of a handful of common attribute
names — so it works with most pollen integrations without any adapter code.

Ships two elements:

- `custom:pollen-card` — a list of active allergens, each with a colour-filled
  allergen icon indicating its severity level.
- `custom:pollen-card-badge` — a compact single-icon badge showing the worst
  currently active level from a set of sensors, meant for a dashboard badge row
  next to e.g. a person entity.

## How level detection works

For each configured entity, the card looks for a numeric level in this order:

1. One of the attributes `numeric_state`, `level`, `pollen_level`, `index`, `value`.
2. The entity's primary state, if it parses as a plain number.

For the human-readable label it checks `named_state`, `level_name`, `state_text`,
falling back to the primary state if that state is text rather than a number.

This covers integrations that put the level on the state directly (a plain
`"0"`–`"4"` string) as well as integrations that keep the state as localized
text and put the numeric level in an attribute (for example the
[Polleninformation](https://github.com/krissen/polleninformation) integration).
Anything with a different shape can still be supported by giving each entity
its own `name`/`icon` in the config and, if needed, adding a matching key to
the detection list in `pollen-card.js`.

## Installation

### HACS (custom repository)

1. HACS → the three-dot menu → Custom repositories.
2. Add `https://github.com/Gr33ndev/ha-pollen-card` with category **Lovelace**.
3. Install "Pollen Card", then hard-refresh your browser.

### Manual

1. Download `pollen-card.js` from the latest release.
2. Copy it into `config/www/`.
3. Add it as a dashboard resource: Settings → Dashboards → Resources →
   `/local/pollen-card.js`, type **JavaScript Module**.

## Configuration

### `pollen-card`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `entities` | list | **required** | Entity IDs, or `{entity, name, icon}` objects to override the auto-detected name/icon. |
| `title` | string | `Pollen` | Card header text. |
| `show_title` | boolean | `true` | Show or hide the header. |
| `hide_zero` | boolean | `true` | Hide entries currently at level 0. |
| `sort_by_level` | boolean | `true` | Sort entries by severity, highest first. |
| `max_level` | number | `4` | The top of the severity scale your integration uses (e.g. `3` for a 0–3 scale), used to pick the level colour. |
| `empty_text` | string | `No elevated pollen levels right now` | Text shown when nothing is active and `hide_zero` filtered everything out. |

```yaml
type: custom:pollen-card
title: Pollen
entities:
  - sensor.polleninformation_austria_48_2036_16_3436_birch
  - sensor.polleninformation_austria_48_2036_16_3436_grasses
  - entity: sensor.polleninformation_austria_48_2036_16_3436_fungal_spores
    name: Mould spores
```

### `pollen-card-badge`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `entities` | list | **required** | Same format as above. Typically the subset relevant to one person. |
| `max_level` | number | `4` | Same as above. |

```yaml
type: custom:pollen-card-badge
entities:
  - sensor.polleninformation_austria_48_2036_16_3436_birch
  - sensor.polleninformation_austria_48_2036_16_3436_ash
```

The badge hides itself entirely when none of its entities are currently above
level 0.

## Credits

This card was inspired by two existing projects, without reusing their code:

- [pollenprognos-card](https://github.com/krissen/pollenprognos-card) by
  [@krissen](https://github.com/krissen) and contributors, for the idea of a
  card that works across multiple pollen integrations rather than being tied
  to one.
- [ha-dwd-card](https://github.com/thkemmer/ha-dwd-card) by
  [@thkemmer](https://github.com/thkemmer), for the clean, compact visual
  style its pollen cards use.

If your integration isn't picked up correctly, an issue with the entity's
`attributes` payload is the fastest way to get it added to the detection list.

## License

MIT — see [LICENSE](LICENSE).
