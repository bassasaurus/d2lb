export const DEVICE_TYPES = [
  ['FFS', 'Full Flight Simulator'], ['FTD', 'Flight Training Device'], ['ATD', 'Aviation Training Device'],
];

export function simulatorEntryErrors(values) {
  if (!['', '141', '142'].includes(values.training_program || '')) return { training_program: 'Choose Part 141 or Part 142.' };
  if (!values.simulator) return {};
  if (!DEVICE_TYPES.some(([type]) => type === values.device_type)) return { device_type: 'Select device type.' };
  if (values.device_type === 'ATD' && !['BATD', 'AATD'].includes(values.atd_type)) return { atd_type: 'Select BATD or AATD.' };
  if (!String(values.device_id || '').trim()) return { device_id: 'Device ID required.' };
  if (values.instrument_credit_eligible && !values.dual) return { dual: 'Dual required.' };
  const duration = Number(values.duration || 0);
  const instrument = Number(values.simulated_instrument || 0);
  if (!(duration > 0)) return values.instrument_credit_eligible ? { duration: 'Duration required.' } : {};
  if (instrument > duration) return { simulated_instrument: 'Cannot exceed duration.' };
  if (values.instrument_credit_eligible && !(instrument > 0)) return { simulated_instrument: 'Instrument time required.' };
  return {};
}

export function prepareFlightEntry(values) {
  return { ...values,
    ...(values.simulator ? { cross_country: false } : {}),
    ...(values.simulator && (values.device_type || values.device_id) ? { registration: null } : {}),
    atd_type: values.simulator && values.device_type === 'ATD' ? (values.atd_type || '') : '',
    instrument_credit_eligible: Boolean(values.simulator && values.instrument_credit_eligible),
    training_program: values.simulator ? (values.training_program || '') : '',
    device_type: values.simulator ? (values.device_type || '') : '',
    device_id: values.simulator ? String(values.device_id || '').trim() : '',
  };
}

export function sessionIdentifier(item) {
  return item?.simulator ? [item.device_type || 'Sim', item.device_id].filter(Boolean).join(' ') : item?.registration;
}
