// Runs on the host, not in the application. The runner owns this local endpoint.
const response = http.post(CHECKPOINT_URL + '/' + STEP, { body: '' });
if (response.status !== 200) throw new Error('Checkpoint ' + STEP + ' failed: ' + response.body);
console.log(response.body);
