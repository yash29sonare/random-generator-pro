function initRandomGeneratorPro() {
            if (window.__rgpInitialized) return;
            window.__rgpInitialized = true;
            window.currentBatchData = [];
            const labelMap = {
                'numbers': 'Numbers',
                'passwords': 'Passwords',
                'names': 'Names',
                'identities': 'Identities'
            };

            // --- Global Error Handler (catch-all, prevents UI crash) ---
            window.addEventListener('error', function(e) {
                console.error('[RGP Error]', e.message, e.filename, e.lineno);
            });
            window.addEventListener('unhandledrejection', function(e) {
                console.error('[RGP Unhandled Promise]', e.reason);
            });

        // --- Utility: Crypto Random Range ---
        function getCrypto() {
            const secureCrypto = window.crypto || window.msCrypto;
            if (!secureCrypto || typeof secureCrypto.getRandomValues !== 'function') {
                throw new Error('Secure crypto.getRandomValues is unavailable.');
            }
            return secureCrypto;
        }

        function cryptoRandomInt(min, max) {
            if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min) {
                throw new Error('Invalid random integer range.');
            }
            const range = max - min + 1;
            const maxUnbiased = Math.floor(0x100000000 / range) * range;
            const randomValues = new Uint32Array(1);
            let value;
            do {
                getCrypto().getRandomValues(randomValues);
                value = randomValues[0];
            } while (value >= maxUnbiased);
            return min + (value % range);
        }

        function cryptoRandomBigInt(min, max) {
            if (max < min) throw new Error('Invalid random BigInt range.');
            const range = max - min + 1n;
            const bitLength = range.toString(2).length;
            const byteLength = Math.ceil(bitLength / 8);
            const bytes = new Uint8Array(byteLength);

            let randomValue;
            do {
                getCrypto().getRandomValues(bytes);
                randomValue = 0n;
                for (let i = 0; i < byteLength; i++) {
                    randomValue = (randomValue << 8n) + BigInt(bytes[i]);
                }
                const mask = (1n << BigInt(bitLength)) - 1n;
                randomValue &= mask;
            } while (randomValue >= range);

            return min + randomValue;
        }

        function generateSecurePassword(length, charset) {
            if (!Number.isSafeInteger(length) || length < 1 || charset.length === 0) {
                throw new Error('Invalid password options.');
            }
            let password = "";
            for (let i = 0; i < length; i++) {
                password += charset.charAt(cryptoRandomInt(0, charset.length - 1));
            }
            return password;
        }

        // --- Security CSP: Activate Preloaded Styles ---
        document.querySelectorAll('link[rel="preload"][as="style"]').forEach(link => {
            link.rel = 'stylesheet';
        });

        // Toast Notification System
        function showToast(message) {
            let toast = document.getElementById('toast-notification');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast-notification';
                toast.style.position = 'fixed';
                toast.style.bottom = '20px';
                toast.style.left = '50%';
                toast.style.transform = 'translateX(-50%)';
                toast.style.backgroundColor = '#18181b';
                toast.style.color = '#ffffff';
                toast.style.padding = '12px 24px';
                toast.style.border = '1px solid #4b5563';
                toast.style.zIndex = '9999';
                toast.style.transition = 'opacity 0.3s ease';
                toast.style.fontWeight = 'bold';
                toast.style.textTransform = 'uppercase';
                toast.style.fontFamily = '"Geist", sans-serif';
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.style.opacity = '1';
            setTimeout(() => { toast.style.opacity = '0'; }, 3000);
        }

        function copyTextToClipboard(text, successMessage, onSuccess) {
            if (!text || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
                showToast("Clipboard unavailable");
                return Promise.resolve(false);
            }

            return navigator.clipboard.writeText(text).then(() => {
                if (typeof onSuccess === 'function') onSuccess();
                if (successMessage) showToast(successMessage);
                return true;
            }).catch(error => {
                console.warn('[RGP Clipboard]', error);
                showToast("Clipboard permission denied");
                return false;
            });
        }

        function escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char]));
        }

        // --- Global State ---
        window.currentBatchData = [];
        const bulkQtySlider = document.getElementById('bulk-qty-slider');
        const bulkQtyBadge = document.getElementById('bulk-qty-badge');
        const qtySteps = [1, 50, 100, 300, 500, 1000];

        function getQty() {
            const index = bulkQtySlider ? parseInt(bulkQtySlider.value, 10) : 0;
            return qtySteps[index] || 1;
        }

        // --- Rolling Session History State (TASK 2) ---
        function addHistoryEntry(type, preview) {
            let history = [];
            try {
                history = JSON.parse(localStorage.getItem('app_history')) || [];
            } catch (e) { }
            const entry = {
                timestamp: new Date().toLocaleTimeString(),
                type: type,
                preview: preview
            };
            history.unshift(entry);
            if (history.length > 10) history = history.slice(0, 10);
            localStorage.setItem('app_history', JSON.stringify(history));
        }

        // Wire History UI Toggling
        const btnHistory = document.querySelectorAll('[aria-label="History"]');
        const historyView = document.getElementById('history-view');
        const bulkConsole = document.getElementById('bulk-control-console');
        const generatorsGrid = document.getElementById('generators-grid');
        const historyList = document.getElementById('history-list-container');
        const btnHistoryBack = document.getElementById('btn-history-back');

        function showHistoryList() {
            if (!bulkConsole || !generatorsGrid || !historyView || !historyList) return;
            bulkConsole.classList.add('hidden');
            generatorsGrid.classList.add('hidden');
            historyView.classList.remove('hidden');

            let history = [];
            try {
                history = JSON.parse(localStorage.getItem('app_history')) || [];
            } catch (e) { }

            historyList.innerHTML = '';
            if (history.length === 0) {
                historyList.innerHTML = `<div class="text-on-surface-variant text-center py-8">No history recorded yet. Start generating data!</div>`;
            } else {
                history.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'border-b border-white/10 pb-3 flex justify-between items-center';
                    row.innerHTML = `
                        <div>
                            <div class="text-white font-bold">${item.type} Generation</div>
                            <div class="text-on-surface-variant text-xs mt-1">Preview: ${item.preview}</div>
                        </div>
                        <div class="text-on-surface-variant text-xs font-mono">${item.timestamp}</div>
                    `;
                    historyList.appendChild(row);
                });
            }
        }

        btnHistory.forEach(btn => btn.addEventListener('click', showHistoryList));
        if (btnHistoryBack) {
            btnHistoryBack.addEventListener('click', () => {
                historyView?.classList.add('hidden');
                bulkConsole?.classList.remove('hidden');
                generatorsGrid?.classList.remove('hidden');
            });
        }

        // --- Settings (Compact Mode UI Density) ---
        const btnSettings = document.querySelectorAll('[aria-label="Settings"]');
        btnSettings.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.classList.toggle('compact-mode');
                const isCompact = document.body.classList.contains('compact-mode');
                showToast(isCompact ? "Compact Mode Activated" : "Normal Mode Restored");
            });
        });

        // --- Bulk Routing Visibility ---
        function updateBulkVisibility() {
            try {
                const qty = getQty();
                if (bulkQtyBadge) {
                    bulkQtyBadge.textContent = `Quantity: ${qty} ${qty === 1 ? '(Single)' : '(Bulk)'}`;
                }

                const modules = ['num', 'pass', 'names', 'identities'];
                modules.forEach(m => {
                    const single = document.getElementById(`${m}-single-display`);
                    const bulk = document.getElementById(`${m}-bulk-container`);
                    if (qty === 1) {
                        single?.classList.remove('hidden');
                        bulk?.classList.add('hidden');
                    } else {
                        single?.classList.add('hidden');
                        bulk?.classList.remove('hidden');
                    }
                });
            } catch (error) {
                console.error('[RGP updateBulkVisibility]', error);
            }
        }
        if (bulkQtySlider) {
            bulkQtySlider.addEventListener('input', updateBulkVisibility);
        }

        // --- Virtual Preview Renderer ---
        function renderVirtualWindow(prefix, data, isObject) {
            try {
                const vw = document.getElementById(prefix + '-virtual-window');
                const actionBar = document.getElementById(prefix + '-action-bar');
                if (!vw) return;

                const displayCount = Math.min(data.length, 10);
                const rows = [];

                for (let i = 0; i < displayCount; i++) {
                    if (isObject) {
                        const d = data[i];
                        rows.push(`<div class="text-white border-b border-white/10 pb-1 font-mono text-xs"><span class="text-on-surface-variant text-[10px] mr-2">${i + 1}.</span><strong>${escapeHtml(d.name)}</strong> — ${escapeHtml(d.city)} • Age: ${escapeHtml(d.age)} • ID: ${escapeHtml(d.id)}</div>`);
                    } else {
                        rows.push(`<div class="text-white border-b border-white/10 pb-1 font-mono text-xs"><span class="text-on-surface-variant text-[10px] mr-2">${i + 1}.</span>${escapeHtml(data[i])}</div>`);
                    }
                }

                if (data.length > 10) {
                    rows.push(`<div class="text-on-surface-variant text-xs text-center pt-2 sticky bottom-0 bg-black font-semibold">+${data.length - 10} more items generated successfully.</div>`);
                }

                vw.innerHTML = rows.join('');

                if (actionBar) {
                    actionBar.classList.remove('hidden');
                }
            } catch (error) {
                console.error('[RGP renderVirtualWindow]', error);
            }
        }

        // --- Modules Logic ---

        // MODULE 01: Numbers
        const btnNumGen = document.getElementById('btn-num-gen');
        const outNum = document.getElementById('out-num');
        const numMin = document.getElementById('num-min');
        const numMax = document.getElementById('num-max');
        const numDigits = document.getElementById('num-digits');
        const btnDigitsClear = document.getElementById('btn-digits-clear');
        const rangeInputsContainer = document.getElementById('range-inputs-container');

        numDigits?.addEventListener('input', () => {
            if (numDigits.value) {
                if (rangeInputsContainer) {
                    rangeInputsContainer.style.opacity = '0.3';
                    rangeInputsContainer.style.pointerEvents = 'none';
                }
            } else {
                if (rangeInputsContainer) {
                    rangeInputsContainer.style.opacity = '1';
                    rangeInputsContainer.style.pointerEvents = 'auto';
                }
            }
        });

        btnDigitsClear?.addEventListener('click', () => {
            if (!numDigits) return;
            numDigits.value = '';
            numDigits.dispatchEvent(new Event('input'));
        });

        btnNumGen?.addEventListener('click', () => {
            try {
                if (!outNum || !numMin || !numMax || !numDigits) return;
                const qty = getQty();
                const generateNumberValue = () => {
                    const digitCountStr = numDigits.value.trim();
                    if (digitCountStr !== "") {
                        const count = parseInt(digitCountStr);
                        if (isNaN(count) || count < 1 || count > 20) {
                            throw new Error('RANGE 1-20');
                        }
                        const min = count === 1 ? 0n : 10n ** BigInt(count - 1);
                        const max = (10n ** BigInt(count)) - 1n;
                        return cryptoRandomBigInt(min, max).toString();
                    }

                    const minVal = numMin.value;
                    const maxVal = numMax.value;
                    if (minVal === "" || maxVal === "") {
                        throw new Error('ERR');
                    }
                    const min = BigInt(minVal);
                    const max = BigInt(maxVal);
                    if (min > max) {
                        throw new Error('MIN > MAX');
                    }
                    return cryptoRandomBigInt(min, max).toString();
                };

                if (qty === 1) {
                    const res = generateNumberValue();
                    outNum.textContent = res;
                    window.currentBatchData = [res];
                    addHistoryEntry('Numbers', res);
                } else {
                    window.currentBatchData = [];
                    for (let i = 0; i < qty; i++) {
                        window.currentBatchData.push(generateNumberValue());
                    }
                    renderVirtualWindow('num', window.currentBatchData, false);
                    if (window.currentBatchData.length > 0) {
                        addHistoryEntry('Numbers', `${window.currentBatchData[0]} (+${qty - 1} more)`);
                    }
                }
                updateBulkVisibility();
            } catch (error) {
                console.error('[RGP Number Generator]', error);
                if (outNum) {
                    const message = ['RANGE 1-20', 'ERR', 'MIN > MAX'].includes(error.message) ? error.message : 'ERR';
                    outNum.textContent = message;
                }
            }
        });

        // MODULE 02: Password Architect
        const btnPassGen = document.getElementById('btn-pass-gen');
        const outPass = document.getElementById('out-pass');
        const passLength = document.getElementById('pass-length');
        const passLenVal = document.getElementById('pass-len-val');
        const chkUpper = document.getElementById('chk-upper');
        const chkNums = document.getElementById('chk-nums');
        const chkSyms = document.getElementById('chk-syms');
        const btnPassCopy = document.getElementById('btn-pass-copy');

        passLength?.addEventListener('input', () => {
            if (passLenVal) passLenVal.textContent = passLength.value;
        });

        btnPassGen?.addEventListener('click', () => {
            try {
                if (!outPass || !passLength || !chkUpper || !chkNums || !chkSyms) return;
                const qty = getQty();
                const generatePasswordValue = () => {
                    const length = parseInt(passLength.value, 10);
                    if (!Number.isSafeInteger(length) || length < 1) {
                        throw new Error('Invalid password length.');
                    }
                    let charset = "abcdefghijklmnopqrstuvwxyz";
                    if (chkUpper.checked) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                    if (chkNums.checked) charset += "0123456789";
                    if (chkSyms.checked) charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";
                    return generateSecurePassword(length, charset);
                };

                if (qty === 1) {
                    const password = generatePasswordValue();
                    outPass.value = password;
                    window.currentBatchData = [password];
                    addHistoryEntry('Passwords', password);
                } else {
                    window.currentBatchData = [];
                    for (let i = 0; i < qty; i++) {
                        window.currentBatchData.push(generatePasswordValue());
                    }
                    renderVirtualWindow('pass', window.currentBatchData, false);
                    if (window.currentBatchData.length > 0) {
                        addHistoryEntry('Passwords', `${window.currentBatchData[0]} (+${qty - 1} more)`);
                    }
                }
                updateBulkVisibility();
            } catch (error) {
                console.error('[RGP Password Generator]', error);
                if (outPass) outPass.value = 'ERROR';
            }
        });

        // MODULE 03: Name Picker
        const btnNamePick = document.getElementById('btn-name-pick');
        const nameInput = document.getElementById('name-input');
        const outName = document.getElementById('out-name');

        btnNamePick?.addEventListener('click', () => {
            try {
                if (!nameInput || !outName) return;
                const qty = getQty();
                const names = nameInput.value.split(',').map(n => n.trim()).filter(n => n !== "");

                if (names.length === 0) {
                    outName.textContent = "EMPTY";
                    return;
                }

                if (qty === 1) {
                    let count = 0;
                    const interval = setInterval(() => {
                        try {
                            outName.textContent = names[cryptoRandomInt(0, names.length - 1)];
                            count++;
                            if (count > 10) {
                                clearInterval(interval);
                                const finalName = names[cryptoRandomInt(0, names.length - 1)];
                                outName.textContent = finalName;
                                window.currentBatchData = [finalName];
                                addHistoryEntry('Names', finalName);
                                updateBulkVisibility();
                            }
                        } catch (error) {
                            clearInterval(interval);
                            console.error('[RGP Name Picker Animation]', error);
                        }
                    }, 50);
                } else {
                    window.currentBatchData = [];
                    for (let i = 0; i < qty; i++) {
                        const list = nameInput.value.split(',').map(n => n.trim()).filter(n => n !== "");
                        if (list.length === 0) continue;
                        const pick = list[cryptoRandomInt(0, list.length - 1)];
                        window.currentBatchData.push(pick);
                    }
                    renderVirtualWindow('names', window.currentBatchData, false);
                    if (window.currentBatchData.length > 0) {
                        addHistoryEntry('Names', `${window.currentBatchData[0]} (+${qty - 1} more)`);
                    }
                    updateBulkVisibility();
                }
            } catch (error) {
                console.error('[RGP Name Picker]', error);
                if (outName) outName.textContent = 'ERROR';
            }
        });

        // MODULE 04: Identity Engine
        const identityData = {
            US: {
                cities: ["New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Austin, TX", "Seattle, WA", "Philadelphia, PA", "San Diego, CA"]
            },
            UK: {
                cities: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Southampton", "Liverpool", "Newcastle", "Sheffield", "Belfast"]
            },
            IN: {
                cities: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur"]
            },
            JP: {
                format: 'lastFirst',
                cities: ["Tokyo", "Osaka", "Kyoto", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kawasaki", "Saitama", "Hiroshima"]
            }
        };

        const btnIdGen = document.getElementById('btn-id-gen');
        const regionSelect = document.getElementById('region-select');
        const genderSelect = document.getElementById('gender-select');
        const outIdList = document.getElementById('out-id-list');
        const CURRENT_NAME_DATA_VERSION = "3.0";

        function generateSecureID(len) {
            try {
                const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                let result = "";
                for (let i = 0; i < len; i++) {
                    result += charset[cryptoRandomInt(0, charset.length - 1)];
                }
                return result;
            } catch (error) {
                console.error('[RGP Secure ID Generator]', error);
                throw error;
            }
        }

        async function fetchNameData(region) {
            let fileRegion = 'US';
            if (region === 'UK') fileRegion = 'UK';
            else if (region === 'IN') fileRegion = 'AS';
            else if (region === 'JP') fileRegion = 'JP';

            const cacheKey = `nameData_${fileRegion}`;
            const versionKey = `nameDataVersion_${fileRegion}`;

            try {
                if (localStorage.getItem(versionKey) === CURRENT_NAME_DATA_VERSION) {
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) return JSON.parse(cached);
                }
            } catch (e) {
                console.warn('[RGP Name Cache]', e);
            }

            try {
                const getFilePath = (path) => window.location.pathname.includes('/tools/') ? '../' + path : './' + path;
                const res = await fetch(getFilePath(`data/names-${fileRegion}.json`));
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(versionKey, CURRENT_NAME_DATA_VERSION);
                return data;
            } catch (e) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) return JSON.parse(cached);
                return null;
            }
        }

        btnIdGen?.addEventListener('click', async () => {
            const originalText = btnIdGen.textContent;
            try {
                if (!regionSelect || !outIdList) return;
                const region = regionSelect.value;
                if (!region || !identityData[region]) return;

                const qty = getQty();
                btnIdGen.disabled = true;
                btnIdGen.textContent = "SYNCING...";

                let remoteData = await fetchNameData(region);

                if (!remoteData) {
                    remoteData = {
                        first: ["Aarav", "John", "Jane", "Yuki", "Priya", "David", "Emily", "Ken"],
                        middle: ["Kumar", "Singh", "Robert", "Alan", "Sato", "Devi", "Marie", "Takashi"],
                        last: ["Sharma", "Smith", "Jones", "Tanaka", "Patel", "Brown", "Taylor", "Suzuki"]
                    };
                }

                const getRand = (arr) => arr && arr.length > 0 ? arr[cryptoRandomInt(0, arr.length - 1)] : "";
                const buildProfile = (profileRegion) => {
                    const localData = identityData[profileRegion];
                    if (!localData) throw new Error('Invalid identity region.');
                    const fName = getRand(remoteData.first);
                    const mName = cryptoRandomInt(0, 99) < 30 ? getRand(remoteData.middle) : "";
                    const lName = getRand(remoteData.last);

                    let components = [];
                    if (localData.format === 'lastFirst' || profileRegion === 'JP') {
                        if (lName) components.push(lName);
                        if (fName) components.push(fName);
                    } else if (profileRegion === 'US' || profileRegion === 'UK') {
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
                        age: cryptoRandomInt(18, 75),
                        city: getRand(localData.cities) || "Unknown City",
                        id: generateSecureID(8)
                    };
                };

                if (qty === 1) {
                    const profile = buildProfile(region);
                    const profileHtml = `
                        <div class="border-b border-white py-3 last:border-0 flex justify-between items-center group">
                            <div>
                                <div class="text-white font-bold">${escapeHtml(profile.name)}</div>
                                <div class="text-on-surface-variant text-sm">${escapeHtml(profile.city)} • Age: ${escapeHtml(profile.age)}</div>
                                <div class="text-[12px] text-white font-mono uppercase mt-1">ID: ${escapeHtml(profile.id)}</div>
                            </div>
                            <button class="w-8 h-8 flex items-center justify-center bg-[#18181b] border border-gray-600 hover:border-gray-400 hover:shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all flex-shrink-0 copy-profile-btn" title="Copy Profile" aria-label="Copy Profile">
                                <span class="material-symbols-outlined text-[16px] text-gray-400 group-hover:text-white">content_copy</span>
                            </button>
                        </div>
                    `;

                    if (outIdList.innerHTML.includes('EMPTY')) outIdList.innerHTML = '';
                    outIdList.insertAdjacentHTML('afterbegin', profileHtml);

                    while (outIdList.children.length > 10) {
                        outIdList.removeChild(outIdList.lastElementChild);
                    }

                    window.currentBatchData = [profile];
                    addHistoryEntry('Profiles', `${profile.name} (${profile.city})`);
                } else {
                    window.currentBatchData = [];
                    for (let i = 0; i < qty; i++) {
                        window.currentBatchData.push(buildProfile(regionSelect.value));
                    }
                    renderVirtualWindow('identities', window.currentBatchData, true);
                    if (window.currentBatchData.length > 0) {
                        addHistoryEntry('Profiles', `${window.currentBatchData[0].name} (+${qty - 1} more)`);
                    }
                }
                updateBulkVisibility();
            } catch (error) {
                console.error('[RGP Identity Generator]', error);
            } finally {
                btnIdGen.disabled = false;
                btnIdGen.textContent = originalText;
            }
        });

        const btnBulkGen = document.getElementById('btn-bulk-gen');
        btnBulkGen?.addEventListener('click', () => {
            try {
                const requestedTarget = btnBulkGen.getAttribute('data-target');
                const focusedSection = document.activeElement?.closest('section')?.id;
                const hashTarget = window.location.hash ? window.location.hash.replace('#', '') : '';
                const target = requestedTarget || focusedSection || hashTarget || 'numbers';
                const generatorMap = {
                    numbers: btnNumGen,
                    passwords: btnPassGen,
                    names: btnNamePick,
                    identities: btnIdGen
                };
                const generatorButton = generatorMap[target] || btnNumGen;
                generatorButton?.click();
                updateBulkVisibility();
            } catch (error) {
                console.error('[RGP Bulk Generator]', error);
            }
        });

        // Profile Copy Delegation
        outIdList?.addEventListener('click', (e) => {
            const btn = e.target.closest('.copy-profile-btn');
            if (!btn) return;
            const profileDiv = btn.closest('.flex');
            const name = profileDiv?.querySelector('.text-white.font-bold')?.textContent;
            const details = profileDiv?.querySelector('.text-on-surface-variant.text-sm')?.textContent;
            const id = profileDiv?.querySelector('.text-\\[12px\\].text-white.font-mono')?.textContent;
            if (!name || !details || !id) return;

            const textToCopy = `${name}\n${details}\n${id}`;
            if (!textToCopy) return;
            copyTextToClipboard(textToCopy, "Profile Copied!", () => {
                const icon = btn.querySelector('.material-symbols-outlined');
                if (!icon) return;
                const originalText = icon.textContent;
                icon.textContent = 'check';
                icon.classList.remove('text-gray-400', 'group-hover:text-white');
                icon.classList.add('text-white');
                setTimeout(() => {
                    icon.textContent = originalText;
                    icon.classList.remove('text-white');
                    icon.classList.add('text-gray-400', 'group-hover:text-white');
                }, 2000);
            });
        });

        // Copy buttons for Single Output
        btnPassCopy?.addEventListener('click', () => {
            if (!outPass) return;
            const textToCopy = outPass.value;
            if (!textToCopy) return;
            copyTextToClipboard(textToCopy, "Password Copied!", () => {
                const originalIcon = btnPassCopy.innerHTML;
                btnPassCopy.innerHTML = '<span class="material-symbols-outlined text-black">check</span>';
                setTimeout(() => { btnPassCopy.innerHTML = originalIcon; }, 2000);
            });
        });

        const btnNumCopyNew = document.getElementById('btn-num-copy-new');
        btnNumCopyNew?.addEventListener('click', () => {
            if (!outNum) return;
            const textToCopy = outNum.textContent;
            if (!textToCopy || ['ERR', 'MIN > MAX', 'RANGE 1-20'].includes(textToCopy)) return;
            copyTextToClipboard(textToCopy, "Number Copied!", () => {
                const icon = btnNumCopyNew.querySelector('.material-symbols-outlined');
                if (!icon) return;
                const originalText = icon.textContent;
                icon.textContent = 'check';
                setTimeout(() => { icon.textContent = originalText; }, 2000);
            });
        });

        // --- Bulk Actions & Smart Export Engine (TASK 3) ---
        function downloadBlob(content, filename, contentType) {
            const blob = new Blob([content], { type: contentType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`Downloaded ${filename}`);
        }

        // Copy All Handler
        document.querySelectorAll('.copy-bulk-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                if (!window.currentBatchData || window.currentBatchData.length === 0) return;

                let text = "";
                if (target === 'identities') {
                    text = window.currentBatchData.map(d => `${d.name} | Age: ${d.age} | ${d.city} | ID: ${d.id}`).join('\n');
                } else {
                    text = window.currentBatchData.join('\n');
                }

                copyTextToClipboard(text, "All items copied to clipboard!");
            });
        });

        // CSV Export Handler
        document.querySelectorAll('.csv-bulk-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                if (!window.currentBatchData || window.currentBatchData.length === 0) return;

                const tabName = labelMap[target] || target;
                const qty = window.currentBatchData.length;
                const filename = `RandomPro_${tabName}_${qty}.csv`;

                let csvContent = "";
                if (target === 'identities') {
                    // Profile CSV: Map keys to headers exactly: Name, Age, City, ID
                    csvContent = 'Name,Age,City,ID\n' + window.currentBatchData.map(d => `"${d.name}",${d.age},"${d.city}","${d.id}"`).join('\n');
                } else {
                    csvContent = 'Value\n' + window.currentBatchData.map(val => `"${val}"`).join('\n');
                }

                downloadBlob(csvContent, filename, 'text/csv');
            });
        });

        // JSON Export Handler
        document.querySelectorAll('.json-bulk-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                if (!window.currentBatchData || window.currentBatchData.length === 0) return;

                const tabName = labelMap[target] || target;
                const qty = window.currentBatchData.length;
                const filename = `RandomPro_${tabName}_${qty}.json`;

                const jsonContent = JSON.stringify(window.currentBatchData, null, 2);
                downloadBlob(jsonContent, filename, 'application/json');
            });
        });

        // --- Initial Seed Runs (null-safe) ---
        if (btnNumGen) btnNumGen.click();
        if (btnPassGen) btnPassGen.click();
        if (typeof updateBulkVisibility === 'function') updateBulkVisibility();

        // --- Service Worker Registrar (null-safe) ---
        if ('serviceWorker' in navigator) {
            const registerServiceWorker = () => {
                navigator.serviceWorker.register('./sw.js').catch(err => {
                    console.warn('[SW] Registration failed:', err);
                });
            };

            if (document.readyState === 'complete') {
                registerServiceWorker();
            } else {
                window.addEventListener('load', registerServiceWorker, { once: true });
            }
        }
        }

        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', initRandomGeneratorPro, { once: true });
        } else {
            initRandomGeneratorPro();
        }
