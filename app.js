// app.js

// Fonction d'initialisation de l'application
function initApp() {
    console.log("Initialisation de l'application");
    document.getElementById('databaseFile').addEventListener('change', handleDatabaseFile);
    document.getElementById('workFiles').addEventListener('change', handleWorkFiles);
    document.getElementById('numColumns').addEventListener('input', updateColumnSelects);
    document.getElementById('processFiles').addEventListener('click', processFiles);
}

let databaseData = null;
let workDataList = [];
let selectedDbIndices = [];
let selectedDbCodeIndex = null;
let workFileNames = [];

function handleDatabaseFile(event) {
    if (!isAuthenticated()) return;
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            databaseData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1});
            document.getElementById('databaseColumns').classList.remove('hidden');
            updateColumnSelects();
            populateSelect(document.getElementById('dbCodeCol'), databaseData[0], selectedDbCodeIndex);
        };
        reader.onerror = function(error) {
            console.error("Erreur de lecture de fichier: ", error);
            alert("Erreur de lecture du fichier. Veuillez réessayer.");
        };
        reader.readAsArrayBuffer(file);
    }
}

function handleWorkFiles(event) {
    if (!isAuthenticated()) return;
    const files = Array.from(event.target.files);
    workDataList = [];
    workFileNames = [];
    let filesProcessed = 0;

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            workDataList.push(XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1}));
            workFileNames.push(file.name);
            filesProcessed++;
            if (filesProcessed === files.length) {
                document.getElementById('workColumns').classList.remove('hidden');
                populateSelect(document.getElementById('workCodeCol'), workDataList[0][0]);
                updateColumnSelects(false);
            }
        };
        reader.onerror = function(error) {
            console.error("Erreur de lecture de fichier: ", error);
            alert("Erreur de lecture du fichier. Veuillez réessayer.");
        };
        reader.readAsArrayBuffer(file);
    });
}

function updateColumnSelects(updateDbColumns = true) {
    if (!isAuthenticated()) return;
    const numColumns = parseInt(document.getElementById('numColumns').value);
    const dbColumnSelects = document.getElementById('dbColumnSelects');
    const workColumnSelects = document.getElementById('workColumnSelects');

    if (updateDbColumns) {
        selectedDbIndices = Array.from(document.querySelectorAll('.db-select')).map(select => parseInt(select.value));
    }

    dbColumnSelects.innerHTML = '';
    workColumnSelects.innerHTML = '';

    for (let i = 0; i < numColumns; i++) {
        const dbSelectLabel = document.createElement('label');
        dbSelectLabel.textContent = `Colonne de base de données ${i + 1}:`;
        const dbSelect = document.createElement('select');
        dbSelect.classList.add('db-select');
        populateSelect(dbSelect, databaseData ? databaseData[0] : [], selectedDbIndices[i]);
        dbColumnSelects.appendChild(dbSelectLabel);
        dbColumnSelects.appendChild(dbSelect);

        const workSelectLabel = document.createElement('label');
        workSelectLabel.textContent = `Colonne de fichier de travail ${i + 1}:`;
        const workSelect = document.createElement('select');
        workSelect.classList.add('work-select');
        populateSelect(workSelect, workDataList.length ? workDataList[0][0] : []);
        workColumnSelects.appendChild(workSelectLabel);
        workColumnSelects.appendChild(workSelect);
    }

    document.getElementById('processFiles').classList.remove('disabled');
    document.getElementById('processFiles').disabled = false;
}

function processFiles() {
    if (!isAuthenticated()) return;
    const dbSelects = document.querySelectorAll('.db-select');
    const workSelects = document.querySelectorAll('.work-select');
    const workCodeIndex = parseInt(document.getElementById('workCodeCol').value);
    const dbCodeIndex = parseInt(document.getElementById('dbCodeCol').value);

    const dbIndices = Array.from(dbSelects).map(select => parseInt(select.value));
    const workIndices = Array.from(workSelects).map(select => parseInt(select.value));

    // Prétraitement de la base de données pour une recherche plus rapide
    const dbMap = new Map();
    for (let j = 1; j < databaseData.length; j++) {
        if (databaseData[j].every(cell => cell === '' || cell === undefined)) continue;
        const dbRow = dbIndices.map(index => removeAccentsAndNormalizeArabic(String(databaseData[j][index] || '').toLowerCase()));
        const dbCode = String(databaseData[j][dbCodeIndex] || '');
        const key = dbRow.join('|');
        if (!dbMap.has(key)) {
            dbMap.set(key, { code: dbCode, row: dbRow });
        }
    }

    workDataList.forEach((workData, fileIndex) => {
        const resultData = [workData[0].concat(['Matched Code', 'Match Type', 'Match Score', 'Matched From'])];
        
        document.getElementById('progressBarContainer').classList.remove('hidden');
        updateProgressBar(0);

        const batchSize = 1000;
        const totalRows = workData.length - 1;

        for (let batchStart = 1; batchStart < workData.length; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, workData.length);
            const batchResults = [];

            for (let i = batchStart; i < batchEnd; i++) {
                if (workData[i].every(cell => cell === '' || cell === undefined)) {
                    continue;
                }

                // Vérification si la colonne de résultat est déjà remplie
                if (workData[i][workCodeIndex]) {
                    // Si la colonne de résultat est déjà remplie, passer à la ligne suivante
                    batchResults.push(workData[i].concat(['', '', '', '']));
                    continue;
                }

                const workRow = workIndices.map(index => removeAccentsAndNormalizeArabic(String(workData[i][index] || '').toLowerCase()));
                const workKey = workRow.join('|');
                
                let bestMatch = { score: 0, code: '', type: '', matchedFrom: '' };

                // Recherche exacte
                if (dbMap.has(workKey)) {
                    const match = dbMap.get(workKey);
                    bestMatch = { score: 1, code: match.code, type: 'Exact', matchedFrom: match.row.join(', ') };
                } else {
                    // Recherche approximative
                    for (const [key, value] of dbMap) {
                        const similarities = workRow.map((val, idx) => stringSimilarity.compareTwoStrings(val, value.row[idx]));
                        const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

                        if (avgSimilarity > bestMatch.score) {
                            bestMatch = { 
                                score: avgSimilarity, 
                                code: value.code, 
                                type: 'Approximate', 
                                matchedFrom: value.row.join(', ')
                            };
                        }
                    }
                }

                const matchScore = bestMatch.score.toFixed(2);
                const matchCode = bestMatch.score >= 0.7 ? bestMatch.code : '';
                
                batchResults.push(workData[i].concat([matchCode, bestMatch.type, matchScore, bestMatch.matchedFrom]));
            }

            resultData.push(...batchResults);
            updateProgressBar(Math.round((batchEnd / totalRows) * 100));
        }

        const worksheet = XLSX.utils.aoa_to_sheet(resultData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, worksheet, "Sheet1");

        const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });

        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = workFileNames[fileIndex].replace(/(\.xlsx)$/i, '_processed$1');
        a.textContent = `Télécharger ${workFileNames[fileIndex].replace(/(\.xlsx)$/i, '_processed$1')}`;
        a.classList.add('download-link');
        document.querySelector('footer').appendChild(a);
    });

    document.getElementById('progressBarContainer').classList.add('hidden');
}
function populateSelect(selectElement, headers, selectedValue = null) {
    selectElement.innerHTML = '';
    headers.forEach((header, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = header;
        if (index === selectedValue) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

function updateProgressBar(value) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${value}%`;
    document.getElementById('progressPercent').textContent = `${value}%`;
}

function removeAccentsAndNormalizeArabic(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u064B-\u065F]/g, "").replace(/[\u06D6-\u06DC]/g, "").replace(/[\u06DF-\u06E4]/g, "").replace(/[\u06E7-\u06E8]/g, "").replace(/[\u06EA-\u06ED]/g, "");
}
