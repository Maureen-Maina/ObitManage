const http = require('http');
const url = require('url');
const fs = require('fs');
const querystring = require('querystring');
const mysql = require('mysql');
const slugify = require('slugify');

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'yourusername',
    password: 'yourpassword',
    database: 'obituary_platform'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected...');
});

// Function to serve static files
function serveFile(filePath, contentType, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
}

// Function to handle form submission
function handleFormSubmission(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        const postData = querystring.parse(body);
        const { name, date_of_birth, date_of_death, content, author } = postData;
        const slug = slugify(name + '-' + Date.now());

        const obituary = { name, date_of_birth, date_of_death, content, author, slug };

        const sql = 'INSERT INTO obituaries SET ?';
        db.query(sql, obituary, (err, result) => {
            if (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error submitting obituary');
            } else {
                res.writeHead(302, { 'Location': '/view_obituaries' });
                res.end();
            }
        });
    });
}

// Function to display obituaries
function displayObituaries(res) {
    const sql = 'SELECT * FROM obituaries';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error retrieving obituaries');
        } else {
            let obituariesHTML = '';
            results.forEach(obituary => {
                obituariesHTML += `
                    <tr>
                        <td>${obituary.name}</td>
                        <td>${obituary.date_of_birth}</td>
                        <td>${obituary.date_of_death}</td>
                        <td>${obituary.content}</td>
                        <td>${obituary.author}</td>
                        <td>${obituary.submission_date}</td>
                    </tr>`;
            });

            fs.readFile('./views/view_obituaries.html', 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading obituaries page');
                } else {
                    const output = data.replace('{obituaries}', obituariesHTML);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(output);
                }
            });
        }
    });
}

// Create server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    if (path === '/submit_obituary' && req.method === 'POST') {
        handleFormSubmission(req, res);
    } else if (path === '/submit_obituary' && req.method === 'GET') {
        serveFile('./views/obituary_form.html', 'text/html', res);
    } else if (path === '/view_obituaries') {
        displayObituaries(res);
    } else if (path === '/styles.css') {
        serveFile('./public/styles.css', 'text/css', res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
