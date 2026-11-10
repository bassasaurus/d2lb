function decode(row) {
  if (!row) return null;
  return {
    ...JSON.parse(row.payload), local_id: row.local_id, sync_state: row.state,
    generation: row.generation, sync_error: row.sync_error,
    can_resolve: row.blocked === 1 || !row.operation_id,
    server_known: row.server_known === 1,
    server_record: row.server_payload ? JSON.parse(row.server_payload) : null,
    response: row.response ? JSON.parse(row.response) : null,
  };
}
const reviewQuery = `SELECT f.*,o.operation_id,o.blocked,r.server_payload,r.server_known,r.response
  FROM mobile_flights f
  LEFT JOIN mobile_operations o ON o.scope=f.scope AND o.local_id=f.local_id
  LEFT JOIN mobile_review_data r ON r.scope=f.scope AND r.local_id=f.local_id`;

export function createReviewStore(db, requireScope, writeTransaction) {
  return {
    async reviewList(scope) {
      requireScope(scope);
      return (await db.getAllAsync(`${reviewQuery} WHERE f.scope=? AND f.sync_error IS NOT NULL ORDER BY f.rowid DESC`, scope)).map(decode);
    },
    async reviewRecord(scope, localId) {
      requireScope(scope);
      return decode(await db.getFirstAsync(`${reviewQuery} WHERE f.scope=? AND f.local_id=?`, scope, localId));
    },
    async captureServer(scope, localId, generation, server) {
      requireScope(scope);
      await writeTransaction(async tx => {
        const row = await tx.getFirstAsync('SELECT payload,generation FROM mobile_flights WHERE scope=? AND local_id=?', scope, localId);
        if (!row || row.generation !== generation) throw new Error('Local changes were updated. Reload this comparison.');
        const local = JSON.parse(row.payload);
        if (server !== null && (!local.id || server.id !== local.id || typeof server.revision !== 'string')) {
          throw new Error('The server record did not match this local record.');
        }
        await tx.runAsync(`INSERT INTO mobile_review_data(scope,local_id,server_payload,server_known)
          VALUES(?,?,?,1) ON CONFLICT(scope,local_id) DO UPDATE SET server_payload=excluded.server_payload,server_known=1`,
        scope, localId, server === null ? null : JSON.stringify(server));
      });
    },
    async resolveReview(scope, localId, generation, choice, expectedServerRevision) {
      requireScope(scope);
      if (!['use_server', 'keep_local', 'recreate', 'discard_local'].includes(choice)) throw new Error('Unknown resolution.');
      await writeTransaction(async tx => {
        const row = await tx.getFirstAsync(`${reviewQuery} WHERE f.scope=? AND f.local_id=?`, scope, localId);
        if (!row || row.generation !== generation || !row.sync_error) throw new Error('This record changed. Reload the comparison.');
        if (row.operation_id && row.blocked !== 1) throw new Error('Upload is uncertain. Reconnect before resolving it.');
        const server = row.server_payload ? JSON.parse(row.server_payload) : null;
        if (choice !== 'discard_local') {
          if (!row.server_known || (server?.revision || null) !== expectedServerRevision) throw new Error('Reload the server comparison before choosing a version.');
        }
        if (server && JSON.parse(row.payload).id !== server.id) throw new Error('Server record does not match the local record.');
        if (choice === 'keep_local' && !server) throw new Error('The server record was deleted. Choose Save as new instead.');
        if (choice === 'recreate' && server) throw new Error('This record still exists. Review it before saving another copy.');
        // Archive both versions in the same transaction as the resolution.
        await tx.runAsync(`INSERT INTO mobile_review_history(scope,local_id,local_payload,server_payload,previous_state,resolution,created_at)
          VALUES(?,?,?,?,?,?,?)`, scope, localId, row.payload, row.server_payload, row.state, choice, new Date().toISOString());
        await tx.runAsync('DELETE FROM mobile_operations WHERE scope=? AND local_id=?', scope, localId);
        const local = JSON.parse(row.payload);
        if (choice === 'discard_local' || (choice === 'use_server' && !server)) {
          await tx.runAsync('DELETE FROM mobile_flights WHERE scope=? AND local_id=?', scope, localId);
        } else {
          let payload;
          let state;
          if (choice === 'use_server') {
            payload = server;
            state = 'synced';
          } else if (choice === 'keep_local') {
            payload = { ...local, id: server.id, revision: server.revision };
            state = row.state === 'pending_delete' ? 'pending_delete' : 'pending_update';
          } else {
            const { id, revision, ...values } = local;
            payload = values;
            if (Array.isArray(payload.approaches)) payload.approaches = payload.approaches.map(({ id, flight_object, ...values }) => values);
            state = 'pending_create';
          }
          await tx.runAsync('UPDATE mobile_flights SET payload=?,state=?,generation=generation+1,sync_error=NULL WHERE scope=? AND local_id=?',
            JSON.stringify(payload), state, scope, localId);
        }
        await tx.runAsync('DELETE FROM mobile_review_data WHERE scope=? AND local_id=?', scope, localId);
      });
    },
    async reviewHistory(scope) {
      requireScope(scope);
      const rows = await db.getAllAsync('SELECT * FROM mobile_review_history WHERE scope=? ORDER BY id DESC', scope);
      return rows.map(row => ({ ...row, local_record: JSON.parse(row.local_payload), server_record: row.server_payload ? JSON.parse(row.server_payload) : null }));
    },
  };
}
