import fs from 'fs';
import csv from 'csv-parser';

export default async function parseCsvWithValidation(filePath, requiredHeaders = []) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', headers => {
        const lower = headers.map(h => h.toLowerCase());
        const requiredLower = requiredHeaders.map(h => h.toLowerCase());
        const missing = requiredLower.filter(h => !lower.includes(h));
        console.log('CSV Headers:', headers);
        console.log('Required Headers:', requiredHeaders);
        console.log('Lowercase Headers:', lower);
        console.log("missing", missing);
        if (missing.length) {
          stream.destroy();
          fs.unlinkSync(filePath);
          reject(new Error(`Missing columns: ${missing.join(', ')}`));
        }
      })
      .on('data', row => results.push(row))
      .on('end', () => {
        fs.unlinkSync(filePath);
        resolve(results);
      })
      .on('error', err => {
        fs.unlinkSync(filePath);
        reject(err);
      });
  });
};
