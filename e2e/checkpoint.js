// Runs on the host, not in the application. The runner owns this local endpoint.
const deadline = Date.now() + 60000;
let response;
do {
  response = http.post(CHECKPOINT_URL + '/' + STEP, { body: '' });
} while (response.status === 202 && Date.now() < deadline);
if (response.status !== 200) throw new Error('Checkpoint ' + STEP + ' failed: ' + response.body);
console.log(response.body);
