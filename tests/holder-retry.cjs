const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the real route handlers with failed upstream calls and a held lease.
async function check(route, reserve, read, store, snapshot, body) {
  let locked = false, completed = false, budget = true, fail = true;
  let calls = 0, releases = 0, audits = 0, owner;
  const usage = {
    usageConfig: () => ({}),
    [read]: async () => null,
    [reserve]: async (slot, id) => {
      if (locked || completed) return false;
      locked = true; owner = id; return true;
    },
    reserveNansenCall: async () => budget,
    recordNansenCall: async () => { audits++; },
    [store]: async value => { assert.deepEqual(JSON.parse(JSON.stringify(value)), {...snapshot, asOf:value.asOf}); completed = true; },
    finishHolderRefresh: async (kind, slot, id) => {
      assert.equal(id, owner); releases++; locked = false;
    },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(route, 'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: name => name === 'node:crypto' ? require(name) :
      name.endsWith('nansen-usage') ? usage : name.endsWith('collection-schedule') ?
      {collectionSlot:()=> '2026-10-11-06'} : {TOKEN:'test'},
    process:{env:{NANSEN_API_KEY:'test'}}, Response, AbortSignal, console:{error:()=>{}},
    fetch:async () => { calls++; if(fail) throw new Error('upstream timeout'); return Response.json(body); }
  });
  let result = await (await exports.GET()).json();
  assert.match(result.warning, /refresh failed/);
  assert.equal(releases, 1); assert.equal(audits, 1);
  // A retry can acquire the lease after the release cooldown, unlike the old handler.
  fail = false;
  result = await (await exports.GET()).json();
  assert.equal(result.snapshot.source, 'api'); assert.equal(calls, 2);
  await exports.GET();
  assert.equal(calls, 2); assert.equal(releases, 2); // completed slot is not collected again
  completed = false; budget = false;
  result = await (await exports.GET()).json();
  assert.match(result.warning, /budget/); assert.equal(calls, 2); assert.equal(releases, 3);
  console.log(`${route}: timeout recovery, completed-slot guard, and budget guard passed`);
}
(async () => {
 await check('app/api/holder-count/route.ts','reserveHolderCountRefresh','readHolderCount','storeHolderCount',
  {source:'api',totalHolders:123},{data:{spot_metrics:{total_holders:123}}});
 const wallet={address:'0x'+'1'.repeat(40),tokenAmount:10,balanceChange24h:2,valueUsd:5};
 await check('app/api/top-holders/route.ts','reserveTopHoldersRefresh','readTopHolders','storeTopHolders',
  {source:'api',wallets:[wallet],count:1,totalTokens:10,change24h:2},
  {data:[{address:wallet.address,token_amount:10,balance_change_24h:2,value_usd:5}]});
})().catch(error=>{console.error(error);process.exitCode=1;});
