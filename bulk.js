// === Bulk Generation Engine ===
// Non-destructive wrapper around existing engine.js single-item generators

(function () {
    'use strict';

    // --- Global State ---
    window.currentBatchData = [];
    const SLIDER_STEPS = [1, 50, 100, 300, 500, 1000];

    // --- DOM References ---
    const slider = document.getElementById('bulk-qty-slider');
    const badge = document.getElementById('bulk-qty-badge');
    if (!slider || !badge) return;

    // --- Slider Logic ---
    function getQty() { return SLIDER_STEPS[parseInt(slider.value)] || 1; }

    slider.addEventListener('input', () => {
        const qty = getQty();
        badge.textContent = qty === 1 ? 'Quantity: 1 (Single)' : `Quantity: ${qty.toLocaleString()}`;
    });

    // --- Display Routing ---
    function routeDisplay(prefix, qty) {
        const single = document.getElementById(prefix + '-single-display');
        const bulk = document.getElementById(prefix + '-bulk-container');
        const actionBar = document.getElementById(prefix + '-action-bar');
        if (qty === 1) {
            single && (single.classList.remove('hidden'));
            bulk && (bulk.classList.add('hidden'));
        } else {
            single && (single.classList.add('hidden'));
            bulk && (bulk.classList.remove('hidden'));
            actionBar && (actionBar.classList.remove('hidden'));
        }
    }

    // --- Virtual Window Renderer ---
    function renderVirtualWindow(prefix, data, isObject) {
        const vw = document.getElementById(prefix + '-virtual-window');
        if (!vw) return;
        vw.innerHTML = '';
        const displayCount = Math.min(data.length, 10);
        for (let i = 0; i < displayCount; i++) {
            const div = document.createElement('div');
            div.className = 'text-white border-b border-white/10 pb-1';
            if (isObject) {
                const d = data[i];
                div.innerHTML = `<span class="text-on-surface-variant text-xs mr-2">${i + 1}.</span><strong>${d.name}</strong> — ${d.city} • Age: ${d.age} • ID: ${d.id}`;
            } else {
                div.innerHTML = `<span class="text-on-surface-variant text-xs mr-2">${i + 1}.</span>${data[i]}`;
            }
            vw.appendChild(div);
        }
        if (data.length > 10) {
            const footer = document.createElement('div');
            footer.className = 'text-on-surface-variant text-xs text-center pt-2 sticky bottom-0 bg-black';
            footer.textContent = `+${data.length - 10} more items generated successfully.`;
            vw.appendChild(footer);
        }
    }

    // --- Export Functions ---
    function copyAll(data, isObject, tabName) {
        const text = isObject
            ? data.map(d => `${d.name} | ${d.city} | Age: ${d.age} | ID: ${d.id}`).join('\n')
            : data.join('\n');
        navigator.clipboard.writeText(text).then(() => showToast(`${data.length} items copied!`));
    }

    function downloadCSV(data, isObject, tabName, qty) {
        let csv;
        if (isObject) {
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(d => Object.values(d).join(','));
            csv = headers + '\n' + rows.join('\n');
        } else {
            csv = 'value\n' + data.join('\n');
        }
        downloadBlob(csv, `${tabName}_Export_${qty}.csv`, 'text/csv');
    }

    function downloadJSON(data, tabName, qty) {
        downloadBlob(JSON.stringify(data, null, 2), `${tabName}_Export_${qty}.json`, 'application/json');
    }

    function downloadBlob(content, filename, type) {
        const blob = new Blob([content], { type });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast(`Downloaded ${filename}`);
    }

    // --- Action Bar Delegation ---
    document.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-bulk-btn');
        const csvBtn = e.target.closest('.csv-bulk-btn');
        const jsonBtn = e.target.closest('.json-bulk-btn');
        if (!copyBtn && !csvBtn && !jsonBtn) return;

        const target = (copyBtn || csvBtn || jsonBtn).dataset.target;
        const data = window.currentBatchData;
        if (!data || data.length === 0) return;
        const isObj = typeof data[0] === 'object';
        const qty = data.length;

        if (copyBtn) copyAll(data, isObj, target);
        if (csvBtn) downloadCSV(data, isObj, target, qty);
        if (jsonBtn) downloadJSON(data, target, qty);
    });

    // === GENERATION WRAPPERS ===
    // These clone and replace original buttons to safely intercept clicks

    // --- Numbers ---
    const btnNum = document.getElementById('btn-num-gen');
    if (btnNum) {
        const newBtn = btnNum.cloneNode(true);
        btnNum.parentNode.replaceChild(newBtn, btnNum);
        newBtn.addEventListener('click', () => {
            const qty = getQty();
            routeDisplay('num', qty);
            if (qty === 1) {
                // Original single-gen logic
                const numDigits = document.getElementById('num-digits');
                const numMin = document.getElementById('num-min');
                const numMax = document.getElementById('num-max');
                const outNum = document.getElementById('out-num');
                const digitStr = numDigits.value.trim();
                if (digitStr !== "") {
                    const count = parseInt(digitStr);
                    if (isNaN(count) || count < 1 || count > 20) { outNum.textContent = "RANGE 1-20"; return; }
                    const mn = count === 1 ? 0n : 10n ** BigInt(count - 1);
                    const mx = (10n ** BigInt(count)) - 1n;
                    outNum.textContent = cryptoRandomBigInt(mn, mx).toString();
                } else {
                    const mn = BigInt(numMin.value || "0"), mx = BigInt(numMax.value || "100");
                    if (mn > mx) { outNum.textContent = "MIN > MAX"; return; }
                    outNum.textContent = cryptoRandomBigInt(mn, mx).toString();
                }
                window.currentBatchData = [];
                return;
            }
            // Bulk
            window.currentBatchData = [];
            const numDigits = document.getElementById('num-digits');
            const numMin = document.getElementById('num-min');
            const numMax = document.getElementById('num-max');
            const digitStr = numDigits.value.trim();
            for (let i = 0; i < qty; i++) {
                if (digitStr !== "") {
                    const count = parseInt(digitStr);
                    if (isNaN(count) || count < 1 || count > 20) continue;
                    const mn = count === 1 ? 0n : 10n ** BigInt(count - 1);
                    const mx = (10n ** BigInt(count)) - 1n;
                    window.currentBatchData.push(cryptoRandomBigInt(mn, mx).toString());
                } else {
                    const mn = BigInt(numMin.value || "0"), mx = BigInt(numMax.value || "100");
                    if (mn > mx) continue;
                    window.currentBatchData.push(cryptoRandomBigInt(mn, mx).toString());
                }
            }
            renderVirtualWindow('num', window.currentBatchData, false);
        });
    }

    // --- Passwords ---
    const btnPass = document.getElementById('btn-pass-gen');
    if (btnPass) {
        const newBtn = btnPass.cloneNode(true);
        btnPass.parentNode.replaceChild(newBtn, btnPass);
        newBtn.addEventListener('click', () => {
            const qty = getQty();
            routeDisplay('pass', qty);

            function generateOnePassword() {
                const length = parseInt(document.getElementById('pass-length').value);
                let charset = "abcdefghijklmnopqrstuvwxyz";
                if (document.getElementById('chk-upper').checked) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                if (document.getElementById('chk-nums').checked) charset += "0123456789";
                if (document.getElementById('chk-syms').checked) charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";
                let password = "";
                const array = new Uint32Array(length);
                window.crypto.getRandomValues(array);
                for (let i = 0; i < length; i++) password += charset.charAt(array[i] % charset.length);
                return password;
            }

            if (qty === 1) {
                document.getElementById('out-pass').value = generateOnePassword();
                window.currentBatchData = [];
                return;
            }
            window.currentBatchData = [];
            for (let i = 0; i < qty; i++) window.currentBatchData.push(generateOnePassword());
            renderVirtualWindow('pass', window.currentBatchData, false);
        });
    }

    // --- Names ---
    const btnName = document.getElementById('btn-name-pick');
    if (btnName) {
        const newBtn = btnName.cloneNode(true);
        btnName.parentNode.replaceChild(newBtn, btnName);
        newBtn.addEventListener('click', () => {
            const qty = getQty();
            routeDisplay('names', qty);
            const names = document.getElementById('name-input').value.split(',').map(n => n.trim()).filter(n => n !== "");
            if (names.length === 0) { document.getElementById('out-name').textContent = "EMPTY"; return; }

            if (qty === 1) {
                // Preserve original animation
                const outName = document.getElementById('out-name');
                let count = 0;
                const interval = setInterval(() => {
                    outName.textContent = names[cryptoRandomInt(0, names.length - 1)];
                    count++;
                    if (count > 10) { clearInterval(interval); outName.textContent = names[cryptoRandomInt(0, names.length - 1)]; }
                }, 50);
                window.currentBatchData = [];
                return;
            }
            window.currentBatchData = [];
            for (let i = 0; i < qty; i++) window.currentBatchData.push(names[cryptoRandomInt(0, names.length - 1)]);
            renderVirtualWindow('names', window.currentBatchData, false);
        });
    }

    // --- Identities ---
    const btnId = document.getElementById('btn-id-gen');
    if (btnId) {
        const newBtn = btnId.cloneNode(true);
        btnId.parentNode.replaceChild(newBtn, btnId);
        newBtn.addEventListener('click', async () => {
            const qty = getQty();
            routeDisplay('identities', qty);
            const regionSelect = document.getElementById('region-select');
            const region = regionSelect.value;
            if (!region || !identityData[region]) return;
            const localData = identityData[region];

            newBtn.disabled = true;
            newBtn.textContent = "SYNCING...";

            let remoteData = null;
            try { remoteData = await fetchNameData(region); } catch (e) { }
            newBtn.disabled = false;
            newBtn.textContent = "Generate Profile";

            if (!remoteData) { showToast("Offline: No data available"); return; }
            const getRand = (arr) => arr && arr.length > 0 ? arr[cryptoRandomInt(0, arr.length - 1)] : "";

            function buildOneProfile() {
                const fName = getRand(remoteData.first);
                let mName = "";
                if (Math.random() < 0.3) mName = getRand(remoteData.middle);
                const lName = getRand(remoteData.last);
                let components = [];
                if (localData.format === 'lastFirst' || region === 'JP') {
                    if (lName) components.push(lName);
                    if (fName) components.push(fName);
                } else if (region === 'US' || region === 'UK') {
                    if (fName) components.push(fName);
                    if (mName) components.push(mName.charAt(0) + ".");
                    if (lName) components.push(lName);
                } else {
                    if (fName) components.push(fName);
                    if (mName) components.push(mName);
                    if (lName) components.push(lName);
                }
                return {
                    name: components.join(' '),
                    city: getRand(localData.cities) || "Unknown City",
                    age: cryptoRandomInt(18, 75),
                    id: generateSecureID(8)
                };
            }

            if (qty === 1) {
                // Use original single-gen rendering
                const p = buildOneProfile();
                const outIdList = document.getElementById('out-id-list');
                if (outIdList.innerHTML.includes('italic')) outIdList.innerHTML = '';
                const html = `<div class="border-b border-white py-3 last:border-0 flex justify-between items-center group"><div><div class="text-white font-bold">${p.name}</div><div class="text-on-surface-variant text-sm">${p.city} • Age: ${p.age}</div><div class="text-[12px] text-white font-mono uppercase mt-1">ID: ${p.id}</div></div><button class="w-8 h-8 flex items-center justify-center bg-[#18181b] border border-gray-600 hover:border-gray-400 hover:shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all flex-shrink-0 copy-profile-btn" title="Copy Profile" aria-label="Copy Profile"><span class="material-symbols-outlined text-[16px] text-gray-400 group-hover:text-white">content_copy</span></button></div>`;
                outIdList.insertAdjacentHTML('afterbegin', html);
                while (outIdList.children.length > 10) outIdList.removeChild(outIdList.lastElementChild);
                window.currentBatchData = [];
                return;
            }
            window.currentBatchData = [];
            for (let i = 0; i < qty; i++) window.currentBatchData.push(buildOneProfile());
            renderVirtualWindow('identities', window.currentBatchData, true);
        });
    }

})();
