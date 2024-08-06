const fs = require('fs');
const path = require('path');

exports.handler = async () => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, 'page.html');

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject({
                    statusCode: 500,
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'Internal Server Error',
                });
                return;
            }

            resolve({
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                body: data,
            });
        });
    });
};
