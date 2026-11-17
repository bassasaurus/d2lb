export function supportEmailURL({ recipient = 'support@direct2logbook.com', version, platform, osVersion, reference }) {
  const body = ['Please describe the problem and what you expected to happen:', '', '',
    '--- App diagnostics ---', `Version: ${version}`, `Device OS: ${platform} ${osVersion}`,
    reference ? `Diagnostic reference: ${reference}` : 'Diagnostic reference: unavailable (development or monitoring disabled)',
    '', 'Please do not include passwords or authentication tokens.'].join('\n');
  return `mailto:${recipient}?subject=${encodeURIComponent('Direct2Logbook support')}&body=${encodeURIComponent(body)}`;
}
