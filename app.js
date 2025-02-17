let timer;
let startTime;
let time = 0;
let isRunning = false;
let savedRecords = [];
let startTimeRilevazione;
let endTimeRilevazione;

// Funzioni Timer
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
// Funzioni Form e Record
function showProjectForm() {
    document.getElementById('new-record-screen').classList.add('hidden');
    document.getElementById('project-form').classList.remove('hidden');
    document.getElementById('saved-records').classList.add('hidden');
}

async function saveRecord() {
    const projectName = document.getElementById('project-name').value;
    const image = document.getElementById('image-upload').files[0];
    const phase = document.getElementById('phase-select').value;
    const positionDescription = document.getElementById('position-description').value;
    const recordedTime = formatTime(time);

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
    document.getElementById('timer').textContent = '00:00:00';
    document.getElementById('position-description').value = '';
    document.getElementById('new-record-screen').classList.remove('hidden');
    document.getElementById('project-form').classList.add('hidden');

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

    document.getElementById('saved-records').classList.remove('hidden');
}

function endRecord() {
    console.log("Clicked 'End'");
    saveRecord();
    document.getElementById('end-record-btn').classList.add('hidden');
    document.getElementById('download-excel-btn').classList.remove('hidden');
}
function downloadExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            throw new Error("XLSX library not loaded.");
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([]);

        const projectName = document.getElementById('project-name').value;
        const fileName = `${projectName}.xlsx`;

        const headerStyle = {
            font: {
                bold: true,
                sz: 26
            }
        };

        XLSX.utils.sheet_add_aoa(ws, [[projectName]], { origin: 'B1' });
        ws['B1'].s = headerStyle;

        if (savedRecords.length > 0 && savedRecords[0].imageName) {
            const imageUrl = `/images/${savedRecords[0].imageName}`;
            XLSX.utils.sheet_add_aoa(ws, [[`<a href="${imageUrl}">Image</a>`]], { origin: 'A2' });
        }

        const tableHeader = ['FASE', 'POSIZIONE', 'TEMPO'];
        XLSX.utils.sheet_add_aoa(ws, [tableHeader], { origin: 'A3' });

        let row = 4;
        savedRecords.forEach(record => {
            let formattedTime = record.recordedTime;

            formattedTime = formattedTime.replace(/<span class="math-inline">|<\/span>/g, '');
            formattedTime = formattedTime.replace(/\{/g, '');
            formattedTime = formattedTime.replace(/\}/g, '');

            if (!/^\d{2}:\d{2}:\d{2}$/.test(formattedTime) && !/^\d+:\d{2}:\d{2}$/.test(formattedTime)) {
                const timeParts = formattedTime.split(':');
                if (timeParts.length === 3) {
                    const hours = parseInt(timeParts[0]);
                    const minutes = parseInt(timeParts[1]);
                    const seconds = parseInt(timeParts[2]);

                    if (!isNaN(hours) && !isNaN(minutes) && !isNaN(seconds)) {
                        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                        formattedTime = formatSecondsToHHMMSS(totalSeconds);
                    }
                }
            }

            const timePartsExcel = formattedTime.split(':');
            const hoursExcel = parseInt(timePartsExcel[0]);
            const minutesExcel = parseInt(timePartsExcel[1]);
            const secondsExcel = parseInt(timePartsExcel[2]);
            const totalSecondsExcel = hoursExcel * 3600 + minutesExcel * 60 + secondsExcel;

            ws['C' + row].t = 'n';
            ws['C' + row].v = totalSecondsExcel / 86400;
            ws['C' + row].z = 'HH:MM:SS';

            XLSX.utils.sheet_add_aoa(ws, [[record.phase, record.positionDescription, formattedTime]], { origin: `A${row}` });
            row++;
        });

        const startTimeParts = startTimeRilevazione.split(':');
        const startHours = parseInt(startTimeParts[0]);
        const startMinutes = parseInt(startTimeParts[1]);
        const startSeconds = parseInt(startTimeParts[2]);
        const totalStartSeconds = startHours * 3600 + startMinutes * 60 + startSeconds;

        ws['A' + (row + 2)].t = 'n';
        ws['B' + (row + 2)].t = 'n';
        ws['A' + (row + 2)].v = totalStartSeconds / 86400;
        ws['B' + (row + 2)].v = totalStartSeconds / 86400;
        ws['A' + (row + 2)].z = 'HH:MM:SS';
        ws['B' + (row + 2)].z = 'HH:MM:SS';

        const endTimeParts = endTimeRilevazione.split(':');
        const endHours = parseInt(endTimeParts[0]);
        const endMinutes = parseInt(endTimeParts[1]);
        const endSeconds = parseInt(endTimeParts[2]);
        const totalEndSeconds = endHours * 3600 + endMinutes * 60 + endSeconds;

        ws['A' + (row + 3)].t = 'n';
        ws['B' + (row + 3)].t = 'n';
        ws['A' + (row + 3)].v = totalEndSeconds / 86400;
        ws['B' + (row + 3)].v = totalEndSeconds / 86400;
        ws['A' + (row + 3)].z = 'HH:MM:SS';
        ws['B' + (row + 3)].z = 'HH:MM:SS';

        XLSX.utils.sheet_add_aoa(ws, [['Orario inizio rilevazione:', startTimeRilevazione]], { origin: `A${row + 2}` });
        XLSX.utils.sheet_add_aoa(ws, [['Orario fine rilevazione:', endTimeRilevazione]], { origin: `A${row + 3}` });

        wb.SheetNames.push('Rilevazioni');
        wb.Sheets['Rilevazioni'] = ws;

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error downloading Excel:", error);
        alert(error.message);
    }
}