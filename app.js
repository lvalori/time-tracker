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
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');

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
                imagePreview.style.width = '150px'; // Set the width of the thumbnail
                imagePreview.style.height = 'auto'; // Maintain aspect ratio
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

        endTimeRilevazione = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const currentTime = performance.now();
        const elapsedMilliseconds = currentTime - startTime;
        time = Math.floor(elapsedMilliseconds / 1000);
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
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const wholeSeconds = Math.floor(remainingSeconds);

        if (milliseconds !== null) {
            const centiseconds = Math.floor((milliseconds % 1000) / 10);
            return `${padZero(minutes)}:${padZero(wholeSeconds)}.${padZero(centiseconds)}`;
        } else {
            return `${padZero(minutes)}:${padZero(wholeSeconds)}`;
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

        Object.keys(groupedRecords).forEach(phase => {
            const phaseGroup = groupedRecords[phase];

            const phaseTitle = document.createElement('h4');
            phaseTitle.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
            recordsList.appendChild(phaseTitle);

            const phaseList = document.createElement('ul');
            phaseGroup.forEach(record => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <strong>Progetto: </strong>${record.projectName}<br>
                    <strong>Posizione: </strong>${record.positionDescription}<br>
                    <strong>Tempo: </strong>${record.recordedTime}<br>`;
                phaseList.appendChild(listItem);
            });
            recordsList.appendChild(phaseList);
        });

        savedRecordsSection.classList.remove('hidden');
    }

    function endRecord() {
        saveRecord();
        document.getElementById('end-record-btn').classList.add('hidden');
        document.getElementById('download-excel-btn').classList.remove('hidden');
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

    function convertTimeToExcelDuration(timeString) {
        const timeParts = timeString.split(':');
        const minutes = parseInt(timeParts[0]);
        const seconds = parseInt(timeParts[1]);
        const centiseconds = timeParts.length > 2 ? parseInt(timeParts[2]) / 100 : 0;
        return (minutes * 60 + seconds + centiseconds) / 86400; // Convert total seconds to Excel duration
    }
});