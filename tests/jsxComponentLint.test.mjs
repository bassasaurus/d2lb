import test from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import { readFile } from 'node:fs/promises';
const lint = new ESLint();

test('lint catches missing React Native JSX imports before a release build', async () => {
  for (const body of ['<View />', '<Animated.View />']) {
    const [result] = await lint.lintText(`export default function Screen() { return ${body}; }`, { filePath: 'app/RegressionScreen.js' });
    assert.ok(result.messages.some(message => message.ruleId === 'local/jsx-component-defined'));
  }
  const [valid] = await lint.lintText("import { View, Animated } from 'react-native'; export default function Screen() { return <View><Animated.View /></View>; }", { filePath: 'app/RegressionScreen.js' });
  assert.equal(valid.errorCount, 0);
});
test('the shared reminder and milestone form has no undefined JSX components', async () => {
  const source = await readFile(new URL('../app/settings/ReminderEditScreen.js', import.meta.url), 'utf8');
  const [result] = await lint.lintText(source, { filePath: 'app/settings/ReminderEditScreen.js' });
  assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
});
