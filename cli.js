#!/usr/bin/env node

const { resolve } = require('path')
const fs = require('fs')

const Hyve = require('./interpreter');

const file_path = resolve(__dirname, process.argv[2]);
fs.readFile(file_path, 'utf8', function(err, data) {
    if (err) throw err;
    
    Hyve.input(`${data}`);
})