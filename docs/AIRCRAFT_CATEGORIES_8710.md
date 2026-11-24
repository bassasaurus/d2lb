# Aircraft categories/classes: Step 2

`app/aircraft/classification.mjs` matches the Django pilot category/class registry
from [14 CFR 61.5(b)](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.5).

- Airplane: SEL/MEL/SES/MES; Rotorcraft: HELO/GYRO.
- Glider (`GL`) and Powered-Lift (`PL`): Class hidden, stored as an empty string,
  shown as “Not applicable” on details.
- Lighter-Than-Air (`LTA`): BALLOON/AIRSHIP; Class required.
- Category changes atomically update the form values and clear incompatible
  classes. Save stays disabled when the classification is invalid.
- Unchanged incomplete downloaded classifications are preserved for unrelated
  edits. Once classification changes, a valid category/class pair is required.
- A changed classification shows the existing-record regrouping explanation.
- Both forms start with Category/Class, then Aircraft Type, Engine, equipment
  options and Weight Category, using the existing platform controls.
- Aircraft saves still use the existing durable outbox, account isolation,
  revision protocol and Aircraft → Tailnumbers → Flights ordering.

No new native dependencies or SQLite migration are required. Existing installed
apps preserve unfamiliar JSON fields, but their older category pickers cannot
edit newly introduced categories; use the updated app for those aircraft.

At the Step 2 checkpoint, engine and weight logic was intentionally unchanged. This means
these intermediate forms still require an engine/weight selection even for the
new categories. Self-launch capability, launch details and complete new summary
presentation are deferred. No Training Remarks field is added.

See `AIRCRAFT_ENGINES_WAKE.md` for the subsequent Step 3 implementation.

Tests cover every category/class pair, category transitions, legacy edits,
display labels, unchanged engine/weight validation and the Step 1 offline
storage/queue compatibility probes.
