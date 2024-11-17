const express = require('express');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const app = express();
const port = 3300;

// CSV failide lugemiseks ja töötlemiseks
let spareParts = [];

// Lae CSV andmed ja töötle need mällu
function loadSpareParts() {
    const filePath = path.join(__dirname, 'LE.txt'); // CSV fail samas kaustas
    fs.createReadStream(filePath)
        .pipe(csvParser({ separator: '\t', headers: false })) // Kasutame tabulatsioonimärki eraldajana
        .on('data', (row) => {
            //console.log(row)
            const part = {
                serialNumber: row[0], // esimene veerg - seerianumber
                name: row[1], // teine veerg - toote nimi
                stock1: row[2], // laoseis (kõik järgmised veerud)
                stock2: row[3],
                stock3: row[4],
                stock4: row[5],
                stock5: row[6],
                manufacturer: row[9],
                priceWithoutVAT: parseFloat(row[8]), // hind ilma käibemaksuta
                priceWithVAT: parseFloat(row[10]), // hind koos käibemaksuga
            };
            spareParts.push(part);
        })
        .on('end', () => {
            console.log('CSV Fail on edukalt loetud!');
        });
}

// Lae andmed serveri käivitamisel
loadSpareParts();
app.set('json spaces', 2); // JSON vastused on alati taandatud

// Vaikimisi tee (kui külastatakse lihtsalt localhost:3300)
app.get('/', (req, res) => {
    res.send('Tere tulemast varuosade API-sse! Kasutage /spare-parts, et saada varuosi.');
});

// API endpoint, et saada kõik varuosad
app.get('/spare-parts', (req, res) => {
    let filteredParts = [...spareParts]; // Tee koopia andmetest, et neid filtreerida

    // Filtreerimine nime järgi
    if (req.query.name) {
        filteredParts = filteredParts.filter(part => part.name.toLowerCase().includes(req.query.name.toLowerCase()));
    }

    // Filtreerimine seerianumbri järgi
    if (req.query.sn) {
        filteredParts = filteredParts.filter(part => part.serialNumber.includes(req.query.sn));
    }

    // Sorteerimine kõikidest andmetest:
    if (req.query.sort) {
        const sortBy = req.query.sort;
        const isDescending = sortBy.startsWith('-');
        const key = sortBy.replace('-', '');
    
        filteredParts.sort((a, b) => {
          if (a[key] < b[key]) return isDescending ? 1 : -1;
          if (a[key] > b[key]) return isDescending ? -1 : 1;
          return 0;
        });
      }

    // Leheküljed - pagineerimine
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10; // Määrame igal lehel kuvatavad tulemused
    const startIndex = (page - 1) * pageSize;
    const pagedParts = filteredParts.slice(startIndex, startIndex + pageSize);

    // Sorteerimine lehekülje kaupa:
    /* if (req.query.sort) {
        const sortBy = req.query.sort;
        const sortDescending = sortBy.startsWith('-');
        const field = sortBy.replace('-', '');

        pagedParts.sort((a, b) => {
            const aValue = a[field] || '';
            const bValue = b[field] || '';
            if (aValue < bValue) return sortDescending ? 1 : -1;
            if (aValue > bValue) return sortDescending ? -1 : 1;
            return 0;
        });
    } */

    // Tagasta tulemused
    res.json({
        data: pagedParts,
        total: filteredParts.length,
        page,
        pageSize,
    });
});

// Serveri kuulamine
app.listen(port, () => {
    console.log(`Server on käivitunud aadressil http://localhost:${port}`);
});
