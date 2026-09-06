/**
 * Renders a message template, replacing {name}, {handle}, {date} and {days}
 * placeholders with the given values.
 */
function render(template, vars) {
  return String(template || '')
    .replace(/\{name\}/g, vars.name ?? '')
    .replace(/\{handle\}/g, vars.handle ?? '')
    .replace(/\{date\}/g, vars.date ?? '')
    .replace(/\{days\}/g, vars.days ?? '');
}

module.exports = { render };
