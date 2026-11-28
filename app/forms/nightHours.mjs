export const nightDurationRule = {
  name: 'night-duration',
  message: 'Night cannot exceed Duration.',
  test(value) {
    const duration = this.parent?.duration;
    if (duration == null || String(duration).trim() === '' || value == null) return true;
    const total = Number(duration);
    return !Number.isFinite(total) || total < 0 || !Number.isFinite(value) || value <= total;
  },
};
