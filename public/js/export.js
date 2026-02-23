const Export = {
    generateGPX(activity, streams) {
        if (!streams?.latlng?.data || !streams?.time?.data) return null;

        const latlng = streams.latlng.data;
        const time = streams.time.data;
        const altitude = streams.altitude?.data || [];
        const startTime = new Date(activity.start_date).getTime();

        let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Strava Exporter"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${Utils.escapeXml(activity.name)}</name>
    <time>${activity.start_date}</time>
  </metadata>
  <trk>
    <name>${Utils.escapeXml(activity.name)}</name>
    <type>${Utils.escapeXml(activity.type)}</type>
    <trkseg>
`;

        for (let i = 0; i < latlng.length; i++) {
            const [lat, lon] = latlng[i];
            const timestamp = new Date(startTime + time[i] * 1000).toISOString();
            gpx += `      <trkpt lat="${lat}" lon="${lon}">\n`;
            if (altitude[i] !== undefined) {
                gpx += `        <ele>${altitude[i]}</ele>\n`;
            }
            gpx += `        <time>${timestamp}</time>\n      </trkpt>\n`;
        }

        gpx += `    </trkseg>
  </trk>
</gpx>`;

        return gpx;
    },

    generateTCX(activity, streams) {
        if (!streams?.time?.data) return null;

        const time = streams.time.data;
        const latlng = streams.latlng?.data || [];
        const altitude = streams.altitude?.data || [];
        const heartrate = streams.heartrate?.data || [];
        const cadence = streams.cadence?.data || [];
        const watts = streams.watts?.data || [];
        const distance = streams.distance?.data || [];
        const startTime = new Date(activity.start_date).getTime();

        const sportMap = {
            Run: 'Running', Ride: 'Biking', VirtualRide: 'Biking',
            VirtualRun: 'Running', Walk: 'Running', Hike: 'Running'
        };
        const sport = sportMap[activity.type] || 'Other';

        let tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Activities>
    <Activity Sport="${sport}">
      <Id>${activity.start_date}</Id>
      <Lap StartTime="${activity.start_date}">
        <TotalTimeSeconds>${activity.elapsed_time || activity.moving_time}</TotalTimeSeconds>
        <DistanceMeters>${activity.distance}</DistanceMeters>
        <Calories>${activity.calories || 0}</Calories>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
`;

        for (let i = 0; i < time.length; i++) {
            const timestamp = new Date(startTime + time[i] * 1000).toISOString();
            tcx += `          <Trackpoint>\n            <Time>${timestamp}</Time>\n`;

            if (latlng[i]) {
                const [lat, lon] = latlng[i];
                tcx += `            <Position>\n              <LatitudeDegrees>${lat}</LatitudeDegrees>\n              <LongitudeDegrees>${lon}</LongitudeDegrees>\n            </Position>\n`;
            }
            if (altitude[i] !== undefined) {
                tcx += `            <AltitudeMeters>${altitude[i]}</AltitudeMeters>\n`;
            }
            if (distance[i] !== undefined) {
                tcx += `            <DistanceMeters>${distance[i]}</DistanceMeters>\n`;
            }
            if (heartrate[i] !== undefined) {
                tcx += `            <HeartRateBpm>\n              <Value>${Math.round(heartrate[i])}</Value>\n            </HeartRateBpm>\n`;
            }
            if (cadence[i] !== undefined || watts[i] !== undefined) {
                tcx += `            <Extensions>\n`;
                if (cadence[i] !== undefined) tcx += `              <Cadence>${Math.round(cadence[i])}</Cadence>\n`;
                if (watts[i] !== undefined) tcx += `              <Watts>${Math.round(watts[i])}</Watts>\n`;
                tcx += `            </Extensions>\n`;
            }
            tcx += `          </Trackpoint>\n`;
        }

        tcx += `        </Track>
      </Lap>
      <Creator xsi:type="Device_t">
        <Name>Strava Exporter</Name>
      </Creator>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

        return tcx;
    },

    async exportActivity(activity, format) {
        const streams = await API.getActivityStreams(activity.id);
        if (!streams) {
            throw new Error('No GPS data available for this activity');
        }

        let content, extension, mimeType;

        if (format === 'gpx') {
            content = this.generateGPX(activity, streams);
            extension = 'gpx';
            mimeType = 'application/gpx+xml';
        } else if (format === 'tcx') {
            content = this.generateTCX(activity, streams);
            extension = 'tcx';
            mimeType = 'application/vnd.garmin.tcx+xml';
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }

        if (!content) {
            throw new Error('Could not generate export file. Activity may not have GPS data.');
        }

        const template = localStorage.getItem(Config.STORAGE_KEYS.FILENAME_TEMPLATE) || Config.FILENAME_TEMPLATE;
        const dateFormat = localStorage.getItem(Config.STORAGE_KEYS.DATE_FORMAT) || Config.DATE_FORMAT;
        const filename = Utils.applyFilenameTemplate(template, activity, dateFormat) + '.' + extension;

        return { content, filename, mimeType };
    },

    async downloadActivity(activity, format) {
        const { content, filename, mimeType } = await this.exportActivity(activity, format);
        Utils.downloadFile(content, filename, mimeType);
    },

    async batchExport(activities, format, onProgress) {
        const zip = new JSZip();
        let completed = 0;
        const errors = [];

        for (const activity of activities) {
            try {
                if (onProgress) onProgress(completed, activities.length, activity.name);
                const { content, filename } = await this.exportActivity(activity, format);
                zip.file(filename, content);
            } catch (error) {
                console.error(`Error exporting ${activity.name}:`, error);
                errors.push({ activity: activity.name, error: error.message });
            }
            completed++;
        }

        if (onProgress) onProgress(completed, activities.length, 'Creating ZIP...');

        const blob = await zip.generateAsync({ type: 'blob' });
        const dateStr = new Date().toISOString().split('T')[0];
        Utils.downloadBlob(blob, `strava_export_${format}_${dateStr}.zip`);

        return { completed, errors };
    },

    getFitUrl(activityId) {
        return `https://www.strava.com/activities/${activityId}/export_original`;
    },

    downloadFit(activityId) {
        window.open(this.getFitUrl(activityId), '_blank');
    },

    async batchExportFit(activities, onProgress) {
        let completed = 0;
        const errors = [];

        for (const activity of activities) {
            if (onProgress) onProgress(completed, activities.length, activity.name);
            try {
                const win = window.open(this.getFitUrl(activity.id), '_blank');
                if (!win || win.closed || typeof win.closed === 'undefined') {
                    throw new Error('Popup blocked');
                }
                completed++;
            } catch (error) {
                errors.push({ activity: activity.name, error: error.message });
                if (completed === 0) break;
            }
        }

        if (onProgress) onProgress(completed, activities.length, 'Done!');

        return { completed, errors };
    }
};