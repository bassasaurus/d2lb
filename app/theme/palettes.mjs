export const PALETTES = {
  light: {
    background: '#f5f6f8', surface: '#ffffff', text: '#14181f', muted: '#565e6b',
    border: '#c9ced6', primary: '#0000cd', selected: '#eef3ff', highlight: '#dddddd',
    danger: '#ba1a2c', success: '#18743b', warning: '#805600', syncPending: '#b45309', placeholder: '#687281',
    actionBlue: '#0000cd', actionDanger: '#b42332', actionGreen: '#008000',
    onAction: '#ffffff', shadow: '#000000',
  },
  dark: {
    background: '#0f131a', surface: '#191f29', text: '#edf1f7', muted: '#b1bbca',
    border: '#465263', primary: '#a8c7ff', selected: '#293d5c', highlight: '#26303e',
    danger: '#ffb1b8', success: '#85d6a1', warning: '#ffca63', syncPending: '#ffad66', placeholder: '#a0acbd',
    actionBlue: '#234ba5', actionDanger: '#a42636', actionGreen: '#176b37',
    onAction: '#ffffff', shadow: '#000000',
  },
};
export function effectiveScheme(preference, systemScheme) {
  return preference === 'dark' || preference === 'light' ? preference : systemScheme === 'dark' ? 'dark' : 'light';
}
