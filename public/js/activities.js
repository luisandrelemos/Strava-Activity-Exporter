const Activities = {
    activities: [],
    filteredActivities: [],
    selectedIds: new Set(),
    currentPage: 1,
    perPage: 30,
    isLoading: false,
    loadingComplete: false,
    filtersApplied: false,
    sortColumn: 'date',
    sortDirection: 'desc',
    elements: {},
    dropdowns: {},
    abortController: null,

    init() {
        this.elements = {
            list: document.getElementById('activities-list'),
            loading: document.getElementById('activities-loading'),
            emptyState: document.getElementById('empty-state'),
            paginationSection: document.getElementById('pagination-section'),
            prevPageBtn: document.getElementById('prev-page-btn'),
            nextPageBtn: document.getElementById('next-page-btn'),
            pageInfo: document.getElementById('page-info'),
            selectAll: document.getElementById('select-all'),
            selectedCount: document.getElementById('selected-count'),
            activitiesTotal: document.getElementById('activities-total'),
            loadingIndicator: document.getElementById('loading-indicator'),
            downloadBtn: document.getElementById('download-btn'),
            exportFormat: document.getElementById('export-format'),
            filterBtn: document.getElementById('filter-btn'),
            searchTitle: document.getElementById('search-title'),
            activityType: document.getElementById('activity-type'),
            dateFrom: document.getElementById('date-from'),
            dateTo: document.getElementById('date-to'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            progressSection: document.getElementById('progress-section'),
            progressText: document.getElementById('progress-text'),
            progressCount: document.getElementById('progress-count'),
            progressFill: document.getElementById('progress-fill')
        };

        this.initDropdowns();
        this.bindEvents();
    },

    initDropdowns() {
        Utils.initDropdownClose();
        this.dropdowns.activityType = Utils.createCustomDropdown(this.elements.activityType);
        this.dropdowns.exportFormat = Utils.createCustomDropdown(this.elements.exportFormat);
    },

    bindEvents() {
        this.elements.prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        this.elements.nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        this.elements.selectAll.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        this.elements.downloadBtn.addEventListener('click', () => this.downloadSelected());
        this.elements.filterBtn.addEventListener('click', () => this.applyFilters());
        this.elements.clearFiltersBtn.addEventListener('click', () => this.clearFilters());

        document.querySelectorAll('.activities-table th.sortable').forEach(header => {
            header.addEventListener('click', () => this.toggleSort(header.dataset.sort));
        });
    },

    async loadAll() {
        if (this.isLoading || !Auth.isLoggedIn()) return;

        this.abortController = new AbortController();
        this.isLoading = true;
        this.loadingComplete = false;
        this.activities = [];
        this.filteredActivities = [];
        this.currentPage = 1;
        this.filtersApplied = false;

        Utils.show(this.elements.loading);
        Utils.show(this.elements.loadingIndicator);
        Utils.hide(this.elements.emptyState);
        this.elements.loading.querySelector('span').textContent = 'Loading activities...';

        try {
            let page = 1;
            let hasMore = true;

            while (hasMore && !this.abortController.signal.aborted) {
                const activities = await API.getActivities(page, 200, this.abortController.signal);

                if (this.abortController.signal.aborted) break;

                if (activities.length > 0) {
                    this.activities = [...this.activities, ...activities];
                    if (this.filtersApplied) {
                        this.applyFiltersInternal();
                    } else {
                        this.filteredActivities = [...this.activities];
                        this.sortActivities();
                    }
                    this.render();
                    this.updateActivitiesCount();
                    this.elements.loading.querySelector('span').textContent = `Loading activities... ${this.activities.length} loaded`;
                }

                hasMore = activities.length >= 200;
                page++;
            }

            if (!this.abortController.signal.aborted) {
                this.loadingComplete = true;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading activities:', error);
                App.showError(error.message);
            }
        } finally {
            this.isLoading = false;
            this.abortController = null;
            Utils.hide(this.elements.loading);
            Utils.hide(this.elements.loadingIndicator);
        }
    },

    applyFiltersInternal() {
        const titleFilter = this.elements.searchTitle.value.toLowerCase().trim();
        const typeFilter = this.elements.activityType.value;
        const dateFromFilter = this.elements.dateFrom.value;
        const dateToFilter = this.elements.dateTo.value;

        this.filteredActivities = this.activities.filter(activity => {
            if (titleFilter && !(activity.name || '').toLowerCase().includes(titleFilter)) {
                return false;
            }

            if (typeFilter) {
                const activityType = activity.type || '';
                const sportType = activity.sport_type || '';
                if (activityType !== typeFilter && sportType !== typeFilter) {
                    return false;
                }
            }

            if (dateFromFilter) {
                const activityDate = new Date(activity.start_date_local);
                const fromDate = new Date(dateFromFilter);
                fromDate.setHours(0, 0, 0, 0);
                if (activityDate < fromDate) return false;
            }

            if (dateToFilter) {
                const activityDate = new Date(activity.start_date_local);
                const toDate = new Date(dateToFilter);
                toDate.setHours(23, 59, 59, 999);
                if (activityDate > toDate) return false;
            }

            return true;
        });

        this.sortActivities();
    },

    toggleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = column === 'title' ? 'asc' : 'desc';
        }

        this.sortActivities();
        this.currentPage = 1;
        this.render();
    },

    sortActivities() {
        const col = this.sortColumn;
        const dir = this.sortDirection === 'asc' ? 1 : -1;

        this.filteredActivities.sort((a, b) => {
            let valA, valB;

            switch (col) {
                case 'sport':
                    valA = (a.sport_type || a.type || '').toLowerCase();
                    valB = (b.sport_type || b.type || '').toLowerCase();
                    break;
                case 'date':
                    valA = new Date(a.start_date_local).getTime();
                    valB = new Date(b.start_date_local).getTime();
                    break;
                case 'title':
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
                    break;
                case 'time':
                    valA = a.moving_time || 0;
                    valB = b.moving_time || 0;
                    break;
                case 'distance':
                    valA = a.distance || 0;
                    valB = b.distance || 0;
                    break;
                case 'elevation':
                    valA = a.total_elevation_gain || 0;
                    valB = b.total_elevation_gain || 0;
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return -dir;
            if (valA > valB) return dir;
            return 0;
        });
    },

    applyFilters() {
        this.filtersApplied = true;
        this.applyFiltersInternal();
        this.currentPage = 1;
        this.selectedIds.clear();
        this.render();
        this.updateActivitiesCount();
        this.updateSelectedCount();
    },

    clearFilters() {
        this.elements.searchTitle.value = '';
        this.elements.activityType.value = '';
        this.elements.dateFrom.value = '';
        this.elements.dateTo.value = '';
        this.sortColumn = 'date';
        this.sortDirection = 'desc';
        this.filtersApplied = false;
        if (this.dropdowns.activityType) this.dropdowns.activityType.updateDisplay();
        this.filteredActivities = [...this.activities];
        this.sortActivities();
        this.currentPage = 1;
        this.selectedIds.clear();
        this.render();
        this.updateActivitiesCount();
        this.updateSelectedCount();
    },

    updateActivitiesCount() {
        this.elements.activitiesTotal.textContent = this.filteredActivities.length;

        if (this.filteredActivities.length === 0 && this.loadingComplete) {
            Utils.show(this.elements.emptyState);
            Utils.hide(this.elements.paginationSection);
        } else {
            Utils.hide(this.elements.emptyState);
        }
    },

    getTotalPages() {
        return Math.ceil(this.filteredActivities.length / this.perPage);
    },

    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page < 1 || page > totalPages) return;

        this.currentPage = page;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    render() {
        this.elements.list.innerHTML = '';

        const totalPages = this.getTotalPages();
        const startIndex = (this.currentPage - 1) * this.perPage;
        const pageActivities = this.filteredActivities.slice(startIndex, startIndex + this.perPage);

        const fragment = document.createDocumentFragment();
        for (const activity of pageActivities) {
            fragment.appendChild(this.createActivityRow(activity));
        }
        this.elements.list.appendChild(fragment);

        document.querySelectorAll('.activities-table th.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.dataset.sort === this.sortColumn) {
                header.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });

        if (totalPages > 1) {
            Utils.show(this.elements.paginationSection);
            this.elements.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
            this.elements.prevPageBtn.disabled = this.currentPage === 1;
            this.elements.nextPageBtn.disabled = this.currentPage === totalPages;
        } else {
            Utils.hide(this.elements.paginationSection);
        }
    },

    createActivityRow(activity) {
        const row = document.createElement('tr');
        row.dataset.id = activity.id;

        const isSelected = this.selectedIds.has(activity.id);
        const sportType = this.formatSportType(activity.sport_type || activity.type);
        const date = this.formatShortDate(activity.start_date_local);
        const duration = Utils.formatDuration(activity.moving_time);
        const distance = Utils.formatDistance(activity.distance);
        const elevation = activity.total_elevation_gain ? Utils.formatElevation(activity.total_elevation_gain) : '-';

        row.innerHTML = `
            <td class="col-checkbox">
                <input type="checkbox" class="activity-checkbox" ${isSelected ? 'checked' : ''}>
            </td>
            <td class="col-sport"><span class="activity-sport">${sportType}</span></td>
            <td class="col-date"><span class="activity-date">${date}</span></td>
            <td class="col-title">
                <a href="https://www.strava.com/activities/${activity.id}" target="_blank" rel="noopener" class="activity-link">${Utils.escapeXml(activity.name)}</a>
            </td>
            <td class="col-time"><span class="activity-stat">${duration}</span></td>
            <td class="col-distance"><span class="activity-stat">${distance}</span></td>
            <td class="col-elevation"><span class="activity-stat">${elevation}</span></td>
            <td class="col-actions">
                <div class="activity-actions">
                    <button class="btn-export btn-gpx">GPX</button>
                    <button class="btn-export btn-tcx">TCX</button>
                    <button class="btn-export btn-fit">FIT</button>
                </div>
            </td>
        `;

        row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectedIds.add(activity.id);
            } else {
                this.selectedIds.delete(activity.id);
            }
            this.updateSelectedCount();
        });

        row.querySelector('.btn-gpx').addEventListener('click', () => this.exportSingle(activity, 'gpx'));
        row.querySelector('.btn-tcx').addEventListener('click', () => this.exportSingle(activity, 'tcx'));
        row.querySelector('.btn-fit').addEventListener('click', () => Export.downloadFit(activity.id));

        return row;
    },

    formatSportType(type) {
        const types = {
            Ride: 'Cycling', MountainBikeRide: 'MTB Cycling', GravelRide: 'Gravel Cycling',
            EBikeRide: 'E-Bike Cycling', VirtualRide: 'Virtual Cycling',
            Run: 'Run', TrailRun: 'Trail Run', VirtualRun: 'Virtual Run',
            Swim: 'Swim', Walk: 'Walk', Hike: 'Hike',
            WeightTraining: 'Weight Training', Workout: 'Workout', Yoga: 'Yoga',
            Rowing: 'Rowing', Kayaking: 'Kayaking', Crossfit: 'Crossfit',
            Elliptical: 'Elliptical', StairStepper: 'Stair Stepper'
        };
        return types[type] || type || 'Activity';
    },

    formatShortDate(dateString) {
        const date = new Date(dateString);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        return `${days[date.getDay()]}, ${dd}/${mm}/${date.getFullYear()}`;
    },

    async exportSingle(activity, format) {
        try {
            await Export.downloadActivity(activity, format);
        } catch (error) {
            console.error('Export error:', error);
            App.showError(`Export failed: ${error.message}`);
        }
    },

    toggleSelectAll(checked) {
        if (checked) {
            this.filteredActivities.forEach(a => this.selectedIds.add(a.id));
        } else {
            this.selectedIds.clear();
        }

        this.elements.list.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = checked);
        this.updateSelectedCount();
    },

    updateSelectedCount() {
        const count = this.selectedIds.size;
        this.elements.selectedCount.textContent = `${count} selected`;
        this.elements.downloadBtn.disabled = count === 0;

        if (count === 0) {
            this.elements.selectAll.checked = false;
            this.elements.selectAll.indeterminate = false;
        } else if (count === this.filteredActivities.length) {
            this.elements.selectAll.checked = true;
            this.elements.selectAll.indeterminate = false;
        } else {
            this.elements.selectAll.indeterminate = true;
        }
    },

    async downloadSelected() {
        if (this.selectedIds.size === 0) return;

        const format = this.elements.exportFormat.value;
        const selectedActivities = this.filteredActivities.filter(a => this.selectedIds.has(a.id));

        Utils.show(this.elements.progressSection);
        this.elements.downloadBtn.disabled = true;

        const onProgress = (completed, total, current) => {
            this.elements.progressCount.textContent = `${completed}/${total}`;
            this.elements.progressText.textContent = `Exporting: ${current}`;
            this.elements.progressFill.style.width = `${(completed / total) * 100}%`;
        };

        try {
            let result;

            if (format === 'fit') {
                result = await Export.batchExportFit(selectedActivities, onProgress);
                if (result.errors.length > 0 && result.completed === 0) {
                    App.showError('Popups blocked! Allow popups for this site and try again.');
                } else if (result.errors.length > 0) {
                    App.showError(`Exported ${result.completed}/${selectedActivities.length}. Some downloads may have been blocked.`);
                }
            } else {
                result = await Export.batchExport(selectedActivities, format, onProgress);
                if (result.errors.length > 0) {
                    App.showError(`Export completed with ${result.errors.length} error(s). Check console for details.`);
                }
            }
        } catch (error) {
            console.error('Batch export error:', error);
            App.showError(`Batch export failed: ${error.message}`);
        } finally {
            Utils.hide(this.elements.progressSection);
            this.elements.downloadBtn.disabled = false;
            this.elements.progressFill.style.width = '0%';
        }
    },

    reset() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isLoading = false;
        this.activities = [];
        this.filteredActivities = [];
        this.selectedIds.clear();
        this.currentPage = 1;
        this.loadingComplete = false;
        this.filtersApplied = false;
        this.sortColumn = 'date';
        this.sortDirection = 'desc';
        this.elements.list.innerHTML = '';
        this.elements.selectAll.checked = false;
        this.updateSelectedCount();
        this.elements.activitiesTotal.textContent = '0';
        Utils.hide(this.elements.paginationSection);
        Utils.hide(this.elements.loading);
        Utils.hide(this.elements.loadingIndicator);
    }
};