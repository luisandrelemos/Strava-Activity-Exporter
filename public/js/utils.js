const Utils = {
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${secs}s`;
    },

    formatDistance(meters) {
        return `${(meters / 1000).toFixed(2)} km`;
    },

    formatElevation(meters) {
        return `${Math.round(meters)} m`;
    },

    safeFilename(name) {
        return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_').substring(0, 100);
    },

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    parseQueryString() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    clearQueryString() {
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    },

    show(element) {
        element.classList.remove('hidden');
    },

    hide(element) {
        element.classList.add('hidden');
    },

    escapeXml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    },

    createCustomDropdown(selectElement) {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-dropdown';

        const trigger = document.createElement('div');
        trigger.className = 'custom-dropdown-trigger';

        const selectedText = document.createElement('span');
        selectedText.className = 'custom-dropdown-selected';

        const arrow = document.createElement('span');
        arrow.className = 'custom-dropdown-arrow';

        trigger.appendChild(selectedText);
        trigger.appendChild(arrow);

        const menu = document.createElement('div');
        menu.className = 'custom-dropdown-menu';

        const options = selectElement.querySelectorAll('option');
        options.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'custom-dropdown-option';
            optionEl.dataset.value = option.value;
            optionEl.textContent = option.textContent;

            if (option.selected) {
                optionEl.classList.add('selected');
                selectedText.textContent = option.textContent;
            }

            optionEl.addEventListener('click', (e) => {
                e.stopPropagation();
                selectElement.value = option.value;
                selectElement.dispatchEvent(new Event('change'));
                menu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('selected'));
                optionEl.classList.add('selected');
                selectedText.textContent = option.textContent;
                wrapper.classList.remove('open');
            });

            menu.appendChild(optionEl);
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-dropdown.open').forEach(d => {
                if (d !== wrapper) d.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });

        selectElement.classList.add('hidden-select');
        selectElement.parentNode.insertBefore(wrapper, selectElement);
        wrapper.appendChild(selectElement);

        wrapper.updateDisplay = () => {
            const currentValue = selectElement.value;
            menu.querySelectorAll('.custom-dropdown-option').forEach(o => {
                o.classList.remove('selected');
                if (o.dataset.value === currentValue) {
                    o.classList.add('selected');
                    selectedText.textContent = o.textContent;
                }
            });
        };

        return wrapper;
    },

    initDropdownClose() {
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
        });
    }
};