document.addEventListener('DOMContentLoaded', () => {
    const newProjectBtn = document.getElementById('new-project-btn');
    const projectForm = document.getElementById('project-form');
    const newRecordScreen = document.getElementById('new-record-screen');
    const savedRecordsSection = document.getElementById('saved-records');
    const startTimerBtn = document.getElementById('start-timer-btn');
    const stopTimerBtn = document.getElementById('stop-timer-btn');
    const saveRecordBtn = document.getElementById('save-record-btn');
    const endRecordBtn = document.getElementById('end-record-btn');
    const downloadExcelBtn = document.getElementById('download-excel-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const projectNameDisplay = document.getElementById('project-name-display');
    const summaryImage = document.getElementById('summary-image');
    const phaseChartCtx = document.getElementById('phase-chart').getContext('2d');
    const chartLegend = document.getElementById('chart-legend');
    let phaseChart;

    newProjectBtn.addEventListener('click', () => {
        showProjectForm();
    });

    startTimerBtn.addEventListener('click', () => {
        startTimer();
    });

    stopTimerBtn.addEventListener('click', () => {
        stopTimer();
    });

    saveRecordBtn.addEventListener('click', () => {
        saveRecord();
    });

    endRecordBtn.addEventListener('click', () => {
        endRecord();
    });

    downloadExcelBtn.addEventListener('click', () => {
        downloadExcel();
    });

    downloadPdfBtn.addEventListener('click', () => {
        exportToPdf();
    });

    imageUploadInput.addEventListener('change', () => {
        displayImagePreview();
    });

    function showProjectForm() {
        newRecordScreen.classList.add('hidden');
        projectForm.classList.remove('hidden');
        savedRecordsSection.classList.add('hidden');
    }

    function displayImagePreview() {
        const file = imageUploadInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.src = e.target.result;
                imagePreview.classList.add('visible');
                imagePreview.style.width = '100px'; // Riduci la dimensione dell'immagine
                imagePreview.style.height = 'auto'; // Mantieni il rapporto d'aspetto
            };
            reader.readAsDataURL(file);
        }
    }

    // Timer functions
    let timer;
    let startTime;
    let time = 0;
    let isRunning = false;
    let savedRecords = [];
    let startTimeRilevazione;
    let endTimeRilevazione;

    function startTimer() {
        if (isRunning) return;
        isRunning = true;
        startTime = performance.now() - time * 1000;
        timer = requestAnimationFrame(updateTimer);

        if (time === 0) {
            startTimeRilevazione = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }

    function stopTimer() {
        if (!isRunning) return;
        isRunning = false;
        cancelAnimationFrame(timer);

        const currentTime = performance.now();
        const elapsedMilliseconds = currentTime - startTime;
        time = Math.ceil(elapsedMilliseconds / 1000); // Arrotonda per eccesso
        document.getElementById('timer').textContent = formatTime(time);
    }

    function updateTimer() {
        if (!isRunning) return;

        const currentTime = performance.now();
        const elapsedMilliseconds = currentTime - startTime;

        time = Math.floor(elapsedMilliseconds / 1000);
        document.getElementById('timer').textContent = formatTime(time, elapsedMilliseconds);

        timer = requestAnimationFrame(updateTimer);
    }

    function formatTime(seconds, milliseconds = null) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        const wholeSeconds = Math.floor(remainingSeconds);

        if (milliseconds !== null) {
            const centiseconds = Math.floor((milliseconds % 1000) / 10);
            return `${padZero(hours)}:${padZero(minutes)}:${padZero(wholeSeconds)}.${padZero(centiseconds)}`;
        } else {
            return `${padZero(hours)}:${padZero(minutes)}:${padZero(wholeSeconds)}`;
        }
    }

    function padZero(num) {
        return num < 10 ? '0' + num : num;
    }

    // Form and record functions
    async function saveRecord() {
        const projectName = document.getElementById('project-name').value;
        const image = document.getElementById('image-upload').files[0];
        const phase = document.getElementById('phase-select').value;
        const positionDescription = document.getElementById('position-description').value;
        const recordedTime = formatTime(time);

        if (!projectName || !phase || !positionDescription || time === 0) {
            alert("Assicurati che tutti i campi siano compilati e che il timer sia stato avviato.");
            return;
        }

        let imageName = null;

        if (image) {
            try {
                imageName = image.name;

                const formData = new FormData();
                formData.append('image', image);

                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Error uploading image: ${response.status} - ${errorText}`);
                }
            } catch (error) {
                console.error("Error saving image:", error);
                alert(`Error saving image: ${error.message}`);
                return;
            }
        }

        const record = {
            projectName,
            imageName: imageName,
            phase,
            positionDescription,
            recordedTime
        };

        savedRecords.push(record);

        time = 0;
        document.getElementById('timer').textContent = '00:00';
        document.getElementById('position-description').value = '';
        newRecordScreen.classList.remove('hidden');
        projectForm.classList.add('hidden');

        displaySavedRecords();
        alert('Rilevazione salvata con successo!');
    }

    function displaySavedRecords() {
        const recordsList = document.getElementById('records-list');
        recordsList.innerHTML = '';

        const groupedRecords = savedRecords.reduce((groups, record) => {
            if (!groups[record.phase]) {
                groups[record.phase] = [];
            }
            groups[record.phase].push(record);
            return groups;
        }, {});

        const phaseTables = document.createElement('div');
        phaseTables.classList.add('phase-tables');

        Object.keys(groupedRecords).forEach(phase => {
            const phaseGroup = groupedRecords[phase];

            const phaseTitle = document.createElement('h4');
            phaseTitle.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);

            const phaseTable = document.createElement('table');
            phaseTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Posizione</th>
                        <th>Tempo</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;

            let totalPhaseTime = 0;
            phaseGroup.forEach(record => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${record.positionDescription}</td>
                    <td>${record.recordedTime}</td>
                `;
                totalPhaseTime += convertTimeToSeconds(record.recordedTime);
                phaseTable.querySelector('tbody').appendChild(row);
            });

            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td><strong>Totale ${phase}</strong></td>
                <td><strong>${formatTime(totalPhaseTime)}</strong></td>
            `;
            phaseTable.querySelector('tbody').appendChild(totalRow);

            phaseTables.appendChild(phaseTitle);
            phaseTables.appendChild(phaseTable);
        });

        recordsList.innerHTML = '';
        recordsList.appendChild(phaseTables);

        projectNameDisplay.textContent = savedRecords[0].projectName;
        summaryImage.src = imagePreview.src;
        savedRecordsSection.classList.remove('hidden');
        document.getElementById('download-excel-btn').classList.remove('hidden');
        document.getElementById('download-pdf-btn').classList.remove('hidden');

        displayTotalTimes();
        createPhaseChart(groupedRecords);
    }

    function endRecord() {
        if (document.getElementById('project-name').value === "" ||
            document.getElementById('phase-select').value === "" ||
            document.getElementById('position-description').value === "" ||
            time === 0) {
            alert("Assicurati che tutti i campi siano compilati e che il timer sia stato avviato.");
            return;
        }

        endTimeRilevazione = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        saveRecord();
        displayTotalTimes();
        document.getElementById('end-record-btn').classList.add('hidden');
    }

    function downloadExcel() {
        if (savedRecords.length === 0) {
            alert("Non ci sono rilevazioni salvate da scaricare.");
            return;
        }

        try {
            if (typeof XLSX === 'undefined') {
                throw new Error("XLSX library not loaded.");
            }

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([]);

            const projectName = savedRecords[0].projectName;
            const headerStyle = {
                font: {
                    bold: true,
                    sz: 26
                }
            };

            ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 15 }]; // Set column widths
            ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]; // Merge cells for project name

            XLSX.utils.sheet_add_aoa(ws, [[projectName]], { origin: 'A1' });
            ws['A1'].s = headerStyle;

            if (savedRecords.length > 0 && savedRecords[0].imageName) {
                const imageUrl = `/images/${savedRecords[0].imageName}`;
                XLSX.utils.sheet_add_aoa(ws, [[`Image: ${imageUrl}`]], { origin: 'A2' });
            }

            const tableHeader = ['FASE', 'POSIZIONE', 'TEMPO'];
            XLSX.utils.sheet_add_aoa(ws, [tableHeader], { origin: 'A3' });

            let row = 4;
            savedRecords.forEach(record => {
                const formattedTime = convertTimeToExcelDuration(record.recordedTime);
                XLSX.utils.sheet_add_aoa(ws, [[record.phase, record.positionDescription, { t: 'n', v: formattedTime, z: '[h]:mm:ss' }]], { origin: `A${row}` });
                row++;
            });

            XLSX.utils.sheet_add_aoa(ws, [['Orario inizio rilevazione:', startTimeRilevazione]], { origin: `A${row + 2}` });
            XLSX.utils.sheet_add_aoa(ws, [['Orario fine rilevazione:', endTimeRilevazione]], { origin: `A${row + 3}` });

            wb.SheetNames.push('Rilevazioni');
            wb.Sheets['Rilevazioni'] = ws;

            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error downloading Excel:", error);
            alert(error.message);
        }
    }

    function exportToPdf() {
        const element = document.getElementById('saved-records');
        html2canvas(element).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            pdf.addImage(imgData, 'PNG', 10, 10);
            pdf.save('rilevazioni.pdf');
        });
    }

    function displayTotalTimes() {
        const startTimeElement = document.getElementById('start-time');
        const endTimeElement = document.getElementById('end-time');
        const totalTimeElement = document.getElementById('total-time');

        startTimeElement.textContent = `Orario inizio rilevazione: ${startTimeRilevazione}`;
        endTimeElement.textContent = `Orario fine rilevazione: ${endTimeRilevazione}`;

        const totalElapsedTime = convertTimeToSeconds(endTimeRilevazione) - convertTimeToSeconds(startTimeRilevazione);
        totalTimeElement.textContent = `Tempo totale impiegato: ${formatTime(totalElapsedTime)}`;
    }

    function createPhaseChart(groupedRecords) {
        const phaseTimes = Object.keys(groupedRecords).map(phase => {
            return groupedRecords[phase].reduce((total, record) => {
                return total + convertTimeToSeconds(record.recordedTime);
            }, 0);
        });

        const phaseLabels = Object.keys(groupedRecords);

        if (phaseChart) {
            phaseChart.destroy();
        }

        phaseChart = new Chart(phaseChartCtx, {
            type: 'pie',
            data: {
                labels: phaseLabels,
                datasets: [{
                    data: phaseTimes,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'center',
                        labels: {
                            generateLabels: function (chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const meta = chart.getDatasetMeta(0);
                                        const style = meta.controller.getStyle(i);

                                        return {
                                            text: `${label}: ${formatTime(data.datasets[0].data[i])}`,
                                            fillStyle: style.backgroundColor,
                                            strokeStyle: style.borderColor,
                                            lineWidth: style.borderWidth,
                                            hidden: !chart.getDataVisibility(i),
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                return `${tooltipItem.label}: ${formatTime(tooltipItem.raw)}`;
                            }
                        }
                    }
                }
            }
        });

        // Move legend to chart-legend div
        chartLegend.innerHTML = '';
        phaseChart.generateLegend().forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.style.display = 'flex';
            legendItem.style.alignItems = 'center';
            const colorBox = document.createElement('span');
            colorBox.style.backgroundColor = item.fillStyle;
            colorBox.style.width = '12px';
            colorBox.style.height = '12px';
            colorBox.style.marginRight = '8px';

            const text = document.createElement('span');
            text.textContent = item.text;

            legendItem.appendChild(colorBox);
            legendItem.appendChild(text);
            chartLegend.appendChild(legendItem);
        });
    }

    function convertTimeToSeconds(timeString) {
        const timeParts = timeString.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        const seconds = parseInt(timeParts[2]);
        return (hours * 3600) + (minutes * 60) + seconds;
    }

    function convertTimeToExcelDuration(timeString) {
        const timeParts = timeString.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        const seconds = parseInt(timeParts[2]);
        return (hours * 3600 + minutes * 60 + seconds) / 86400; // Convert total seconds to Excel duration
    }
});