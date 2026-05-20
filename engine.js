// --- Utility: Crypto Random Range ---
function cryptoRandomInt(min, max) {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const randomBytes = new Uint8Array(bytesNeeded);
    window.crypto.getRandomValues(randomBytes);
    let value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
        value = (value << 8) | randomBytes[i];
    }
    return min + (value % range);
}

/**
 * Generates a cryptographically strong random BigInt between min and max (inclusive).
 * Supports values larger than 2^53 - 1.
 */
function cryptoRandomBigInt(min, max) {
    const range = max - min + 1n;
    const bitLength = range.toString(2).length;
    const byteLength = Math.ceil(bitLength / 8);
    const bytes = new Uint8Array(byteLength);

    let randomValue;
    do {
        window.crypto.getRandomValues(bytes);
        randomValue = 0n;
        for (let i = 0; i < byteLength; i++) {
            randomValue = (randomValue << 8n) + BigInt(bytes[i]);
        }
        // Mask to avoid extra bits if bitLength is not a multiple of 8
        const mask = (1n << BigInt(bitLength)) - 1n;
        randomValue &= mask;
    } while (randomValue >= range);

    return min + randomValue;
}

// --- Module 1: Number Generator ---
const btnNumGen = document.getElementById('btn-num-gen');
const outNum = document.getElementById('out-num');
const numMin = document.getElementById('num-min');
const numMax = document.getElementById('num-max');
const numDigits = document.getElementById('num-digits');
const btnDigitsClear = document.getElementById('btn-digits-clear');
const rangeInputsContainer = document.getElementById('range-inputs-container');

// Toggle UI based on digit count presence
numDigits?.addEventListener('input', () => {
    if (numDigits.value) {
        rangeInputsContainer.style.opacity = '0.3';
        rangeInputsContainer.style.pointerEvents = 'none';
    } else {
        rangeInputsContainer.style.opacity = '1';
        rangeInputsContainer.style.pointerEvents = 'auto';
    }
});

btnDigitsClear?.addEventListener('click', () => {
    numDigits.value = '';
    numDigits.dispatchEvent(new Event('input'));
});

btnNumGen?.addEventListener('click', () => {
    const digitCountStr = numDigits.value.trim();

    if (digitCountStr !== "") {
        const count = parseInt(digitCountStr);
        if (isNaN(count) || count < 1 || count > 20) {
            outNum.textContent = "RANGE 1-20";
            return;
        }

        // For x digits: min is 10^(x-1), max is (10^x) - 1
        // For 1 digit: 0 to 9 (as per user logic of "exactly that many digits", 
        // but usually for 1 digit it starts from 0 or 1. Let's do 1-9 or 10^(x-1) for consistency)
        const min = count === 1 ? 0n : 10n ** BigInt(count - 1);
        const max = (10n ** BigInt(count)) - 1n;

        outNum.textContent = cryptoRandomBigInt(min, max).toString();
    } else {
        const minVal = numMin.value;
        const maxVal = numMax.value;

        if (minVal === "" || maxVal === "") {
            outNum.textContent = "ERR";
            return;
        }

        const min = BigInt(minVal);
        const max = BigInt(maxVal);

        if (min > max) {
            outNum.textContent = "MIN > MAX";
            return;
        }

        outNum.textContent = cryptoRandomBigInt(min, max).toString();
    }
});

// --- Module 2: Password Architect ---
const btnPassGen = document.getElementById('btn-pass-gen');
const outPass = document.getElementById('out-pass');
const passLength = document.getElementById('pass-length');
const passLenVal = document.getElementById('pass-len-val');
const chkUpper = document.getElementById('chk-upper');
const chkNums = document.getElementById('chk-nums');
const chkSyms = document.getElementById('chk-syms');
const btnPassCopy = document.getElementById('btn-pass-copy');

passLength?.addEventListener('input', () => {
    passLenVal.textContent = passLength.value;
});

btnPassGen?.addEventListener('click', () => {
    const length = parseInt(passLength.value);
    let charset = "abcdefghijklmnopqrstuvwxyz";
    if (chkUpper.checked) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (chkNums.checked) charset += "0123456789";
    if (chkSyms.checked) charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    let password = "";
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
        password += charset.charAt(array[i] % charset.length);
    }
    outPass.value = password;
});

btnPassCopy?.addEventListener('click', () => {
    if (outPass.value) {
        navigator.clipboard.writeText(outPass.value);
        const originalIcon = btnPassCopy.innerHTML;
        btnPassCopy.innerHTML = '<span class="material-symbols-outlined text-black">check</span>';
        showToast("Password Copied!");
        setTimeout(() => { btnPassCopy.innerHTML = originalIcon; }, 2000);
    }
});

// --- Module 3: Name Picker ---
const btnNamePick = document.getElementById('btn-name-pick');
const nameInput = document.getElementById('name-input');
const outName = document.getElementById('out-name');

btnNamePick?.addEventListener('click', () => {
    const names = nameInput.value.split(',').map(n => n.trim()).filter(n => n !== "");
    if (names.length === 0) {
        outName.textContent = "EMPTY";
        return;
    }

    // Animation effect
    let count = 0;
    const interval = setInterval(() => {
        outName.textContent = names[cryptoRandomInt(0, names.length - 1)];
        count++;
        if (count > 10) {
            clearInterval(interval);
            outName.textContent = names[cryptoRandomInt(0, names.length - 1)];
        }
    }, 50);
});

// --- Module 4: Identity Engine ---
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
const genderSelect = document.getElementById('gender-select'); // Not actively used for names since dataset provides generic first names
const outIdList = document.getElementById('out-id-list');

const CURRENT_NAME_DATA_VERSION = "3.0"; // Increment this to bust the local cache when updating JSON files

function generateSecureID(len) {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes ambiguous 0, O, I, 1
    let result = "";
    const array = new Uint32Array(len);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < len; i++) {
        result += charset[array[i] % charset.length];
    }
    return result;
}

async function fetchNameData(region) {
    let fileRegion = 'US';
    if (region === 'UK') {
        fileRegion = 'UK';
    } else if (region === 'IN' || region === 'AS') {
        fileRegion = 'AS';
    } else if (region === 'JP') {
        fileRegion = 'JP';
    }

    const cacheKey = `nameData_${fileRegion}`;
    const versionKey = `nameDataVersion_${fileRegion}`;

    if (localStorage.getItem(versionKey) === CURRENT_NAME_DATA_VERSION) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
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
        console.error("Error fetching name data", e);
        showToast('Offline Mode: Using backup data.');
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    }
}

btnIdGen?.addEventListener('click', async () => {
    const isOffline = !navigator.onLine;
    const region = regionSelect.value;

    // Safety check
    if (!region || !identityData[region]) return;

    const localData = identityData[region];

    // Show Syncing state
    const originalText = btnIdGen.textContent;
    btnIdGen.disabled = true;
    btnIdGen.textContent = "SYNCING...";

    let remoteData = null;
    let fileRegion = 'US';
    if (region === 'UK') {
        fileRegion = 'UK';
    } else if (region === 'IN' || region === 'AS') {
        fileRegion = 'AS';
    } else if (region === 'JP') {
        fileRegion = 'JP';
    }
    const cacheKey = `nameData_${fileRegion}`;

    if (isOffline) {
        showToast('Offline Mode: Using locally cached identities.');
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            remoteData = JSON.parse(cached);
        }
    } else {
        try {
            remoteData = await fetchNameData(region);
        } catch (error) {
            console.error(error);
            showToast('Network error, falling back to cache');
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                remoteData = JSON.parse(cached);
            }
        }
    }

    // Restore button state
    btnIdGen.disabled = false;
    btnIdGen.textContent = originalText;

    if (!remoteData) {
        showToast("Failed to load name data. UI not frozen.");
        return;
    }

    const getRand = (arr) => arr && arr.length > 0 ? arr[cryptoRandomInt(0, arr.length - 1)] : "";

    const fName = getRand(remoteData.first);
    let mName = "";
    if (Math.random() < 0.3) {
        mName = getRand(remoteData.middle);
    }
    const lName = getRand(remoteData.last);

    // Cultural logic and graceful fallback
    let components = [];
    if (localData.format === 'lastFirst' || region === 'JP') {
        if (lName) components.push(lName);
        if (fName) components.push(fName);
        // ZERO middle names for Japan
    } else if (region === 'US' || region === 'UK') {
        if (fName) components.push(fName);
        if (mName) components.push(mName.charAt(0) + "."); // Middle Initial
        if (lName) components.push(lName);
    } else {
        // India (IN) and Default: First + (Middle) + Last
        if (fName) components.push(fName);
        if (mName) components.push(mName);
        if (lName) components.push(lName);
    }
    const name = components.join(' ');

    const city = getRand(localData.cities) || "Unknown City";
    const age = cryptoRandomInt(18, 75);
    const idNumber = generateSecureID(8);

    const profileHtml = `
        <div class="border-b border-white py-3 last:border-0 flex justify-between items-center group">
            <div>
                <div class="text-white font-bold">${name}</div>
                <div class="text-on-surface-variant text-sm">${city} • Age: ${age}</div>
                <div class="text-[12px] text-white font-mono uppercase mt-1">ID: ${idNumber}</div>
            </div>
            <button class="w-8 h-8 flex items-center justify-center bg-[#18181b] border border-gray-600 hover:border-gray-400 hover:shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all flex-shrink-0 copy-profile-btn" title="Copy Profile">
                <span class="material-symbols-outlined text-[16px] text-gray-400 group-hover:text-white">content_copy</span>
            </button>
        </div>
    `;

    // Remove 'EMPTY' placeholder robustly
    if (outIdList.innerHTML.includes('italic')) outIdList.innerHTML = '';

    outIdList.insertAdjacentHTML('afterbegin', profileHtml);

    // Memory and UI Optimization: limit to 10 profiles
    while (outIdList.children.length > 10) {
        outIdList.removeChild(outIdList.lastElementChild);
    }
});

// Event delegation for copying profiles
outIdList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-profile-btn');
    if (!btn) return;
    const profileDiv = btn.closest('.flex');
    const name = profileDiv.querySelector('.text-white.font-bold').textContent;
    const details = profileDiv.querySelector('.text-on-surface-variant.text-sm').textContent;
    const id = profileDiv.querySelector('.text-\\[12px\\].text-white.font-mono').textContent;

    const textToCopy = `${name}\n${details}\n${id}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const icon = btn.querySelector('.material-symbols-outlined');
        const originalText = icon.textContent;
        icon.textContent = 'check';
        icon.classList.remove('text-gray-400', 'group-hover:text-white');
        icon.classList.add('text-white');
        showToast("Profile Copied!");
        setTimeout(() => {
            icon.textContent = originalText;
            icon.classList.remove('text-white');
            icon.classList.add('text-gray-400', 'group-hover:text-white');
        }, 2000);
    });
});

// Initial Generation
btnNumGen.click();
btnPassGen.click();

const btnNumCopy = document.getElementById('btn-num-copy');
if (btnNumCopy) {
    btnNumCopy?.addEventListener('click', () => {
        const text = document.getElementById('out-num').textContent;
        if (text && text !== "ERR" && text !== "MIN > MAX" && text !== "RANGE 1-20") {
            navigator.clipboard.writeText(text);
            const originalIcon = btnNumCopy.innerHTML;
            btnNumCopy.innerHTML = '<span class="material-symbols-outlined">check</span>';
            setTimeout(() => { btnNumCopy.innerHTML = originalIcon; }, 2000);
        }
    });
}

(function () {
    const btn = document.getElementById('btn-num-copy-new');
    if (btn) {
        btn?.addEventListener('click', () => {
            const text = document.getElementById('out-num').textContent;
            if (text && !['ERR', 'MIN > MAX', 'RANGE 1-20'].includes(text)) {
                navigator.clipboard.writeText(text).then(() => {
                    const icon = btn.querySelector('.material-symbols-outlined');
                    const originalText = icon.textContent;
                    icon.textContent = 'check';
                    showToast("Number Copied!");
                    setTimeout(() => { icon.textContent = originalText; }, 2000);
                });
            }
        });
    }
})();

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

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// PWA Service Worker Registration is handled entirely in index.html to improve time-to-interactive.

