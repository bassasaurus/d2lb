// Database-only repository: also exercised against real SQLite in Node tests.
export async function createFlightStore(db) {
  const version = await db.getFirstAsync('PRAGMA user_version');
  if (version.user_version > 2) throw new Error('This local database requires a newer app.');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS mobile_flights (
      scope TEXT NOT NULL, local_id TEXT NOT NULL, payload TEXT NOT NULL,
      state TEXT NOT NULL CHECK(state IN ('synced','pending_create','pending_update','pending_delete')),
      PRIMARY KEY(scope, local_id)
    );
    CREATE TABLE IF NOT EXISTS mobile_reference (
      scope TEXT NOT NULL, name TEXT NOT NULL, payload TEXT NOT NULL,
      PRIMARY KEY(scope,name)
    );
    CREATE TABLE IF NOT EXISTS mobile_operations (
      scope TEXT NOT NULL, local_id TEXT NOT NULL, operation_id TEXT NOT NULL,
      request TEXT NOT NULL, generation INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, retry_at INTEGER NOT NULL DEFAULT 0,
      blocked INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(scope,local_id), UNIQUE(scope,operation_id)
    );
  `);
  if (version.user_version < 2) {
    await db.withExclusiveTransactionAsync(async tx => {
      await tx.execAsync(`ALTER TABLE mobile_flights ADD COLUMN generation INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE mobile_flights ADD COLUMN sync_error TEXT;
        PRAGMA user_version = 2;`);
    });
  }
  const requireScope = scope => {
    if (!scope) throw new Error('Sign in before accessing local flights.');
  };
  return {
    async moveScope(from, to) {
      requireScope(from); requireScope(to);
      if (from === to) return;
      await db.withExclusiveTransactionAsync(async tx => {
        const source = await tx.getFirstAsync('SELECT COUNT(*) AS count FROM mobile_flights WHERE scope=?', from);
        const target = await tx.getFirstAsync('SELECT COUNT(*) AS count FROM mobile_flights WHERE scope=?', to);
        if (source.count && target.count) throw new Error('Two local account caches need review before they can be combined.');
        if (!target.count) {
          for (const table of ['mobile_flights', 'mobile_operations']) {
            await tx.runAsync(`UPDATE ${table} SET scope=? WHERE scope=?`, to, from);
          }
          await tx.runAsync('DELETE FROM mobile_reference WHERE scope=?', to);
          await tx.runAsync('UPDATE mobile_reference SET scope=? WHERE scope=?', to, from);
        }
      });
    },
    async nextOperation(scope, operationId, now = Date.now()) {
      requireScope(scope);
      let operation;
      await db.withExclusiveTransactionAsync(async tx => {
        const existing = await tx.getFirstAsync('SELECT * FROM mobile_operations WHERE scope=? AND blocked=0 AND retry_at<=? ORDER BY rowid LIMIT 1', scope, now);
        if (existing) { operation = existing; return; }
        const row = await tx.getFirstAsync(`SELECT f.* FROM mobile_flights f WHERE f.scope=? AND f.state!='synced' AND f.sync_error IS NULL
          AND NOT EXISTS(SELECT 1 FROM mobile_operations o WHERE o.scope=f.scope AND o.local_id=f.local_id)
          ORDER BY f.rowid LIMIT 1`, scope);
        if (!row) return;
        const payload = JSON.parse(row.payload);
        const action = row.state === 'pending_create' ? 'create' : row.state === 'pending_update' ? 'update' : 'delete';
        const request = { operation_id: operationId, action };
        if (action !== 'create') {
          if (!payload.id || !payload.revision) {
            await tx.runAsync('UPDATE mobile_flights SET sync_error=? WHERE scope=? AND local_id=?', 'This older local edit needs review before upload.', scope, row.local_id);
            return;
          }
          request.flight_id = payload.id;
          request.base_revision = payload.revision;
        }
        if (action !== 'delete') {
          request.data = { ...payload };
          for (const key of ['landings_day', 'landings_night', 'night', 'instrument', 'simulated_instrument']) {
            if (request.data[key] === '') request.data[key] = null;
          }
        }
        await tx.runAsync('INSERT INTO mobile_operations(scope,local_id,operation_id,request,generation) VALUES(?,?,?,?,?)',
          scope, row.local_id, operationId, JSON.stringify(request), row.generation);
        operation = { scope, local_id: row.local_id, operation_id: operationId, request: JSON.stringify(request), generation: row.generation, attempts: 0 };
      });
      return operation;
    },
    async acknowledge(scope, operation, response) {
      requireScope(scope);
      if (response.operation_id !== operation.operation_id || (!response.flight && !response.deleted_id)) {
        throw new Error('Server acknowledgement did not match the pending operation.');
      }
      const request = JSON.parse(operation.request);
      if ((request.action === 'delete' && !response.deleted_id) || (request.action !== 'delete' && !response.flight)) {
        throw new Error('Acknowledgement action did not match the pending operation.');
      }
      if (response.flight && (!Number.isInteger(response.flight.id) || typeof response.flight.revision !== 'string'
          || (request.action !== 'create' && response.flight.id !== request.flight_id))) {
        throw new Error('Invalid flight acknowledgement.');
      }
      if (response.deleted_id && (request.action !== 'delete' || response.deleted_id !== request.flight_id)) {
        throw new Error('Invalid deletion acknowledgement.');
      }
      await db.withExclusiveTransactionAsync(async tx => {
        const row = await tx.getFirstAsync('SELECT * FROM mobile_flights WHERE scope=? AND local_id=?', scope, operation.local_id);
        if (!row) throw new Error('Pending flight is missing.');
        if (response.deleted_id) {
          await tx.runAsync('DELETE FROM mobile_flights WHERE scope=? AND local_id=?', scope, operation.local_id);
        } else {
          const unchanged = row.generation === operation.generation;
          const payload = unchanged ? response.flight : { ...JSON.parse(row.payload), id: response.flight.id, revision: response.flight.revision };
          const state = unchanged ? 'synced' : row.state === 'pending_delete' ? 'pending_delete' : 'pending_update';
          await tx.runAsync('UPDATE mobile_flights SET payload=?,state=?,sync_error=NULL WHERE scope=? AND local_id=?',
            JSON.stringify(payload), state, scope, operation.local_id);
        }
        await tx.runAsync('DELETE FROM mobile_operations WHERE scope=? AND operation_id=?', scope, operation.operation_id);
      });
    },
    async failOperation(scope, operation, message, blocked, now = Date.now()) {
      const attempts = operation.attempts + 1;
      const delay = Math.min(300000, 5000 * 2 ** Math.min(attempts - 1, 6));
      await db.withExclusiveTransactionAsync(async tx => {
        await tx.runAsync('UPDATE mobile_operations SET attempts=?,retry_at=?,blocked=? WHERE scope=? AND operation_id=?',
          attempts, now + delay, blocked ? 1 : 0, scope, operation.operation_id);
        await tx.runAsync('UPDATE mobile_flights SET sync_error=? WHERE scope=? AND local_id=?', message, scope, operation.local_id);
      });
    },
    async reference(scope, name) {
      requireScope(scope);
      const row = await db.getFirstAsync('SELECT payload FROM mobile_reference WHERE scope=? AND name=?', scope, name);
      return row ? JSON.parse(row.payload) : [];
    },
    async cacheReference(scope, name, rows) {
      requireScope(scope);
      if (!Array.isArray(rows)) throw new Error('Invalid reference response.');
      await db.runAsync(`INSERT INTO mobile_reference(scope,name,payload) VALUES(?,?,?)
        ON CONFLICT(scope,name) DO UPDATE SET payload=excluded.payload`, scope, name, JSON.stringify(rows));
    },
    async list(scope) {
      requireScope(scope);
      const rows = await db.getAllAsync("SELECT * FROM mobile_flights WHERE scope=? AND state!='pending_delete' ORDER BY rowid DESC", scope);
      const dateKey = value => {
        const [month, day, year] = String(value || '').split('/').map(Number);
        return (year || 0) * 10000 + (month || 0) * 100 + (day || 0);
      };
      return rows.map(row => ({ ...JSON.parse(row.payload), local_id: row.local_id, sync_state: row.state, sync_error: row.sync_error }))
        .sort((a, b) => dateKey(b.date) - dateKey(a.date));
    },
    async errors(scope) {
      requireScope(scope);
      const rows = await db.getAllAsync('SELECT payload,sync_error FROM mobile_flights WHERE scope=? AND sync_error IS NOT NULL', scope);
      return rows.map(row => ({ route: JSON.parse(row.payload).route, message: row.sync_error }));
    },
    async pendingCount(scope) {
      requireScope(scope);
      return (await db.getFirstAsync("SELECT COUNT(*) AS count FROM mobile_flights WHERE scope=? AND state!='synced'", scope)).count;
    },
    async save(scope, localId, flight) {
      requireScope(scope);
      // One durable row is both the local record and its outbox entry.
      const { local_id, sync_state, sync_error, ...payload } = flight;
      await db.withExclusiveTransactionAsync(async tx => {
        const existing = await tx.getFirstAsync('SELECT payload,state FROM mobile_flights WHERE scope=? AND local_id=?', scope, localId);
        if (existing?.state === 'pending_delete') throw new Error('This flight is pending deletion.');
        if (existing) {
          const saved = JSON.parse(existing.payload);
          if (saved.id) payload.id = saved.id;
          if (saved.revision) payload.revision = saved.revision;
        }
        const state = payload.id ? 'pending_update' : 'pending_create';
        await tx.runAsync('DELETE FROM mobile_operations WHERE scope=? AND local_id=? AND blocked=1', scope, localId);
        await tx.runAsync(`INSERT INTO mobile_flights(scope,local_id,payload,state) VALUES(?,?,?,?)
          ON CONFLICT(scope,local_id) DO UPDATE SET payload=excluded.payload,state=excluded.state,
          generation=mobile_flights.generation+1,sync_error=NULL`, scope, localId, JSON.stringify(payload), state);
      });
    },
    async remove(scope, localId) {
      requireScope(scope);
      await db.withExclusiveTransactionAsync(async tx => {
        const row = await tx.getFirstAsync('SELECT state FROM mobile_flights WHERE scope=? AND local_id=?', scope, localId);
        if (!row) throw new Error('Flight not found on this device.');
        const operation = await tx.getFirstAsync('SELECT operation_id FROM mobile_operations WHERE scope=? AND local_id=?', scope, localId);
        if (row.state === 'pending_create' && !operation) {
          await tx.runAsync('DELETE FROM mobile_flights WHERE scope=? AND local_id=?', scope, localId);
        } else {
          await tx.runAsync("UPDATE mobile_flights SET state='pending_delete',generation=generation+1,sync_error=NULL WHERE scope=? AND local_id=?", scope, localId);
        }
      });
    },
    async cacheSnapshot(scope, flights) {
      requireScope(scope);
      if (!Array.isArray(flights) || flights.some(flight => !Number.isInteger(flight.id))) {
        throw new Error('Invalid flight response; local records were preserved.');
      }
      await db.withExclusiveTransactionAsync(async tx => {
        await tx.runAsync("DELETE FROM mobile_flights WHERE scope=? AND state='synced'", scope);
        const existing = await tx.getAllAsync('SELECT local_id,payload,state FROM mobile_flights WHERE scope=?', scope);
        const retainedIds = new Set(existing.map(row => JSON.parse(row.payload).id));
        for (const flight of flights) {
          if (retainedIds.has(flight.id)) continue;
          await tx.runAsync(`INSERT INTO mobile_flights(scope,local_id,payload,state) VALUES(?,?,?,'synced')
            ON CONFLICT(scope,local_id) DO NOTHING`, scope, `server:${flight.id}`, JSON.stringify(flight));
        }
      });
    },
  };
}
