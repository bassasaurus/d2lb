import { FLAGS } from '../app/aircraft/fields.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { aircraftSchema, createAircraftSchema } from '../app/aircraft/validation.mjs';
import { CLASSES_BY_CATEGORY, CLASS_CHOICES, classChoices, classDisplay, classificationErrors, withAircraftCategory } from '../app/aircraft/classification.mjs';
import { ENGINE_CHOICES, WEIGHT_CHOICES, normalizeCharacteristics } from '../app/aircraft/characteristics.mjs';
import { aircraftValues } from '../app/aircraft/fields.mjs';
const valid = { aircraft_type: 'C172', aircraft_category: 'A', aircraft_class: 'SEL', piston: true, turbine: false, small: true };

test('aircraft requires type, category, class, and exactly one engine and weight', () => {
  assert.equal(aircraftSchema.isValidSync(valid), true);
  for (const key of ['aircraft_type', 'aircraft_category', 'aircraft_class']) {
    assert.equal(aircraftSchema.isValidSync({ ...valid, [key]: '' }), false, key);
  }
  assert.equal(aircraftSchema.isValidSync({ ...valid, piston: false }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, turbine: true }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, piston: false, turbine: true }), true);
  assert.equal(aircraftSchema.isValidSync({ ...valid, small: false }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, heavy: true }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, small: false, heavy: true }), true);
});
test('aircraft category and class must agree, with optional flags remaining optional', () => {
  assert.equal(aircraftSchema.isValidSync({ ...valid, aircraft_class: 'HELO' }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, aircraft_category: 'R', aircraft_class: 'HELO' }), true);
  assert.equal(aircraftSchema.isValidSync({ ...valid, aircraft_type: 'TOO-LONG-123' }), false);
});

test('every category and class combination follows the explicit FAA rating matrix', () => {
  for (const [category, classes] of Object.entries(CLASSES_BY_CATEGORY)) {
    assert.deepEqual(classChoices(category).map(([key]) => key), classes);
    for (const klass of ['', ...CLASS_CHOICES.map(([key]) => key)]) {
      assert.equal(aircraftSchema.isValidSync({ ...valid, aircraft_category: category, aircraft_class: klass }),
        classes.length ? classes.includes(klass) : klass === '', `${category}/${klass}`);
    }
  }
  assert.equal(aircraftSchema.isValidSync({ ...valid, aircraft_category: 'UNKNOWN' }), false);
});

test('category switching clears incompatible classes atomically and preserves unrelated fields', () => {
  const rotor = withAircraftCategory(valid, 'R');
  assert.equal(rotor.aircraft_class, '');
  assert.deepEqual(classificationErrors(rotor), { aircraft_class: 'Choose an aircraft class.' });
  assert.deepEqual(withAircraftCategory(valid, 'A'), valid);
  for (const category of ['GL', 'PL']) {
    const changed = withAircraftCategory(valid, category);
    assert.equal(changed.aircraft_class, '');
    assert.equal(changed.piston, true);
    assert.equal(changed.small, true);
    assert.equal(aircraftSchema.isValidSync(changed), true);
    assert.equal(classDisplay(category, ''), 'Not applicable');
  }
  assert.equal(classDisplay('A', ''), 'Not recorded');
  assert.equal(classDisplay('LTA', 'BALLOON'), 'Balloon');
});

test('an unchanged imported classification remains editable but changing it requires a valid choice', () => {
  const legacy = { ...valid, id: 19, aircraft_class: '' };
  const schema = createAircraftSchema(legacy);
  assert.equal(schema.isValidSync({ ...legacy, simple: true }), true);
  assert.equal(schema.isValidSync({ ...legacy, aircraft_category: 'R' }), false);
  assert.equal(schema.isValidSync({ ...legacy, aircraft_category: 'R', aircraft_class: 'HELO' }), true);
  assert.equal(schema.isValidSync({ ...legacy, aircraft_category: 'GL' }), true);
  assert.equal(aircraftSchema.isValidSync({ ...valid, aircraft_class: '' }), false);
});

test('hidden engines are optional and ATC wake selection remains required', () => {
  for (const [category, klass] of [['GL', ''], ['PL', ''], ['LTA', 'BALLOON'], ['LTA', 'AIRSHIP']]) {
    const record = { ...valid, aircraft_category: category, aircraft_class: klass };
    assert.equal(aircraftSchema.isValidSync({ ...record, piston: false }), category === 'GL' || klass === 'BALLOON');
    assert.equal(aircraftSchema.isValidSync({ ...record, small: false }), false);
  }
});

test('tracked categories require one of Piston, Turbine or Electric', () => {
  assert.deepEqual(ENGINE_CHOICES.map(([key]) => key), ['piston', 'turbine', 'electric']);
  for (const [category, klass] of [['A', 'SEL'], ['R', 'HELO'], ['R', 'GYRO'], ['PL', ''], ['LTA', 'AIRSHIP']]) {
    for (const [engine] of ENGINE_CHOICES) {
      const record = { ...valid, aircraft_category: category, aircraft_class: klass, piston: false, turbine: false, electric: false, [engine]: true };
      assert.equal(aircraftSchema.isValidSync(record), true);
      assert.equal(aircraftSchema.isValidSync({ ...record, [engine]: false }), false);
    }
  }
});

test('hidden engine selections are cleared and self-launch capability is restricted to gliders', () => {
  for (const [category, klass] of [['GL', ''], ['LTA', 'BALLOON']]) {
    const record = normalizeCharacteristics({ ...valid, aircraft_category: category, aircraft_class: klass, electric: true, self_launch_capable: true });
    assert.equal(record.piston, false);
    assert.equal(record.turbine, false);
    assert.equal(record.electric, false);
    assert.equal(record.self_launch_capable, category === 'GL');
    assert.equal(aircraftSchema.isValidSync(record), true);
  }
});

test('cached Medium becomes ATC Small and retired choices are not presented', () => {
  const record = aircraftValues({ ...valid, id: 9, small: false, medium: true, light_sport: false });
  assert.equal(record.small, true);
  assert.equal(Object.hasOwn(record, 'medium'), false);
  assert.equal(Object.hasOwn(record, 'light_sport'), false);
  assert.deepEqual(WEIGHT_CHOICES.map(([, label]) => label), ['Small', 'Large', 'Heavy', 'Super']);
  assert.equal(aircraftSchema.isValidSync(record), true);
});


test('glider classification removes inapplicable equipment attributes', async () => {
  const {flagApplicable} = await import('../app/aircraft/characteristics.mjs');
  const flags = {requires_type: true, compleks: true, high_performance: true, tailwheel: true, simple: true};
  const glider = normalizeCharacteristics({...valid, aircraft_category: 'GL', aircraft_class: '', ...flags});
  for (const key of Object.keys(flags)) {
    assert.equal(glider[key], false);
    assert.equal(flagApplicable(glider, key), false);
  }
  for (const aircraft_category of ['A', 'R', 'PL', 'LTA']) {
    const other = normalizeCharacteristics({...valid, aircraft_category, ...flags});
    for (const key of Object.keys(flags)) {
      const applicable = key !== 'simple' && (aircraft_category === 'A' || key === 'requires_type' && ['R', 'PL'].includes(aircraft_category));
      assert.equal(other[key], key === 'simple' ? aircraft_category === 'A' : applicable);
      assert.equal(flagApplicable(other, key), applicable);
    }
  }
});


test('selecting a wake category completes a glider form with one validated value set', async () => {
  const {selectCharacteristic} = await import('../app/aircraft/characteristics.mjs');
  const initial = aircraftValues({aircraft_type: 'GLT1', aircraft_category: 'GL', self_launch_capable: true});
  assert.equal(aircraftSchema.isValidSync(initial), false);
  const selected = selectCharacteristic(initial, WEIGHT_CHOICES, 'small');
  assert.equal(aircraftSchema.isValidSync(selected), true);
  assert.equal(selected.self_launch_capable, true);
  assert.equal(WEIGHT_CHOICES.filter(([key]) => selected[key]).length, 1);
  assert.equal(initial.small, false);
  const changed = selectCharacteristic(selected, WEIGHT_CHOICES, 'large');
  assert.equal(aircraftSchema.isValidSync(changed), true);
  assert.equal(changed.small, false);
  assert.equal(changed.large, true);
  const airplane = selectCharacteristic({...valid, piston: false}, ENGINE_CHOICES, 'electric');
  assert.equal(aircraftSchema.isValidSync(airplane), true);
  assert.equal(airplane.piston, false);
  assert.equal(airplane.electric, true);
});


test('powered-lift automatically requires a type rating and Simple is no longer a form choice', () => {
  assert.equal(normalizeCharacteristics({...valid, aircraft_category: 'PL', requires_type: false}).requires_type, true);
  assert.equal(normalizeCharacteristics({...valid, simple: true}).simple, true);
  assert.equal(normalizeCharacteristics({...valid, aircraft_category: 'R', simple: true}).simple, false);
  assert.equal(FLAGS.some(([key]) => key === 'simple'), false);
});
