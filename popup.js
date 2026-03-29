    let domainData = []; // Array of { hostname, url, cookies, selected }
    let globalCookiesToExport = [];

    async function recalculateAndRender() {
        const tableBody = document.getElementById('cookieTableBody');
        const status = document.getElementById('status');
        
        const selectedData = domainData.filter(d => d.selected);
        
        let allCookies = [];
        selectedData.forEach(d => {
            allCookies.push(...d.cookies);
        });

        // Deduplicate cookies across merged domains
        const uniqueCookiesMap = new Map();
        for (const c of allCookies) {
            const key = `${c.domain}|${c.path}|${c.name}`;
            if (!uniqueCookiesMap.has(key)) {
                uniqueCookiesMap.set(key, c);
            }
        }

        globalCookiesToExport = Array.from(uniqueCookiesMap.values());

        // Render Table (Clear previous)
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        const fragment = document.createDocumentFragment();
        const MAX_DISPLAY = 500;
        const displayCookies = globalCookiesToExport.slice(0, MAX_DISPLAY);

        displayCookies.forEach(cookie => {
            const tr = document.createElement('tr');
            
            const tdDomain = document.createElement('td');
            tdDomain.textContent = cookie.domain || '';
            tdDomain.title = cookie.domain || ''; // Tooltip
            
            const tdName = document.createElement('td');
            tdName.textContent = cookie.name || '';
            tdName.title = cookie.name || '';
            
            const tdVal = document.createElement('td');
            tdVal.textContent = cookie.value || '';
            tdVal.title = cookie.value || '';

            tr.appendChild(tdDomain);
            tr.appendChild(tdName);
            tr.appendChild(tdVal);
            fragment.appendChild(tr);
        });
        tableBody.appendChild(fragment);

        if (globalCookiesToExport.length > MAX_DISPLAY) {
            status.textContent = `Found ${globalCookiesToExport.length} cookies (showing first ${MAX_DISPLAY}).`;
        } else {
            status.textContent = `Found ${globalCookiesToExport.length} cookies.`;
        }
        status.className = 'status-msg success';
        
        if (globalCookiesToExport.length === 0) {
            if (domainData.length > 0) {
                status.textContent = 'No domains selected.';
            } else {
                status.textContent = 'No cookies found in tabs.';
            }
            status.className = 'status-msg error';
        }
    }

    // On popup open, get cookies and populate table
    async function loadCookies() {
        const status = document.getElementById('status');
        const domainList = document.getElementById('domainList');
        
        try {
            status.textContent = 'Scanning database...';
            status.className = 'status-msg';

            const extractionScope = document.getElementById('extractionScope');
            const scope = extractionScope ? extractionScope.value : 'opened';

            // 1. Get raw tabs
            const tabs = await chrome.tabs.query({});
            const openTabHostnames = new Set();
            const tabUrls = [];
            tabs.forEach(tab => {
                if (tab.url) {
                    try {
                        const parsed = new URL(tab.url);
                        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                            tabUrls.push(tab.url);
                            let hn = parsed.hostname;
                            openTabHostnames.add(hn);
                            if (hn.startsWith('www.')) openTabHostnames.add(hn.substring(4));
                        }
                    } catch(e) {}
                }
            });

            domainData = [];
            while (domainList.firstChild) { domainList.removeChild(domainList.firstChild); } // Clear loader

            if (scope === 'opened') {
                const uniqueUrls = [...new Set(tabUrls)];
                if (uniqueUrls.length === 0) {
                    status.textContent = 'No valid web tabs opened!';
                    status.classList.add('error');
                    const msg = document.createElement('div');
                    msg.style.color = 'var(--text-secondary)';
                    msg.style.textAlign = 'center';
                    msg.textContent = 'No valid domains';
                    domainList.appendChild(msg);
                    return;
                }

                for (const url of uniqueUrls) {
                    try {
                        const cookies = await chrome.cookies.getAll({ url: url });
                        if (cookies.length > 0) {
                            const hostname = new URL(url).hostname;
                            domainData.push({
                                hostname: hostname,
                                url: url,
                                cookies: cookies,
                                selected: true
                            });
                        }
                    } catch (err) { }
                }

            } else {
                // 'all' or 'closed'
                const allCookies = await chrome.cookies.getAll({});
                
                // Group by domain
                const grouped = new Map();
                for (let c of allCookies) {
                    let d = c.domain;
                    const cleanDomain = d.startsWith('.') ? d.substring(1) : d;
                    
                    if (scope === 'closed') {
                        // Skip if domain belongs to an open tab
                        let isOpen = false;
                        for (const oh of openTabHostnames) {
                            if (oh === cleanDomain || oh.endsWith('.' + cleanDomain) || cleanDomain.endsWith('.' + oh)) {
                                isOpen = true;
                                break;
                            }
                        }
                        if (isOpen) continue;
                    }

                    if (!grouped.has(d)) {
                        grouped.set(d, []);
                    }
                    grouped.get(d).push(c);
                }

                for (const [domain, cookies] of grouped.entries()) {
                    domainData.push({
                        hostname: domain,
                        url: null,
                        cookies: cookies,
                        selected: true
                    });
                }
            }

            if (domainData.length === 0) {
                status.textContent = 'No cookies matched this scope.';
                status.classList.add('error');
                const msg = document.createElement('div');
                msg.style.color = 'var(--text-secondary)';
                msg.style.textAlign = 'center';
                msg.textContent = 'No domains found';
                domainList.appendChild(msg);
                return;
            }
            
            // Deduplicate UI checkboxes
            const uniqueDomainsMap = new Map();
            for (const d of domainData) {
                if (!uniqueDomainsMap.has(d.hostname)) {
                    uniqueDomainsMap.set(d.hostname, d);
                } else {
                    uniqueDomainsMap.get(d.hostname).cookies.push(...d.cookies);
                }
            }
            domainData = Array.from(uniqueDomainsMap.values());

            // Render Checkboxes efficiently using Fragment
            const fragment = document.createDocumentFragment();
            domainData.forEach(data => {
                const label = document.createElement('label');
                label.title = `Cookies for ${data.hostname}`;
                
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = true;
                cb.addEventListener('change', (e) => {
                    data.selected = e.target.checked;
                    recalculateAndRender();
                });
                
                const span = document.createElement('span');
                span.textContent = data.hostname;
                
                label.appendChild(cb);
                label.appendChild(span);
                fragment.appendChild(label);
            });
            domainList.appendChild(fragment);

            await recalculateAndRender();

        } catch (error) {
            console.error("Load failed:", error);
            status.textContent = error.message;
            status.classList.add('error');
        }
    }

    // Attach listener to dropdown if exists
    const scopeSelect = document.getElementById('extractionScope');
    if (scopeSelect) {
        scopeSelect.addEventListener('change', () => {
             // Reset UI and reload
             const domainList = document.getElementById('domainList');
             while (domainList.firstChild) { domainList.removeChild(domainList.firstChild); }
             const loader = document.createElement('div');
             loader.className = 'loader';
             loader.style.margin = '0 auto';
             domainList.appendChild(loader);
             loadCookies();
        });
    }

    // Load table on start
    document.addEventListener('DOMContentLoaded', loadCookies);

document.getElementById('exportBtn').addEventListener('click', () => {
    const btn = document.getElementById('exportBtn');
    const btnText = btn.querySelector('.btn-text');
    const loader = document.getElementById('loader');
    const status = document.getElementById('status');
    const formatSelect = document.getElementById('formatSelect');

    if (globalCookiesToExport.length === 0) {
        status.textContent = 'No cookies loaded to export.';
        status.className = 'status-msg error';
        return;
    }

    try {
        // UI updates
        btnText.textContent = 'Exporting...';
        loader.classList.remove('hidden');
        btn.disabled = true;
        status.textContent = '';
        status.className = 'status-msg';

        const format = formatSelect.value;
        const scopeElem = document.getElementById('extractionScope');
        const scope = scopeElem ? scopeElem.value : 'opened';
        
        let prefix = 'cookies_export';
        if (scope === 'opened') prefix = 'opened_tabs_cookies';
        else if (scope === 'closed') prefix = 'closed_tabs_cookies';
        else if (scope === 'all') prefix = 'all_stored_cookies';

        let fileContent = '';
        let filename = '';

        // Apply Safe Share Redaction Filter logic
        const safeShareEnabled = document.getElementById('safeShareToggle').checked;
        let exportPayload = globalCookiesToExport;
        
        if (safeShareEnabled) {
            exportPayload = globalCookiesToExport.map(c => ({
                ...c,
                value: '[REDACTED_SAFE_SHARE]'
            }));
        }

        // 4. Format to output string
        if (format === 'netscape') {
            filename = `${prefix}.txt`;
            fileContent = "# Netscape HTTP Cookie File\n";
            fileContent += "# This file was generated by Cookie Exporter Extension\n";
            fileContent += "# Do not edit this file!\n\n";

            for (const cookie of exportPayload) {
                const domain = cookie.domain || '';
                const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
                const path = cookie.path || '/';
                const secure = cookie.secure ? 'TRUE' : 'FALSE';
                const expirationDate = cookie.expirationDate ? Math.floor(cookie.expirationDate) : 0;
                const name = cookie.name || '';
                const value = cookie.value || '';

                fileContent += `${domain}\t${includeSubdomains}\t${path}\t${secure}\t${expirationDate}\t${name}\t${value}\n`;
            }
        } else if (format === 'json') {
            filename = `${prefix}.json`;
            fileContent = JSON.stringify(exportPayload, null, 2);
        }

        // 5. Download the file using URL.createObjectURL for memory safety
        const blob = new Blob([fileContent], { type: format === 'json' ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);
            
        chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: false // Download straight to default folder without prompting each time
        }, (downloadId) => {
            // Revoke object URL after a short delay to free memory immediately
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            if (chrome.runtime.lastError) {
                btnText.textContent = 'Export';
                loader.classList.add('hidden');
                btn.disabled = false;
                status.textContent = 'Error: ' + chrome.runtime.lastError.message;
                status.classList.add('error');
                return;
            }
            
            // Success
            btnText.textContent = 'Export';
            loader.classList.add('hidden');
            btn.disabled = false;
            
            status.textContent = `Success! Exported ${globalCookiesToExport.length} cookies.`;
            status.classList.add('success');
        });

    } catch (error) {
        console.error("Export failed:", error);
        btnText.textContent = 'Export';
        loader.classList.add('hidden');
        btn.disabled = false;
        
        status.textContent = error.message;
        status.classList.add('error');
    }
});
